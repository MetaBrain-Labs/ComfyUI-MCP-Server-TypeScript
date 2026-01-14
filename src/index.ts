import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";
import server from "./serve/index";
import cors from "cors";
import "dotenv/config";

const app = express();
app.use(express.json());

// app.use(
//   cors({
//     origin: "*",
//     exposedHeaders: ["Mcp-Session-Id"],
//     allowedHeaders: ["Content-Type", "mcp-session-id"],
//   })
// );
app.use(cors());

/**
 * @METHOD
 * @description 处理客户端请求
 * @author LaiFQZzr
 * @date 2026/01/12 14:55
 */
app.post("/mcp", async (req: Request, res: Response) => {
  // 为每个请求创建一个独立的传输实例
  const transport = new StreamableHTTPServerTransport({
    // sessionIdGenerator 可选，用于生成会话ID
  });

  try {
    // 将当前传输连接到全局的server实例
    await server.connect(transport);
    // 处理请求，transport会自动管理会话生命周期
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP请求处理出错:", error);
    // 返回符合JSON-RPC规范的错误
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
      });
    }
  } finally {
    // 仅关闭当前传输，不关闭全局server
    transport.close().catch(console.error);
  }
});

/**
 * @METHOD
 * @description 健康检查端点（可选，便于监控）
 * @author LaiFQZzr
 * @date 2026/01/12 14:55
 */
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

/**
 * @METHOD
 * @description 处理不支持的HTTP方法
 * @author LaiFQZzr
 * @date 2026/01/12 14:56
 */
app.all("/mcp", async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed. Only POST is supported.",
      },
    });
  }
});

const ip = process.env.MCP_SERVER_IP || "http://127.0.0.1";
const port = process.env.MCP_SERVER_PORT || 8189;

app.listen(port, () => {
  console.log(`✅ MCP HTTP Server is running on ${ip}:${port}`);
  console.log(`📮 MCP 服务端点: ${ip}:${port}/mcp`);
});
