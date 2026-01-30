import {
  ComfyExecutedData,
  ComfyExecutingData,
  ComfyExecutionCachedData,
  ComfyExecutionStartData,
  ComfyExecutionSuccessData,
  ComfyFeatureFlagsData,
  ComfyProgressStateData,
  ComfyStatusData,
} from "../interface/ws";

export class ComfyClientHook {
  /**
   * 处理状态消息
   */
  onStatus(data: ComfyStatusData): void {
    console.error("Status update:", data);
    // 实现你的业务逻辑
  }

  /**
   * 执行开始
   */
  onExecutionStart(data: ComfyExecutionStartData): void {
    console.error("Execution started:", data);
  }

  /**
   * 缓存执行
   */
  onExecutionCached(data: ComfyExecutionCachedData): void {
    console.error("Execution cached:", data);
  }

  /**
   * 节点执行中
   */
  onNodeExecuting(data: ComfyExecutingData): void {
    console.error("Node executing:", data);
  }

  /**
   * 进度更新
   */
  onProgressState(data: ComfyProgressStateData): void {
    console.error("ProgressState:", data);
  }

  /**
   * 节点执行完成
   */
  onExecuted(data: ComfyExecutedData): void {
    console.error("Node executed:", data);
  }

  /**
   * 节点执行完成
   */
  onExecutionSuccess(data: ComfyExecutionSuccessData): void {
    console.error("Node executed success:", data);
  }

  /**
   * 执行错误
   */
  onExecutionError(data: any): void {
    console.error("Execution error:", data);
  }

  /**
   * 执行中断
   */
  onExecutionInterrupted(data: any): void {
    console.error("Execution interrupted:", data);
  }

  /**
   * 功能标志
   */
  handleFeatureFlags(data: ComfyFeatureFlagsData): void {
    console.error("Feature flags:", data);
  }

  /**
   * 二进制数据 (如预览图片)
   */
  onBinaryData(data: Buffer): void {
    console.error("Binary data received, size:", data.length);
  }

  /**
   * 未处理的消息
   */
  onUnhandledMessage(type: string, data: any): void {
    console.error("Unhandled message type:", type, data);
  }
}
