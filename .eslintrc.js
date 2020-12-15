module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'prettier',
    'prettier/@typescript-eslint',
    'prettier/babel',
    'prettier/flowtype',
    'prettier/prettier'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import'],
  parserOptions: {
    project: 'tsconfig.json',
    ecmaVersion: 8,
    sourceType: 'module'
  },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './'
      }
    }
  },
  rules: {
    'import/no-unresolved': 'error',
    'import/no-deprecated': 'warn',
    'import/no-duplicates': 'error',
    'no-restricted-imports': ['error'],
    'import/namespace': 'off',
    'import/order': [
      'error',
      {
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc'
        }
      }
    ],
    'jsdoc/no-types': 0
  }
};
