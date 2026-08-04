import js from '@eslint/js'
import prettier from '@vue/eslint-config-prettier'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'

const tsRecommended = tseslint.configs.recommended.map((config) => ({
  ...config,
  files: ['**/*.ts'],
}))

const browserGlobals = {
  Event: 'readonly',
  HTMLInputElement: 'readonly',
  HTMLElement: 'readonly',
  MouseEvent: 'readonly',
  document: 'readonly',
  window: 'readonly',
}

const nodeGlobals = {
  process: 'readonly',
}

export default [
  {
    name: 'app/files-to-ignore',
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  ...tsRecommended,
  {
    files: ['src/**/*.{ts,vue}'],
    languageOptions: {
      globals: browserGlobals,
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: nodeGlobals,
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  prettier,
]
