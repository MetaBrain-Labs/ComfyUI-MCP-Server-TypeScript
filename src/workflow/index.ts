import { ok } from "../interface/result";
import { CollectWorkflowResult } from "../interface/workflow";
import { fetchWorkflowHistory } from "./fetchWorkflowHistory";
import { saveWorkflow } from "./saveWorkflow";

export async function collectAndSaveWorkflow(params: {
  baseUrl: string;
  maxItems?: number;
  offset?: number;
}) {
  const data = await fetchWorkflowHistory(params);

  const result = await saveWorkflow(data);

  return ok<CollectWorkflowResult>({
    savedPath: result.filePath,
    count: Object.keys(data).length,
  });
}
