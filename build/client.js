import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import { CallToolResultSchema, ListToolsResultSchema, } from "@modelcontextprotocol/sdk/types.js";
import * as readline from "node:readline";
dotenv.config();
export class MCPClient {
    client = null;
    anthropic;
    transport = null;
    constructor(config = {}) {
        this.anthropic = new Anthropic();
    }
    // 方法将在这里实现
    async connectToServer(serverScriptPath) {
        const isPython = serverScriptPath.endsWith(".py");
        const isJs = serverScriptPath.endsWith(".js");
        if (!isPython && !isJs) {
            throw new Error("服务器脚本必须是 .py 或 .js 文件");
        }
        const command = isPython ? "python" : "node";
        this.transport = new StdioClientTransport({
            command,
            args: [serverScriptPath],
        });
        this.client = new Client({
            name: "mcp-client",
            version: "1.0.0",
        }, {
            capabilities: {},
        });
        await this.client.connect(this.transport);
        // 列出可用工具
        const response = await this.client.request({ method: "tools/list" }, ListToolsResultSchema);
        console.log("\n已连接到服务器，可用工具：", response.tools.map((tool) => tool.name));
    }
    async processQuery(query) {
        if (!this.client) {
            throw new Error("客户端未连接");
        }
        // 使用用户查询初始化消息数组
        let messages = [
            {
                role: "user",
                content: query,
            },
        ];
        // 获取可用工具
        const toolsResponse = await this.client.request({ method: "tools/list" }, ListToolsResultSchema);
        const availableTools = toolsResponse.tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            input_schema: tool.inputSchema,
        }));
        const finalText = [];
        let currentResponse = await this.anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 1000,
            messages,
            tools: availableTools,
        });
        // 处理响应和工具调用
        while (true) {
            // 将 Claude 的响应添加到最终文本和消息中
            for (const content of currentResponse.content) {
                if (content.type === "text") {
                    finalText.push(content.text);
                }
                else if (content.type === "tool_use") {
                    const toolName = content.name;
                    const toolArgs = content.input;
                    // 执行工具调用
                    const result = await this.client.request({
                        method: "tools/call",
                        params: {
                            name: toolName,
                            args: toolArgs,
                        },
                    }, CallToolResultSchema);
                    finalText.push(`[调用工具 ${toolName}，参数：${JSON.stringify(toolArgs)}]`);
                    // 将 Claude 的响应（包括工具使用）添加到消息中
                    messages.push({
                        role: "assistant",
                        content: currentResponse.content,
                    });
                    // 将工具结果添加到消息中
                    messages.push({
                        role: "user",
                        content: [
                            {
                                type: "tool_result",
                                tool_use_id: content.id,
                                content: [
                                    { type: "text", text: JSON.stringify(result.content) },
                                ],
                            },
                        ],
                    });
                    // 使用工具结果获取 Claude 的下一个响应
                    currentResponse = await this.anthropic.messages.create({
                        model: "claude-3-5-sonnet-20241022",
                        max_tokens: 1000,
                        messages,
                        tools: availableTools,
                    });
                    // 将 Claude 对工具结果的解释添加到最终文本中
                    if (currentResponse.content[0]?.type === "text") {
                        finalText.push(currentResponse.content[0].text);
                    }
                    // 继续循环以处理任何额外的工具调用
                    continue;
                }
            }
            // 如果到达这里，说明响应中没有工具调用
            break;
        }
        return finalText.join("\n");
    }
    async chatLoop() {
        console.log("\nMCP 客户端已启动！");
        console.log("输入你的查询或输入 'quit' 退出。");
        // 使用 Node 的 readline 进行控制台输入
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        const askQuestion = () => {
            rl.question("\n查询：", async (query) => {
                try {
                    if (query.toLowerCase() === "quit") {
                        await this.cleanup();
                        rl.close();
                        return;
                    }
                    const response = await this.processQuery(query);
                    console.log("\n" + response);
                    askQuestion();
                }
                catch (error) {
                    console.error("\n错误：", error);
                    askQuestion();
                }
            });
        };
        askQuestion();
    }
    async cleanup() {
        if (this.transport) {
            await this.transport.close();
        }
    }
}
