const base = require('./jest.config');
module.exports = {
  ...base,
  transform: { '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: { jsx: 'react-jsx', esModuleInterop: true, isolatedModules: true } }] },
  testMatch: ['<rootDir>/__tests__/snapPixel.test.tsx'],
};
