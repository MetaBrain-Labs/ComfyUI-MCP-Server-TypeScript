/**
 * 工具处理器统一导出
 * 所有工具注册函数都从此文件导出
 */

export { registerGetCoreManual } from "./core-manual";
export { registerGetWorkflowsCatalog } from "./workflows-catalog";
export { registerGetWorkflowAPI } from "./workflow-api";
export { registerGetTaskDetail } from "./task-detail";
export { registerMountWorkflow } from "./mount-workflow";
export { registerQueuePrompt } from "./queue-prompt";
export { registerQueueCustomPrompt } from "./queue-custom-prompt";
export { registerSaveCustomWorkflow } from "./save-custom-workflow";
export { registerSaveTaskAssets } from "./save-task-assets";
export { registerInterruptPrompt } from "./interrupt-prompt";
export { registerGetPromptResult } from "./prompt-result";
export { registerGetSystemStatus } from "./system-status";
export { registerListModels } from "./list-models";
export { registerUploadAssets } from "./upload-assets";
