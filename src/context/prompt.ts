type PromptState = "IDLE" | "QUEUED" | "RUNNING" | "FINISHED" | "ERROR";

interface PromptContext {
  promptId: string;
  state: PromptState;
  nodes: Record<string, NodeContext>;
}
