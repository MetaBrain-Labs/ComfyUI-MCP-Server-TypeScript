/**
 * @file mcp-helpers.test.ts
 * @description 测试 MCP 辅助函数
 */

import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import type { CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js';
import {
  withMcpErrorHandling,
  ResultToMcpResponse,
  ResultToMcpStringResponse,
  buildComfyViewUrls,
} from '../../src/utils/mcp-helpers.js';
import { ok, error } from '../../src/types/result.js';
import { ExecutionResult } from '../../src/types/execute.js';

const originalEnv = process.env;

describe('mcp-helpers', () => {
  beforeEach(() => {
    // 使用实际环境变量或默认值
      if (!process.env.COMFY_UI_SERVER_IP) {
        process.env.COMFY_UI_SERVER_IP = 'http://localhost:8188';
      }
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('withMcpErrorHandling()', () => {
    it('should return result when handler succeeds with content property', async () => {
      const mockHandler = jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'success' }],
      } as CallToolResult);

      const wrapped = withMcpErrorHandling(mockHandler);
      const result = await wrapped('arg1', 'arg2');

      expect(mockHandler).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result).toEqual({ content: [{ type: 'text', text: 'success' }] });
    });

    it('should wrap result when handler succeeds without content property', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ data: 'test' });

      const wrapped = withMcpErrorHandling(mockHandler);
      const result = await wrapped();

      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify({ data: 'test' }, null, 2) }],
      });
    });

    it('should re-throw McpError without wrapping', async () => {
      const mcpError = new McpError(ErrorCode.InternalError, 'MCP Error');
      const mockHandler = jest.fn().mockRejectedValue(mcpError);

      const wrapped = withMcpErrorHandling(mockHandler);

      await expect(wrapped()).rejects.toThrow(McpError);
      await expect(wrapped()).rejects.toThrow('MCP Error');
    });

    it('should wrap plain Error in McpError', async () => {
      const plainError = new Error('Plain error message');
      const mockHandler = jest.fn().mockRejectedValue(plainError);

      const wrapped = withMcpErrorHandling(mockHandler);

      await expect(wrapped()).rejects.toThrow(McpError);
      await expect(wrapped()).rejects.toThrow('Plain error message');
    });
  });

  describe('ResultToMcpResponse()', () => {
    it('should convert success result to MCP response without isError', () => {
      const result = ok('Success', { data: 'test' });
      const response = ResultToMcpResponse(result);

      expect(response.isError).toBeUndefined();
    });

    it('should convert error result to MCP response with isError flag', () => {
      const result = error('Error occurred');
      const response = ResultToMcpResponse(result);

      expect(response.isError).toBe(true);
    });
  });

  describe('buildComfyViewUrls()', () => {
    it('should return empty array when outputs is undefined', () => {
      const result: ExecutionResult = { 
        success: true, 
        promptId: '123', 
        outputs: undefined, 
        executionTime: 100 
      };
      const urls = buildComfyViewUrls(result);

      expect(urls).toEqual([]);
    });

    it('should return empty array when outputs is empty object', () => {
      const result: ExecutionResult = { 
        success: true, 
        promptId: '123', 
        outputs: {}, 
        executionTime: 100 
      };
      const urls = buildComfyViewUrls(result);

      expect(urls).toEqual([]);
    });

    it('should build URLs for images with all fields', () => {
      const result: ExecutionResult = {
        success: true,
        promptId: '123',
        outputs: {
          node1: {
            images: [{ filename: 'image1.png', type: 'output', subfolder: 'sub1' }],
          },
        },
        executionTime: 100,
      };

      const urls = buildComfyViewUrls(result);

      const baseUrl = process.env.COMFY_UI_SERVER_IP || 'http://127.0.0.1:8188';
      expect(urls).toEqual([
        `${baseUrl}/view?filename=image1.png&type=output&subfolder=sub1`,
      ]);
    });
  });
});
