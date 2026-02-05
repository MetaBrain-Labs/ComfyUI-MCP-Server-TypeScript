# ComfyUI MCP 动态工作流工具 - AGENT 使用指南

## 概述

本 MCP 服务允许你基于 ComfyUI 历史任务创建**可重用的动态工作流工具**。核心特点是：

- **结构保护**：只能修改参数值，不能改变工作流结构
- **参数分级**：明确区分【必须填充】和【可选修改】参数
- **模板复用**：一次创建，多次执行，参数可灵活调整

---

## 节点标题标记规则（重要）

ComfyUI 节点的 `_meta.title` 使用特定前缀来标记参数重要性：

| 标记 | 含义 | 示例 | AGENT 处理方式 |
|------|------|------|----------------|
| `==xxx==` | 工作流名称/描述 | `==生成全图（带背景图）==` | 已用于命名工作流，不作为可配置参数 |
| `=>xxx` | **必须填充** | `=>CLIP文本编码(正向提示词)` | **必须**根据用户需求填充，不可使用默认值 |
| 无标记/其他 | 可选修改 | `UNet加载器` | AGENT **自行判断**是否需要修改 |

### 参数响应示例

```javascript
// cui_create_workflow_tool 返回的参数示例
{
  "configurableParams": [
    {
      "key": "3_text",
      "path": "3.text",
      "type": "string",
      "defaultValue": "__prompt__",
      "description": "【必须填充】提示词文本，支持多行 (原值: \"__prompt__\")",
      "nodeTitle": "=>CLIP文本编码(正向提示词)",
      "classType": "CLIPTextEncode",
      "required": true        // ← true 表示必须填充
    },
    {
      "key": "5_seed",
      "path": "5.seed",
      "type": "number",
      "defaultValue": 1050097129315662,
      "description": "随机种子 (Seed)，控制生成结果的随机性",
      "nodeTitle": "K采样器",
      "classType": "KSampler",
      "required": false       // ← false 表示可选修改
    }
  ],
  "requiredParams": ["3_text", "4_text"]  // ← 必须填充的参数 key 列表
}
```

---

## 执行流程（标准 3 步法）

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: 探索 - 发现可用的历史工作流                               │
├─────────────────────────────────────────────────────────────────┤
│  Tool: cui_init_workflow                                        │
│  目的: 扫描 ComfyUI 历史任务，获取可用的工作流列表                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: 创建 - 基于历史任务创建动态 Tool                         │
├─────────────────────────────────────────────────────────────────┤
│  Tool: cui_create_workflow_tool                                 │
│  输入: promptId（来自 Step 1 的工作流 ID）                        │
│  输出: 动态 Tool + 可配置参数列表（带 required 标记）              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: 执行 - 使用动态 Tool 生成图像                            │
├─────────────────────────────────────────────────────────────────┤
│  Tool: cui_execute_dynamic_tool                                 │
│  输入: toolName + 必须填充参数 + 可选修改参数                      │
│  注意: required=true 的参数必须根据用户需求填写，不可使用默认值     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 详细步骤说明

### Step 1: 初始化工作流列表

**何时调用**：首次使用或需要刷新工作流列表时

```javascript
// 调用
cui_init_workflow({
  maxItems: 3,    // 获取最近 3 个任务
  offset: 0,      // 从第 0 个开始
  append: true    // 追加到现有列表
})

// 返回关键信息
{
  "success": true,
  "detail": {
    "data": {
      "itemsCollected": 1,  // 收集到 1 个工作流
      "savedPath": ".../workflow.json"
    }
  }
}
```

**下一步**：使用 `cui_get_workflow_tasks` 查看工作流列表，选择感兴趣的 `promptId`

---

### Step 2: 创建动态 Tool

**何时调用**：找到想要复用的历史任务后

