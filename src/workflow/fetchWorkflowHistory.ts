import axios from "axios";
import { ComfyTaskResponse } from "../interface/task";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types";

export interface FetchWorkflowOptions {
  baseUrl: string;
  maxItems?: number;
  offset?: number;
}

/**
 * @METHOD
 * @description 获取历史任务（支持分页）
 * @author LaiFQZzr
 * @date 2026/01/20 11:50
 */
export async function fetchWorkflowHistory(
  options: FetchWorkflowOptions,
): Promise<ComfyTaskResponse> {
  const { baseUrl, maxItems = 3, offset = 0 } = options;

  const url = `${baseUrl}/history?max_items=${maxItems}&offset=${offset}`;

  const res = await axios.get<ComfyTaskResponse>(url);

  if (typeof res.data !== "object" || res.data === null) {
    throw new McpError(
      ErrorCode.InternalError,
      "Invalid workflow history response",
    );
  }

  const successTasks = Object.fromEntries(
    Object.entries(res.data).filter(
      ([uuid, item]) => item.status.status_str === "success",
    ),
  ) as ComfyTaskResponse;

  return successTasks;
}
