/*
  MCP Server 的核心运行依赖
    管理：
      tool 注册
      请求分发
      响应封装 
*/
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import "@modelcontextprotocol/sdk/client/streamableHttp";

/* 
  工具输入的 schema 定义
*/
import { z } from "zod";

import {
  AlertFeature,
  AlertsResponse,
  ForecastPeriod,
  ForecastResponse,
  PointsResponse,
} from "../interface/common";

const NWS_API_BASE = "https://api.weather.gov";
const USER_AGENT = "weather-app/1.0";

/**
 * @METHOD
 * @description 组装请求
 * @author LaiFQZzr
 * @date 2026/01/09 12:00
 */
async function makeNWSRequest<T>(url: string): Promise<T | null> {
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "application/geo+json",
  };

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error("Error making NWS request:", error);
    return null;
  }
}

/**
 * @METHOD
 * @description 格式化信息
 * @author LaiFQZzr
 * @date 2026/01/09 12:00
 */
function formatAlert(feature: AlertFeature): string {
  const props = feature.properties;
  return [
    `Event: ${props.event || "Unknown"}`,
    `Area: ${props.areaDesc || "Unknown"}`,
    `Severity: ${props.severity || "Unknown"}`,
    `Status: ${props.status || "Unknown"}`,
    `Headline: ${props.headline || "No headline"}`,
    "---",
  ].join("\n");
}

/**
 * @METHOD
 * @description 创建 MCP 服务实例
 * @author LaiFQZzr
 * @date 2026/01/09 12:02
 */
const server = new McpServer({
  name: "weather",
  version: "1.0.0",
});

/**
 * @METHOD
 * @description 注册 MCP 工具 —— 获取天气预警
 * @author LaiFQZzr
 * @date 2026/01/09 12:02
 */
server.registerTool(
  "get-alerts",
  {
    title: "获取天气预警信息",
    description: "根据美国天气局的公开信息获取天气预警信息",
    inputSchema: {
      state: z.string().length(2).describe("美国城市缩写单词 (e.g. CA, NY)"),
    },
  },
  async ({ state }) => {
    const stateCode = state.toUpperCase();
    const alertsUrl = `${NWS_API_BASE}/alerts?area=${stateCode}`;
    const alertsData = await makeNWSRequest<AlertsResponse>(alertsUrl);

    // 检索天气预警信息失败
    if (!alertsData) {
      return {
        content: [
          {
            type: "text",
            text: "检索天气预警信息失败",
          },
        ],
      };
    }

    // 无可用天气预警信息
    const features = alertsData.features || [];
    if (features.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `无可用天气预警信息：${stateCode}`,
          },
        ],
      };
    }

    // 格式化数据
    const formattedAlerts = features.map(formatAlert);
    // 拼接JSON格式数据
    const alertsText = `Active alerts for ${stateCode}:\n\n${formattedAlerts.join(
      "\n"
    )}`;

    return {
      content: [
        {
          type: "text",
          text: alertsText,
        },
      ],
    };
  }
);

/**
 * @METHOD
 * @description 注册 MCP 工具 —— 获取天气预报
 * @author LaiFQZzr
 * @date 2026/01/09 12:02
 */
server.registerTool(
  "get-forecast",
  {
    title: "获取天气预报信息",
    description: "根据美国天气局的公开信息获取天气预报信息",
    inputSchema: {
      latitude: z
        .number()
        .min(-90)
        .max(90)
        .describe("Latitude of the location"),
      longitude: z
        .number()
        .min(-180)
        .max(180)
        .describe("Longitude of the location"),
    },
  },
  async ({ latitude, longitude }) => {
    const pointsUrl = `${NWS_API_BASE}/points/${latitude.toFixed(
      4
    )},${longitude.toFixed(4)}`;
    const pointsData = await makeNWSRequest<PointsResponse>(pointsUrl);

    if (!pointsData) {
      return {
        content: [
          {
            type: "text",
            text: `根据【纬度：${latitude}，经度：${longitude}】检索天气预报信息失败。可能原因：NES API不支持该经纬度（经纬度仅支持美国国内）。`,
          },
        ],
      };
    }

    const forecastUrl = pointsData.properties?.forecast;
    if (!forecastUrl) {
      return {
        content: [
          {
            type: "text",
            text: "获取天气预报信息失败",
          },
        ],
      };
    }

    const forecastData = await makeNWSRequest<ForecastResponse>(forecastUrl);
    if (!forecastData) {
      return {
        content: [
          {
            type: "text",
            text: "检索天气预报信息失败",
          },
        ],
      };
    }

    const periods = forecastData.properties?.periods || [];
    if (periods.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "无可用天气预报信息",
          },
        ],
      };
    }

    const formattedForecast = periods.map((period: ForecastPeriod) =>
      [
        `${period.name || "Unknown"}:`,
        `Temperature: ${period.temperature || "Unknown"}°${
          period.temperatureUnit || "F"
        }`,
        `Wind: ${period.windSpeed || "Unknown"} ${period.windDirection || ""}`,
        `${period.shortForecast || "No forecast available"}`,
        "---",
      ].join("\n")
    );

    const forecastText = `Forecast for ${latitude}, ${longitude}:\n\n${formattedForecast.join(
      "\n"
    )}`;

    return {
      content: [
        {
          type: "text",
          text: forecastText,
        },
      ],
    };
  }
);

export default server;