```javascript
// 调用
cui_create_workflow_tool({
  promptId: "ef1035db-a023-4b1d-955c-09491358601b",  // 历史任务ID
  toolName: "flux_txt2img",                            // 新Tool名称（唯一）
  title: "Flux 文生图",                                // 显示标题（可选）
  description: "基于Flux模型的文本生成图像工作流"       // 描述（可选）
})

// 返回关键信息（注意 required 标记）
{
  "success": true,
  "message": "成功创建动态 Tool: flux_txt2img",
  "tool": {
    "name": "flux_txt2img",
    "configurableParamsCount": 15,
    "configurableParams": [
      {
        "key": "3_text",
        "path": "3.text",
        "type": "string",
        "defaultValue": "__prompt__",
        "description": "【必须填充】提示词文本，支持多行 (原值: \"__prompt__\")",
        "nodeTitle": "=>CLIP文本编码(正向提示词)",
        "classType": "CLIPTextEncode",
        "required": true           // ← 必须填充！
      },
      {
        "key": "4_text",
        "path": "4.text",
        "type": "string",
        "defaultValue": "__negative__",
        "description": "【必须填充】提示词文本，支持多行 (原值: \"__negative__\")",
        "nodeTitle": "=>CLIP文本编码(负向提示词)",
        "classType": "CLIPTextEncode",
        "required": true           // ← 必须填充！
      },
      {
        "key": "5_seed",
        "path": "5.seed",
        "type": "number",
        "defaultValue": 1050097129315662,
        "description": "随机种子 (Seed)，控制生成结果的随机性",
        "nodeTitle": "K采样器",
        "classType": "KSampler",
        "required": false          // ← 可选修改
      }
      // ... 其他参数
    ],
    "requiredParams": ["3_text", "4_text"],  // ← 快速查看必填参数
    "exampleUsage": {
      "3_text": "__prompt__",
      "4_text": "__negative__",
      "5_seed": 1050097129315662
      // ... 所有参数的默认值
    }
  }
}
```

**AGENT 处理逻辑**：
1. 检查 `requiredParams` 列表，这些是用户必须提供的信息
2. 向用户询问 `required=true` 的参数值（如正向提示词、负向提示词）
3. 可选参数（`required=false`）由 AGENT 判断是否需要修改

---

### Step 3: 执行动态 Tool

**何时调用**：收集到所有必须参数后

```javascript
// 调用 - required=true 的参数必须填写，不能保留默认值
cui_execute_dynamic_tool({
  toolName: "flux_txt2img",
  params: {
    // 【必须填充】必须根据用户需求填写，不能使用 "__prompt__"
    "3_text": "a beautiful sunset over mountains, digital art, cinematic lighting",
    "4_text": "low quality, blurry, distorted",
    
    // 【可选修改】AGENT 根据判断决定是否修改
    "5_seed": 123456,        // 使用新种子获得不同结果
    "6_width": 1024,         // 用户要求更高分辨率
    "6_height": 768
    // 其他参数使用默认值
  }
})

// 返回结果
{
  "success": true,
  "promptId": "abc-123-...",      // 新任务的 promptId
  "outputs": {                     // 输出结果
    "images": [...]
  },
  "executionTime": 15320           // 执行时间(ms)
}
```

---

## AGENT 决策流程

```
用户输入
   │
   ▼
解析用户需求（提示词内容、风格、尺寸等）
   │
   ▼
检查 cui_create_workflow_tool 返回的参数
   │
   ├── required: true 的参数 ──→ 必须向用户确认或从需求中提取
   │                              不能使用默认值！
   │
   └── required: false 的参数 ──→ AGENT 自行判断
                                   ├── 用户明确提到的 → 修改
                                   ├── 常识性调整（如尺寸） → 修改
                                   └── 未提及的 → 使用默认值
   │
   ▼
组装 params 对象
   │
   ▼
执行 cui_execute_dynamic_tool
```

---

## 完整对话示例

### 场景：用户想要生成一张海边夕阳图片

