/**
 * @file execution.test.ts
 * @description 测试任务执行相关函数
 * 
 * 【分支覆盖分析】
 * 
 * executeWorkflowTaskByPrompts():
 * 1. 正常路径: clientId 存在，成功调用 api.prompt
 * 2. 异常路径: clientId 为空字符串
 * 3. 异常路径: clientId 为 undefined
 * 4. 异常路径: clientId 为 null
 * 5. 边界: api.prompt 抛出错误
 * 
 * executeCustomWorkflowTaskByPrompts():
 * 1. 正常路径: clientId 存在，成功调用 api.prompt
 * 2. 异常路径: clientId 为空/undefined/null
 * 3. 边界: api.prompt 抛出错误
 * 
 * 【Mock 策略】
 * - api.prompt: Mock 返回成功或抛出错误
 */

import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import {
  executeWorkflowTaskByPrompts,
  executeCustomWorkflowTaskByPrompts,
  ExecuteTaskOptions,
} from '../../../src/services/task/execution';
import { api } from '../../../src/api/api';
import { ExecutePromptResult } from '../../../src/types/execute';

// Mock api module
jest.mock('../../../src/api/api', () => ({
  api: {
    prompt: jest.fn(),
  },
}));

describe('execution', () => {
  const mockPromptResult: ExecutePromptResult = {
    prompt_id: 'test-prompt-123',
    number: 1,
    node_errors: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('executeWorkflowTaskByPrompts()', () => {
    it('should execute workflow when clientId is provided', async () => {
      (api.prompt as jest.Mock).mockResolvedValue(mockPromptResult);

      const options: ExecuteTaskOptions = {
        prompts: {
          '1': { inputs: { text: 'test' }, class_type: 'CLIPTextEncode' },
        },
        clientId: 'client-123',
      };

      const result = await executeWorkflowTaskByPrompts(options);

      expect(api.prompt).toHaveBeenCalledWith({
        client_id: 'client-123',
        prompt: options.prompts,
      });
      expect(result).toEqual(mockPromptResult);
    });

    it('should throw McpError when clientId is empty string', async () => {
      const options: ExecuteTaskOptions = {
        prompts: {},
        clientId: '',
      };

      await expect(executeWorkflowTaskByPrompts(options)).rejects.toThrow(McpError);
      await expect(executeWorkflowTaskByPrompts(options)).rejects.toThrow(
        '不存在WS客户端ID，请检查是否正确连接WS服务器',
      );
    });

    it('should throw McpError when clientId is undefined', async () => {
      const options: ExecuteTaskOptions = {
        prompts: {},
        clientId: undefined as any,
      };

      await expect(executeWorkflowTaskByPrompts(options)).rejects.toThrow(McpError);
    });

    it('should throw McpError when clientId is null', async () => {
      const options: ExecuteTaskOptions = {
        prompts: {},
        clientId: null as any,
      };

      await expect(executeWorkflowTaskByPrompts(options)).rejects.toThrow(McpError);
    });

    it('should throw McpError with correct error code', async () => {
      const options: ExecuteTaskOptions = {
        prompts: {},
        clientId: '',
      };

      try {
        await executeWorkflowTaskByPrompts(options);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(ErrorCode.InternalError);
      }
    });

    it('should propagate api error', async () => {
      const apiError = new Error('Network error');
      (api.prompt as jest.Mock).mockRejectedValue(apiError);

      const options: ExecuteTaskOptions = {
        prompts: {},
        clientId: 'client-123',
      };

      await expect(executeWorkflowTaskByPrompts(options)).rejects.toThrow('Network error');
    });

    it('should handle complex prompt structure', async () => {
      (api.prompt as jest.Mock).mockResolvedValue(mockPromptResult);

      const complexPrompt = {
        '1': {
          inputs: { text: 'positive prompt', clip: ['2', 0] },
          class_type: 'CLIPTextEncode',
        },
        '2': {
          inputs: { ckpt_name: 'model.safetensors' },
          class_type: 'CheckpointLoaderSimple',
        },
        '3': {
          inputs: {
            seed: 12345,
            steps: 20,
            cfg: 7,
            sampler_name: 'euler',
            scheduler: 'normal',
            denoise: 1,
            model: ['2', 0],
            positive: ['1', 0],
            negative: ['1', 0],
            latent_image: ['4', 0],
          },
          class_type: 'KSampler',
        },
      };

      const options: ExecuteTaskOptions = {
        prompts: complexPrompt,
        clientId: 'client-123',
      };

      const result = await executeWorkflowTaskByPrompts(options);

      expect(api.prompt).toHaveBeenCalledWith({
        client_id: 'client-123',
        prompt: complexPrompt,
      });
      expect(result).toEqual(mockPromptResult);
    });

    it('should handle empty prompts object', async () => {
      (api.prompt as jest.Mock).mockResolvedValue(mockPromptResult);

      const options: ExecuteTaskOptions = {
        prompts: {},
        clientId: 'client-123',
      };

      const result = await executeWorkflowTaskByPrompts(options);

      expect(api.prompt).toHaveBeenCalledWith({
        client_id: 'client-123',
        prompt: {},
      });
      expect(result.prompt_id).toBe('test-prompt-123');
    });
  });

  describe('executeCustomWorkflowTaskByPrompts()', () => {
    it('should execute custom workflow when clientId is provided', async () => {
      (api.prompt as jest.Mock).mockResolvedValue(mockPromptResult);

      const options: ExecuteTaskOptions = {
        prompts: { '1': { inputs: {}, class_type: 'Test' } },
        clientId: 'client-456',
      };

      const result = await executeCustomWorkflowTaskByPrompts(options);

      expect(api.prompt).toHaveBeenCalledWith({
        client_id: 'client-456',
        prompt: options.prompts,
      });
      expect(result).toEqual(mockPromptResult);
    });

    it('should throw McpError when clientId is empty string', async () => {
      const options: ExecuteTaskOptions = {
        prompts: {},
        clientId: '',
      };

      await expect(executeCustomWorkflowTaskByPrompts(options)).rejects.toThrow(McpError);
      await expect(executeCustomWorkflowTaskByPrompts(options)).rejects.toThrow(
        '不存在WS客户端ID，请检查是否正确连接WS服务器',
      );
    });

    it('should throw McpError when clientId is undefined', async () => {
      const options: ExecuteTaskOptions = {
        prompts: {},
        clientId: undefined as any,
      };

      await expect(executeCustomWorkflowTaskByPrompts(options)).rejects.toThrow(McpError);
    });

    it('should throw McpError when clientId is null', async () => {
      const options: ExecuteTaskOptions = {
        prompts: {},
        clientId: null as any,
      };

      await expect(executeCustomWorkflowTaskByPrompts(options)).rejects.toThrow(McpError);
    });

    it('should propagate api error for custom workflow', async () => {
      const apiError = new Error('Custom workflow error');
      (api.prompt as jest.Mock).mockRejectedValue(apiError);

      const options: ExecuteTaskOptions = {
        prompts: {},
        clientId: 'client-456',
      };

      await expect(executeCustomWorkflowTaskByPrompts(options)).rejects.toThrow(
        'Custom workflow error',
      );
    });

    it('should handle result with node_errors', async () => {
      const resultWithErrors: ExecutePromptResult = {
        prompt_id: 'prompt-with-errors',
        number: 2,
        node_errors: {
          '1': { errors: [{ message: 'Invalid input' }] },
        },
      };
      (api.prompt as jest.Mock).mockResolvedValue(resultWithErrors);

      const options: ExecuteTaskOptions = {
        prompts: {},
        clientId: 'client-789',
      };

      const result = await executeCustomWorkflowTaskByPrompts(options);

      expect(result.node_errors).toEqual({
        '1': { errors: [{ message: 'Invalid input' }] },
      });
    });
  });
});
