import { z } from "zod";
import {
  ConfigurableParam,
  DynamicWorkflowTool,
} from "../interface/dynamic-tool";
import { ComfyInputValue, ComfyPromptConfig } from "../interface/task";
import { ComfyClient } from "../ws";

/**
 * 动态 Tool 存储
 */
const dynamicTools = new Map<string, DynamicWorkflowTool>();

/**
 * @METHOD
 * @description 获取动态 Tool
 * @author LaiFQZzr
 * @date 2026/02/03 17:26
 */
export function getDynamicTool(name: string): DynamicWorkflowTool | undefined {
  return dynamicTools.get(name);
}

/**
 * @METHOD
 * @description 获取所有动态 Tools
 * @author LaiFQZzr
 * @date 2026/02/03 17:26
 */
export function getAllDynamicTools(): DynamicWorkflowTool[] {
  return Array.from(dynamicTools.values());
}

/**
 * @METHOD
 * @description 删除动态 Tool
 * @author LaiFQZzr
 * @date 2026/02/03 17:26
 */
export function deleteDynamicTool(name: string): boolean {
  return dynamicTools.delete(name);
}

/**
 * @METHOD
 * @description 检查 Tool 是否存在
 * @author LaiFQZzr
 * @date 2026/02/03 17:27
 */
export function hasDynamicTool(name: string): boolean {
  return dynamicTools.has(name);
}

/**
 * @METHOD
 * @description 判断值是否为连接引用（不能作为可配置参数） —— 连接引用格式：[nodeId, slotIndex] 或更复杂的嵌套数组
 * @author LaiFQZzr
 * @date 2026/02/03 16:53
 */
function isConnectionReference(value: ComfyInputValue): boolean {
  if (!Array.isArray(value)) return false;
  if (value.length === 0) return false;
  // 连接引用通常是 [string, number] 格式
  if (
    value.length === 2 &&
    typeof value[0] === "string" &&
    typeof value[1] === "number"
  ) {
    return true;
  }
  // 嵌套数组也可能是连接引用
  if (Array.isArray(value[0])) {
    return true;
  }
  return false;
}

/**
 * @METHOD
 * @description 获取参数类型
 * @author LaiFQZzr
 * @date 2026/02/03 16:59
 */
function getValueType(value: ComfyInputValue): ConfigurableParam["type"] {
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (Array.isArray(value)) return "array";
  return "string";
}

/**
 * @METHOD
 * @description 将值转换为 Zod Schema
 * @author LaiFQZzr
 * @date 2026/02/03 17:00
 */
function valueToZodSchema(
  value: ComfyInputValue,
  description?: string,
): z.ZodTypeAny {
  const type = getValueType(value);

  switch (type) {
    case "string":
      return z
        .string()
        .default(value as string)
        .describe(description || `字符串值，默认: ${value}`);
    case "number":
      return z
        .number()
        .default(value as number)
        .describe(description || `数值，默认: ${value}`);
    case "boolean":
      return z
        .boolean()
        .default(value as boolean)
        .describe(description || `布尔值，默认: ${value}`);
    case "array":
      return z
        .array(z.any())
        .default(value as any[])
        .describe(description || `数组值`);
    default:
      return z.any().describe(description || "任意值");
  }
}

/**
* @METHOD
* @description 从 workflow 中提取可配置参数
                提取规则：
                  1. 排除连接引用（数组形式的连接）
                  2. 提取基础类型值（string, number, boolean）
                  3. 某些特定类型的节点输入可以被智能识别（如种子、提示词等）
* @author LaiFQZzr
* @date 2026/02/03 17:09
*/
export function extractConfigurableParams(
  workflow: ComfyPromptConfig,
): ConfigurableParam[] {
  const params: ConfigurableParam[] = [];

  for (const [nodeId, nodeConfig] of Object.entries(workflow)) {
    const { inputs, class_type, _meta } = nodeConfig;

    for (const [inputKey, value] of Object.entries(inputs)) {
      if (isConnectionReference(value)) {
        continue;
      }

      if (value === null || value === undefined) {
        continue;
      }

      // 检测节点标题是否以 "=>" 开头 - 表示 AGENT 必须填充
      const nodeTitle = _meta?.title || "";
      const isRequired = nodeTitle.startsWith("=>");

      let description = "";

      if (isRequired) {
        description = `【必须填充】`;
      }

      description += `${class_type} 节点的 ${inputKey} 参数`;

      const lowerKey = inputKey.toLowerCase();
      if (lowerKey.includes("seed") || lowerKey.includes("种子")) {
        description += `随机种子 (Seed)，控制生成结果的随机性`;
      } else if (lowerKey.includes("prompt") || lowerKey.includes("text")) {
        description += `提示词文本，支持多行`;
      } else if (lowerKey.includes("width") || lowerKey.includes("宽度")) {
        description += `图像宽度 (像素)`;
      } else if (lowerKey.includes("height") || lowerKey.includes("高度")) {
        description += `图像高度 (像素)`;
      } else if (lowerKey.includes("steps") || lowerKey.includes("步数")) {
        description += `采样步数`;
      } else if (lowerKey.includes("cfg") || lowerKey.includes("scale")) {
        description += `CFG Scale，提示词遵循程度`;
      }

      // 如果是必须填充的节点，添加额外说明
      if (isRequired) {
        description += ` (原值: ${JSON.stringify(value)})`;
      }

      params.push({
        path: `${nodeId}.${inputKey}`,
        nodeId,
        inputKey,
        type: getValueType(value),
        defaultValue: value,
        classType: class_type,
        nodeTitle,
        description,
        required: isRequired,
      });
    }
  }

  return params;
}

