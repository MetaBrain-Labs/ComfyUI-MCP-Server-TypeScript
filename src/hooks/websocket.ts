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
   * @METHOD
   * @description 整体进度更新
   * 处理措施：不应打印相关信息
   * @author LaiFQZzr
   * @date 2026/02/04 16:24
   */
  onProgressState(data: ComfyProgressStateData): void {
    /*
      {
        prompt_id: '172da8ac-5737-49d2-9de5-706fd4a8b5c1',
        nodes: {
          '1': {
            value: 1,
            max: 1,
            state: 'finished',
            node_id: '1',
            prompt_id: '172da8ac-5737-49d2-9de5-706fd4a8b5c1',
            display_node_id: '1',
            parent_node_id: null,
            real_node_id: '1'
          },
          '2': {
            value: 1,
            max: 1,
            state: 'finished',
            node_id: '2',
            prompt_id: '172da8ac-5737-49d2-9de5-706fd4a8b5c1',
            display_node_id: '2',
            parent_node_id: null,
            real_node_id: '2'
          },
          '3': {
            value: 1,
            max: 1,
            state: 'finished',
            node_id: '3',
            prompt_id: '172da8ac-5737-49d2-9de5-706fd4a8b5c1',
            display_node_id: '3',
            parent_node_id: null,
            real_node_id: '3'
          },
          '4': {
            value: 1,
            max: 1,
            state: 'finished',
            node_id: '4',
            prompt_id: '172da8ac-5737-49d2-9de5-706fd4a8b5c1',
            display_node_id: '4',
            parent_node_id: null,
            real_node_id: '4'
          },
          '5': {
            value: 50,
            max: 50,
            state: 'finished',
            node_id: '5',
            prompt_id: '172da8ac-5737-49d2-9de5-706fd4a8b5c1',
            display_node_id: '5',
            parent_node_id: null,
            real_node_id: '5'
          },
          '6': {
            value: 1,
            max: 1,
            state: 'finished',
            node_id: '6',
            prompt_id: '172da8ac-5737-49d2-9de5-706fd4a8b5c1',
            display_node_id: '6',
            parent_node_id: null,
            real_node_id: '6'
          },
          '7': {
            value: 1,
            max: 1,
            state: 'finished',
            node_id: '7',
            prompt_id: '172da8ac-5737-49d2-9de5-706fd4a8b5c1',
            display_node_id: '7',
            parent_node_id: null,
            real_node_id: '7'
          },
          '8': {
            value: 1,
            max: 1,
            state: 'finished',
            node_id: '8',
            prompt_id: '172da8ac-5737-49d2-9de5-706fd4a8b5c1',
            display_node_id: '8',
            parent_node_id: null,
            real_node_id: '8'
          },
          '10': {
            value: 1,
            max: 1,
            state: 'finished',
            node_id: '10',
            prompt_id: '172da8ac-5737-49d2-9de5-706fd4a8b5c1',
            display_node_id: '10',
            parent_node_id: null,
            real_node_id: '10'
          }
        }
      }
    */
  }

  /**
   * @METHOD
   * @description 获取特定结点的进度（例如：KSampler等）
   * 处理措施：内容较少，可以考虑打印信息，监听特定结点进度
   * @author LaiFQZzr
   * @date 2026/02/04 16:26
   */
  onProgress(data: ComfyProgressData): void {
    // console.error("ProgressState:", data);
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
