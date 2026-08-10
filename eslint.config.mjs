import js from "@eslint/js";
import tseslint from "typescript-eslint";

// Phase D cleanup pass landed: the transitional relaxations named in the
// production-readiness plan (no-explicit-any in src/, preserve-caught-error,
// no-useless-assignment, unused reference constants in the generators) are
// fixed and fully enforced. Everything not listed here is enforced too.
export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "coverage/**",
      "node_modules/**",
      // Generated operation manifests; regenerate, never lint-fix.
      "src/operations/**"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true
        }
      ],
      // src/ and unit tests carry zero explicit any. tests/e2e still has
      // deliberate `any` casts on dynamic REST fixtures; those converge in a
      // later pass (plan D3), so they warn instead of erroring.
      "@typescript-eslint/no-explicit-any": "error"
    }
  },
  {
    files: ["tests/e2e/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      // E2E fixtures deliberately re-throw inside finally to fail the run
      // after best-effort cleanup.
      "no-unsafe-finally": "off"
    }
  },
  {
    files: ["**/*.mjs"],
    rules: {
      // Plain-JS Node scripts are not type-checked; Node globals (fetch,
      // AbortSignal, structuredClone, ...) vary by Node version, so no-undef
      // here would duplicate the runtime's own checks with a stale list.
      "no-undef": "off"
    }
  }
);
