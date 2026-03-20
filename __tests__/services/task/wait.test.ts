/**
 * @file wait.test.ts
 * @description 测试任务等待执行完成相关函数
 */

import {
  waitForExecutionCompletion,
  waitForExecutionInterrupt,
  waitForExecutionStart,
  WaitForExecutionOptions,
} from '../../../src/services/task/wait.js';
import { ComfyClient } from '../../../src/utils/ws.js';

jest.mock('../../../src/utils/ws.js', () => ({
  ComfyClient: jest.fn().mockImplementation(() => ({
    hook: {
      onExecutionStart: jest.fn(),
      onNodeExecuting: jest.fn(),
      onProgress: jest.fn(),
      onExecuted: jest.fn(),
      onExecutionSuccess: jest.fn(),
      onExecutionError: jest.fn(),
      onExecutionInterrupted: jest.fn(),
    },
  })),
}));

describe('wait', () => {
  let mockClient: jest.Mocked<ComfyClient>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockClient = new ComfyClient() as jest.Mocked<ComfyClient>;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('waitForExecutionCompletion()', () => {
    it('should resolve with success when execution succeeds', async () => {
      const options: WaitForExecutionOptions = {
        client: mockClient,
        promptId: 'test-prompt-123',
        timeout: 10000,
      };

      const promise = waitForExecutionCompletion(options);

      mockClient.hook.onExecutionSuccess({
        prompt_id: 'test-prompt-123',
        timestamp: Date.now(),
      });

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.promptId).toBe('test-prompt-123');
    });

    it('should resolve with error when execution fails', async () => {
      const options: WaitForExecutionOptions = {
        client: mockClient,
        promptId: 'test-prompt-123',
      };

      const promise = waitForExecutionCompletion(options);

      mockClient.hook.onExecutionError({
        prompt_id: 'test-prompt-123',
        timestamp: Date.now(),
        exception_message: 'Node execution failed',
      });

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toBe('Node execution failed');
    });

    it('should timeout when execution takes too long', async () => {
      const options: WaitForExecutionOptions = {
        client: mockClient,
        promptId: 'test-prompt-123',
        timeout: 5000,
      };

      const promise = waitForExecutionCompletion(options);

      jest.advanceTimersByTime(5001);

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('超时');
    });

    it('should ignore events with different prompt_id', async () => {
      const options: WaitForExecutionOptions = {
        client: mockClient,
        promptId: 'test-prompt-123',
        timeout: 1000,
      };

      const promise = waitForExecutionCompletion(options);

      mockClient.hook.onExecutionSuccess({
        prompt_id: 'different-prompt',
        timestamp: Date.now(),
      });

      jest.advanceTimersByTime(1001);

      const result = await promise;
      expect(result.success).toBe(false);
    });

    it('should call onProgress callback with execution progress', async () => {
      const onProgress = jest.fn();
      const options: WaitForExecutionOptions = {
        client: mockClient,
        promptId: 'test-prompt-123',
        onProgress,
      };

      const promise = waitForExecutionCompletion(options);

      mockClient.hook.onExecutionStart({
        prompt_id: 'test-prompt-123',
        timestamp: Date.now(),
      });

      mockClient.hook.onExecutionSuccess({
        prompt_id: 'test-prompt-123',
        timestamp: Date.now(),
      });

      await promise;

      expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
        stage: 'starting',
      }));
    });
  });

  describe('waitForExecutionInterrupt()', () => {
    it('should resolve with success when interrupted', async () => {
      const options: WaitForExecutionOptions = {
        client: mockClient,
        promptId: 'test-prompt-123',
        timeout: 20000,
      };

      const promise = waitForExecutionInterrupt(options);

      mockClient.hook.onExecutionInterrupted({
        prompt_id: 'test-prompt-123',
        timestamp: Date.now(),
      });

      const result = await promise;

      expect(result.success).toBe(true);
    });

    it('should timeout when no interrupt received', async () => {
      const options: WaitForExecutionOptions = {
        client: mockClient,
        promptId: 'test-prompt-123',
        timeout: 5000,
      };

      const promise = waitForExecutionInterrupt(options);

      jest.advanceTimersByTime(5001);

      const result = await promise;

      expect(result.success).toBe(false);
    });
  });

  describe('waitForExecutionStart()', () => {
    it('should resolve with success when execution starts', async () => {
      const options: WaitForExecutionOptions = {
        client: mockClient,
        promptId: 'test-prompt-123',
        timeout: 20000,
      };

      const promise = waitForExecutionStart(options);

      mockClient.hook.onExecutionStart({
        prompt_id: 'test-prompt-123',
        timestamp: Date.now(),
      });

      const result = await promise;

      expect(result.success).toBe(true);
    });

    it('should timeout when execution does not start', async () => {
      const options: WaitForExecutionOptions = {
        client: mockClient,
        promptId: 'test-prompt-123',
        timeout: 5000,
      };

      const promise = waitForExecutionStart(options);

      jest.advanceTimersByTime(5001);

      const result = await promise;

      expect(result.success).toBe(false);
    });
  });
});
