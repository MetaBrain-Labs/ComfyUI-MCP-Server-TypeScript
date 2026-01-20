import { Result } from "../interface/result";

/**
 * @METHOD
 * @description 返回给AGENT的统一响应结果
 * @author LaiFQZzr
 * @date 2026/01/20 15:40
 */
export function resultToMcpResponse<T>(result: Result<T>, description: string) {
  return {
    content: [
      {
        type: "text" as const,
        text: `### ${description}\n` + JSON.stringify(result, null, 2),
      },
    ],
  };
}
