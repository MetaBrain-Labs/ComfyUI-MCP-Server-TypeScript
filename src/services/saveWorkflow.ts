import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { pipeline } from "stream/promises";
import { BASE_URL } from "../api/http";
import { COMMON } from "../constants";
import { CollectFormatTaskWorkflow, sourcePriority } from "../types/common";
import { ComfyImage } from "../types/task";

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
 * @description 保存自定义工作流到本地
 * @author LaiFQZzr
 * @date 2026/03/06 10:22
 */
export async function saveCustomWorkflow(
  filename: string,
  apiJson: Record<string, any>,
): Promise<string> {
  try {
    const dir = COMMON.WORKFLOW_DIR;

    await mkdir(dir, { recursive: true });

    const filePath = path.join(dir, filename);

    await writeFile(filePath, JSON.stringify(apiJson, null, 2), "utf-8");

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
 * @METHOD
 * @description 保存资产到本地
 * @author LaiFQZzr
 * @date 2026/03/06 11:17
 */
export async function saveAssets(
  data: ComfyImage,
  overwrite: boolean,
  dir: string = COMMON.ASSETS_DIR,
): Promise<string> {
  try {
    const url = `${BASE_URL}/view?filename=${encodeURIComponent(data.filename)}&type=${data.type}&subfolder=${data.subfolder}`;

    const res = await fetch(url);

    if (!res.ok || !res.body) {
      throw new McpError(ErrorCode.InternalError, `下载资源失败: ${url}`);
    }

    let filename = data.filename;
    let savePath = path.join(dir, filename);

    if (!overwrite && fs.existsSync(savePath)) {
      const ext = path.extname(filename);
      const name = path.basename(filename, ext);

      const timestamp = Date.now();

      filename = `${name}_${timestamp}${ext}`;
      savePath = path.join(dir, filename);
    }

    await pipeline(res.body, fs.createWriteStream(savePath));

    return filename;
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }

    throw new McpError(
      ErrorCode.InternalError,
      `保存资产失败: ${error instanceof Error ? error.message : String(error)}`,
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
* @METHOD
* @description 核心规则:
    同类型：取 last_updated 最新的。
    External 类型：优先级最低，总是被非 External 替换。
    Initial vs Complete：
    这是核心业务逻辑。通常 Complete 优先级高于 Initial。
    但在特定条件下反转：如果 Initial 的 userdata_modified 晚于 Complete 的 last_updated，说明“完成检测”后用户又修改了数据，此时 Initial 更可信（更新），应保留 Initial。
    否则，保留 Complete。
* @return boolean 返回 true 表示替换，false 表示保持原样
* @author LaiFQZzr
* @date 2026/02/27 15:27
*/
function shouldReplaceWorkflow(
  existing: CollectFormatTaskWorkflow,
  candidate: CollectFormatTaskWorkflow,
): boolean {
  // 1. 如果状态相同：保留 last_updated 较新的
  if (existing.inspection_status === candidate.inspection_status) {
    return candidate.last_updated > existing.last_updated;
  }

  // 2. 特殊情况下：InitialInspection和CompleteInspection做比较
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

  // 3. 其他情况：默认按优先级高低处理 (非 External 覆盖 External)
  // 获取优先级，默认为 -1 防止字典中不存在的类型
  const existingPriority = sourcePriority[existing.inspection_status] ?? -1;
  const candidatePriority = sourcePriority[candidate.inspection_status] ?? -1;

  // 如果优先级不同，取优先级高的
  if (candidatePriority !== existingPriority) {
    return candidatePriority > existingPriority;
  }

  // 4. 兜底：如果优先级定义相同但状态名不同，按时间最新的
  return candidate.last_updated > existing.last_updated;
}
