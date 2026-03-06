import axios, { AxiosError, AxiosRequestConfig } from "axios";
import "dotenv/config";

export const BASE_URL =
  process.env.COMFY_UI_SERVER_IP ?? "http://127.0.0.1:8188";

const instance = axios.create({
  baseURL: BASE_URL + "/api",
  timeout: 100000,
  withCredentials: true,
});

/**
 * @METHOD
 * @description 请求拦截器 —— 预留后续接入cloud使用
 * @author LaiFQZzr
 * @date 2026/02/24 14:45
 */
// http.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem("token");

//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }

//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   },
// );

/**
 * @METHOD
 * @description 响应拦截器 —— 全局错误处理
 * @author LaiFQZzr
 * @date 2026/02/24 14:56
 */
instance.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError) => {
    if (!error.response) {
      console.error("网络异常");
      return Promise.reject(error);
    }

    if (error.response.status === 401) {
      localStorage.removeItem("token");
    }

    return Promise.reject(error);
  },
);

const http = {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return instance.get(url, config);
  },

  post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return instance.post(url, data, config);
  },

  put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return instance.put(url, data, config);
  },

  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return instance.delete(url, config);
  },
};

export default http;
