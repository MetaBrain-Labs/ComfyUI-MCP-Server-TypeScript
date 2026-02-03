import { ComfyInputValue, ComfyPromptConfig } from "./task";
import { z } from "zod";

/**
 * 可配置参数的定义
 */
export interface ConfigurableParam {
  /** 参数路径，格式：nodeId.inputKey */
  path: string;
  /** 节点ID */
  nodeId?: string;
  /** 输入键名 */
  inputKey?: string;
  /** 参数类型 */
  type: "string" | "number" | "boolean" | "array";
  /** 当前值（作为默认值） */
  defaultValue: ComfyInputValue;
  /** 节点类名 */
  classType: string;
  /** 节点标题 */
  nodeTitle?: string;
  /** 参数描述 */
  description?: string;
}

/**
 * 动态 Tool 的定义
 */
export interface DynamicWorkflowTool {
  /** Tool 名称 */
  name: string;
  /** 显示标题 */
  title: string;
  /** 描述 */
  description: string;
  /** 原始 promptId */
  sourcePromptId: string;
  /** 原始 workflow 模板（深拷贝） */
  workflowTemplate: ComfyPromptConfig;
  /** 可配置参数列表 */
  configurableParams: ConfigurableParam[];
  /** Zod Schema */
  schema: Record<string, z.ZodTypeAny>;
  /** 创建时间 */
  createdAt: number;
}

export interface DynamicWorkflowToolData {
  /** Tool 名称 */
  name: string;
  /** 显示标题 */
  title: string;
  /** 描述 */
  description: string;
  /** 原始 promptId */
  sourcePromptId: string;
  /** 可配置参数数量 */
  configurableParamsCount?: number;
  /** 可配置参数列表 */
  configurableParams: ConfigurableParam[];
  /** 使用示例 */
  exampleUsage: Record<string, any>;
  /** 创建时间 */
  createdAt?: string;
}

export interface ListDynamicWorkflowToolData {
  count: number;
  tools: {
    name: string;
    title: string;
    description: string;
    sourcePromptId: string;
    configurableParamsCount: number;
    createdAt: string;
  }[];
}
