import { CollectFormatTaskResult } from "../types/common";
import { ComfyPromptConfig, ComfyTaskResponse } from "../types/task";

/**
 * @METHOD
 * @description 格式化工作流任务数据
 * @author LaiFQZzr
 * @date 2026/01/30 10:51
 */
export const formatTask = (
  data: ComfyTaskResponse,
  isFromOriginWorkflow: boolean,
): CollectFormatTaskResult => {
  const result: CollectFormatTaskResult = {
    last_updated: Date.now(),
    workflows: [],
  };

  for (const [uuid, item] of Object.entries(data)) {
    const promptConfig: ComfyPromptConfig = item.prompt[2];
    const parameters: string[] = [];
    let description: string | null = null;
    let name: string | null = null;

    for (const [nodeId, nodeConfig] of Object.entries(promptConfig)) {
      const isDesc = nodeConfig._meta?.title?.match(/==(.+?)==/);
      if (isDesc) {
        description =
          (nodeConfig.inputs["value"] as string) || "无工作流描述内容";
        name = isDesc[1] || "无工作流名称";
      }
      parameters.push(nodeConfig.class_type);
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

    result.workflows.push({
      name: name,
      id: uuid,
      description: description,
      parameters: parameters,
      last_updated: timestamp,
      isFromOriginWorkflow,
    });
  }

  return result;
};
