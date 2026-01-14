interface ComfyMessage {
  type: string; // 'status' | 'execution_start' | 'executing' | 'executed' | 'progress'
  data: any;
}

interface NodeData {
  node: string | null;
  prompt_id: string;
}

// 图片生成的输出结果
interface ExecutionOutput {
  images: Array<{
    filename: string;
    subfolder: string;
    type: string;
  }>;
}
