import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          "blue-dark2": "#071D41",
          "blue-dark1": "#0C326F",
          "blue":       "#1351B4",
          "blue-light": "#2670E8",
          "blue-pale":  "#E8F0FB",
          "yellow":     "#FFCD07",
          "green":      "#168821",
          "red":        "#E52207",
        },
        n: {
          1: "#F8F8F8",
          2: "#EDEDED",
          3: "#CCCCCC",
          4: "#888888",
          5: "#333333",
          6: "#1B1B1B",
        },
      },
      fontFamily: {
        sans: ["Roboto", "sans-serif"],
        mono: ["Roboto Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
