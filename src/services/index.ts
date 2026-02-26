import { ok, Result } from "../types/result";
import { ComfyPromptConfig } from "../types/task";
import { WorkflowCollectionData } from "../types/workflow";
import { formatTask } from "../utils/format";
import { WorkflowConverter } from "../utils/workflow-converter";
import { ComfyClient } from "../utils/ws";
import { saveWorkflow } from "./saveWorkflow";
import {
  fetchHistoryTasks,
  fetchTaskByPromptId,
  fetchUserWorkflow,
} from "./tasks";
import { executeWorkflowTask } from "./workflow-executor";

/**
 * @METHOD
 * @description 提供给server调用，用于收集和格式化任务并且将格式化信息保存到本地缓存文件中
 * @author LaiFQZzr
 * @date 2026/01/20 11:50
 */
export async function collectAndSaveFormatTask(params: {
  maxItems: number;
  offset: number;
  append: boolean;
}): Promise<Result<WorkflowCollectionData>> {
  const startTime = Date.now();

  const data = await fetchHistoryTasks(params);

  const formatData = formatTask(data.successTasks, false);

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
 * @METHOD
 * @description 从工作流中获取一遍工作流
 * @author LaiFQZzr
 * @date 2026/02/10 15:46
 */
export async function collectAndSaveFormatTaskFromWorkflows(
  client: ComfyClient,
  converter: WorkflowConverter,
) {
  const startTime = Date.now();

  const availableWorkflow = await executeWorkflowTask(client, converter);

  const data = await fetchUserWorkflow(availableWorkflow);

  const formatData = formatTask(data, true);

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
