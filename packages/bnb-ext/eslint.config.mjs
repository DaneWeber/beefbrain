import eslint from '@eslint/js'
import prettier from 'eslint-config-prettier'
import unusedImports from 'eslint-plugin-unused-imports'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'out/**',
      'coverage/**',
      'node_modules/**',
      '.vscode-test/**',
      '.vscode-test.js',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: globals.node,
    },
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
    },
  },
  {
    files: ['src/test/**/*.ts'],
    languageOptions: {
      globals: globals.mocha,
    },
  },
  prettier,
)
