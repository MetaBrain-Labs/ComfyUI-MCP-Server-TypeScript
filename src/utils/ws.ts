import { randomUUID } from "crypto";
import "dotenv/config";
import WebSocket from "ws";
import { ComfyClientHook } from "../hooks/websocket";

export class ComfyClient {
  private ws: WebSocket | null = null;
  private clientId: string;
  private serverAddress: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 3000;
  private isManualClose: boolean = false;

  public hook: ComfyClientHook = new ComfyClientHook();

  constructor() {
    this.clientId = randomUUID().replace(/-/g, "");
    const serverHost = process.env.COMFY_UI_SERVER_HOST || "127.0.0.1";
    const serverPort = process.env.COMFY_UI_SERVER_PORT || "8188";
    this.serverAddress = `${serverHost}:${serverPort}`;
  }

  /**
   * @METHOD
   * @description 连接到 ComfyUI WebSocket 服务器
   */
  public async connect(): Promise<void> {
    const serverIp = process.env.COMFY_UI_SERVER_IP || "http://127.0.0.1:8188";
    const urlObj = new URL(serverIp);
    const protocol = urlObj.protocol === "https:" ? "wss" : "ws";

    const wsUrl = `${protocol}://${this.serverAddress}/ws?clientId=${this.clientId}`;

    console.error(`Connecting to ComfyUI: ${wsUrl}`);

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);

      this.ws.on("open", () => {
        this.sendJson({
          type: "feature_flags",
          data: {
            supports_preview_metadata: true,
            supports_manager_v4_ui: true,
          },
        });
        this.reconnectAttempts = 0;
        this.isManualClose = false;
        resolve();
      });

      this.ws.on("message", (data: WebSocket.RawData) => {
        this.handleMessage(data);
      });

      this.ws.on("error", (err) => {
        console.error("WebSocket Error:", err.message);
        reject(err);
      });

      this.ws.on("close", (code, reason) => {
        console.error(
          `Disconnected from ComfyUI (Code: ${code}, Reason: ${reason})`,
        );

        if (
          !this.isManualClose &&
          this.reconnectAttempts < this.maxReconnectAttempts
        ) {
          this.attemptReconnect();
        }
      });
    });
  }

  /**
   * @METHOD
   * @description 自动重连逻辑
   */
  private attemptReconnect(): void {
    this.reconnectAttempts++;
    console.error(
      `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`,
    );

    setTimeout(() => {
      this.connect().catch((err) => {
        console.error(`Reconnect failed:`, err.message);
      });
    }, this.reconnectDelay);
  }

  /**
   * @METHOD
   * @description 处理接收到的消息
   */
  private handleMessage(rawData: WebSocket.RawData): void {
    try {
      const msgString = rawData.toString();
      const msg = JSON.parse(msgString);

      const { type, data } = msg;

      this.dispatchMessage(type, data);
    } catch (error) {
      console.error("Failed to process message:", error);
    }
  }

  /**
   * @METHOD
   * @description 消息分发逻辑
   */
  private dispatchMessage(type: string, data: any): void {
    switch (type) {
      case "status":
        this.hook.onStatus(data);
        break;
      case "execution_start":
        this.hook.onExecutionStart(data);
        break;
      case "execution_cached":
        this.hook.onExecutionCached(data);
        break;
      case "executing":
        this.hook.onNodeExecuting(data);
        break;
      case "progress_state":
        this.hook.onProgressState(data);
        break;
      case "progress":
        this.hook.onProgress(data);
        break;
      case "executed":
        this.hook.onExecuted(data);
        break;
      case "execution_success":
        this.hook.onExecutionSuccess(data);
        break;
      case "execution_error":
        this.hook.onExecutionError(data);
        break;
      case "execution_interrupted":
        this.hook.onExecutionInterrupted(data);
        break;
      case "feature_flags":
        this.hook.handleFeatureFlags(data);
        break;
      default:
        this.hook.onUnhandledMessage(type, data);
        break;
    }
  }

  /**
   * @METHOD
   * @description 发送 JSON 消息
   */
  public sendJson(data: any): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        const jsonString = JSON.stringify(data);
        this.ws.send(jsonString);
        console.error("Message sent:", data);
        return true;
      } catch (error) {
        console.error("Failed to send message:", error);
        return false;
      }
    } else {
      console.error("Cannot send message: WebSocket is not open");
      return false;
    }
  }

  /**
   * @METHOD
   * @description 发送文本消息
   */
  public sendText(text: string): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(text);
      console.error("Text sent:", text);
      return true;
    } else {
      console.error("Cannot send text: WebSocket is not open");
      return false;
    }
  }

  /**
   * @METHOD
   * @description 手动关闭连接
   */
  public close(code: number = 1000, reason: string = "Manual close"): void {
    this.isManualClose = true;
    if (this.ws) {
      this.ws.close(code, reason);
      this.ws = null;
    }
  }

  /**
   * @METHOD
   * @description 检查连接状态
   */
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * @METHOD
   * @description 获取客户端 ID
   */
  public getClientId(): string {
    return this.clientId;
  }
}
