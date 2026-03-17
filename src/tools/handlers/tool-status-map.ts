/**
 * 工具与 inspection_status 的映射关系
 * key: ToolName
 * value: 该Tool归属的inspection_status列表，一个Tool可归属多个inspection_status
 */

import { SourceType } from "../../types/common";

export const toolInspectionStatusMap: Record<string, SourceType[]> = {
  // 基础核心工具
  get_core_manual: ["External", "InitialInspection", "CompleteInspection"],

  // 工作流目录相关
  get_workflows_catalog: ["InitialInspection", "CompleteInspection"],
  mount_workflow: ["External", "InitialInspection", "CompleteInspection"],
  get_workflow_api: ["External", "InitialInspection", "CompleteInspection"],

  // 任务执行相关
  queue_prompt: ["External", "InitialInspection", "CompleteInspection"],
  queue_custom_prompt: [], // 不可被任何inspection_status使用
  interrupt_prompt: ["External", "InitialInspection", "CompleteInspection"],
  get_prompt_result: ["External", "InitialInspection", "CompleteInspection"],
  get_task_detail: ["External", "InitialInspection", "CompleteInspection"],

  // 资产与存储相关
  save_custom_workflow: ["External"], // 只有External可用
  save_task_assets: ["External", "InitialInspection", "CompleteInspection"],
  upload_assets: ["External", "InitialInspection", "CompleteInspection"],

  // 系统工具
  get_system_status: ["External", "InitialInspection", "CompleteInspection"],
  list_models: ["External", "InitialInspection", "CompleteInspection"],
};
