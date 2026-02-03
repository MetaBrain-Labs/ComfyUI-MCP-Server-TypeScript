import { COMMON } from "../../../constants";

export default {
  instructions: `
    这是一个 ComfyUI 工作流服务器。

    重要提示：
    在使用任何工具之前，请先阅读相关的 Skill 文档以了解最佳实践。

    可用的 Skill 资源：
    - skill://comfyui-workflow - ComfyUI 工作流操作的完整指南
    - skill://image-generation - 图像生成的最佳实践

    建议工作流程：
    1. 首先读取相关的 skill:// 资源
    2. 根据 Skill 指导使用相应的工具
    3. 遵循 Skill 中的最佳实践
  `,

  promptId: "一次 “工作流执行任务” 的唯一 ID",

  collected: (offset: number, count: number, mode: string) =>
    `已从偏移量 ${offset} 处收集并保存 ${count} 条工作流，模式：${mode ? "追加" : "覆盖"}
      IMPORTANT: 
        要读取此文件内容，首先确定是否可使用 MCP 资源通道，不要尝试直接读取磁盘路径。
        请读取资源 URI: ${COMMON.WORKFLOW_RESOURCE_URI}
        如果无法使用 MCP 读取，请使用cui_get_workflow_tasks工具获取对应资源信息。
    `,
  collectedContent: {
    title: "查询 ComfyUI 工作流历史任务",
    description:
      "从 ComfyUI 中获取工作流历史任务，根据情况可以设置获取数量和偏移量",
    maxItems:
      "单次获取的最大历史任务条数。建议值: 小批量用 2 - 3,完整获取用 10",
    offset:
      "分页偏移量,从0开始。例如: offset = 0 获取前 N 条,offset = N 获取接下来的 N 条",
    append: "存储模式。true = 追加到现有数据(累积), false = 覆盖现有数据(重置)",
  },

  executeWorkflowOriginalTask: {
    title: "执行原始 API",
    description:
      "受限工具。仅用于明确要求的底层调试或无预设 API 生成。普通任务禁止使用。",
  },
};
