export class ComfyClientHook {
  /**
   * 当收到服务器的功能标志时 (通常在连接初期)
   */
  public handleFeatureFlags(data: any) {
    console.log("[Hook] Server Feature Flags:", data);
  }

  /**
   * 当一个 Prompt 开始被处理时
   */
  public onExecutionStart(data: { prompt_id: string }) {
    console.log(`[Hook] Execution Started: ${data.prompt_id}`);
  }

  /**
   * 当节点命中缓存时（未重新计算）
   */
  public onExecutionCached(data: { nodes: string[]; prompt_id: string }) {
    // console.log(`[Hook] Cached Nodes: ${data.nodes.length}`);
  }

  /**
   * 当某个节点开始执行时
   * data: { node: string, prompt_id: string }
   */
  public onNodeExecuting(data: { node: string | null; prompt_id: string }) {
    if (data.node === null) {
      console.log(`[Hook] Workflow Execution Finished (Internal)`);
    } else {
      console.log(`[Hook] Node Executing: ${data.node}`);
    }
  }

  /**
   * 进度条更新 (ComfyUI 可能不发送 type: 'progress'，而是通过 socket.io 协议，
   * 但原生 WS 有时也会收到 progress 类型的消息)
   */
  public onProgress(data: { value: number; max: number }) {
    console.log(`[Hook] Progress: ${data.value}/${data.max}`);
  }

  /**
   * 任务彻底完成（包含输出结果，如图片）
   */
  public onExecuted(data: { prompt_id: string; output: any }) {
    console.log(`[Hook] Executed. Output keys: ${Object.keys(data.output)}`);
  }

  /**
   * 队列状态更新
   */
  public onStatus(data: {
    status: { exec_info: { queue_remaining: number } };
  }) {
    // console.log(`[Hook] Queue Remaining: ${data.status.exec_info.queue_remaining}`);
  }

  /**
   * 未知消息类型的兜底处理
   */
  public onUnhandledMessage(type: string, data: any) {
    console.log(`[Hook] Unhandled message type: ${type}`);
  }
}
