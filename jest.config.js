/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          target: 'ES2022',
          module: 'commonjs',
          moduleResolution: 'node',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: true,
        },
      },
    ],
  },
  // 只收集核心模块的覆盖率
  collectCoverageFrom: [
    'src/types/result.ts',
    'src/types/enums/result.ts',
    'src/utils/special-node-handler.ts',
    'src/utils/mcp-helpers.ts',
    'src/services/task/execution.ts',
    'src/services/task/wait.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 50,
      functions: 80,
      lines: 80,
    },
  },
  coverageReporters: ['text', 'text-summary'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  clearMocks: true,
  restoreMocks: true,
  verbose: true,
};
