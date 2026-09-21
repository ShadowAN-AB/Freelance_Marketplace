module.exports = {
  env: { node: true, es2022: true, mocha: true },
  extends: ['eslint:recommended'],
  ignorePatterns: ['node_modules/', 'uploads/'],
  parserOptions: { ecmaVersion: 2022 },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'off',
  },
};
