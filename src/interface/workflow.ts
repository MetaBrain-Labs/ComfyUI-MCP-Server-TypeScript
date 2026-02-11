export interface WorkflowCollectionData {
  savedPath: string;
  itemsRequested: number;
  itemsCollected: number;
  offset: number;
  failedTasks: number;
  pagination: {
    hasNextPage: boolean;
    nextOffset: number | null;
    currentOffset: number;
    requestedItems: number;
    returnedItems: number;
  };
}

/**
 * ComfyUI 工作流保存文件 (.json) 的完整结构
 */
export interface ComfyUIWorkflow {
  id?: string;
  revision?: number;
  last_node_id: number;
  last_link_id: number;
  nodes: ComfyNode[];
  links: ComfyLink[];
  groups?: ComfyGroup[];
  config?: Record<string, any>;
  extra?: ComfyExtra;
  version: number;
}

/**
 * 单个节点定义
 */
export interface ComfyNode {
  id: number;
  type: string;
  pos: [number, number]; // [x, y]
  size: [number, number] | { [key: number]: number }; // 通常是 [width, height]
  flags: ComfyNodeFlags;
  order: number;
  mode: ComfyNodeMode; // 0: Always, 2: Mute, 4: Bypass 等
  inputs?: ComfyNodeInput[];
  outputs?: ComfyNodeOutput[];
  properties: Record<string, any>;
  /**
   * 节点的具体参数值（按顺序对应 Widget）
   * 例如: [model_name, seed, steps, cfg, ...]
   */
  widgets_values?: Array<string | number | boolean | null>;
  title?: string;
  color?: string;
  bgcolor?: string;
}

export interface ComfyNodeInput {
  name: string;
  type: string;
  link: number | null; // 连接的 link_id，未连接为 null
  localized_name?: string;
  shape?: number;
  widget?: {
    name: string;
  };
}

export interface ComfyNodeOutput {
  name: string;
  type: string;
  links: number[] | null; // 连接出去的 link_id 列表
  slot_index: number;
  localized_name?: string;
}

/**
 * 连线定义
 * 格式: [link_id, source_node_id, source_slot_index, target_node_id, target_slot_index, type]
 */
export type ComfyLink = [number, number, number, number, number, string];

export interface ComfyGroup {
  id: number;
  title: string;
  bounding: [number, number, number, number]; // [x, y, w, h]
  color: string;
  font_size: number;
  flags: Record<string, any>;
}

export interface ComfyNodeFlags {
  collapsed?: boolean;
  [key: string]: any;
}

export enum ComfyNodeMode {
  Always = 0,
  OnEvent = 1,
  Never = 2, // Mute
  OnTrigger = 3,
  Bypass = 4,
}

export interface ComfyExtra {
  ds?: {
    scale: number;
    offset: [number, number];
  };
  frontendVersion?: string;
  workflowRendererVersion?: string;
  [key: string]: any;
}
