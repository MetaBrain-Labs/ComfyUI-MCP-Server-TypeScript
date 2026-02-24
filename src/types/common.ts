export interface CollectFormatTaskResult {
  last_updated: number;
  workflows: CollectFormatTaskWorkflow[];
}

export interface CollectFormatTaskWorkflow {
  name: string;
  id: string;
  description: string;
  parameters: string[];
  last_updated: number;
  // 是否从原始工作流中生成的历史任务
  isFromOriginWorkflow: boolean;
}
