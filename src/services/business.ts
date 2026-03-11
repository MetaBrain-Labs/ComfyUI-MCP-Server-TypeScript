/**
 * 业务逻辑层
 * 组合底层服务（task, storage, workflow）提供高层业务功能
 */

import { readdir, readFile } from "fs/promises";
import path from "path";
import { COMMON } from "../constants";
import { CollectFormatTaskWorkflow } from "../types/common";
import { ComfyImage, ComfyPromptConfig } from "../types/task";
import { formatTask, formatTaskFromApiJson } from "../utils/format";
import { WorkflowConverter } from "../utils/workflow-converter";
import { ComfyClient } from "../utils/ws";
import { saveAssets, saveCustomWorkflow, saveWorkflow } from "./storage";
import {
  fetchAssetsByPromptId,
  fetchHistoryTasks,
  fetchTaskByPromptId,
  fetchUserWorkflow,
} from "./task/fetch";
import { executeWorkflowTask, executeWorkflowTaskByApiJson } from "./workflow";

/**
 * 提供给server调用，用于收集和格式化任务并且将格式化信息保存到本地缓存文件中
 */
export async function collectAndSaveFormatTask(params: {
  maxItems: number;
  offset: number;
  append: boolean;
}): Promise<boolean> {
  const data = await fetchHistoryTasks(params);
  const formatData = formatTask(data.successTasks, "CompleteInspection");

  await saveWorkflow(formatData.workflows, {
    append: params?.append,
  });

  return data.total === params.maxItems;
}

/**
 * 从工作流中获取一遍工作流
 */
export async function collectAndSaveFormatTaskFromWorkflows(
  client: ComfyClient,
  converter: WorkflowConverter,
) {
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

  return result.filePath;
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
}): Promise<ComfyPromptConfig> {
  return await fetchTaskByPromptId(params);
}

/**
 * 从本地 workflow 目录读取 JSON 文件作为 External 类型工作流
 */
export async function collectExternalWorkflowsFromDirectory(): Promise<
  CollectFormatTaskWorkflow[]
> {
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
                id:
                  workflow.id ||
                  `external-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                last_updated: workflow.last_updated || Date.now(),
              });
            }
          }
        } else if (isValidWorkflow(workflows)) {
          // 单个工作流对象
          externalWorkflows.push({
            ...workflows,
            inspection_status: "External",
            id:
              workflows.id ||
              `external-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            last_updated: workflows.last_updated || Date.now(),
          });
        }
      } catch (error) {
        console.error(`读取 workflow 文件 ${file} 失败:`, error);
      }
    }

    return externalWorkflows;
  } catch (error) {
    // 如果目录不存在，返回空数组
    return [];
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
