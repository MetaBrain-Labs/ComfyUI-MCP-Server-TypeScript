# ComfyUI-MCP-Server - ComfyUI Model Context Protocol Integration

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-success)](https://nodejs.org/)
[![MCP Protocol](https://img.shields.io/badge/Protocol-MCP-purple)](https://modelcontextprotocol.io/)
[![Static Badge](https://img.shields.io/badge/MetaBrainLabs-Org?logo=github&label=GitHub)](https://github.com/orgs/MetaBrain-Labs)

**ComfyUI-MCP-Server 是一个基于 MCP（Model Context Protocol / 模型上下文协议）的服务器实现，它将 ComfyUI 的工作流无缝转化为可供 AI 代理（Agents）调用的工具。**

通过本项目，您可以赋予 AI 助手（如 `Claude Desktop`、`Trae`、`Dify` 等）强大的图像与视频生成能力。完全通过自然语言交互，AI 即可实现：

- 🎨 **生成图像/视频**
  - 调用历史任务或初始工作流生成媒体内容。
  - 主动修改节点参数（受限/允许的参数范围内）以微调生成结果。
  - 自动化批量生成：同一工作流，不同风格呈现。
- 🔄 **触发与复用**
  - 触发新的工作流，或一键重用历史成功任务。
- 🛠️ **自定义执行**
  - 支持执行 AI 自定义的 JSON 管道（高级模式）。

<aside>
⚠️

**免责声明**

我们目前**没有**官方网站。您在网上看到的任何相关网站均为非官方性质，与本开源项目无关，请自行甄别风险。

**并且我们不提供任何收费服务，并且请用户注意TOKEN使用情况，产生任何损失与该组织无关。**

</aside>

## 🎬 演示视频

演示视频文件待补充…

## ✨ 核心能力

- 🔌 **工作流即工具**：将 ComfyUI 的节点图完美抽象为标准 MCP 工具。
- 🕰️ **历史任务复用模式**：高成功率的生成策略，复用已知成功的状态。
- 🛡️ **初始工作流验证**：在生成前进行节点连通性预检。
- 🧩 **标准 MCP 适配**：全面支持 STDIO 与 Streamable HTTP 通信。
- ⚡ **流式与进度支持**：支持生成进度报告（需 Client/Host 支持）。
- 🌍 **国际化双语支持**：内置中英文（zh/en）国际化。
- 🔬 **Skills 支持**：针对支持 Skills 的 AI 助手通过Skills进行深度优化。
- 📂 **资产管理**：支持从本地路径或网络 URL 自动上传资源至 ComfyUI。
- 🔄 **自动会话管理**：智能处理会话生命周期（当前主要针对 StreamHTTP）。

## 🚀 快速开始

<aside>
💡

**提示**

MCP 协议目前定义了两种客户端-服务器通信的标准传输机制：

- STDIO
- Streamable HTTP

本项目两者皆支持，请根据您的 MCP 客户端能力进行选择。

您有责任确保使用这些服务器符合相关条款，以及适用于您的任何法律、规则、法规、政策或标准。

</aside>

### 前置条件

- Node.js 18+
- ComfyUI 运行中

### 模式一：STDIO 连接 (推荐用于 Claude Desktop 等本地客户端)

- 克隆项目
- 安装依赖
  ```bash
  npm install
  ```
- 配置环境变量：
  - 仅需要在MCP Client/Host中配置下述json文件即可。
  - STDIO的全局变量需要在下述mcpServers中手动配置。
  ```json
  {
    "mcpServers": {
      "comfy-ui-advanced": {
        "command": "npx",
        "args": [
          "tsx",
          "E:\\comfyui-mcp\\ComfyUI-MCP-Server-1\\src\\server-stdio.ts"
        ],
        "env": {
          "LOCALE": "en",
          "MCP_SERVER_URL": "http://192.168.0.192:8189/mcp",
          "MCP_SERVER_IP": "http://192.168.0.192",
          "MCP_SERVER_PORT": "8189",
          "COMFY_UI_SERVER_IP": "http://192.168.0.171:8188",
          "COMFY_UI_SERVER_HOST": "192.168.0.171",
          "COMFY_UI_SERVER_PORT": "8188",
          "SYNC_MODE": "timed",
          "SYNC_POLL_INTERVAL_SECONDS": "3",
          "SYNC_EVENT_FALLBACK_INTERVAL_SECONDS": "300",
          "ONDEMAND_REFRESH_COOLDOWN_SECONDS": "3",
          "COMFY_UI_INSTALL_PATH": "",
          "WORKFLOW_NAME_REGEX": "^==(.+?)==$",
          "WORKFLOW_PARAM_REGEX": "^=>(.+)$",
          "LOG_LEVEL": "INFO"
        }
      }
    }
  }
  ```

### 模式二：StreamHTTP 连接 (推荐用于网络化/分布式部署)

- 克隆项目
- 安装依赖
  ```bash
  npm install
  ```
- 配置环境变量：
  - StreamHTTP的全局变量由[.env](./env)中指定，无需再下述mcpServers中配置全局变量。
  - 目前支持StreamHTTP的MCP Client/Host较少，应根据需求使用。
  ```json
  {
    "mcpServers": {
      "comfy-ui-advanced-http": {
        "url": "http://192.168.0.192:8189/mcp"
      }
    }
  }
  ```
- 启动StreamHTTP连接方式的Server
  ```bash
  npm run dev
  ```

### 调试工具 (MCP Inspector)

Inspector是MCP官方提供的MCP调试工具，推荐使用StreamHTTP作为Inspector的连接方式。

- 克隆项目
- 安装相关依赖
  ```bash
  npm install
  ```
- 启动StreamHTTP连接方式的Server：
  ```bash
  # 1. 在终端 A 启动 HTTP 服务
  npm run dev
  ```
- 启动Inspector：
  ```bash
  # 2. 在终端 B 启动 Inspector
  npm run inspector
  ```

启动完成后，控制台中会出现类似下述地址，复制地址到浏览器后即可开始调试相关工具：

```bash
# 每次启动MCP_PROXY_AUTH_TOKEN都不一样，因此每次启动后需要及时切换链接
http://localhost:6274/?MCP_PROXY_AUTH_TOKEN=d66fcf6cbbb3723c60bfef51f020e5e96811002a675e7162b065b44f2fe377f3
```

inspector启动成功后，浏览器页面配置参考：

![inspector配置示例](./docs/content/public/inspector-example.png)

## ⚙️ 环境配置

<aside>
💡

**注意**

下列是本服务器的全部环境配置参数以及对应的介绍，请优先阅读此。

下列环境配置参数中部分还未启用，未启动的均为后续计划中使用的。

</aside>

- 点击查看完整配置文件说明

  ```
  # =============================================================================
  # ComfyUI MCP Server - Configuration
  # 配置文件说明：
  #   [User Config]   用户配置 —— 根据您的部署环境修改此区块
  #   [System Config] 系统配置 —— 保持默认即可，无需修改
  # =============================================================================

  # =============================================================================
  # [User Config] 用户配置
  # Modify this section based on your deployment environment.
  # 根据您的部署环境修改以下内容。
  # =============================================================================

  # Language for MCP tool descriptions.
  # MCP 工具描述的显示语言。可选值：en（英文）| zh（中文）
  LOCALE=en

  # -----------------------------------------------------------------------------
  # ComfyUI Server Connection / ComfyUI 服务器连接
  # -----------------------------------------------------------------------------

  # Full URL of your ComfyUI server. No trailing slash.
  # ComfyUI 服务器的完整地址，末尾不加斜杠。
  COMFY_UI_SERVER_IP="http://192.168.0.171:8188"

  # Host (without protocol) and port. Used separately for WebSocket connections.
  # 主机名（不含协议头）和端口号，WebSocket 连接时单独使用。
  COMFY_UI_SERVER_HOST="192.168.0.171"
  COMFY_UI_SERVER_PORT="8188"

  # -----------------------------------------------------------------------------
  # Sync Mode / 同步模式
  # -----------------------------------------------------------------------------

  # Controls how the server detects workflow updates from ComfyUI.
  # 控制服务器检测 ComfyUI 工作流更新的方式。
  #
  #   timed  — Background loop polls ComfyUI at a fixed interval. (default)
  #             后台循环以固定间隔轮询 ComfyUI。（默认）
  #
  #   push   — ComfyUI plugin sends real-time save events; long fallback poll as safety net.
  #             Requires COMFY_UI_INSTALL_PATH (must be on same machine as ComfyUI).
  #             ComfyUI 插件实时推送保存事件；兜底长轮询作为安全网。
  #             需要配置 COMFY_UI_INSTALL_PATH（需与 ComfyUI 同机部署）。
  #
  #   manual — No background loop. Refresh only when tools are called
  #             (get_workflows_catalog / mount_workflow / queue_prompt).
  #             无后台循环，仅在调用工具时按需刷新
  #             （get_workflows_catalog / mount_workflow / queue_prompt）。
  #
  SYNC_MODE=timed

  # Polling interval in seconds for timed mode.
  # timed 模式的轮询间隔（秒）。
  SYNC_POLL_INTERVAL_SECONDS=3

  # Fallback polling interval in seconds for push mode (safety net for missed events).
  # push 模式的兜底轮询间隔（秒），用于捕捉遗漏的推送事件。
  SYNC_EVENT_FALLBACK_INTERVAL_SECONDS=300

  # Cooldown in seconds between manual mode refreshes.
  # Prevents excessive ComfyUI API calls when tools are called in quick succession.
  # manual 模式两次刷新之间的冷却时间（秒），防止工具短时间内连续调用时频繁请求 ComfyUI API。
  ONDEMAND_REFRESH_COOLDOWN_SECONDS=30

  # -----------------------------------------------------------------------------
  # Push Mode Plugin / 推送模式插件（仅 SYNC_MODE=push 时需要）
  # -----------------------------------------------------------------------------

  # Absolute path to your LOCAL ComfyUI installation root directory.
  # Required when SYNC_MODE=push: MCP Server will automatically deploy a lightweight
  # backend plugin that pushes workflow save events in real-time.
  # Leave blank if ComfyUI runs on a remote machine or if using timed/manual mode.
  #
  # 本地 ComfyUI 安装目录的绝对路径。
  # 使用 SYNC_MODE=push 时必填：MCP Server 会自动部署一个超轻量推送插件，
  # 实现工作流保存后的实时推送通知。
  # 若 ComfyUI 部署在远端机器上，或使用 timed/manual 模式，请留空。
  #
  # Windows 示例 / Example: COMFY_UI_INSTALL_PATH=C:/ComfyUI
  # Linux   示例 / Example: COMFY_UI_INSTALL_PATH=/home/user/ComfyUI
  COMFY_UI_INSTALL_PATH=

  # -----------------------------------------------------------------------------
  # Workflow Marker Patterns / 工作流标识符正则表达式
  # -----------------------------------------------------------------------------

  # Regex identifying the workflow name node (title of a PrimitiveStringMultiline node).
  # Must contain ONE capture group that extracts the MCP tool name.
  # Default matches titles like "==my_workflow=="
  # 工作流名称节点的标识正则（PrimitiveStringMultiline 节点的 title）。
  # 必须含一个捕获组提取工具名，默认匹配 ==名称== 格式。
  WORKFLOW_NAME_REGEX=^==(.+?)==$

  # Regex identifying configurable parameter nodes.
  # Must contain ONE capture group that extracts the parameter description.
  # Default matches titles like "=>prompt text"
  # 参数节点的标识正则，必须含一个捕获组提取参数描述，默认匹配 =>描述 格式。
  WORKFLOW_PARAM_REGEX=^=>(.+)$

  # =============================================================================
  # [System Config] 系统配置
  # Internal settings — change only if you know what you are doing.
  # 内部运行参数，通常无需修改。
  # =============================================================================

  # -----------------------------------------------------------------------------
  # MCP Server / MCP 服务地址
  # -----------------------------------------------------------------------------

  # MCP server bind address and listening port.
  # MCP 服务器的监听地址和端口（MCP 客户端连接此处）。
  MCP_SERVER_URL="http://192.168.0.192:8189/mcp"
  MCP_SERVER_IP="http://192.168.0.192"
  MCP_SERVER_PORT="8189"

  # -----------------------------------------------------------------------------
  # Logging / 日志配置
  # -----------------------------------------------------------------------------

  # Minimum log level written to stderr.
  # 输出到 stderr 的最低日志级别。
  # DEBUG | INFO | WARNING | ERROR  (default: INFO)
  LOG_LEVEL=INFO

  # Optional absolute path for a log file.
  # When set, logs are written to BOTH stderr and this file.
  # Leave blank to disable file logging.
  # 可选：日志文件的绝对路径。填写后同时输出到 stderr 和文件。留空则不开启文件日志。
  # LOG_FILE=

  # Log file rotation size. Default: 10 MB
  # 日志文件切割大小，默认 10 MB。
  # LOG_ROTATE=10 MB

  # Number of rotated log files to retain. Default: 7
  # 保留历史日志文件个数，默认 7。
  # LOG_RETAIN=7
  ```

## 🧰 可用工具集

AI 代理可以通过 MCP 协议调用以下内置工具：

| 工具名                  | 描述                                                                                                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_core_manual`       | 【系统指引】核心协议与操作字典。初始化或调用其他工具前必须优先读取，获取最新参数填充策略与报错恢复机制。                                                                           |
| `get_workflows_catalog` | 【目录检索】获取当前服务器支持的所有工作流清单。涉及生图的指令必须精确匹配此清单，严禁伪造或猜测工作流名称。                                                                       |
| `get_workflow_API`      | 【工作流API】读取目标工作流的全量底层拓扑JSON。体积庞大，仅在执行异常需排查最底层逻辑时调用，严禁在常规业务中使用防污染上下文。                                                    |
| `mount_workflow`        | 【参数挂载】提取目标生成任务的受支持交互参数Schema（屏蔽连线细节）。提交工作流任务前，必须调用此接口获取合法的参数键名表。                                                         |
| `queue_prompt`          | 【任务提交】向队列提交任务 Prompt。底层自动调度计算节点并向 Host 实时同步进度。必须确保所有键名已通过挂载校验，严禁编造键名。                                                      |
| `queue_custom_prompt`   | 【高级模式】直接向队列提交完整的原生 ComfyUI API Prompt JSON。仅在调试底层方案或响应明确专家指令时开放，常规任务严禁使用。                                                         |
| `save_custom_workflow`  | 【保存工作流】将自定义参数化工作流保存到服务器的工作流目录中并随后自动执行语法校验和挂载。提交的 JSON 必须符合规范（至少包含一处符合挂载规则的 ==名称== 节点），否则将被拒绝保存。 |
| `save_task_assets`      | 【保存生成资产】获取指定任务 (prompt_id) 的执行历史，并将产生的所有多媒体生成物 (图片、视频、GIF等) 下载并保存到指定的本地目录中。                                                 |
| `upload_assets`         | 【上传文件】将本地文件或网络 URL 上传至 ComfyUI 服务器的 input 目录，以便在工作流中直接应用。                                                                                      |
| `interrupt_prompt`      | 【任务取消】取消特定 `prompt_id` 的运算进程并强制移除队列中的等待项。                                                                                                              |
| `get_prompt_result`     | 【输出快照与资产】获取特定 Prompt 执行完成后的节点快照，提取生成的目标媒体文件（图像/视频链接）或回溯 Traceback 诊断错误。                                                         |
| `get_system_status`     | 【系统监控】采集内存、显存及 Python 运行时指标，用于排查 OOM 或服务死锁等底层异常。                                                                                                |
| `list_models`           | 【模型目录】轮询本地磁盘模型存放区。参数涉及具体模型文件时，必须前置调用此接口枚举校准，严禁凭空伪造模型文件名。                                                                   |
| `upload_assets`         | 【资产导入】当用户提供一张图片的本地路径或网络链接时，可调用此工具将图片上传 ComfyUI 服务器并处理。                                                                                |

## 示例

### Cluade Desktop

待补充…

### Trae

待补充…

## 🛠️ 故障排除

### 常见问题

1. **WebSocket 连接失败**
   - 确保 ComfyUI 正在运行
   - 检查 ComfyUI 的 WebSocket 端口配置
   - 检查 `.env` 中的 `COMFY_UI_SERVER_HOST` 与 `PORT` 是否准确配置。
2. **工作流执行失败**
   - 检查提交的参数类型是否与目标节点的要求（Schema）匹配。
   - 检查 ComfyUI 控制台是否有缺失自定义节点（Custom Nodes）的报错。
   - 查看 MCP Client/Host 对应 MCP Server 日志获取详细错误信息
3. **会话过期**
   - 默认 HTTP 会话超时时间为 30 分钟。如果进行超长视频渲染，可通过修改代码中的 `SESSION_TIMEOUT` 常量来延长。

## 🔬 技术细节

### 核心协议

1. **MCP (Model Context Protocol)**

   [What is the Model Context Protocol (MCP)? - Model Context Protocol](https://modelcontextprotocol.io/docs/getting-started/intro)

2. **JSON-RPC 2.0**

   [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)

3. **WebSocket**

   [The WebSocket API (WebSockets) - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

4. **REST API**

   [About the REST API - GitHub Docs](https://docs.github.com/en/rest/about-the-rest-api/about-the-rest-api?apiVersion=2022-11-28)

### 技术限制与安全考量

- **依赖性**：强依赖 ComfyUI 原生 API 与 WebSocket，不支持非 ComfyUI 标准格式的图表导入。
- **安全验证**：当前版本未实现强鉴权机制（Token/Auth），请**不要**将其暴露在公网环境下运行。建议在生产环境中配置 HTTPS 以及额外的网关层访问控制。
- **资源消耗**：高并发调用可能导致 ComfyUI 宿主机显存溢出（OOM），请在 AI 系统提示词中限制其并发请求频率。

### **图片生成模式**

- 通过历史任务生成图片：根据**已执行完毕且执行结果为SUCCESS**的历史任务生成图片。
  - 此方式可确保在模型等核心不受影响的情况下，保证工作流执行的成功率。
- 通过初始工作流生成图片：根据**无历史任务或历史任务的执行时间在其对应工作流最新修改时间之前**的工作流生成图片。
  - 此方式仅会针对工作流进行初步校验——保证结点间联通无异常，但并不保证工作流完整流程运行成功。
  - 如需保证生成图片的成功率，可考虑手动运行相关工作流。在工作流完整流程运行成功之后，历史任务中会产生对应的任务记录，后续AI工具即可使用历史任务生成图片的方式。
- AI工具自定义生成图片：**AI工具自行提供API JSON文件**并调用执行自定义工作流工具生成图片。
  - 此方式不会进行任何校验，一切校验交由ComfyUI后端进行，如API JSON文件格式、结点以及参数范围有问题，ComfyUI后端会进行拦截，并返回相应报错信息。
  - 此方式为兜底生成图片措施，在上述历史任务生成图片、初始工作流生成图片都无法使用的情况下使用，除此之外，用户应该避免使用该方式。

为希望将 AI 工具与 ComfyUI 强大的图片/视频生成工作流连接的开发者打造，涵盖从简单的自然语言查询到复杂的多步代理工作流。

## 🗺️ 后续计划

<aside>
💡

我们正积极扩展项目功能，如果您有好的建议，欢迎提交 Issue！

</aside>

- [ ] **增强工作流解析**：支持更复杂的嵌套节点与动态参数提取。
- [ ] **云服务集成**：适配主流 ComfyUI 云端托管平台（鉴权与 API 映射）。
- [ ] **连接优化**：完善 StreamHTTP 下的断线重连机制与状态保持。
- [ ] **性能面板**：增加可视化的资源占用与任务排队监控状态反馈。

## 🤝 贡献

欢迎贡献！请随时提交 Pull 请求。

### 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 打开 Pull Request

## 📄 许可证

本项目基于 **MIT** 许可证开源 - 详情请参阅 [LICENSE](./LICENSE) 文件。

_本项目为第三方社区开源驱动，并非 ComfyUI 官方产品，由 [MetaBrain-Labs](https://github.com/MetaBrain-Labs) 贡献孵化。_

## 📬 联系方式

_(注：因工作原因，邮件可能无法及时回复，请优先使用 GitHub Issues)_

`TypeScript` 版本作者：

[LaiFQZzr(lfq2376939781@gmail.com)](mailto:lfq2376939781@gmail.com)

[![Static Badge](https://img.shields.io/badge/LaiFQZzr-User?logo=github&label=GitHub)](https://github.com/LaiFQzzr)

`Python` 版本作者：

[OldDeer(q1498823915@outlook.com)](mailto:q1498823915@outlook.com)

[![Static Badge](https://img.shields.io/badge/OldDeer-User?logo=github&label=GitHub)](https://github.com/OldDeer00)
