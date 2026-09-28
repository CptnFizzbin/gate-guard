import js from "@eslint/js"
import stylistic from "@stylistic/eslint-plugin"
import { defineConfig, globalIgnores } from "eslint/config"
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript"
import checkFile from "eslint-plugin-check-file"
import { importX } from "eslint-plugin-import-x"
import globals from "globals"
import tseslint from "typescript-eslint"

export default defineConfig([
  globalIgnores([
    "**/target/",
    "**/dist/",
    "**/.docusaurus",
  ]),
  tseslint.configs.recommended,
  js.configs.recommended,
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  stylistic.configs.customize({
    indent: 2,
    quotes: "double",
    semi: false,
    jsx: true,
    arrowParens: true,
    braceStyle: "1tbs",
  }),
  {
    plugins: {
      "check-file": checkFile,
    },
    languageOptions: {
      // TODO: remove the __APP_VERSION__ global - nothing in this repo defines or reads it
      globals: { ...globals.browser, __APP_VERSION__: "readonly" },
      parserOptions: {
        projectService: true,
      },
    },
    settings: {
      "import-x/resolver-next": [createTypeScriptImportResolver()],
      "react": {
        // TODO: switch back to "detect" once eslint-plugin-react supports ESLint 10;
        // "detect" calls context.getFilename(), which ESLint 10 removed.
        version: "19.0",
      },
    },
    rules: {
      ...{ // eslint-plugin-check-file rules
        "check-file/filename-naming-convention": [
          "error",
          {
            "**/*.{ts,tsx}": "CAMEL_CASE",
          },
          {
            ignoreMiddleExtensions: true,
          },
        ],
      },

      ...{ // builtin eslint rules
        "default-case": "error",
        "default-case-last": "error",
        "eqeqeq": ["error", "always"],
        "max-classes-per-file": ["error", 1],
        "max-depth": ["error", 4],
        "no-undef": "off",
        "no-eval": "error",
        "no-inner-declarations": "error",
        "no-restricted-syntax": [
          "error",
          {
            selector: "TSAsExpression > TSAsExpression[typeAnnotation.type=\"TSUnknownKeyword\"]",
            message:
              "Do not use \"as unknown as T\" (double type assertion) — it bypasses structural checks entirely. "
              + "See AGENTS.md § Type assertions for alternatives.",
          },
        ],
        "no-shadow": "error",
        "no-unused-vars": "off",
        "require-await": "error",
        "unicode-bom": ["error", "never"],
      },

      ...{ // @typescript-eslint rules
        "@typescript-eslint/consistent-type-exports": "error",
        "@typescript-eslint/consistent-type-imports": "error",
        "@typescript-eslint/no-empty-object-type": "off",
        "@typescript-eslint/no-unused-vars": ["error", {
          ignoreRestSiblings: true,
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        }],
        "@typescript-eslint/switch-exhaustiveness-check": ["error", {
          allowDefaultCaseForExhaustiveSwitch: true,
          considerDefaultExhaustiveForUnions: true,
          requireDefaultForNonUnion: true,
        }],

        // conflicts with TypeScript's function overloads
        "no-redeclare": "off",
        "default-case": "off",
      },

      ...{ // eslint-plugin-import-x rules
        "import-x/consistent-type-specifier-style": ["error", "prefer-top-level"],
        "import-x/default": "off",
        "import-x/extensions": ["error", "ignorePackages", { fix: true }],
        "import-x/no-cycle": "error",
        "import-x/no-named-as-default-member": "off",
        "import-x/first": "error",
        "import-x/newline-after-import": "error",
        "import-x/no-duplicates": "error",
        "import-x/order": [
          "error",
          {
            "pathGroups": [
              {
                pattern: "(#/**|#*/**)",
                group: "internal",
              },
            ],
            "groups": [
              "builtin",
              "external",
              "internal",
              ["parent", "sibling"],
              "index",
            ],
            "newlines-between": "always",
            "distinctGroup": true,
            "alphabetize": {
              order: "asc",
              orderImportKind: "asc",
            },
          },
        ],
      },

      ...{ // eslint-plugin-react rules
        "react/no-children-prop": "off",
        "react/no-unescaped-entities": "off",
        "react/react-in-jsx-scope": "off",
      },

      ...{ // @stylistic rules
        "@stylistic/jsx-one-expression-per-line": "off",
        "@stylistic/operator-linebreak": [
          "error", "before", {
            overrides: {
              "=": "after",
              "+=": "after",
              "-=": "after",
              "*=": "after",
            },
          }],
      },
    },
  },
  {
    files: [
      "src/routes/**",
      "src/data/migrations/**",
    ],
    rules: {
      "check-file/filename-naming-convention": "off",
    },
  },
  {
    files: [
      "scripts/**/*",
    ],
    rules: {
      "check-file/filename-naming-convention": "off",
    },
  },
  {
    files: [
      "./env.node.ts",
      "./vite.config.ts",
      "./vitest.config.ts",
      "./eslint.config.ts",
    ],
    languageOptions: {
      globals: globals.node,
    },
  },
])
