import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types";
import { ObjectInfoResponse } from "../types/object-info";
import { ComfyInputValue, ComfyPromptConfig } from "../types/task";
import {
  ComfyLink,
  ComfyNode,
  ComfyNodeMode,
  ComfyUIWorkflow,
} from "../types/workflow";
import { api } from "../api/api";

/**
 * @METHOD
 * @description 根据 ComfyUI 规则，将从原始工作流中获取的信息（ComfyUIWorkflow）格式化为执行工作流需要用到的信息（ComfyPromptConfig）
 */
export class WorkflowConverter {
  private objectInfo: ObjectInfoResponse = {};

  /**
   * @METHOD
   * @description 初始化，加载图的节点对象定义
   */
  async init(): Promise<void> {
    this.objectInfo = await api.getNodeDefs();
  }

  /**
   * @METHOD
   * @description 格式化核心方法 —— 将 ComfyUIWorkflow 转换为 ComfyPromptConfig
   * @param workflow ComfyUIWorkflow 数据
   * @returns ComfyPromptConfig 对象，可直接用于 /prompt 接口
   */
  convert(workflow: ComfyUIWorkflow): ComfyPromptConfig {
    const output: ComfyPromptConfig = {};
    const workflowId = workflow?.id || "";

    // 1. 创建所有节点的映射，过滤掉不需要的节点
    const validNodes = workflow.nodes.filter((node: ComfyNode) => {
      return (
        !node.mode ||
        (node.mode !== ComfyNodeMode.Bypass &&
          node.mode !== ComfyNodeMode.Never)
      );
    });

    // 2. 构建节点ID到节点的映射
    const nodeMap = new Map<string, ComfyNode>();
    validNodes.forEach((node: ComfyNode) => {
      nodeMap.set(String(node.id), node);
    });

    // 3. 构建连接关系映射 links 结构: [link_id, origin_id, origin_slot, target_id, target_slot, link_type]
    const linksMap = new Map<string, Array<string | number>>();
    workflow.links.forEach((link: ComfyLink) => {
      const linkId = link[0];
      const originId = String(link[1]);
      const originSlot = link[2];
      const linkType = link[5];

      const linkKey = `${linkId}:${linkType}`;
      if (!linksMap.has(linkKey)) {
        linksMap.set(linkKey, []);
      }
      linksMap.get(linkKey)!.push(originId, originSlot);
    });

    // 4. 处理每个节点
    validNodes.forEach((node: ComfyNode) => {
      const nodeId = node.id;
      const inputs: Record<string, ComfyInputValue> = {};
      const inputNames: string[] = [];
      let noLink = 0;

      const object = Object.entries(this.objectInfo).find(([key, value]) => {
        return key === node.type;
      });

      if (!object) {
        throw new McpError(
          ErrorCode.InternalError,
          "MCP_OBJECT_INFO_NOT_FOUND",
        );
      }

      Object.entries(object[1].input.required).forEach(([inputName, input]) => {
        inputNames.push(inputName);
      });

      if (object[1].input.optional) {
        Object.entries(object[1].input.optional).forEach(
          ([inputName, input]) => {
            inputNames.push(inputName);
          },
        );
      }

      if (object[1].input.hidden) {
        Object.entries(object[1].input.hidden).forEach(([inputName, input]) => {
          inputNames.push(inputName);
        });
      }

      inputNames.forEach((inputName: string) => {
        for (let i = 0; i < node.inputs.length; i++) {
          if (inputName === node.inputs[i].name) {
            if (node.inputs[i].link !== null && !node.inputs[i].widget) {
              inputs[inputName] =
                linksMap.get(`${node.inputs[i].link}:${node.inputs[i].type}`) ||
                [];
            } else {
              if (Array.isArray(node.widgets_values)) {
                if (node.widgets_values[noLink] === "randomize") {
                  noLink++;
                }
                inputs[inputName] = node.widgets_values[noLink++];
              } else if (
                typeof node.widgets_values === "object" &&
                node.widgets_values !== null
              ) {
                inputs[inputName] = node.widgets_values[inputName];
              }
            }
            break;
          }
        }
      });

      // 构建节点对象
      output[nodeId] = {
        inputs,
        class_type: node.type,
        _meta: {
          title: node.title || node.type,
        },
      };
    });

    return output;
  }
}
