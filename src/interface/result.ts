import { ResultCode } from "../enums/result";

interface ResultDetail<T = any> {
  data?: T;
  code: number;
  timestamp: number;
  executionTime?: number;
}

/**
 * @METHOD
 * @description 结构化返回结果
 * @author LaiFQZzr
 * @date 2026/01/27 14:22
 */
export interface Result<T = any> {
  success: boolean;
  message: string;
  detail: ResultDetail<T>;
  error?: {
    code?: string;
    message?: string;
    details?: string;
    retryable?: boolean;
  };
  metadata?: {
    action?: string;
    mode?: "append" | "overwrite";
  };
}

/**
 * @METHOD
 * @description 正常成功返回
 * @author LaiFQZzr
 * @date 2026/01/27 11:33
 */
export function ok<T>(
  message: string,
  data?: T,
  metadata?: Result["metadata"],
  executionTime?: number,
): Result<T> {
  return {
    success: true,
    message,
    detail: {
      data: data,
      code: ResultCode.SUCCESS,
      timestamp: Date.now(),
      ...(executionTime !== undefined && { executionTime }),
    },
    metadata,
  };
}

/**
 * @METHOD
 * @description 错误返回
 * @author LaiFQZzr
 * @date 2026/01/27 14:00
 */
export function error<T>(
  message: string,
  errorDetails?: Result["error"],
  code: number = ResultCode.FORBIDDEN,
  executionTime?: number,
): Result<T> {
  return {
    success: false,
    message,
    detail: {
      code,
      timestamp: Date.now(),
      ...(executionTime !== undefined && { executionTime }),
    },
    error: errorDetails,
  };
}
