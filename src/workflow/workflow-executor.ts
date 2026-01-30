import axios from "axios";
import { ComfyClient } from "../ws";
import { Result } from "../interface/result";
import { ExecutePromptResult } from "../interface/execute";

export interface WorkflowResult {
  success: boolean;
  promptId?: string;
  outputs?: any;
  error?: string;
  executionTime?: number;
}

export class WorkflowExecutor {
  private client: ComfyClient;
  private serverAddress: string;

  constructor() {
    const serverHost = process.env.COMFY_UI_SERVER_HOST || "127.0.0.1";
    const serverPort = process.env.COMFY_UI_SERVER_PORT || "8188";
    this.serverAddress = `http://${serverHost}:${serverPort}`;
    this.client = new ComfyClient();
  }

  /**
   * 执行工作流并等待完成
   */
  public async executeWorkflow(workflow: any): Promise<Result<any>> {
    const startTime = Date.now();
    let promptId: string | null = null;

    try {
      // 1. 建立 WebSocket 连接
      console.error("Step 1: Establishing WebSocket connection...");
      await this.client.connect();

      // 2. 创建 Promise 来等待执行完成
      const executionPromise = new Promise<WorkflowResult>(
        (resolve, reject) => {
          let hasResolved = false;

          // 设置超时
          const timeout = setTimeout(
            () => {
              if (!hasResolved) {
                hasResolved = true;
                reject(new Error("Workflow execution timeout (5 minutes)"));
              }
            },
            5 * 60 * 1000,
          );

          // 监听执行开始
          this.client.hook.onExecutionStart = (data) => {
            promptId = data.prompt_id;
            console.error(`Execution started: ${promptId}`);
          };

          // 监听进度
          this.client.hook.onProgress = (data) => {
            const { value, max } = data;
            const percent = ((value / max) * 100).toFixed(1);
            console.error(`Progress: ${value}/${max} (${percent}%)`);
          };

          // 监听节点执行
          this.client.hook.onNodeExecuting = (data) => {
            if (data.node) {
              console.error(`Executing node: ${data.node}`);
            }
          };

          // 监听执行完成
          this.client.hook.onExecuted = (data) => {
            console.error(`Node executed:`, data);

            // 检查是否是最后一个节点
            if (data.output) {
              if (!hasResolved) {
                hasResolved = true;
                clearTimeout(timeout);
                resolve({
                  success: true,
                  promptId: promptId || undefined,
                  outputs: data.output,
                  executionTime: Date.now() - startTime,
                });
              }
            }
          };

          // 监听执行错误
          this.client.hook.onExecutionError = (data) => {
            console.error(`Execution error:`, data);
            if (!hasResolved) {
              hasResolved = true;
              clearTimeout(timeout);
              resolve({
                success: false,
                promptId: promptId || undefined,
                error: JSON.stringify(data),
                executionTime: Date.now() - startTime,
              });
            }
          };

          // 监听执行中断
          this.client.hook.onExecutionInterrupted = (data) => {
            console.error(`Execution interrupted:`, data);
            if (!hasResolved) {
              hasResolved = true;
              clearTimeout(timeout);
              resolve({
                success: false,
                promptId: promptId || undefined,
                error: "Execution was interrupted",
                executionTime: Date.now() - startTime,
              });
            }
          };
        },
      );

      // 3. 发送 POST 请求到 /prompt
      console.error("Step 2: Sending workflow to /prompt...");

      // workflow里面的内容需要请求一遍获取准确promptId之后才能确定
      // todo 获取对应promptId的内容
      const response = await axios.post<ExecutePromptResult>(
        `${this.serverAddress}/prompt`,
        {
          prompt: workflow,
        },
      );

      promptId = response.data.prompt_id;
      console.error(`Prompt submitted: ${promptId}`);

      // 4. 等待执行完成
      console.error("Step 3: Waiting for execution to complete...");
      const result = await executionPromise;

      return result;
    } catch (error: any) {
      console.error("Workflow execution failed:", error.message);
      return {
        success: false,
        promptId: promptId || undefined,
        error: error.message,
        executionTime: Date.now() - startTime,
      };
    } finally {
      // 5. 无论如何都关闭 WebSocket 连接
      console.error("🔌 Step 4: Closing WebSocket connection...");
      this.client.close();
    }
  }
}
