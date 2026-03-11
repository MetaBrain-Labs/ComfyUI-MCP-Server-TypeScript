import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { COMMON } from "../../constants";
import { CollectFormatTaskWorkflow, sourcePriority } from "../../types/common";

export interface SaveWorkflowOptions {
  dir?: string;
  fileName?: string;
  append?: boolean;
}

/**
 * 保存工作流任务信息到本地
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
    const uniqueData = deduplicateWorkflows(finalData);

    const filteredData = uniqueData.filter((item) => {
      if (typeof item === "object" && item !== null && !Array.isArray(item)) {
        return Object.keys(item).length > 0;
      }
      return true;
    });

    await writeFile(filePath, JSON.stringify(filteredData, null, 2), "utf-8");
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
 * 保存自定义工作流到本地
 */
export async function saveCustomWorkflow(
  data: CollectFormatTaskWorkflow[],
  options: SaveWorkflowOptions = {},
): Promise<string> {
  try {
    const dir = COMMON.WORKFLOW_DIR;
    const fileName = options.fileName!;

    await mkdir(dir, { recursive: true });

    const filePath = path.join(dir, fileName);

    await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
    return filePath;
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(
      ErrorCode.InternalError,
      `保存自定义工作流失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * 根据 name 去重，保留最新的项
 */
function deduplicateWorkflows(
  workflows: CollectFormatTaskWorkflow[],
): CollectFormatTaskWorkflow[] {
  const map = new Map<string, CollectFormatTaskWorkflow>();

  for (const workflow of workflows) {
    const existing = map.get(workflow.name);
    if (!existing) {
      map.set(workflow.name, workflow);
      continue;
    }
    if (shouldReplaceWorkflow(existing, workflow)) {
      map.set(workflow.name, workflow);
    }
  }

  return Array.from(map.values());
}

/**
 * 判断是否应该替换工作流
 */
function shouldReplaceWorkflow(
  existing: CollectFormatTaskWorkflow,
  candidate: CollectFormatTaskWorkflow,
): boolean {
  if (existing.inspection_status === candidate.inspection_status) {
    return candidate.last_updated > existing.last_updated;
  }

  const isInitialVsComplete =
    (existing.inspection_status === "InitialInspection" &&
      candidate.inspection_status === "CompleteInspection") ||
    (existing.inspection_status === "CompleteInspection" &&
      candidate.inspection_status === "InitialInspection");

  if (isInitialVsComplete) {
    const initial =
      existing.inspection_status === "InitialInspection" ? existing : candidate;
    const complete =
      existing.inspection_status === "CompleteInspection"
        ? existing
        : candidate;

    const initialModifiedTime = initial.userdata_modified ?? 0;
    if (initialModifiedTime > complete.last_updated) {
      return candidate === initial;
    } else {
      return candidate === complete;
    }
  }

  const existingPriority = sourcePriority[existing.inspection_status] ?? -1;
  const candidatePriority = sourcePriority[candidate.inspection_status] ?? -1;

  if (candidatePriority !== existingPriority) {
    return candidatePriority > existingPriority;
  }

  return candidate.last_updated > existing.last_updated;
}
