import { ComfyNodeOutput } from "./task";

export interface ExecutePromptResult {
  prompt_id: string;
  number: number;
  node_errors: any;
}

/** 工作流执行结果 */
export interface ExecutionResult {
  success: boolean;
  promptId: string;
  outputs?: Record<string, ComfyNodeOutput>;
  error?: string;
  executionTime: number;
}
