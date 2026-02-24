import { ObjectInfoResponse } from "../types/object-info";
import "dotenv/config";

export class ComfyApi {
  BASE_URL = process.env.COMFY_UI_SERVER_IP ?? "http://127.0.0.1:8188";

  internalURL(route: string): string {
    return this.BASE_URL + "/internal" + route;
  }

  apiURL(route: string): string {
    return this.BASE_URL + "/api" + route;
  }

  fileURL(route: string): string {
    return this.BASE_URL + route;
  }

  async fetchApi(route: string, options?: RequestInit) {
    const headers: HeadersInit = options?.headers ?? {};

    return fetch(this.apiURL(route), {
      cache: "no-cache",
      ...options,
      headers,
    });
  }

  /**
   * @METHOD
   * @description 加载图的节点对象定义
   * @author LaiFQZzr
   * @date 2026/02/13 11:53
   */
  async getNodeDefs(): Promise<ObjectInfoResponse> {
    const resp = await this.fetchApi("/object_info", { cache: "no-store" });
    return await resp.json();
  }
}

export const api = new ComfyApi();
