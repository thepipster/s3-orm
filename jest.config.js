/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json'
    }],
    '^.+\\.js$': 'babel-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(chai|callsites|colorts)/)'
  ],
  testMatch: ['**/test/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/lib/$1'
  }
};
