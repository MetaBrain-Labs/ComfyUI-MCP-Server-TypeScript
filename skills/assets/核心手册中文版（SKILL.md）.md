---
name: comfyui-workflow-automation
description: 管理 ComfyUI 生成任务的全生命周期，涵盖工作流发现、即时（JIT）工具挂载、执行监控、错误恢复策略以及系统健康检查。
---

# ComfyUI 工作流自动化

## 指令 (Instructions)

你必须严格遵守以下定义的协议来与 ComfyUI MCP 服务器进行交互。

### 第一阶段：发现与验证 (Discovery & Verification)

1. **搜索目录**：当用户请求生成任务时，调用 `cui_get_workflows_catalog`。分析列表以找到最佳的语义匹配项。`workflow_name` 将作为唯一的标识符。
2. **决策点**：
   - **找到匹配**：选择目标 `workflow_name` 并进入 **第二阶段**（工具挂载）。
   - **无匹配**：如果现有的工作流名称无法满足请求，请进入 **第 1.5 阶段**（自定义生成）。
3. **验证资产**：如果用户指定了模型（例如 "Flux"）或 LoRA，**切勿**猜测文件名。必须调用 `cui_list_models`（使用 `folder_name="checkpoints"` 或 `"loras"`）从服务器检索精确的、区分大小写的文件名。

### 第 1.5 阶段：自定义工作流生成（兜底方案）

- **触发条件**：在目录中未找到合适的工作流名称，或用户对现有结果不满意。
- **用户互动**：如果没有找到合适的工作流，或者用户对现有工作流生成的结果不满意，请提醒用户他们可以授权使用 `cui_execute_custom_workflow` 工具来定制符合其需求的工作流。
- **行动**：**仅在**用户明确请求时，根据你对 ComfyUI 节点的了解构建有效的 ComfyUI 工作流 JSON 结构。
- **执行**：使用生成的 JSON 调用 `cui_execute_custom_workflow`。
- **约束**：你对节点的有效性和连接逻辑负全责。确保 JSON 中使用的所有模型文件名均已通过 `cui_list_models` 验证。

### 第二阶段：工具挂载（即时编译） (Tool Mounting - JIT Compilation)

_仅适用于在第一阶段选择了工作流名称的情况。_  
4. **注册工具**：使用选定的名称调用 `cui_mount_workflow`。  
 _ `workflow_name`: 第一阶段确定的确切名称字符串（作为 ID）。  
 _ `extension_name`: 生成一个唯一的简短后缀（正则表达式：`^[a-z][a-z0-9_]*$`）。示例：`flux_p`。  
5. **关键停止序列 (CRITICAL STOP SEQUENCE)**：在调用 `cui_mount_workflow` 后立即执行：  
 _ **终止生成**。  
 _ 在本轮次中不要输出任何进一步的文本或工具调用。  
 \* 等待宿主（Host）刷新工具列表（新工具将在下一轮次中作为“虚拟”函数生效）。

### 第三阶段：执行 (Execution)

_仅适用于已挂载的工具。_  
6. **恢复与检查**：在下一轮对话中，新工具 `cui_execute_dynamic_task_{workflow_name}` 将变为可用状态。如果不确定具体参数，请先调用 `cui_get_workflow_definition`。  
7. **调用工具**：调用 `cui_execute_dynamic_task_{workflow_name}`，将用户意图映射到参数。  
 \* **多模态约束**：媒体输入（图像、音频、视频、遮罩、参考图）**必须**是公开的 HTTP/HTTPS URL。**拒绝**本地路径或 Base64 数据。

### 第四阶段：监控与交付 (Monitoring & Delivery)

8. **实时反馈**：将 MCP 通知（`execution_start`，`progress`）即时转达给用户（例如：“采样步骤 15/20...”），以防止用户焦虑和连接超时。
9. **完成**：收到 `execution_success` 后：
   - 使用 `prompt_id` 调用 `cui_get_task_result`。
   - 从 `outputs` 列表中提取 `url` 并展示给用户。如果你具备显示多媒体内容的能力，请同时在行内渲染它。

### 错误处理与安全性 (Error Handling & Safety)

- **找不到工具 (Tool Not Found)**：返回第二阶段并重新挂载（工具可能会过期）。
- **锁定 (423)**：如果目录正在建立索引，等待 10 秒后重试。
- **系统健康**：在执行重型任务（视频/批量生成）之前，检查 `cui_get_system_status`。如果显存 (VRAM) < 2GB，发出警告。
- **受限 API**：严禁在标准任务中使用 `cui_execute_custom_workflow`。仅当用户明确要求进行低级调试或严格需要覆盖目录的生成工作流结构时方可使用。

## 示例 (Examples)

### 场景：用户要求“使用 Flux 模型生成一张肖像画”

**第 1 轮：发现与资产验证**

> **思考**：用户想要使用特定模型 ("Flux")。我需要找到工作流并在服务器上验证确切的模型文件名。

1. 调用 `cui_get_workflows_catalog` -> 返回包含 `flux_portrait_v2` 的名称列表。
2. 调用 `cui_list_models(type_name="checkpoints")` -> 返回包含 `flux1-dev-fp8.safetensors` 的列表。

**第 2 轮：工具挂载**

> **思考**：我已经有了工作流名称 (`flux_portrait_v2`) 和模型名称。现在我必须挂载该工具。

1. 调用 `cui_mount_workflow(workflow_name="flux_portrait_v2", extension_name="flux_p")`。
2. **[停止生成]**

**第 3 轮：执行**

> **思考**：工具 `cui_execute_dynamic_task_flux_portrait_v2` 现已可用。

1. 调用 `cui_execute_dynamic_task_flux_portrait_v2(prompt="A cinematic portrait", ckpt_name="flux1-dev-fp8.safetensors")`。

**第 4 轮：监控**

> **系统事件**：`progress: step 10/20`  
> **助手**：“正在处理中... 采样步骤 10/20。”

**第 5 轮：交付**

> **系统事件**：`execution_success`

1. 调用 `cui_get_task_result(job_id="job_123")`。
2. **助手**：“这是您的结果：
   ![](...)"

ComfyUI 工作流参数分级规则：

1. 【必须填充】节点标题以 "=>" 开头
   - 示例：=>CLIP文本编码(正向提示词)
   - 行为：AGENT 必须根据用户需求填写，不能使用默认值如 "**prompt**"

2. 【可选修改】普通节点
   - 示例：K采样器、空Latent图像
   - 行为：AGENT 根据常识和用户要求判断是否修改

3. 【跳过】节点标题以 "== ==" 包裹
   - 示例：==生成全图（带背景图）==
   - 行为：用于工作流命名，不作为可配置参数

API 返回示例：
{
"configurableParams": [
{ "key": "3_text", "required": true, "description": "【必须填充】..." },
{ "key": "5_seed", "required": false, "description": "随机种子..." }
],
"requiredParams": ["3_text", "4_text"] // 快速查看必填项
}
