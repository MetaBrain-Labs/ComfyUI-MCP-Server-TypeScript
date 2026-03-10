import { CollectFormatTaskResult, SourceType } from "../types/common";
import { ComfyPromptConfig, ComfyTaskResponse } from "../types/task";
import "dotenv/config";

/**
 * @METHOD
 * @description 格式化工作流任务数据
 * @author LaiFQZzr
 * @date 2026/01/30 10:51
 */
export const formatTask = (
  data: ComfyTaskResponse,
  sourceType: SourceType,
  modifiedWorkflow?: Map<string, number>,
  workflowNames?: Map<string, string>,
): CollectFormatTaskResult => {
  const workflowNameRegexString =
    process.env.WORKFLOW_NAME_REGEX || "==(.+?)==";
  const workflowParamRegexString = process.env.WORKFLOW_PARAM_REGEX || "^=>";

  const workflowNameRegex = new RegExp(workflowNameRegexString);
  const workflowParamRegex = new RegExp(workflowParamRegexString);

  const result: CollectFormatTaskResult = {
    last_updated: Date.now(),
    workflows: [],
  };

  for (const [uuid, item] of Object.entries(data)) {
    const promptConfig: ComfyPromptConfig = item.prompt[2];
    const promptId: string = item.prompt[1];
    const parameters: string[] = [];
    let modified: number | undefined;
    let workflowName: string | undefined;
    let description: string | null = null;
    let name: string | null = null;

    for (const [nodeId, nodeConfig] of Object.entries(promptConfig)) {
      const isDesc = nodeConfig._meta?.title?.match(workflowNameRegex);
      if (isDesc) {
        description =
          (nodeConfig.inputs["value"] as string) || "无工作流描述内容";
        name = isDesc[1] || "无工作流名称";
      }
      const isRequired = nodeConfig._meta?.title?.match(workflowParamRegex);
      if (isRequired) {
        parameters.push(nodeConfig.class_type + nodeConfig._meta?.title);
      }
    }

    // 如果name为null或者description为null的时候则不纳入列表
    if (!name || !description) {
      continue;
    }

    const timestamp = item.status.messages.find(
      ([type]) => type === "execution_start",
    )?.[1].timestamp;

    if (!timestamp) {
      continue;
    }

    if (
      sourceType === "InitialInspection" &&
      modifiedWorkflow &&
      workflowNames
    ) {
      modified = modifiedWorkflow.get(promptId);
      workflowName = workflowNames.get(promptId);
    }

    result.workflows.push({
      name: name,
      id: uuid,
      description: description,
      parameters: parameters,
      last_updated: timestamp,
      inspection_status: sourceType,
      userdata_modified: modified,
      workflowName,
    });
  }

  return result;
};
