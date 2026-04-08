import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // ---------------------------------------------------------------------
  // Strict modern TypeScript rules — see CLAUDE.md "TypeScript conventions"
  // ---------------------------------------------------------------------
  // Most of these are type-aware and require parserOptions.projectService.
  // Scoped to src/** so generated/config files (next.config.ts etc.) aren't
  // forced to satisfy the same rules.
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Force `import type` for type-only imports (works with verbatimModuleSyntax).
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports", prefer: "type-imports" },
      ],

      // Ban escape hatches.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",

      // Promise hygiene — every promise must be awaited or .catch'd.
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",

      // Stylistic / consistency.
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      "@typescript-eslint/array-type": ["error", { default: "array" }],
      "@typescript-eslint/prefer-as-const": "error",

      // Exhaustive switch statements over discriminated unions.
      "@typescript-eslint/switch-exhaustiveness-check": [
        "error",
        { considerDefaultExhaustiveForUnions: true },
      ],

      // Catches dead code paths after refactors.
      "@typescript-eslint/no-unnecessary-condition": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",

      // Ban TS enum declarations entirely — use `as const` objects or
      // string-literal unions instead.
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSEnumDeclaration",
          message:
            "Use `as const` objects or string-literal unions instead of enums.",
        },
      ],
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vitest v8 coverage output — generated, never linted.
    "coverage/**",
  ]),
]);

export default eslintConfig;
