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
   * @METHOD
   * @description 处理状态消息
   */
  onStatus(data: ComfyStatusData): void {}

  /**
   * @METHOD
   * @description 执行开始
   */
  onExecutionStart(data: ComfyExecutionStartData): void {}

  /**
   * @METHOD
   * @description 缓存执行
   */
  onExecutionCached(data: ComfyExecutionCachedData): void {}

  /**
   * @METHOD
   * @description 节点执行中
   */
  onNodeExecuting(data: ComfyExecutingData): void {}

  /**
   * @METHOD
   * @description 整体进度更新
   */
  onProgressState(data: ComfyProgressStateData): void {}

  /**
   * @METHOD
   * @description 获取特定结点的进度（例如：KSampler等）
   */
  onProgress(data: ComfyProgressData): void {}

  /**
   * @METHOD
   * @description 节点执行完成
   */
  onExecuted(data: ComfyExecutedData): void {}

  /**
   * @METHOD
   * @description 工作流执行成果
   */
  onExecutionSuccess(data: ComfyExecutionSuccessData): void {}

  /**
   * @METHOD
   * @description 执行错误
   */
  onExecutionError(data: any): void {}

  /**
   * @METHOD
   * @description 执行中断
   */
  onExecutionInterrupted(data: any): void {}

  /**
   * @METHOD
   * @description 功能标志
   */
  handleFeatureFlags(data: ComfyFeatureFlagsData): void {}

  /**
   * @METHOD
   * @description 二进制数据
   */
  onBinaryData(data: Buffer): void {}

  /**
   * @METHOD
   * @description 未处理的消息
   */
  onUnhandledMessage(type: string, data: any): void {
    console.error("Unhandled message type:", type, data);
  }
}
