import { CollectFormatTaskResult } from "../interface/common";
import { ComfyPromptConfig, ComfyTaskResponse } from "../interface/task";

/**
 * @METHOD
 * @description 格式化工作流任务数据
 * @author LaiFQZzr
 * @date 2026/01/30 10:51
 */
export const formatTask = (
  data: ComfyTaskResponse,
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

    result.workflows.push({
      name: name,
      id: uuid,
      description: description,
      parameters: parameters,
      last_updated: Date.now(),
    });
  }

  return result;
};
