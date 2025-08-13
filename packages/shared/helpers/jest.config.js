/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  moduleNameMapper: {
    '^@usertour/(.*)$': '<rootDir>/../$1/src',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/__tests__/**'],
  extensionsToTreatAsEsm: ['.ts'],
  transformIgnorePatterns: ['node_modules/(?!(@usertour)/)'],
};

export default config;
