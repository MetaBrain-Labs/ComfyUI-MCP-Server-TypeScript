import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { Result } from "../interface/result";

/**
 * @METHOD
 * @description 包装 MCP 工具处理函数，自动处理错误
 * @author LaiFQZzr
 * @date 2026/01/27 11:22
 */
export function withMcpErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
) {
  return async (...args: T): Promise<CallToolResult> => {
    try {
      const result = await handler(...args);

      // 如果结果已经是 CallToolResult 格式，直接返回
      if (result && typeof result === "object" && "content" in result) {
        return result as CallToolResult;
      }

      // 否则包装成 CallToolResult
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      // 如果已经是 McpError，直接抛出
      if (error instanceof McpError) {
        throw error;
      }

      // 否则包装成 McpError
      throw new McpError(
        ErrorCode.InternalError,
        error instanceof Error ? error.message : String(error),
      );
    }
  };
}

/**
 * @METHOD
 * @description 将结果转换为 MCP 响应格式
 * @author LaiFQZzr
 * @date 2026/01/27 11:39
 */
export function ResultToMcpResponse(result: Result): CallToolResult {
  if (result.success) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } else {
    return {
      content: [
        {
          type: "text",
          text: `错误: ${result || "未知错误"}`,
        },
      ],
      isError: true,
    };
  }
}
