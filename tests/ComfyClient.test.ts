import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";

// ---- Mock axios ----
vi.mock("axios", () => ({
  default: {
    post: vi.fn(),
  },
}));

/**
 * Fake WebSocket（最小可用实现）
 */
class FakeWebSocket {
  static OPEN = 1;
  readyState = FakeWebSocket.OPEN;

  onopen?: () => void;
  onmessage?: (ev: { data: any }) => void;
  onerror?: (err: any) => void;
  onclose?: () => void;

  constructor(public url: string) {}

  triggerOpen() {
    this.onopen?.();
  }

  triggerMessage(data: any) {
    this.onmessage?.({ data });
  }

  close() {
    this.onclose?.();
  }
}

describe("ComfyClient", () => {
  let client: ComfyClient;
  let ws: FakeWebSocket;

  beforeEach(() => {
    vi.clearAllMocks();

    ws = new FakeWebSocket("ws://fake");

    client = new ComfyClient("127.0.0.1");

    // 手动注入 fake ws
    (client as any).ws = ws;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("queues prompt and resolves when executed message is received", async () => {
    (axios.post as any).mockResolvedValueOnce({
      data: { prompt_id: "prompt-1" },
    });

    const promise = client.queuePrompt({ test: "workflow" });

    // 模拟 ComfyUI WS 返回
    (client as any).handleMessage(
      JSON.stringify({
        type: "executed",
        data: {
          prompt_id: "prompt-1",
          output: {
            images: ["a.png"],
          },
        },
      })
    );

    const result = await promise;

    expect(result.images[0]).toBe("a.png");
    expect(axios.post).toHaveBeenCalledOnce();
  });

  it("supports multiple concurrent prompts", async () => {
    (axios.post as any)
      .mockResolvedValueOnce({ data: { prompt_id: "p1" } })
      .mockResolvedValueOnce({ data: { prompt_id: "p2" } });

    const p1 = client.queuePrompt({ a: 1 });
    const p2 = client.queuePrompt({ b: 2 });

    (client as any).handleMessage(
      JSON.stringify({
        type: "executed",
        data: {
          prompt_id: "p2",
          output: { images: ["b.png"] },
        },
      })
    );

    (client as any).handleMessage(
      JSON.stringify({
        type: "executed",
        data: {
          prompt_id: "p1",
          output: { images: ["a.png"] },
        },
      })
    );

    const r1 = await p1;
    const r2 = await p2;

    expect(r1.images[0]).toBe("a.png");
    expect(r2.images[0]).toBe("b.png");
  });

  it("throws error if websocket is not connected", async () => {
    (client as any).ws = null;

    await expect(client.queuePrompt({})).rejects.toThrow(
      "WebSocket not connected"
    );
  });

  it("rejects if execution times out", async () => {
    vi.useFakeTimers();

    (axios.post as any).mockResolvedValueOnce({
      data: { prompt_id: "timeout-id" },
    });

    const promise = client.queuePrompt({});

    // 推进 5 分钟
    vi.advanceTimersByTime(300_000);

    await expect(promise).rejects.toThrow(
      "Timeout waiting for ComfyUI generation"
    );
  });

  it("ignores binary websocket messages", async () => {
    (axios.post as any).mockResolvedValueOnce({
      data: { prompt_id: "binary-test" },
    });

    const promise = client.queuePrompt({});

    // 模拟二进制消息
    (client as any).handleMessage(Buffer.from([1, 2, 3]));

    // 正常完成
    (client as any).handleMessage(
      JSON.stringify({
        type: "executed",
        data: {
          prompt_id: "binary-test",
          output: { images: ["ok.png"] },
        },
      })
    );

    const result = await promise;
    expect(result.images[0]).toBe("ok.png");
  });
});
