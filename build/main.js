import { MCPClient } from "./client.js";
// 主执行
async function main() {
    if (process.argv.length < 3) {
        console.log("用法：ts-node client.ts <服务器脚本路径>");
        process.exit(1);
    }
    const client = new MCPClient();
    try {
        await client.connectToServer(process.argv[2]);
        await client.chatLoop();
    }
    catch (error) {
        console.error("错误：", error);
        await client.cleanup();
        process.exit(1);
    }
}
// 如果这是主模块则运行 main
if (import.meta.url === new URL(process.argv[1], "file:").href) {
    main();
}
export default MCPClient;
