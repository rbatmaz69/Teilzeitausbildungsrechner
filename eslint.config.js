// ESLint 9 Config für Browser-JavaScript
// Nutzt empfohlene Regeln + Browser-Umgebung
import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,  // Standard-Regeln von ESLint
  {
    files: ["static/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser  // Alle Browser-APIs (window, document, etc.)
    },
    rules: {
      "no-unused-vars": "warn"  // Warnung statt Error
    }
  }
];
