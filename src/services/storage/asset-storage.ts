import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { BASE_URL } from "../../api/http";
import { COMMON } from "../../constants";
import { ComfyImage } from "../../types/task";

/**
 * 保存资产到本地
 */
export async function saveAssets(
  data: ComfyImage,
  overwrite: boolean,
  dir: string = COMMON.ASSETS_DIR,
): Promise<string> {
  try {
    const url = `${BASE_URL}/view?filename=${encodeURIComponent(data.filename)}&type=${data.type}&subfolder=${data.subfolder}`;

    const res = await fetch(url);

    if (!res.ok || !res.body) {
      throw new McpError(ErrorCode.InternalError, `下载资源失败: ${url}`);
    }

    let filename = data.filename;
    let savePath = path.join(dir, filename);

    if (!overwrite && fs.existsSync(savePath)) {
      const ext = path.extname(filename);
      const name = path.basename(filename, ext);
      const timestamp = Date.now();
      filename = `${name}_${timestamp}${ext}`;
      savePath = path.join(dir, filename);
    }

    await pipeline(res.body, fs.createWriteStream(savePath));
    return filename;
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(
      ErrorCode.InternalError,
      `保存资产失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
