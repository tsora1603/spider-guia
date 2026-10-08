import tseslint from 'typescript-eslint';

const commonRules = {
  eqeqeq: ['error', 'always', { null: 'ignore' }],
  'no-constant-binary-expression': 'error',
  'no-redeclare': 'error',
  'no-unreachable': 'error',
  'no-unused-vars': [
    'warn',
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^(E)$'
    }
  ]
};

export default [
  {
    ignores: ['dist/**', 'playwright-report/**', 'test-results/**']
  },
  {
    files: ['public/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script'
    },
    rules: commonRules
  },
  {
    files: ['scripts/**/*.mjs', 'vite.config.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    rules: commonRules
  },
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.ts', '*.config.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true }
      }
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin
    },
    rules: {
      ...commonRules,
      'no-unused-vars': 'off',
      'no-redeclare': 'off',
      '@typescript-eslint/no-redeclare': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^(E)$'
        }
      ]
    }
  }
];
