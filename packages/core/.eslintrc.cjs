module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { es2022: true, node: true },
  ignorePatterns: ['dist', 'node_modules'],
  rules: {
    // Rules are pure: time is passed in, nothing is random.
    'no-restricted-properties': [
      'error',
      { object: 'Date', property: 'now', message: 'Pass time in; rules never read the clock.' },
      { object: 'Math', property: 'random', message: 'Rules are deterministic.' },
    ],
    'no-restricted-syntax': [
      'error',
      {
        selector: "NewExpression[callee.name='Date'][arguments.length=0]",
        message: 'Pass time in; rules never read the clock.',
      },
    ],
  },
};
