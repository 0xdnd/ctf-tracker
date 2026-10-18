import { config } from "@remotion/eslint-config-flat";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/out/**",
      "**/build/**",
      "eslint.config.mjs",
      "remotion.config.ts",
    ],
  },
  // Filter out buggy duplicate typescript-eslint/eslint-recommended blocks that freeze ESLint 9 on Windows
  ...config.filter((c) => c.name !== "typescript-eslint/eslint-recommended"),
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "no-var": "error",
      "prefer-const": "error",
      "prefer-rest-params": "error",
      "prefer-spread": "error",
    },
  },
];
