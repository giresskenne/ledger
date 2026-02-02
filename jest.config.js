/**
 * Jest config for lightweight unit tests of pure stores/utilities (no RN runtime).
 * Keeps tests fast and focused on business logic like contributions and dedupe.
 */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.[jt]s?(x)'],
};

