import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import cors from "cors";
import { randomUUID } from "crypto";
import "dotenv/config";
import express, { Request, Response } from "express";
import { mcpManager } from "./tools";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "*",
    exposedHeaders: ["Mcp-Session-Id"],
    allowedHeaders: ["Content-Type", "mcp-session-id"],
  }),
);

interface SessionInfo {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
  createdAt: number;
  lastAccessedAt: number;
}

const sessions: Map<string, SessionInfo> = new Map();

const SESSION_TIMEOUT = 30 * 60 * 1000;
const CLEANUP_INTERVAL = 5 * 60 * 1000;

/**
 * @METHOD
 * @description 判断是否为initialize请求
 * @author LaiFQZzr
 * @date 2026/01/20 17:08
 */
function isInitializeRequest(body: any): boolean {
  return body?.method === "initialize";
}

/**
 * @METHOD
 * @description 定期清理过期会话
 * @author LaiFQZzr
 * @date 2026/01/20 17:08
 */
setInterval(() => {
  const now = Date.now();
  const expiredSessions: string[] = [];

  sessions.forEach((session, sessionId) => {
    if (now - session.lastAccessedAt > SESSION_TIMEOUT) {
      expiredSessions.push(sessionId);
    }
  });

  expiredSessions.forEach((sessionId) => {
    console.error(`清理过期会话: ${sessionId}`);
    const session = sessions.get(sessionId);
    if (session) {
      session.server.close().catch(console.error);
      session.transport.close().catch(console.error);
      sessions.delete(sessionId);
    }
  });

  if (expiredSessions.length > 0) {
    console.error(
      `清理了 ${expiredSessions.length} 个过期会话, 当前活跃会话: ${sessions.size}`,
    );
  }
}, CLEANUP_INTERVAL);

/**
 * @METHOD
 * @description 处理客户端发起的POST请求（For /mcp HTTP API）
 * @author LaiFQZzr
 * @date 2026/01/20 17:09
 */
app.post("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  try {
    let transport: StreamableHTTPServerTransport;
    let isNewSession = false;

    // 1，已有会话,复用transport
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      transport = session.transport;
      session.lastAccessedAt = Date.now();
      console.error(`复用会话: ${sessionId}`);
    }
    // 2，新会话初始化
    else if (!sessionId && isInitializeRequest(req.body)) {
      isNewSession = true;
      const newSessionId = randomUUID();

      const currentServer = mcpManager.createSessionServer();

      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => newSessionId,
        onsessioninitialized: (sid) => {
          console.error(`会话已初始化: ${sid}`);
          const now = Date.now();
          sessions.set(sid, {
            transport,
            server: currentServer,
            createdAt: now,
            lastAccessedAt: now,
          });
        },
      });

      // 监听transport关闭事件
      transport.onclose = () => {
        console.error(`Transport关闭,清理会话: ${transport.sessionId}`);
        if (transport.sessionId) {
          const session = sessions.get(transport.sessionId);
          if (session) {
            session.server.close().catch(console.error);
          }
          sessions.delete(transport.sessionId);
        }
      };

      // 连接到MCP server
      await currentServer.connect(transport);
      console.error(`创建新会话: ${newSessionId}`);
    }
    // 3，错误请求
    else {
      const errorMsg = sessionId
        ? `会话不存在或已过期: ${sessionId}`
        : "缺少会话ID,且非initialize请求";

      console.error(errorMsg);
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: errorMsg,
        },
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);

    if (isNewSession) {
      console.error(`当前活跃会话数: ${sessions.size}`);
    }
  } catch (error) {
    console.error("MCP请求处理错误:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "服务器内部错误",
          data: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }
});

/**
 * @METHOD
 * @description 处理GET/DELETE请求
 * @author LaiFQZzr
 * @date 2026/01/20 17:13
 */
const handleSessionRequest = async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (!sessionId) {
    res.status(400).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "缺少会话ID",
      },
    });
    return;
  }

  const session = sessions.get(sessionId);
  if (!session) {
    res.status(404).json({
      jsonrpc: "2.0",
      error: {
        code: -32001,
        message: `会话不存在: ${sessionId}`,
      },
    });
    return;
  }

  try {
    session.lastAccessedAt = Date.now();

    await session.transport.handleRequest(req, res);

    // DELETE请求后清理会话
    if (req.method === "DELETE") {
      console.error(`手动关闭会话: ${sessionId}`);
      session.server.close().catch(console.error);
      session.transport.close().catch(console.error);
      sessions.delete(sessionId);
    }
  } catch (error) {
    console.error(`${req.method}请求处理错误:`, error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "服务器内部错误",
        },
      });
    }
  }
};

app.get("/mcp", handleSessionRequest);
app.delete("/mcp", handleSessionRequest);

/**
 * @METHOD
 * @description 检查服务端的健康状态
 * @author LaiFQZzr
 * @date 2026/01/20 17:15
 */
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    activeSessions: sessions.size,
    uptime: process.uptime(),
  });
});

/**
 * @METHOD
 * @description 关闭所有会话
 * @author LaiFQZzr
 * @date 2026/01/20 17:16
 */
process.on("SIGTERM", async () => {
  const closePromises = Array.from(sessions.values()).map((session) => {
    session.server.close().catch(console.error);
    session.transport.close().catch(console.error);
  });

  await Promise.all(closePromises);
  sessions.clear();

  mcpManager.shutdown();

  console.error("所有会话已关闭");
  process.exit(0);
});

const ip = process.env.MCP_SERVER_IP || "http://127.0.0.1";
const port = process.env.MCP_SERVER_PORT || 8189;

async function bootstrap() {
  try {
    await mcpManager.initialize();

    app.listen(port, () => {
      console.error(`MCP服务器运行在 ${ip}:${port}/mcp`);
      console.error(`健康检查: ${ip}:${port}/health`);
    });
  } catch (error) {
    console.error("服务器启动失败:", error);
    process.exit(1);
  }
}

bootstrap();
