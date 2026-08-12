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
        // chroma-js ships a CJS default export; without interop the ts-jest
        // CJS transpile reads `.default` as undefined and every hexToHSL*
        // call silently falls back to black.
        tsconfig: { esModuleInterop: true },
      },
    ],
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/__tests__/**'],
  extensionsToTreatAsEsm: ['.ts'],
};

export default config;
