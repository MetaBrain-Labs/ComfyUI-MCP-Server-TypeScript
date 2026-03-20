/**
 * @file result.test.ts
 * @description 测试结果类型和结果构建函数
 * 
 * 【分支覆盖分析】
 * 1. ok() 函数:
 *    - 正常路径: 提供所有参数
 *    - 边界: executionTime 为 0
 *    - 边界: executionTime 未提供 (undefined)
 * 
 * 2. error() 函数:
 *    - 正常路径: 提供所有参数
 *    - 边界: errorDetails 为 undefined
 *    - 边界: code 使用默认值 (ResultCode.FORBIDDEN)
 *    - 边界: executionTime 未提供
 * 
 * 3. errorWithToken() 函数:
 *    - 正常路径: 提供所有参数
 *    - 边界: 使用默认 code 和 errorDetails
 * 
 * 4. errorWithDetail() 函数:
 *    - 正常路径: 提供所有参数
 *    - 边界: errorDetails 为 undefined
 * 
 * 【Mock 策略】
 * - Date.now(): Mock 为固定时间戳以确保可预测性
 */

import { ResultCode } from '../../src/types/enums/result';
import {
  ok,
  error,
  errorWithToken,
  errorWithDetail,
  Result,
} from '../../src/types/result';

describe('result', () => {
  const mockTimestamp = 1234567890;
  const originalDateNow = Date.now;

  beforeEach(() => {
    Date.now = jest.fn(() => mockTimestamp);
  });

  afterEach(() => {
    Date.now = originalDateNow;
  });

  describe('ok()', () => {
    it('should return success result with all parameters provided', () => {
      const data = { id: 1, name: 'test' };
      const metadata = { action: 'create' };
      
      const result: Result<typeof data> = ok('Success message', data, metadata, 100);

      expect(result).toEqual({
        success: true,
        message: 'Success message',
        detail: {
          data,
          code: ResultCode.SUCCESS,
          timestamp: mockTimestamp,
          executionTime: 100,
        },
        metadata,
      });
    });

    it('should return success result without data', () => {
      const result = ok('Success without data');

      expect(result).toEqual({
        success: true,
        message: 'Success without data',
        detail: {
          data: undefined,
          code: ResultCode.SUCCESS,
          timestamp: mockTimestamp,
        },
      });
    });

    it('should handle executionTime of 0 (falsy but valid)', () => {
      const result = ok('Test', {}, {}, 0);

      expect(result.detail.executionTime).toBe(0);
    });

    it('should not include executionTime when undefined', () => {
      const result = ok('Test');

      expect(result.detail.executionTime).toBeUndefined();
    });

    it('should handle null data', () => {
      const result = ok('Test', null);

      expect(result.detail.data).toBeNull();
    });
  });

  describe('error()', () => {
    it('should return error result with all parameters', () => {
      const errorDetails = { message: 'Validation failed', field: 'email' };
      
      const result = error('Error message', errorDetails, ResultCode.SYSTEM_ERROR, 200);

      expect(result).toEqual({
        success: false,
        message: 'Error message',
        detail: {
          code: ResultCode.SYSTEM_ERROR,
          timestamp: mockTimestamp,
          executionTime: 200,
        },
        error: errorDetails,
      });
    });

    it('should use default code (FORBIDDEN) when not provided', () => {
      const result = error('Default error code');

      expect(result.detail.code).toBe(ResultCode.FORBIDDEN);
    });

    it('should handle undefined errorDetails', () => {
      const result = error('No details');

      expect(result.error).toBeUndefined();
    });

    it('should handle empty errorDetails object', () => {
      const result = error('Empty details', {});

      expect(result.error).toEqual({});
    });

    it('should not include executionTime when undefined', () => {
      const result = error('No execution time');

      expect(result.detail.executionTime).toBeUndefined();
    });
  });

  describe('errorWithToken()', () => {
    it('should return error result with token', () => {
      const errorDetails = { code: 401, message: 'expired' };
      
      const result = errorWithToken('Token error', 'abc123', errorDetails, ResultCode.UNAUTHORIZED, 50);

      expect(result).toEqual({
        success: false,
        message: 'Token error',
        detail: {
          code: ResultCode.UNAUTHORIZED,
          timestamp: mockTimestamp,
          executionTime: 50,
        },
        error: errorDetails,
        metadata: {
          token: 'abc123',
        },
      });
    });

    it('should use default code when not provided', () => {
      const result = errorWithToken('Default code', 'token123');

      expect(result.detail.code).toBe(ResultCode.FORBIDDEN);
    });

    it('should handle undefined errorDetails', () => {
      const result = errorWithToken('No details', 'token456');

      expect(result.error).toBeUndefined();
    });

    it('should always include token in metadata', () => {
      const result = errorWithToken('Test', 'my-token');

      expect(result.metadata).toEqual({ token: 'my-token' });
    });
  });

  describe('errorWithDetail()', () => {
    it('should return error with string detail', () => {
      const result = errorWithDetail('Main error', 'Additional context', ResultCode.PARAM_ERROR, 150);

      expect(result).toEqual({
        success: false,
        message: 'Main error',
        detail: {
          code: ResultCode.PARAM_ERROR,
          timestamp: mockTimestamp,
          executionTime: 150,
        },
        error: {
          message: 'Main error',
          details: 'Additional context',
          code: ResultCode.PARAM_ERROR,
        },
      });
    });

    it('should use default code (FORBIDDEN) when not provided', () => {
      const result = errorWithDetail('Default code');

      expect(result.detail.code).toBe(ResultCode.FORBIDDEN);
      expect(result.error?.code).toBe(ResultCode.FORBIDDEN);
    });

    it('should handle undefined errorDetails', () => {
      const result = errorWithDetail('No details');

      expect(result.error?.details).toBeUndefined();
    });

    it('should include message in both top-level and error object', () => {
      const message = 'Consistent message';
      const result = errorWithDetail(message, 'Details');

      expect(result.message).toBe(message);
      expect(result.error?.message).toBe(message);
    });
  });
});
