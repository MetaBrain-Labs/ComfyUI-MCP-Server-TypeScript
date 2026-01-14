type NodeState = "PENDING" | "RUNNING" | "FINISHED" | "ERROR" | "CACHED";

interface NodeContext {
  nodeId: string;
  state: NodeState;
  progress?: {
    value: number;
    max: number;
  };
}
