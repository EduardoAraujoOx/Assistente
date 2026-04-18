#!/usr/bin/env node
/**
 * scripts/build-kb.mjs
 *
 * Gera data/kb-{ANO}.json com todos os planos de trabalho APROVADOS do ES
 * para servir de Knowledge Base às predições do assistente.
 *
 * Uso:
 *   node scripts/build-kb.mjs          # ano corrente - 1 (padrão: KB de produção)
 *   node scripts/build-kb.mjs 2025     # ano explícito
 *   node scripts/build-kb.mjs 2026     # para gerar gabarito de validação
 *
 * Saída: data/kb-{ANO}.json
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname }            from 'path';
import { fileURLToPath }            from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

const TGOV_BASE   = 'https://api.transferegov.gestao.gov.br/transferenciasespeciais';
const PORTAL_BASE = 'https://especiais.transferegov.sistema.gov.br/maisbrasil-transferencia-especial-backend/api';
const UF          = 'ES';
const CONCURRENCY = 5;   // chamadas paralelas ao portal
const TIMEOUT_MS  = 15000;

const ANO = Number(process.argv[2]) || new Date().getFullYear() - 1;

// ─── helpers ────────────────────────────────────────────────────────────────

async function getJson(url) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return r.json();
  } finally {
    clearTimeout(timer);
  }
}

async function getJsonSafe(url) {
  try { return await getJson(url); }
  catch { return null; }
}

// Divide array em chunks para controlar concorrência
async function pmap(arr, fn, concurrency = CONCURRENCY) {
  const results = [];
  for (let i = 0; i < arr.length; i += concurrency) {
    const chunk = await Promise.all(arr.slice(i, i + concurrency).map(fn));
    results.push(...chunk);
  }
  return results;
}

// ─── passo 1: IDs dos planos com PT aprovado ────────────────────────────────

async function fetchIdsAprovados() {
  // Busca via plano_trabalho_especial (filtro mais preciso: PT = APROVADO)
  const qs = new URLSearchParams({
    'plano_acao_especial.uf_beneficiario_plano_acao': `eq.${UF}`,
    'plano_acao_especial.ano_plano_acao':             `eq.${ANO}`,
    situacao_plano_trabalho:                          'eq.APROVADO',
    select: 'id_plano_acao,id_plano_trabalho,situacao_plano_trabalho,' +
            'prazo_execucao_meses_plano_trabalho,classificacao_orcamentaria_pt',
    limit: '500',
  });

  let rows = await getJsonSafe(`${TGOV_BASE}/plano_trabalho_especial?${qs}`);

  // Fallback: busca por PA status CIENTE (cobre lag de sincronização do PostgREST)
  if (!rows || rows.length === 0) {
    console.log('  ↳ plano_trabalho_especial sem resultados — tentando via PA status CIENTE...');
    const qs2 = new URLSearchParams({
      uf_beneficiario_plano_acao:  `eq.${UF}`,
      ano_plano_acao:              `eq.${ANO}`,
      situacao_plano_acao:         'in.(CIENTE,AGUARDANDO_CIENCIA)',
      select: 'id_plano_acao',
      limit:  '500',
    });
    const pas = await getJsonSafe(`${TGOV_BASE}/plano_acao_especial?${qs2}`) ?? [];
    const ids = pas.map(p => p.id_plano_acao).filter(Boolean);
    if (ids.length === 0) return [];

    // Busca PT para esses IDs
    const qs3 = new URLSearchParams({
      'id_plano_acao': `in.(${ids.join(',')})`,
      select: 'id_plano_acao,id_plano_trabalho,situacao_plano_trabalho,' +
              'prazo_execucao_meses_plano_trabalho,classificacao_orcamentaria_pt',
      limit: '500',
    });
    rows = await getJsonSafe(`${TGOV_BASE}/plano_trabalho_especial?${qs3}`) ?? [];
  }

  return rows;
}

// ─── passo 2: detalhes do executor ──────────────────────────────────────────

async function fetchExecutores(idsPa) {
  if (!idsPa.length) return [];
  const qs = new URLSearchParams({
    id_plano_acao: `in.(${idsPa.join(',')})`,
    select: 'id_plano_acao,id_executor,cnpj_executor,nome_executor,objeto_executor,' +
            'vl_custeio_executor,vl_investimento_executor,' +
            'ind_recursos_gerenciados_conta_especifica_executor,' +
            'codigo_banco_executor,nome_banco_executor,' +
            'numero_agencia_executor,dv_agencia_executor,nome_agencia_executor,' +
            'numero_conta_executor,dv_conta_executor',
    limit: '500',
  });
  return await getJsonSafe(`${TGOV_BASE}/executor_especial?${qs}`) ?? [];
}

// ─── passo 3: finalidades ───────────────────────────────────────────────────

async function fetchFinalidades(idsExec) {
  if (!idsExec.length) return [];
  const qs = new URLSearchParams({
    id_executor: `in.(${idsExec.join(',')})`,
    select: 'id_executor,cd_area_politica_publica_tipo,ds_area_politica_publica_tipo,' +
            'cd_area_politica_publica,ds_area_politica_publica',
    limit: '500',
  });
  return await getJsonSafe(`${TGOV_BASE}/finalidade_especial?${qs}`) ?? [];
}

// ─── passo 4: metas ─────────────────────────────────────────────────────────

async function fetchMetas(idsExec) {
  if (!idsExec.length) return [];
  const qs = new URLSearchParams({
    id_executor: `in.(${idsExec.join(',')})`,
    select: 'id_executor,desc_meta,qt_unidade_meta,un_medida_meta,' +
            'vl_unitario_meta,vl_total_meta',
    limit: '500',
  });
  return await getJsonSafe(`${TGOV_BASE}/meta_especial?${qs}`) ?? [];
}

// ─── passo 5: objeto do parlamentar (portal backend) ────────────────────────

async function fetchObjetosParlamentar(idsPa) {
  console.log(`  Buscando objeto do parlamentar para ${idsPa.length} planos...`);
  const resultados = await pmap(idsPa, async (id) => {
    const pa = await getJsonSafe(`${PORTAL_BASE}/public/plano-acao/${id}`);
    if (!pa) return { id, objetoParlamentar: null };
    const o = pa.objeto || {};
    return {
      id,
      objetoParlamentar:
        o.descricaoFormatada ||
        pa.objetoDetalhe ||
        (o.codigo && o.descricao ? `${o.codigo} - ${o.descricao}` : null),
      nomeParlamentar: pa.emendaParlamentar?.nomeParlamentar ?? null,
      codigoEmenda:   pa.emendaParlamentar?.codigoEmendaFormatado ?? null,
      valorTotal:     pa.valorTotal ?? null,
      valorCusteio:   pa.valorCusteio ?? null,
      valorInvestimento: pa.valorInvestimento ?? null,
      nomeBeneficiario:  pa.beneficiario?.nome ?? null,
      cnpjBeneficiario:  pa.beneficiario?.cnpj ?? null,
    };
  });
  return Object.fromEntries(resultados.map(r => [r.id, r]));
}

// ─── main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔨 build-kb.mjs — Knowledge Base ${ANO} (UF=${UF})\n`);

  console.log('1. Buscando planos com PT aprovado...');
  const ptRows = await fetchIdsAprovados();
  console.log(`   → ${ptRows.length} planos encontrados`);
  if (!ptRows.length) {
    console.log('   Nenhum plano encontrado. Encerrando.');
    process.exit(0);
  }

  const idsPa = [...new Set(ptRows.map(r => r.id_plano_acao).filter(Boolean))];
  const ptByPa = Object.fromEntries(ptRows.map(r => [r.id_plano_acao, r]));

  console.log('2. Buscando executores...');
  const executores = await fetchExecutores(idsPa);
  console.log(`   → ${executores.length} executores`);

  const idsExec = [...new Set(executores.map(e => e.id_executor).filter(Boolean))];

  console.log('3. Buscando finalidades e metas em paralelo...');
  const [finalidades, metas] = await Promise.all([
    fetchFinalidades(idsExec),
    fetchMetas(idsExec),
  ]);
  console.log(`   → ${finalidades.length} finalidades, ${metas.length} metas`);

  console.log('4. Buscando objetos do parlamentar (portal backend)...');
  const objMap = await fetchObjetosParlamentar(idsPa);

  // ─── monta registros ───────────────────────────────────────────────────────

  // índices auxiliares
  const finalByExec = {};
  for (const f of finalidades) {
    (finalByExec[f.id_executor] ??= []).push(f);
  }
  const metasByExec = {};
  for (const m of metas) {
    (metasByExec[m.id_executor] ??= []).push(m);
  }

  const kb = executores
    .filter(e => e.id_plano_acao && ptByPa[e.id_plano_acao])
    .map(e => {
      const pt  = ptByPa[e.id_plano_acao] ?? {};
      const inf = objMap[e.id_plano_acao]  ?? {};
      const fs  = (finalByExec[e.id_executor] ?? []).map(f => ({
        tipoCodigo:  f.cd_area_politica_publica_tipo,
        tipoDescricao: f.ds_area_politica_publica_tipo,
        areaCodigo:  f.cd_area_politica_publica,
        areaDescricao: f.ds_area_politica_publica,
      }));
      const ms  = (metasByExec[e.id_executor] ?? []).map(m => ({
        descricao:    m.desc_meta,
        quantidade:   m.qt_unidade_meta,
        unidade:      m.un_medida_meta,
        valorUnitario: m.vl_unitario_meta,
        valorTotal:   m.vl_total_meta,
      }));

      return {
        // identificação
        idPlanoAcao:     e.id_plano_acao,
        ano:             ANO,
        nomeParlamentar: inf.nomeParlamentar,
        codigoEmenda:    inf.codigoEmenda,
        // beneficiário
        nomeBeneficiario: inf.nomeBeneficiario,
        cnpjBeneficiario: inf.cnpjBeneficiario,
        // valores
        valorTotal:       inf.valorTotal,
        valorCusteio:     inf.valorCusteio,
        valorInvestimento: inf.valorInvestimento,
        // âncora de similaridade (dois textos complementares)
        objetoParlamentar: inf.objetoParlamentar,    // vem do SIOP via portal
        objetoExecutor:    e.objeto_executor,         // texto livre aprovado
        // executor
        executor: {
          cnpj:  e.cnpj_executor,
          nome:  e.nome_executor,
          contaEspecifica: e.ind_recursos_gerenciados_conta_especifica_executor,
          banco: {
            codigo:  e.codigo_banco_executor,
            nome:    e.nome_banco_executor,
          },
          agencia: {
            numero: e.numero_agencia_executor,
            dv:     e.dv_agencia_executor,
            nome:   e.nome_agencia_executor,
          },
          conta: {
            numero: e.numero_conta_executor,
            dv:     e.dv_conta_executor,
          },
        },
        // plano de trabalho
        classificacaoOrcamentaria: pt.classificacao_orcamentaria_pt,
        prazoMeses:                pt.prazo_execucao_meses_plano_trabalho,
        situacaoPT:                pt.situacao_plano_trabalho,
        // campos IA
        finalidades: fs,
        metas:       ms,
      };
    });

  console.log(`\n5. Montados ${kb.length} registros no KB.`);

  // ─── salva ────────────────────────────────────────────────────────────────

  const outDir  = join(ROOT, 'data');
  const outFile = join(outDir, `kb-${ANO}.json`);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, JSON.stringify(kb, null, 2), 'utf8');

  const estadual = kb.filter(p => p.cnpjBeneficiario === '27080530000143');
  console.log(`\n✅ Salvo em data/kb-${ANO}.json`);
  console.log(`   Total: ${kb.length} planos`);
  console.log(`   Estado ES: ${estadual.length} planos`);
  console.log(`   Municípios: ${kb.length - estadual.length} planos\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
