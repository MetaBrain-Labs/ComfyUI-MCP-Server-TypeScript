import {
  ComfyExecutedData,
  ComfyExecutingData,
  ComfyExecutionCachedData,
  ComfyExecutionStartData,
  ComfyExecutionSuccessData,
  ComfyFeatureFlagsData,
  ComfyProgressData,
  ComfyProgressStateData,
  ComfyStatusData,
} from "../types/ws";

export class ComfyClientHook {
  /**
   * 处理状态消息
   */
  onStatus(data: ComfyStatusData): void {}

  /**
   * 执行开始
   */
  onExecutionStart(data: ComfyExecutionStartData): void {}

  /**
   * 缓存执行
   */
  onExecutionCached(data: ComfyExecutionCachedData): void {}

  /**
   * 节点执行中
   */
  onNodeExecuting(data: ComfyExecutingData): void {}

  /**
   * @METHOD
   * @description 整体进度更新
   * 处理措施：不应打印相关信息
   * @author LaiFQZzr
   * @date 2026/02/04 16:24
   */
  onProgressState(data: ComfyProgressStateData): void {}

  /**
   * @METHOD
   * @description 获取特定结点的进度（例如：KSampler等）
   * 处理措施：内容较少，可以考虑打印信息，监听特定结点进度
   * @author LaiFQZzr
   * @date 2026/02/04 16:26
   */
  onProgress(data: ComfyProgressData): void {}

  /**
   * 节点执行完成
   */
  onExecuted(data: ComfyExecutedData): void {}

  /**
   * 节点执行完成
   */
  onExecutionSuccess(data: ComfyExecutionSuccessData): void {}

  /**
   * 执行错误
   */
  onExecutionError(data: any): void {}

  /**
   * 执行中断
   */
  onExecutionInterrupted(data: any): void {}

  /**
   * 功能标志
   */
  handleFeatureFlags(data: ComfyFeatureFlagsData): void {}

  /**
   * 二进制数据 (如预览图片)
   */
  onBinaryData(data: Buffer): void {}

  /**
   * 未处理的消息
   */
  onUnhandledMessage(type: string, data: any): void {
    console.error("Unhandled message type:", type, data);
  }
}
