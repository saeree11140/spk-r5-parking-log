import js from "@eslint/js";
import pluginRouter from "@tanstack/eslint-plugin-router";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  globalIgnores([
    "dist/**",
    "coverage/**",
    "src/routeTree.gen.ts",
    // Leftover Next.js build output from before the Vite migration.
    ".next/**",
    "out/**",
  ]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  ...pluginRouter.configs["flat/recommended"],
  {
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ["*.config.{js,mjs,ts,mts}"],
    languageOptions: {
      globals: globals.node,
    },
  },
]);

export default eslintConfig;
