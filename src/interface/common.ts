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
}
