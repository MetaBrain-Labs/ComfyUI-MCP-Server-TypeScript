import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { mkdir, readFile, writeFile } from "fs/promises";
import { COMMON } from "../constants";
import server from "../tools";
import { CollectFormatTaskWorkflow } from "../types/common";

export interface SaveWorkflowOptions {
  dir?: string;
  fileName?: string;
  append?: boolean;
}

export interface WorkflowData {
  prompt_id?: string;
  [key: string]: any;
}

/**
 * @METHOD
 * @description 保存工作流任务信息到本地
 * @author LaiFQZzr
 * @date 2026/01/30 11:09
 */
export async function saveWorkflow(
  data: CollectFormatTaskWorkflow[],
  options: SaveWorkflowOptions = {},
): Promise<{ filePath: string; itemsCollected: number }> {
  try {
    const {
      dir = COMMON.WORKFLOW_DIR,
      fileName = COMMON.WORKFLOW_FILE,
      append = true,
    } = options;

    const itemsCollected = Object.keys(data).length;

    await mkdir(dir, { recursive: true });

    const filePath = COMMON.WORKFLOW_PATH;

    let finalData: CollectFormatTaskWorkflow[] = [];

    if (append) {
      try {
        const existingContent = await readFile(filePath, "utf-8");
        const existingData = JSON.parse(existingContent);

        if (Array.isArray(existingData)) {
          finalData = existingData.flat(Infinity);
        } else {
          console.error("现有文件格式不是数组，将被覆盖");
        }
      } catch (error: any) {
        if (error.code !== "ENOENT") {
          throw new McpError(
            ErrorCode.InternalError,
            `读取现有文件失败: ${error.message}`,
          );
        }
      }
    }

    const newData = data.flat(Infinity);

    finalData = [...finalData, ...newData];

    // 去重
    const uniqueData = deduplicateWorkflows(finalData);

    // 过滤空对象
    const filteredData = uniqueData.filter((item) => {
      if (typeof item === "object" && item !== null && !Array.isArray(item)) {
        return Object.keys(item).length > 0;
      }
      return true;
    });

    // 写入文件
    await writeFile(filePath, JSON.stringify(filteredData, null, 2), "utf-8");

    // 通知 AGENT 资源变更
    server.sendResourceListChanged();

    return { filePath, itemsCollected };
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }

    throw new McpError(
      ErrorCode.InternalError,
      `保存工作流失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * @METHOD
 * @description 根据 name 去重，保留最新的项
 * TODO 是否加一个标记位，允许当前项无论时间戳多少都保留当前项
 * @author LaiFQZzr
 * @date 2026/01/27 11:55
 */
function deduplicateWorkflows(
  workflows: CollectFormatTaskWorkflow[],
): CollectFormatTaskWorkflow[] {
  const map = new Map<string, CollectFormatTaskWorkflow>();

  for (const workflow of workflows) {
    const existing = map.get(workflow.name);

    if (!existing || workflow.last_updated > existing.last_updated) {
      map.set(workflow.name, workflow);
    }
  }

  return Array.from(map.values());
}
