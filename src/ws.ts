import WebSocket, { CloseEvent, ErrorEvent, Event, MessageEvent } from "ws";
import axios from "axios";
import { randomUUID } from "crypto";
import "dotenv/config";
import { ComfyClientHook } from "./hooks/websocket";

export class ComfyClient {
  private ws: WebSocket | null = null;

  public hook: ComfyClientHook = new ComfyClientHook();

  /**
   * @METHOD
   * @description 连接Comfy UI WebSocket服务器
   * @author LaiFQZzr
   * @date 2026/01/14 16:57
   */
  public async connect(): Promise<void> {
    const serverHost = process.env.COMFY_UI_SERVER_HOST || "127.0.0.1";
    const serverPort = process.env.COMFY_UI_SERVER_PORT || "8188";

    const serverAddress = `${serverHost}:${serverPort}`;
    const clientId = randomUUID().replace(/-/g, "");

    const wsUrl = `ws://${serverAddress}/ws?clientId=${clientId}`;
    console.log(`🔌 Connecting to ComfyUI: ${wsUrl}`);

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);

      this.ws.on("open", () => {
        console.log("✅ Connected to ComfyUI WebSocket");
        resolve();
      });

      this.ws.on("message", (data: WebSocket.RawData) => {
        const msg = JSON.parse(data.toString());
        this.dispatchMessage(msg);
      });

      this.ws.on("error", (err) => {
        console.error("❌ WebSocket Error:", err);
        reject(err);
      });

      this.ws.on("close", () => {
        console.log("⚠️ Disconnected from ComfyUI");
      });
    });
  }

  /**
   * @METHOD
   * @description 向Comfy UI WebSocket服务器发送 JSON 消息的方法
   * @author LaiFQZzr
   * @date 2026/01/14 16:58
   */
  public sendJson(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const jsonString = JSON.stringify(data);
      this.ws.send(jsonString);
      console.log("📤 Message sent:", data);
    } else {
      console.warn("⚠️ Cannot send message: WebSocket is not open");
    }
  }

  /**
   * @METHOD
   * @description 手动关闭Comfy UI WebSocket服务器
   * @author LaiFQZzr
   * @date 2026/01/14 16:58
   */
  public close() {
    if (this.ws) {
      this.ws.close();
    }
  }

  /**
   * 核心分发逻辑：解析 JSON 并调用 Hook 对应方法
   */
  private dispatchMessage(rawData: WebSocket.RawData) {
    try {
      // 忽略二进制数据 (Preview Image)
      if (Buffer.isBuffer(rawData)) return;

      const msgString = rawData.toString();
      const msg = JSON.parse(msgString);

      console.log("接收到的msg", msg);

      // msg 结构通常是: { type: string, data: any }
      const { type, data } = msg;

      // 路由分发
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
        case "progress":
          this.hook.onProgress(data);
          break;
        case "executed":
          this.hook.onExecuted(data);
          break;
        case "feature_flags":
          this.hook.handleFeatureFlags(data);
          break;
        default:
          this.hook.onUnhandledMessage(type, data);
          break;
      }
    } catch (error) {
      console.error("Failed to process message:", error);
    }
  }
}
