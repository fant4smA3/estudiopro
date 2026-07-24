import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

/* Los módulos de src/proto/ siguen el patrón del prototipo: componentes y helpers
   compartidos vía window.* y React como global. no-undef no aplica ahí (los identificadores
   se resuelven en window en tiempo de ejecución y la prueba de humo monta las 24 pantallas);
   el resto de reglas sí. Los módulos .ts nuevos se revisan completos. */
export default [
  { ignores: ["dist/**", "dev-dist/**", "node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended.map((c) => ({ ...c, files: ["**/*.ts"] })),
  {
    files: ["**/*.{js,jsx,ts,mjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      // el prototipo omite dependencias a propósito (suscripciones manuales al store)
      "react-hooks/exhaustive-deps": "off",
      "no-unused-vars": ["warn", { args: "none", varsIgnorePattern: "^_" }],
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    files: ["src/**/*.jsx"],
    rules: {
      // componentes/helpers compartidos vía window.* (patrón del prototipo)
      "no-undef": "off",
    },
  },
  {
    files: ["src/**/*.test.*"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: { "no-undef": "off" },
  },
];
