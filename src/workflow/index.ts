import { t } from "../i18n";
import "../i18n/locales";
import { ok, Result } from "../interface/result";
import { ComfyPromptConfig, ComfyTaskResponse } from "../interface/task";
import { WorkflowCollectionData } from "../interface/workflow";
import { formatTask } from "../tools/format";
import { ComfyClient } from "../ws";
import { saveWorkflow } from "./saveWorkflow";
import {
  fetchHistoryTasks,
  fetchTaskByPromptId,
  fetchUserWorkflow,
} from "./tasks";
import { executeWorkflowTask } from "./workflow-executor";

/**
 * @METHOD
 * @description 提供给server调用，用于收集工作流数据
 * @author LaiFQZzr
 * @date 2026/01/20 11:50
 */
export async function collectAndSaveWorkflow(params: {
  baseUrl: string;
  maxItems: number;
  offset: number;
  append: boolean;
}): Promise<Result<ComfyTaskResponse>> {
  const startTime = Date.now();

  const data = await fetchHistoryTasks(params);

  const executionTime = Date.now() - startTime;

  return ok(
    t("workflow.collected", params.offset, params.maxItems, params.append),
    data.successTasks,
    {
      action: "collect_workflow",
      mode: params.append ? "append" : "overwrite",
    },
    executionTime,
  );
}

/**
 * @METHOD
 * @description 提供给server调用，用于收集和格式化任务并且将格式化信息保存到本地缓存文件中
 * @author LaiFQZzr
 * @date 2026/01/20 11:50
 */
export async function collectAndSaveFormatTask(params: {
  baseUrl: string;
  maxItems: number;
  offset: number;
  append: boolean;
}): Promise<Result<WorkflowCollectionData>> {
  const startTime = Date.now();

  const data = await fetchHistoryTasks(params);

  const formatData = formatTask(data.successTasks);

  const result = await saveWorkflow(formatData.workflows, {
    append: params?.append,
  });

  const executionTime = Date.now() - startTime;

  return ok<WorkflowCollectionData>(
    t("workflow.collected", params.offset, params.maxItems, params.append),
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
 * @METHOD
 * @description 从工作流中获取一遍工作流
 * @author LaiFQZzr
 * @date 2026/02/10 15:46
 */
export async function collectAndSaveFormatTaskFromWorkflows(
  baseUrl: string,
  client: ComfyClient,
) {
  const startTime = Date.now();

  const availableWorkflow = await executeWorkflowTask(baseUrl, client);

  const data = await fetchUserWorkflow(baseUrl, availableWorkflow);

  const formatData = formatTask(data);

  const result = await saveWorkflow(formatData.workflows, {
    append: false,
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
 * @METHOD
 * @description 提供给server调用，用于根据prompt_id获取Tasks详细信息
 * @author LaiFQZzr
 * @date 2026/02/03 11:30
 */
export async function getTaskDetailByPromptId(params: {
  baseUrl: string;
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
