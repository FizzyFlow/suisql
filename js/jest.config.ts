import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  verbose: true,
  testMatch: ['**/*.test.ts', '**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js'],
  collectCoverage: true,
  coverageReporters: ['json-summary', 'text', 'lcov'],
  collectCoverageFrom: ['./src/**'],
};

export default config;