export default {
  testEnvironment: 'node',
  transform: {
    '^.+\\.jsx?$': ['@swc/jest', {
      jsc: {
        parser: {
          syntax: 'ecmascript',
          dynamicImport: true,
        },
        target: 'es2022',
      },
    }],
  },
  moduleFileExtensions: ['js', 'json'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: ['src/**/*.js', '!src/index.js'],
}