export interface CollectFormatTaskResult {
  last_updated: number;
  workflows: CollectFormatTaskWorkflow[];
}

export interface CollectFormatTaskWorkflow {
  name: string;
  description: string | null;
  parameters: string[];
  last_updated: number;
}
