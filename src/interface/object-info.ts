// 节点信息定义
interface ObjectNode {
  input: NodeInput;
  input_order: InputOrder;
  output: string[];
  output_is_list: boolean[];
  output_name: string[];
  name: string;
  display_name: string;
  description: string;
  python_module: string;
  category: string;
  output_node: boolean;

  output_tooltips?: string[];
  deprecated?: boolean;
  experimental?: boolean;
  api_node?: boolean;
}

// 输入定义
export interface NodeInput {
  required: NodeFields;
  optional?: NodeFields;
  hidden?: NodeFields;
}

export interface NodeFields {
  [key: string]: FieldDefinition;
}

export type FieldDefinition = [string] | [string, any];

// 输入顺序定义
interface InputOrder {
  required?: string[];
  optional?: string[];
  hidden?: string[];
}

export interface ObjectInfoResponse {
  [nodeClassName: string]: ObjectNode;
}