```
User: 帮我生成一张海边夕阳的图片

Agent: 我来帮你生成海边夕阳图片。我先查找可用的工作流工具。

[Step 1] 扫描历史工作流...
-> cui_init_workflow({ maxItems: 5 })

[Step 2] 查看可用工作流，发现 Flux 文生图工作流
-> cui_get_workflow_tasks()
<- 发现 promptId: "ef1035db-..."

[Step 3] 基于该任务创建动态 Tool...
-> cui_create_workflow_tool({
     promptId: "ef1035db-...",
     toolName: "sunset_beach"
   })
<- 返回参数列表，其中 requiredParams: ["3_text", "4_text"]

Agent: 我找到了一个 Flux 文生图工作流。为了生成海边夕阳图片，
      我需要确认以下信息：
      
      1. 正向提示词：海边夕阳场景的具体描述
         （例如：a beautiful beach at sunset, waves, golden hour...）
         
      2. 负向提示词：你不希望出现的元素
         （例如：low quality, blurry, distorted...）

User: 正向：海边夕阳，金色沙滩，椰子树，高品质
      负向：低质量，模糊，变形的人

Agent: 收到！我还将调整图像尺寸为 1024x768 以获得更好效果。

[Step 4] 执行工作流...
-> cui_execute_dynamic_tool({
     toolName: "sunset_beach",
     params: {
       "3_text": "海边夕阳，金色沙滩，椰子树，高品质，cinematic lighting",
       "4_text": "低质量，模糊，变形的人",
       "6_width": 1024,
       "6_height": 768
     }
   })
<- 返回生成结果

Agent: 完成了！海边夕阳图片已生成。
      如果你想要调整场景或其他参数，我可以再次使用这个工具。
```

---

## 错误处理

### 常见错误

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `Tool "xxx" 不存在` | Tool 未创建或名称错误 | 先调用 `cui_create_workflow_tool` 创建 |
| `Invalid parameter type` | 参数类型不匹配 | 检查参数类型（string/number/boolean） |
| `Cannot modify connection` | 尝试修改连接引用 | 只能修改基础类型值，不能修改 `["nodeId", slot]` 格式的连接 |
| `promptId not found` | 历史任务已被清理 | 使用 `cui_init_workflow` 获取新的 promptId |

---

## 最佳实践

### 1. 必须参数检查清单

执行前确保：
- [ ] 所有 `required: true` 的参数都有用户提供的值
- [ ] 没有保留像 `"__prompt__"`、`"__negative__"` 这样的占位符
- [ ] 提示词已根据用户需求定制

### 2. 可选参数决策指南

| 参数 | 何时修改 | 建议 |
|------|----------|------|
| `seed` | 用户想要不同结果 | 使用随机值或当前时间戳 |
| `width/height` | 用户指定尺寸或常识判断 | 标准尺寸：512/768/1024 |
| `steps` | 用户要求质量/速度调整 | 20-50 之间 |
| `cfg` | 用户要求风格强度调整 | 7-12 之间 |

### 3. Tool 复用

```javascript
// 创建一次，多次使用
await cui_create_workflow_tool({...})  // 只需执行一次

// 之后可以反复调用，每次只改必要的参数
await cui_execute_dynamic_tool({ 
  toolName: "sunset_beach", 
  params: { "3_text": "新提示词..." }  // 只改提示词
})
```

---

## 总结

**核心流程**：探索 → 创建 → 执行

**关键概念**：
1. `promptId` = 历史任务的唯一标识
2. `toolName` = 动态 Tool 的唯一名称
3. `params` = 要修改的参数，格式为 `{nodeId}_{inputKey}`
4. `required` = 标记是否必须填充（基于 `=>` 标题前缀）

**设计目的**：
- 让 AGENT 能安全地复用成功的工作流
- 通过 `=>` 标记明确哪些参数必须根据用户需求填写
- 保留 AGENT 对可选参数的判断和优化空间
