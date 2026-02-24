import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { ExecutionResult } from "../types/execute";
import { Result } from "../types/result";

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
      if (error instanceof McpError) {
        throw error;
      }

      throw new McpError(
        ErrorCode.InternalError,
        error instanceof Error ? error.message : String(error),
      );
    }
  };
}

/**
 * @METHOD
 * @description 将结构化结果转换为 MCP 响应格式
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
          text: JSON.stringify(result, null, 2),
        },
      ],
      isError: true,
    };
  }
}

/**
 * @METHOD
 * @description 将文本结果转换为 MCP 响应格式
 * @author LaiFQZzr
 * @date 2026/02/02 09:34
 */
export function ResultToMcpStringResponse(result: string): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

/**
 * @METHOD
 * @description 拼接生成资源路径
 * @author LaiFQZzr
 * @date 2026/02/04 17:58
 */
export function buildComfyViewUrls(
  result: ExecutionResult,
  baseURL: string,
): string[] {
  if (!result.outputs) return [];

  const urls: string[] = [];

  for (const nodeOutput of Object.values(result.outputs)) {
    for (const img of nodeOutput.images ?? []) {
      const params = new URLSearchParams({
        filename: img.filename,
        type: img.type,
        subfolder: img.subfolder ?? "",
      });

      urls.push(`${baseURL}/view?${params.toString()}`);
    }
  }

  return urls;
}
