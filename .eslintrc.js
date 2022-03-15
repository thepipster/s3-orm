module.exports = {
    root: true,
    env: {
      node: true
    },
    extends: [
      'eslint:recommended'
    ],
    parserOptions: {
      parser: 'babel-eslint'
    },
    rules: {
      'no-undef': 'off',
      "no-mixed-spaces-and-tabs": 0,
      "no-unused-vars": process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off'
    }
  }
  