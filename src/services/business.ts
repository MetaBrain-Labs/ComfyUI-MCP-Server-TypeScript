/**
 * 业务逻辑层
 * 组合底层服务（task, storage, workflow）提供高层业务功能
 */

import { COMMON } from "../constants";
import { ok, Result } from "../types/result";
import { ComfyImage, ComfyPromptConfig } from "../types/task";
import { WorkflowCollectionData } from "../types/workflow";
import { formatTask, formatTaskFromApiJson } from "../utils/format";
import { WorkflowConverter } from "../utils/workflow-converter";
import { ComfyClient } from "../utils/ws";
import { executeWorkflowTask, executeWorkflowTaskByApiJson } from "./workflow";
import {
  fetchAssetsByPromptId,
  fetchTaskByPromptId,
  fetchHistoryTasks,
  fetchUserWorkflow,
} from "./task/fetch";
import { saveAssets, saveCustomWorkflow, saveWorkflow } from "./storage";
import { readdir, readFile } from "fs/promises";
import path from "path";
import { CollectFormatTaskWorkflow } from "../types/common";

/**
 * 提供给server调用，用于收集和格式化任务并且将格式化信息保存到本地缓存文件中
 */
export async function collectAndSaveFormatTask(params: {
  maxItems: number;
  offset: number;
  append: boolean;
}): Promise<Result<WorkflowCollectionData>> {
  const startTime = Date.now();

  const data = await fetchHistoryTasks(params);
  const formatData = formatTask(data.successTasks, "CompleteInspection");

  const result = await saveWorkflow(formatData.workflows, {
    append: params?.append,
  });

  const executionTime = Date.now() - startTime;

  return ok<WorkflowCollectionData>(
    `已从偏移量 ${params.offset} 处收集并保存 ${data.total - data.fail} 条工作流，模式：${params.append ? "追加" : "覆盖"}`,
    {
      savedPath: result.filePath,
      itemsRequested: params.maxItems,
      itemsCollected: data.total,
      failedTasks: data.fail,
      offset: params.offset,
      pagination: {
        hasNextPage: data.total === params.maxItems,
        nextOffset:
          data.total === params.maxItems
            ? params.offset + params.maxItems
            : null,
        currentOffset: params.offset,
        requestedItems: params.maxItems,
        returnedItems: data.total,
      },
    },
    {
      action: "collect_workflow",
      mode: params.append ? "append" : "overwrite",
    },
    executionTime,
  );
}

/**
 * 从工作流中获取一遍工作流
 */
export async function collectAndSaveFormatTaskFromWorkflows(
  client: ComfyClient,
  converter: WorkflowConverter,
) {
  const startTime = Date.now();

  const { availableWorkflow, modifiedWorkflow, workflowNames } =
    await executeWorkflowTask(client, converter);

  const data = await fetchUserWorkflow(availableWorkflow);

  const formatData = formatTask(
    data,
    "InitialInspection",
    modifiedWorkflow,
    workflowNames,
  );

  const result = await saveWorkflow(formatData.workflows, {
    append: true,
  });

  const executionTime = Date.now() - startTime;

  return ok(
    "从原始工作流中获取历史任务，并保存到本地缓存文件中",
    { filePath: result.filePath },
    {
      action: "collect_origin_workflow",
    },
    executionTime,
  );
}

/**
 * 提供给server调用，用于收集和格式化任务并且将格式化信息保存到本地缓存文件中
 */
export async function collectAndSaveFormatTaskFromExternal(
  finalName: string,
  apiJson: Record<string, any>,
  client: ComfyClient,
) {
  // 运行一次工作流
  const promptId = await executeWorkflowTaskByApiJson(apiJson, client);

  const formatData = formatTaskFromApiJson(apiJson, promptId);

  const filePath = await saveCustomWorkflow(formatData.workflows, {
    fileName: finalName,
  });

  return { filePath, promptId };
}

/**
 * 根据promptId获取相关资产到本地
 */
export async function saveAssetsByPromptId(
  promptId: string,
  overwrite: boolean,
  destinationDir?: string,
): Promise<{ assetsNames: string[]; filePath: string }> {
  const images: ComfyImage[] = [];
  const assetsNames: string[] = [];
  const assetsInfo = await fetchAssetsByPromptId(promptId);

  assetsInfo.forEach((item) => {
    item.images.forEach((item) => {
      images.push(item);
    });
  });

  for (const image of images) {
    const assetsName = await saveAssets(image, overwrite, destinationDir);
    assetsNames.push(assetsName);
  }

  return {
    assetsNames: assetsNames,
    filePath: destinationDir || COMMON.ASSETS_DIR,
  };
}

/**
 * 提供给server调用，用于根据prompt_id获取Tasks详细信息
 */
export async function getTaskDetailByPromptId(params: {
  promptId: string;
}): Promise<Result<ComfyPromptConfig>> {
  const startTime = Date.now();

  const data = await fetchTaskByPromptId(params);

  const executionTime = Date.now() - startTime;

  return ok<ComfyPromptConfig>(
    "根据prompt_id获取任务详情，包括prompt、outputs、status、meta等项内容",
    data,
    {
      action: "cui_get_task_detail",
    },
    executionTime,
  );
}

/**
 * 从本地 workflow 目录读取 JSON 文件作为 External 类型工作流
 */
export async function collectExternalWorkflowsFromDirectory(): Promise<
  Result<CollectFormatTaskWorkflow[]>
> {
  const startTime = Date.now();
  const externalWorkflows: CollectFormatTaskWorkflow[] = [];

  try {
    const workflowDir = COMMON.WORKFLOW_DIR;
    const files = await readdir(workflowDir);
    const jsonFiles = files.filter(
      (file) => file.endsWith(".json") && file !== COMMON.WORKFLOW_FILE,
    );

    for (const file of jsonFiles) {
      try {
        const filePath = path.join(workflowDir, file);
        const content = await readFile(filePath, "utf-8");
        const workflows = JSON.parse(content);

        if (Array.isArray(workflows)) {
          // 文件内容是数组，解析为 External 类型
          for (const workflow of workflows) {
            if (isValidWorkflow(workflow)) {
              externalWorkflows.push({
                ...workflow,
                inspection_status: "External",
                id: workflow.id || `external-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                last_updated: workflow.last_updated || Date.now(),
              });
            }
          }
        } else if (isValidWorkflow(workflows)) {
          // 单个工作流对象
          externalWorkflows.push({
            ...workflows,
            inspection_status: "External",
            id: workflows.id || `external-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            last_updated: workflows.last_updated || Date.now(),
          });
        }
      } catch (error) {
        console.error(`读取 workflow 文件 ${file} 失败:`, error);
      }
    }

    const executionTime = Date.now() - startTime;

    return ok<CollectFormatTaskWorkflow[]>(
      `从本地 workflow 目录读取了 ${externalWorkflows.length} 个 External 类型工作流`,
      externalWorkflows,
      {
        action: "collect_external_workflows",
      },
      executionTime,
    );
  } catch (error) {
    // 如果目录不存在，返回空数组
    return ok<CollectFormatTaskWorkflow[]>(
      "本地 workflow 目录不存在或无法读取",
      [],
      {
        action: "collect_external_workflows",
      },
      Date.now() - startTime,
    );
  }
}

/**
 * 验证工作流对象是否有效
 */
function isValidWorkflow(obj: any): obj is CollectFormatTaskWorkflow {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.name === "string" &&
    typeof obj.description === "string" &&
    Array.isArray(obj.parameters)
  );
}
