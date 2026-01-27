import { ok } from "../interface/result";
import { WorkflowCollectionData } from "../interface/workflow";
import { fetchWorkflowHistory } from "./fetchWorkflowHistory";
import { saveWorkflow } from "./saveWorkflow";

/**
 * @METHOD
 * @description 提供给server调用，用于收集和保存工作流数据
 * @author LaiFQZzr
 * @date 2026/01/20 11:50
 */
export async function collectAndSaveWorkflow(params: {
  baseUrl: string;
  maxItems: number;
  offset: number;
  append: boolean;
}) {
  const startTime = Date.now();

  const data = await fetchWorkflowHistory(params);

  const result = await saveWorkflow(data, { append: params?.append });

  const executionTime = Date.now() - startTime;

  return ok<WorkflowCollectionData>(
    `已从偏移量 ${params.offset} 处收集并保存 ${params.maxItems} 条工作流，模式：${params.append ? "追加" : "覆盖"}`,
    {
      savedPath: result.filePath,
      itemsRequested: params.maxItems,
      itemsCollected: result.itemsCollected,
      offset: params.offset,
      pagination: {
        hasNextPage: result.itemsCollected === params.maxItems,
        nextOffset:
          result.itemsCollected === params.maxItems
            ? params.offset + params.maxItems
            : null,
        currentOffset: params.offset,
        requestedItems: params.maxItems,
        returnedItems: result.itemsCollected,
      },
    },
    {
      action: "collect_workflow",
      mode: params.append ? "append" : "overwrite",
    },
    executionTime,
  );
}
