import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { mkdir, readFile, writeFile } from "fs/promises";
import { COMMON } from "../constants";
import { CollectFormatTaskWorkflow, sourcePriority } from "../types/common";

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

    const uniqueData = deduplicateWorkflows(finalData);

    // 过滤空对象
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
 * @METHOD
 * @description 根据 name 去重，保留最新的项
 * @author LaiFQZzr
 * @date 2026/01/27 11:55
 */
function deduplicateWorkflows(
  workflows: CollectFormatTaskWorkflow[],
): CollectFormatTaskWorkflow[] {
  const map = new Map<string, CollectFormatTaskWorkflow>();

  for (const workflow of workflows) {
    const existing = map.get(workflow.name);

    // 如果不存在那么直接添加
    if (!existing) {
      map.set(workflow.name, workflow);
      continue;
    } else {
      // 已存在的判断逻辑
      const typeDiff =
        sourcePriority[workflow.inspection_status] -
        sourcePriority[existing.inspection_status];

      // 相同类型的处理
      if (typeDiff === 0) {
        if (workflow.last_updated > existing.last_updated) {
          map.set(workflow.name, workflow);
        }
      } else if (typeDiff === 1) {
        // 针对已有类型为CompleteInspection，新增类型为InitialInspection
        if (
          workflow.inspection_status === "InitialInspection" &&
          existing.inspection_status === "CompleteInspection"
        ) {
          if (workflow.userdata_modified! > existing.last_updated) {
            // 如果workflow的userdata_modified更大，那么说明在existing运行后初始工作流进行了更改，用初始工作流最新的数据workflow的数据覆盖
            map.set(workflow.name, workflow);
            continue;
          } else {
            // 如果workflow的userdata_modified更小，那么说明在existing运行后初始工作流没有进行了更改，不覆盖
            continue;
          }
        }

        // 针对已有类型为InitialInspection，新增类型为CompleteInspection
        if (
          workflow.inspection_status === "CompleteInspection" &&
          existing.inspection_status === "InitialInspection"
        ) {
          if (existing.userdata_modified! > workflow.last_updated) {
            // 如果existing的userdata_modified更大，那么说明在workflow运行后初始工作流进行了更改，用初始工作流最新的数据existing的数据覆盖
            continue;
          } else {
            // 如果existing的userdata_modified更小，那么说明在workflow运行前初始工作流没有进行了更改，用workflow的数据覆盖
            map.set(workflow.name, workflow);
            continue;
          }
        }

        if (existing.inspection_status === "External") {
          map.set(workflow.name, workflow);
        }
      } else if (typeDiff === 2) {
        // 如果diff为2，说明一个必然是CompleteInspection，另一个必然是External，External为优先级最低的任务
        if (workflow.inspection_status === "CompleteInspection") {
          map.set(workflow.name, workflow);
        }
      }
    }
  }

  return Array.from(map.values());
}
