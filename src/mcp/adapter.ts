import { Result } from "../interface/result";

export function resultToMcpResponse<T>(result: Result<T>) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
