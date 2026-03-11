import "@modelcontextprotocol/sdk/client/streamableHttp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import "dotenv/config";
import { WorkflowConverter } from "../utils/workflow-converter";
import { ComfyClient } from "../utils/ws";
import {
  registerGetCoreManual,
  registerGetWorkflowsCatalog,
  registerGetWorkflowAPI,
  registerGetTaskDetail,
  registerMountWorkflow,
  registerQueuePrompt,
  registerQueueCustomPrompt,
  registerSaveCustomWorkflow,
  registerSaveTaskAssets,
  registerInterruptPrompt,
  registerGetPromptResult,
  registerGetSystemStatus,
  registerListModels,
  registerUploadAssets,
} from "./handlers";

export class ComfyMcpManager {
  private client: ComfyClient;
  private converter: WorkflowConverter;
  private isInitialized: boolean = false;

  constructor() {
    this.client = new ComfyClient();
    this.converter = new WorkflowConverter();
  }

  /**
   * @METHOD
   * @description 全局初始化，负责连接外部服务（只需在应用启动时调用一次）
   */
  public async initialize() {
    if (this.isInitialized) return;

    await this.client.connect();
    console.error("ComfyClient 已连接");

    await this.converter.init();
    console.error("WorkflowConverter 已初始化");

    this.isInitialized = true;
  }

  /**
   * @METHOD
   * @description 为每个 MCP 客户端请求创建全新的 Server 实例
   */
  public createSessionServer(): McpServer {
    const server = new McpServer(
      {
        name: "comfy-ui-advanced",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: { listChanged: true },
          resources: { listChanged: true, subscribe: true },
        },
      },
    );

    // 注册所有工具
    registerGetCoreManual(server);
    registerGetWorkflowsCatalog(server, this.client, this.converter);
    registerGetWorkflowAPI(server);
    registerGetTaskDetail(server);
    registerMountWorkflow(server);
    registerQueuePrompt(server, this.client);
    registerQueueCustomPrompt(server, this.client);
    registerSaveCustomWorkflow(server, this.client);
    registerSaveTaskAssets(server);
    registerInterruptPrompt(server);
    registerGetPromptResult(server);
    registerGetSystemStatus(server);
    registerListModels(server);
    registerUploadAssets(server);

    return server;
  }

  /**
   * @METHOD
   * @description 关闭所有底层连接（优雅退出时调用）
   */
  public shutdown() {
    if (this.isInitialized) {
      this.client.close();
      console.error("Manager 底层资源已清理");
    }
  }
}

export const mcpManager = new ComfyMcpManager();
