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
   * @author LaiFQZzr
   * @date 2026/02/13 11:17
   */
  onStatus(data: ComfyStatusData): void {}

  /**
   * @METHOD
   * @description 执行开始
   * @author LaiFQZzr
   * @date 2026/02/13 11:18
   */
  onExecutionStart(data: ComfyExecutionStartData): void {}

  /**
   * @METHOD
   * @description 缓存执行
   * @author LaiFQZzr
   * @date 2026/02/13 11:18
   */
  onExecutionCached(data: ComfyExecutionCachedData): void {}

  /**
   * @METHOD
   * @description 节点执行中
   * @author LaiFQZzr
   * @date 2026/02/13 11:18
   */
  onNodeExecuting(data: ComfyExecutingData): void {}

  /**
   * @METHOD
   * @description 整体进度更新
   * @author LaiFQZzr
   * @date 2026/02/13 11:18
   */
  onProgressState(data: ComfyProgressStateData): void {}

  /**
   * @METHOD
   * @description 获取特定结点的进度（例如：KSampler等）
   * @author LaiFQZzr
   * @date 2026/02/13 11:18
   */
  onProgress(data: ComfyProgressData): void {}

  /**
   * @METHOD
   * @description 节点执行完成
   * @author LaiFQZzr
   * @date 2026/02/13 11:18
   */
  onExecuted(data: ComfyExecutedData): void {}

  /**
   * @METHOD
   * @description 工作流执行成果
   * @author LaiFQZzr
   * @date 2026/02/13 11:18
   */
  onExecutionSuccess(data: ComfyExecutionSuccessData): void {}

  /**
   * @METHOD
   * @description 执行错误
   * @author LaiFQZzr
   * @date 2026/02/13 11:19
   */
  onExecutionError(data: any): void {}

  /**
   * @METHOD
   * @description 执行中断
   * @author LaiFQZzr
   * @date 2026/02/13 11:19
   */
  onExecutionInterrupted(data: any): void {}

  /**
   * @METHOD
   * @description 功能标志
   * @author LaiFQZzr
   * @date 2026/02/13 11:19
   */
  handleFeatureFlags(data: ComfyFeatureFlagsData): void {}

  /**
   * @METHOD
   * @description 二进制数据
   * @author LaiFQZzr
   * @date 2026/02/13 11:19
   */
  onBinaryData(data: Buffer): void {}

  /**
   * @METHOD
   * @description 未处理的消息
   * @author LaiFQZzr
   * @date 2026/02/13 11:19
   */
  onUnhandledMessage(type: string, data: any): void {
    console.error("Unhandled message type:", type, data);
  }
}
