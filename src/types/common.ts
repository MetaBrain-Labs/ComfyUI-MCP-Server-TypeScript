export type SourceType =
  | "CompleteInspection"
  | "InitialInspection"
  | "External";

export const sourcePriority: Record<SourceType, number> = {
  External: 3,
  InitialInspection: 2,
  CompleteInspection: 1,
};

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
  inspection_status: SourceType;
  userdata_modified?: number;
  workflowPath?: string;
}

export interface UploadImgResponse {
  subfolder: string;
  name: string;
  type: string;
}

export interface ModelTypeResponse {
  name: string;
  folders: string[];
}

export interface DetailModelResponse {
  name: string;
  pathIndex: number;
  modified: number;
  created: number;
  size: number;
}

export interface SystemStatus {
  system: System;
  devices: Device[];
}

export interface Device {
  name: string;
  type: string;
  index: number;
  vram_total: number;
  vram_free: number;
  torch_vram_total: number;
  torch_vram_free: number;
}

export interface System {
  os: string;
  ram_total: number;
  ram_free: number;
  comfyui_version: string;
  required_frontend_version: string;
  installed_templates_version: string;
  required_templates_version: string;
  python_version: string;
  pytorch_version: string;
  embedded_python: boolean;
  argv: string[];
}
