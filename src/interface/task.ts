// 顶层结构：以 UUID 为键的映射
export type ComfyTaskResponse = Record<string, ComfyTaskItem>;

export type PromptType = [
  number,
  string,
  ComfyPromptConfig,
  ComfyExtraInfo,
  string[],
];

// 单个历史记录项
export interface ComfyTaskItem {
  /**
   * 包含提示词配置、元数据等的元组/数组
   * [0]: 序号 (number)
   * [1]: 任务 UUID (string)
   * [2]: 节点图配置 (PromptConfig)
   * [3]: 额外信息 (ExtraInfo)
   * [4]: 输出节点ID列表 (string[])
   */
  prompt: PromptType;

  /** 执行结果输出 */
  outputs: Record<string, ComfyNodeOutput>;

  /** 任务状态 */
  status: ComfyExecutionStatus;

  /** 节点元数据 */
  meta: Record<string, ComfyNodeMeta>;
}

//#region --- Prompt 配置部分 (对应 prompt[2]) ---
export interface ComfyPromptConfig {
  [nodeId: string]: ComfyNodeConfig;
}

export interface ComfyNodeConfig {
  /** 节点的输入参数，包含具体值或连接引用 */
  inputs: Record<string, ComfyInputValue>;
  /** 节点类名 */
  class_type: string;
  _meta?: {
    title?: string;
  };
}

/**
 * 输入值可以是基础类型，也可以是连接引用。
 * 连接引用通常是 [nodeId, slotIndex] 的形式，例如 ["5", 0]
 */
export type ComfyInputValue =
  | string
  | number
  | boolean
  | [string, number]
  | Array<string | number>
  | null;
//#endregion

//#region --- 额外信息部分 (对应 prompt[3]) ---
export interface ComfyExtraInfo {
  extra_pnginfo: {
    workflow: ComfyUIWorkflow;
  };
  client_id: string;
  create_time: number;
}

/** ComfyUI 前端图表结构 (UI 保存的结构) */
export interface ComfyUIWorkflow {
  id: string;
  revision: number;
  last_node_id: number;
  last_link_id: number;
  nodes: ComfyUINode[];
  links: ComfyUILink[];
  groups?: any[];
  config?: Record<string, any>;
  extra?: any;
  version: number;
}

export interface ComfyUINode {
  id: number;
  type: string;
  pos: [number, number];
  size: [number, number] | { 0: number; 1: number };
  flags: any;
  order: number;
  mode: number;
  inputs?: Array<{ name: string; type: string; link: number | null }>;
  outputs?: Array<{ name: string; type: string; links: number[] | null }>;
  properties?: Record<string, any>;
  widgets_values?: Array<string | number | boolean>;
  title?: string;
  color?: string;
  bgcolor?: string;
}

/** [id, sourceNodeId, sourceSlot, targetNodeId, targetSlot, type] */
export type ComfyUILink = [number, number, number, number, number, string];
//#endregion

//#region  --- 输出结果部分 (outputs) ---
export interface ComfyNodeOutput {
  images: ComfyImage[];
}

export interface ComfyImage {
  filename: string;
  subfolder: string;
  type: "temp" | "output" | "input";
}
//#endregion

//#region --- 状态部分 (status) ---
export interface ComfyExecutionStatus {
  status_str: "success" | "error" | string;
  completed: boolean;
  messages: ExecutionMessage[];
}

type ExecutionMessage = [string, ExecutionMessagePayload];

interface ExecutionMessagePayload {
  prompt_id: string;
  timestamp: number;
  nodes?: string[];
}
//#endregion

//#region --- 元数据部分 (meta) ---
export interface ComfyNodeMeta {
  node_id: string;
  display_node: string;
  parent_node: string | null;
  real_node_id: string;
}
//#endregion

export interface WorkflowSimpleData {
  path: string;
  size: number;
  modified: number;
  created: number;
}
