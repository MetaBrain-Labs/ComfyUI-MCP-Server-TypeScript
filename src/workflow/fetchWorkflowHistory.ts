import axios from "axios";

export interface FetchWorkflowOptions {
  baseUrl: string;
  maxItems?: number;
  offset?: number;
}

export async function fetchWorkflowHistory(
  options: FetchWorkflowOptions
): Promise<Record<string, any>> {
  const { baseUrl, maxItems = 3, offset = 0 } = options;

  const url = `${baseUrl}/history?max_items=${maxItems}&offset=${offset}`;

  const res = await axios.get(url);

  if (typeof res.data !== "object" || res.data === null) {
    throw new Error("Invalid workflow history response");
  }

  return res.data;
}
