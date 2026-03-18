export interface ComfyStatusData {
  status: {
    exec_info: {
      queue_remaining: number;
    };
  };
  sid: string;
}

export interface ComfyFeatureFlagsData {
  supports_preview_metadata: boolean;
  max_upload_size: number;
  extension: {
    manager?: {
      supports_v4: boolean;
    };
    [key: string]: any;
  };
}

export interface ComfyExecutionStartData {
  prompt_id: string;
  timestamp: number;
}

export interface ComfyExecutionCachedData {
  nodes: string[];
  prompt_id: string;
  timestamp: number;
}

export interface ComfyExecutionSuccessData {
  prompt_id: string;
  timestamp: number;
}

export interface ComfyProgressStateData {
  prompt_id: string;
  nodes: Record<string, ComfyNodeProgressState>;
}

export interface ComfyProgressData {
  prompt_id: string;
  value: number;
  max: number;
  node: string;
}

export interface ComfyExecutingData {
  node: string | null;
  display_node: string;
  prompt_id: string;
}

export interface ComfyExecutedData {
  node: string;
  display_node: string;
  output: ComfyNodeOutputData;
  prompt_id: string;
}

/** 节点进度详情 */
export interface ComfyNodeProgressState {
  value: number; // 当前进度 (0.0 - 1.0 或具体步数)
  max: number; // 最大进度/总步数
  state: "running" | "finished" | "pending" | string; // 节点状态
  node_id: string; // 当前节点 ID
  prompt_id: string; // 关联的任务 ID
  display_node_id: string; // UI 显示的节点 ID
  parent_node_id: string | null;
  real_node_id: string; // 实际执行的节点 ID
}

import { ComfyImage } from "./task";

/** 节点执行结果输出 (通常包含 images, 但也可能有 tags, text 等) */
export interface ComfyNodeOutputData {
  images?: ComfyImage[];
  [key: string]: any; // 允许其他类型的输出（如 text, gifs 等）
}
