import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import boundaries from "eslint-plugin-boundaries";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "deprecated/**", // 레거시 파일 제외
    ],
  },
  {
    plugins: {
      boundaries,
    },
    settings: {
      "boundaries/elements": [
        {
          type: "app",
          pattern: "app/**",
        },
        {
          type: "use-cases",
          pattern: "lib/use-cases/**",
        },
        {
          type: "domain",
          pattern: "lib/domain/**",
        },
        {
          type: "infrastructure",
          pattern: "lib/repositories/**",
        },
        {
          type: "services",
          pattern: "lib/services/**",
        },
      ],
    },
    rules: {
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            {
              from: "app",
              allow: ["use-cases"], // UI는 Use Case만 호출 가능
            },
            {
              from: "use-cases",
              allow: ["domain", "infrastructure", "services"], // Use Case는 Domain/Infrastructure 호출 가능
            },
            {
              from: "domain",
              allow: [], // Domain은 다른 레이어 호출 불가 (순수 로직만)
            },
            {
              from: "infrastructure",
              allow: ["domain"], // Repository는 Domain 모델 사용 가능
            },
            {
              from: "services",
              allow: ["domain"], // Service는 Domain 모델 사용 가능
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
