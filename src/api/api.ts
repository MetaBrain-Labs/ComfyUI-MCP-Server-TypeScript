import {
  DetailModelResponse,
  ModelTypeResponse,
  SystemStatus,
  UploadImgResponse,
} from "../types/common";
import { ExecutePromptRequest, ExecutePromptResult } from "../types/execute";
import { ObjectInfoResponse } from "../types/object-info";
import {
  ComfyImage,
  ComfyTaskResponse,
  WorkflowSimpleData,
} from "../types/task";
import { ComfyUIWorkflow } from "../types/workflow";
import http from "./http";

export class ComfyApi {
  /**
   * @METHOD
   * @description 加载图的节点对象定义
   */
  async getNodeDefs(): Promise<ObjectInfoResponse> {
    return await http.get<ObjectInfoResponse>("/object_info");
  }

  /**
   * @METHOD
   * @description 分页获取历史任务
   */
  async pageHistoryTasks(
    max_items: number = 10,
    offset?: number,
  ): Promise<ComfyTaskResponse> {
    return await http.get<ComfyTaskResponse>(
      `/history?max_items=${max_items}&offset=${offset}`,
    );
  }

  /**
   * @METHOD
   * @description 获取历史任务详情
   */
  async getDetailHistoryTasks(promptId: string): Promise<ComfyTaskResponse> {
    return await http.get<ComfyTaskResponse>(`/history/${promptId}`);
  }

  /**
   * @METHOD
   * @description 执行工作流
   */
  async prompt(data: ExecutePromptRequest): Promise<ExecutePromptResult> {
    return await http.post<ExecutePromptResult>(`/prompt`, data);
  }

  /**
   * @METHOD
   * @description 中断工作流
   */
  async interrupt(promptId: string): Promise<ComfyTaskResponse> {
    return await http.post<ComfyTaskResponse>(`/interrupt`, {
      prompt_id: promptId,
    });
  }

  /**
   * @METHOD
   * @description 获取用户当前拥有工作流
   */
  async getUserData(dir: string = "workflows"): Promise<WorkflowSimpleData[]> {
    return await http.get<WorkflowSimpleData[]>(
      `/userdata?dir=${dir}&recurse=true&split=false&full_info=true`,
    );
  }

  /**
   * @METHOD
   * @description 获取用户当前工作流具体信息
   */
  async getDetailUserData(workflowPath: string): Promise<ComfyUIWorkflow> {
    return await http.get<ComfyUIWorkflow>(
      `/userdata/workflows%2F${workflowPath}`,
    );
  }

  /**
   * @METHOD
   * @description 获取用户当前工作流具体信息
   * @author LaiFQZzr
   * @date 2026/02/24 15:09
   */
  async uploadImg(body: FormData): Promise<string | null> {
    const resp = await http.post<UploadImgResponse>(`/upload/image`, body);
    return resp.subfolder ? `${resp.subfolder}/${resp.name}` : resp.name;
  }

  /**
   * @METHOD
   * @description 获取模型类型列表
   */
  async getModelType(): Promise<ModelTypeResponse[]> {
    return await http.get<ModelTypeResponse[]>(`/experiment/models`);
  }

  /**
   * @METHOD
   * @description 模型
   */
  async getDetailModel(typeName: string): Promise<DetailModelResponse[]> {
    return await http.get<DetailModelResponse[]>(
      `/experiment/models/${typeName}`,
    );
  }

  /**
   * @METHOD
   * @description 获取系统状态
   */
  async getSystemStatus(): Promise<SystemStatus> {
    return await http.get<SystemStatus>(`/system_stats`);
  }
}

export const api = new ComfyApi();
