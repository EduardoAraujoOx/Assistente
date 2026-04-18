#!/usr/bin/env node
/**
 * scripts/validate.mjs
 *
 * Backtesting: usa KB do ano N como "treinamento" e compara predições
 * com os planos realmente aprovados no ano N+1 (gabarito).
 *
 * Foco: entes ESTADUAIS do ES (e opcionalmente municipais como sanidade).
 *
 * Uso:
 *   node scripts/validate.mjs               # treino=2025, gabarito=2026
 *   node scripts/validate.mjs 2024 2025     # treino=2024, gabarito=2025
 *   node scripts/validate.mjs --all         # inclui municípios além do estado
 *
 * Requer:
 *   - data/kb-{treino}.json  (gerado por build-kb.mjs)
 *   - data/kb-{gabarito}.json (gerado por build-kb.mjs --ano={gabarito})
 *   - GEMINI_API_KEY no ambiente (para as predições via Gemini)
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

const CNPJ_ESTADO_ES = '27080530000143';
const GEMINI_KEY     = process.env.GEMINI_API_KEY;
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

const args        = process.argv.slice(2);
const incluirMun  = args.includes('--all');
const anoTreino   = Number(args.find(a => /^\d{4}$/.test(a) && args.indexOf(a) === args.findIndex(x => /^\d{4}$/.test(x)))) || 2025;
const anoGabarito = Number(args.find(a => /^\d{4}$/.test(a) && args.indexOf(a) !== args.findIndex(x => /^\d{4}$/.test(x)))) || anoTreino + 1;

// ─── utilidades ─────────────────────────────────────────────────────────────

const STOP_PT = new Set([
  'de','da','do','das','dos','para','em','com','a','o','e','por',
  'na','no','nas','nos','um','uma','ao','à','as','os','que','se',
]);

function tokenize(text) {
  return (text || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(/\W+/)
    .filter(w => w.length > 3 && !STOP_PT.has(w));
}

function similarity(a, b) {
  const ta = tokenize(a);
  const tb = new Set(tokenize(b));
  if (!ta.length || !tb.size) return 0;
  const inter = ta.filter(w => tb.has(w)).length;
  return inter / Math.sqrt(ta.length * tb.size);
}

function loadKb(ano) {
  const path = join(ROOT, 'data', `kb-${ano}.json`);
  try   { return JSON.parse(readFileSync(path, 'utf8')); }
  catch { return null; }
}

function topSimilar(kb, query, n = 3) {
  return kb
    .map(p => ({
      ...p,
      _score: similarity(
        query,
        `${p.objetoParlamentar ?? ''} ${p.objetoExecutor ?? ''}`
      ),
    }))
    .filter(p => p._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, n);
}

// ─── predição via Gemini ─────────────────────────────────────────────────────

function buildPrompt(planoAtual, exemplos) {
  const exStr = exemplos.map((ex, i) => `
Exemplo ${i + 1} (aprovado ${ex.ano}):
  Objeto parlamentar: ${ex.objetoParlamentar ?? 'n/d'}
  Objeto executor: ${ex.objetoExecutor ?? 'n/d'}
  Executor: ${ex.executor?.cnpj} — ${ex.executor?.nome}
  Banco: ${ex.executor?.banco?.codigo} — ${ex.executor?.banco?.nome}
  Agência: ${ex.executor?.agencia?.numero}
  Conta específica: ${ex.executor?.contaEspecifica ? 'Sim' : 'Não'}
  Classificação orçamentária: ${ex.classificacaoOrcamentaria ?? 'n/d'}
  Prazo (meses): ${ex.prazoMeses ?? 'n/d'}
  Finalidades: ${(ex.finalidades ?? []).map(f => `${f.tipoCodigo}/${f.areaCodigo} — ${f.tipoDescricao}/${f.areaDescricao}`).join('; ') || 'n/d'}
  Metas: ${(ex.metas ?? []).map(m => `${m.descricao} | ${m.quantidade} ${m.unidade} | R$ ${m.valorTotal}`).join(' // ') || 'n/d'}
`).join('');

  return `Você é especialista em Transferências Especiais EC 105/2019.

Com base nos exemplos de planos de trabalho já APROVADOS pelo ministério abaixo,
preencha os campos para o novo plano.

${exStr}

PLANO A PREENCHER:
  Beneficiário: ${planoAtual.nomeBeneficiario} (${planoAtual.cnpjBeneficiario})
  Objeto do parlamentar: ${planoAtual.objetoParlamentar ?? 'n/d'}
  Valor total: R$ ${planoAtual.valorTotal ?? 'n/d'}

REGRAS:
- Se os exemplos mostram o mesmo executor em todos os casos, USE ESSE EXECUTOR EXATAMENTE.
- Escolha a finalidade mais coerente com o objeto (prefira a finalidade dos exemplos).
- O prazoMeses deve refletir a escala do projeto; nunca invente valores fora do contexto dos exemplos.

Responda SOMENTE com JSON válido, sem markdown:
{
  "executorCnpj": "CNPJ do executor mais provável",
  "executorNome": "nome do executor",
  "bancoCodigo": "código do banco",
  "bancoNome": "nome do banco",
  "agenciaNumero": "número da agência",
  "contaEspecifica": true ou false,
  "classificacaoOrcamentaria": "texto completo da classificação",
  "prazoMeses": número inteiro,
  "finalidade": "TipoCod/AreaCod — TipoDesc/AreaDesc",
  "metas": [{ "descricao": "...", "quantidade": 0, "unidade": "..." }],
  "detalhamentoObjeto": "3 a 5 linhas descrevendo o objeto com base nos exemplos"
}`;
}

async function predict(planoAtual, exemplos) {
  if (!GEMINI_KEY) throw new Error('GEMINI_API_KEY não definida no ambiente.');
  const prompt = buildPrompt(planoAtual, exemplos);
  const r = await fetch(GEMINI_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1200 },
    }),
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}`);
  const d = await r.json();
  const raw = d.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

// ─── métricas ────────────────────────────────────────────────────────────────

function normalCnpj(s) { return (s ?? '').replace(/\D/g, ''); }
function normalText(s)  { return (s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); }

function scoreField(campo, predito, real) {
  if (predito == null || real == null) return { campo, ok: null, nota: 'sem dado' };

  switch (campo) {
    case 'executorCnpj':
      return { campo, ok: normalCnpj(predito) === normalCnpj(real), predito, real };

    case 'bancoCodigo':
      return { campo, ok: String(predito) === String(real), predito, real };

    case 'agenciaNumero':
      return { campo, ok: String(predito) === String(real), predito, real };

    case 'prazoMeses':
      return { campo, ok: Number(predito) === Number(real), predito, real };

    case 'contaEspecifica':
      return { campo, ok: Boolean(predito) === Boolean(real), predito, real };

    case 'classificacaoOrcamentaria': {
      // similaridade de texto (aceitamos 0.4+)
      const s = similarity(String(predito), String(real));
      return { campo, ok: s >= 0.4, score: s.toFixed(2), predito: String(predito).slice(0, 80), real: String(real).slice(0, 80) };
    }

    case 'finalidade': {
      const s = similarity(String(predito), String(real));
      return { campo, ok: s >= 0.3, score: s.toFixed(2), predito: String(predito).slice(0, 80), real: String(real).slice(0, 80) };
    }

    default:
      return { campo, ok: null, nota: 'sem critério' };
  }
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔬 validate.mjs — treino=${anoTreino} | gabarito=${anoGabarito} | estado${incluirMun ? '+municípios' : ' apenas'}\n`);

  const kbTreino   = loadKb(anoTreino);
  const kbGabarito = loadKb(anoGabarito);

  if (!kbTreino)   { console.error(`❌ data/kb-${anoTreino}.json não encontrado. Rode: node scripts/build-kb.mjs ${anoTreino}`); process.exit(1); }
  if (!kbGabarito) { console.error(`❌ data/kb-${anoGabarito}.json não encontrado. Rode: node scripts/build-kb.mjs ${anoGabarito}`); process.exit(1); }

  // Filtra gabarito por tipo de ente
  const gabarito = kbGabarito.filter(p =>
    incluirMun
      ? true
      : p.cnpjBeneficiario === CNPJ_ESTADO_ES
  );

  if (!gabarito.length) {
    console.log(`⚠️  Nenhum plano do Estado ES encontrado em kb-${anoGabarito}.json.`);
    console.log('   Verifique se o PostgREST já sincronizou os status "APROVADO".');
    console.log('   Use --all para incluir municípios como sanidade.\n');
    process.exit(0);
  }

  console.log(`Gabarito: ${gabarito.length} plano(s) — treino: ${kbTreino.length} plano(s)\n`);

  const resultados = [];

  for (const real of gabarito) {
    const queryTexto = `${real.objetoParlamentar ?? ''} ${real.objetoExecutor ?? ''}`;

    // Remove o próprio plano do conjunto de treino (evita data leakage)
    const kbSemEle = kbTreino.filter(p => p.idPlanoAcao !== real.idPlanoAcao);
    const exemplos = topSimilar(kbSemEle, queryTexto, 3);

    console.log(`▶ Plano ${real.idPlanoAcao} | ${real.nomeBeneficiario}`);
    console.log(`  Objeto: ${(real.objetoParlamentar ?? '').slice(0, 80)}`);
    console.log(`  Exemplos similares no treino: ${exemplos.length}`);

    let predito;
    try {
      predito = await predict(real, exemplos);
    } catch (e) {
      console.log(`  ⚠️  Gemini falhou: ${e.message}\n`);
      resultados.push({ idPlanoAcao: real.idPlanoAcao, erro: e.message });
      continue;
    }

    // Prepara real para comparação
    const realFinalidade = real.finalidades?.[0]
      ? `${real.finalidades[0].tipoCodigo}/${real.finalidades[0].areaCodigo} — ${real.finalidades[0].tipoDescricao}/${real.finalidades[0].areaDescricao}`
      : null;

    const campos = [
      scoreField('executorCnpj',            predito.executorCnpj,            real.executor?.cnpj),
      scoreField('bancoCodigo',             predito.bancoCodigo,             real.executor?.banco?.codigo),
      scoreField('agenciaNumero',           predito.agenciaNumero,           real.executor?.agencia?.numero),
      scoreField('contaEspecifica',         predito.contaEspecifica,         real.executor?.contaEspecifica),
      scoreField('prazoMeses',              predito.prazoMeses,              real.prazoMeses),
      scoreField('classificacaoOrcamentaria', predito.classificacaoOrcamentaria, real.classificacaoOrcamentaria),
      scoreField('finalidade',              predito.finalidade,              realFinalidade),
    ];

    campos.forEach(c => {
      const ok = c.ok === null ? '?' : c.ok ? '✓' : '✗';
      const detalhe = c.score ? `(sim=${c.score})` : '';
      console.log(`  ${ok} ${c.campo.padEnd(28)} pred: ${String(c.predito ?? '').slice(0,40)}  real: ${String(c.real ?? '').slice(0,40)} ${detalhe}`);
    });

    const scored = campos.filter(c => c.ok !== null);
    const acertos = scored.filter(c => c.ok).length;
    const taxa = scored.length ? (acertos / scored.length * 100).toFixed(0) : '?';
    console.log(`  → Acurácia geral: ${acertos}/${scored.length} (${taxa}%)\n`);

    resultados.push({ idPlanoAcao: real.idPlanoAcao, beneficiario: real.nomeBeneficiario, campos, acertos, total: scored.length });
  }

  // ─── resumo agregado ──────────────────────────────────────────────────────
  const validos = resultados.filter(r => r.campos);
  if (validos.length) {
    console.log('═══════════════════════════════════════════');
    console.log('RESUMO POR CAMPO\n');

    const camposNomes = ['executorCnpj','bancoCodigo','agenciaNumero','contaEspecifica','prazoMeses','classificacaoOrcamentaria','finalidade'];
    for (const nome of camposNomes) {
      const todos    = validos.flatMap(r => r.campos.filter(c => c.campo === nome));
      const scored   = todos.filter(c => c.ok !== null);
      const acertos  = scored.filter(c => c.ok).length;
      const pct      = scored.length ? (acertos / scored.length * 100).toFixed(0) : '?';
      const bar      = '█'.repeat(Math.round(Number(pct) / 10));
      console.log(`  ${nome.padEnd(28)} ${String(acertos + '/' + scored.length).padEnd(6)} ${bar} ${pct}%`);
    }

    const totalAcertos = validos.reduce((s, r) => s + r.acertos, 0);
    const totalPossivel = validos.reduce((s, r) => s + r.total, 0);
    console.log(`\n  TOTAL: ${totalAcertos}/${totalPossivel} (${(totalAcertos/totalPossivel*100).toFixed(0)}%)`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
