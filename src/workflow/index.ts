import { ok } from "../interface/result";
import { CollectWorkflowResult } from "../interface/workflow";
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
  maxItems?: number;
  offset?: number;
  append?: boolean;
}) {
  const data = await fetchWorkflowHistory(params);

  const result = await saveWorkflow(data, { append: params?.append });

  return ok<CollectWorkflowResult>({
    savedPath: result.filePath,
    count: Object.keys(data).length,
  });
}