/**
 * @METHOD
 * @description 根据可配置参数生成 Zod Schema
 * @author LaiFQZzr
 * @date 2026/02/03 17:14
 */
export function generateZodSchema(
  params: ConfigurableParam[],
): Record<string, z.ZodTypeAny> {
  const schema: Record<string, z.ZodTypeAny> = {};

  for (const param of params) {
    const key = `${param.nodeId}_${param.inputKey}`;
    schema[key] = valueToZodSchema(param.defaultValue, param.description);
  }

  return schema;
}

/**
 * @METHOD
 * @description 将AGENT修改的输入合并到 workflow 模板
 * @author LaiFQZzr
 * @date 2026/02/03 17:16
 */
export function mergeParamsToWorkflow(
  template: ComfyPromptConfig,
  params: ConfigurableParam[],
  userInputs: Record<string, any>,
): ComfyPromptConfig {
  const workflow = JSON.parse(JSON.stringify(template)) as ComfyPromptConfig;

  for (const param of params) {
    const key = `${param.nodeId}_${param.inputKey}`;
    const userValue = userInputs[key];

    if (userValue !== undefined && workflow[param.nodeId!]) {
      workflow[param.nodeId!].inputs[param.inputKey!] = userValue;
    }
  }

  return workflow;
}

/**
 * @METHOD
 * @description 创建动态 Workflow Tool
 * @author LaiFQZzr
 * @date 2026/02/03 17:18
 */
export function createDynamicWorkflowTool(
  name: string,
  sourcePromptId: string,
  workflow: ComfyPromptConfig,
  customTitle?: string,
  customDescription?: string,
): DynamicWorkflowTool {
  const configurableParams = extractConfigurableParams(workflow);

  const schema = generateZodSchema(configurableParams);

  const paramDescriptions = configurableParams
    .map(
      (p) =>
        `- ${p.nodeId}_${p.inputKey}: ${p.description} (默认: ${JSON.stringify(p.defaultValue)})`,
    )
    .join("\n");

  const tool: DynamicWorkflowTool = {
    name,
    title: customTitle || `Workflow: ${name}`,
    description:
      customDescription ||
      `基于历史任务 ${sourcePromptId} 创建的动态工作流工具。\n\n` +
        `可配置参数:\n${paramDescriptions}\n\n` +
        `注意：只能修改参数值，不能修改工作流结构。`,
    sourcePromptId,
    workflowTemplate: JSON.parse(JSON.stringify(workflow)),
    configurableParams,
    schema,
    createdAt: Date.now(),
  };

  dynamicTools.set(name, tool);

  return tool;
}

/**
 * @METHOD
 * @description 执行动态 Workflow Tool
 * @author LaiFQZzr
 * @date 2026/02/03 17:27
 */
export async function executeDynamicWorkflowTool(
  toolName: string,
  userInputs: Record<string, any>,
  client: ComfyClient,
): Promise<any> {
  const tool = getDynamicTool(toolName);
  if (!tool) {
    return `动态工具 "${toolName}" 不存在`;
  }

  // 合并用户输入到 workflow
  const workflow = mergeParamsToWorkflow(
    tool.workflowTemplate,
    tool.configurableParams,
    userInputs,
  );

  return workflow;
}

/**
 * @METHOD
 * @description 生成动态 Tool 的参数示例
 * @author LaiFQZzr
 * @date 2026/02/03 17:24
 */
export function generateToolExampleParams(
  tool: DynamicWorkflowTool,
): Record<string, any> {
  const example: Record<string, any> = {};

  for (const param of tool.configurableParams) {
    const key = `${param.nodeId}_${param.inputKey}`;
    example[key] = param.defaultValue;
  }

  return example;
}
