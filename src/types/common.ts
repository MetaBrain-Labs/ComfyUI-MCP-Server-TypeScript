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
}

export interface UploadImgResponse {
  subfolder: string;
  name: string;
  type: string;
}
