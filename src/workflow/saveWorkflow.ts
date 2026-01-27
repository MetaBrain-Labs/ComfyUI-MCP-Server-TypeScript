import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

export interface SaveWorkflowOptions {
  dir?: string;
  fileName?: string;
  append?: boolean;
}

export interface WorkflowData {
  prompt_id?: string;
  [key: string]: any;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function saveWorkflow(
  data: any,
  options: SaveWorkflowOptions = {},
): Promise<{ filePath: string; itemsCollected: number }> {
  try {
    const projectRoot = path.resolve(__dirname, "..", "..");

    const {
      dir = path.join(projectRoot, "workflow"),
      fileName = "workflow.json",
      append = true,
    } = options;

    const itemsCollected = Object.keys(data).length;

    // 创建目录
    await mkdir(dir, { recursive: true });

    const filePath = path.join(dir, fileName);

    let finalData: WorkflowData[] = [];

    // 如果是追加模式，读取现有文件
    if (append) {
      try {
        const existingContent = await readFile(filePath, "utf-8");
        const existingData = JSON.parse(existingContent);

        if (Array.isArray(existingData)) {
          finalData = existingData.flat(Infinity);
        } else {
          console.warn("现有文件格式不是数组，将被覆盖");
        }
      } catch (error: any) {
        // 如果文件不存在且系统发错中断信号则抛出异常
        if (error.code !== "ENOENT") {
          throw new McpError(
            ErrorCode.InternalError,
            `读取现有文件失败: ${error.message}`,
          );
        }
      }
    }

    // 处理新数据
    const newData = normalizeData(data);

    // 合并数据
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
 * @description 将各种格式的数据标准化为数组
 * @author LaiFQZzr
 * @date 2026/01/27 11:57
 */
function normalizeData(data: unknown): WorkflowData[] {
  if (Array.isArray(data)) {
    return data.flat(Infinity);
  }

  if (typeof data === "object" && data !== null) {
    if (!Array.isArray(data)) {
      return Object.entries(data).map(([promptId, workflow]) => {
        if (typeof workflow === "object" && workflow !== null) {
          return {
            prompt_id: promptId,
            ...(workflow as object),
          };
        }
        return { prompt_id: promptId, data: workflow };
      });
    }
  }

  return [data as WorkflowData];
}

/**
 * @METHOD
 * @description 根据 prompt_id 去重，保留最新的
 * @author LaiFQZzr
 * @date 2026/01/27 11:55
 */
function deduplicateWorkflows(workflows: WorkflowData[]): WorkflowData[] {
  const map = new Map<string, WorkflowData>();

  workflows.forEach((workflow) => {
    if (workflow.prompt_id) {
      map.set(workflow.prompt_id, workflow);
    } else {
      // 没有 prompt_id 的项目直接保留
      const key = JSON.stringify(workflow);
      map.set(key, workflow);
    }
  });

  return Array.from(map.values());
}
