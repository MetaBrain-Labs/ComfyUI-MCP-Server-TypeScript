import crypto from "crypto";
import { mkdir, readFile } from "fs/promises";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * @METHOD
 * @description 写入随机码到文件中
 * @author LaiFQZzr
 * @date 2026/02/09 11:49
 */
export function validateToken(token: string): boolean {
  const validateToken = deterministicRandom({
    seed: "my-seed",
    referenceTime: Date.now(),
  });

  if (token === validateToken) {
    return true;
  }
  return false;
}

function deterministicRandom({
  seed = "my-seed",
  referenceTime = Date.now(),
  timeWindow = 60_000,
  length = 16,
}): string {
  const bucket = Math.floor(referenceTime / timeWindow);

  const hmac = crypto
    .createHmac("sha256", String(seed))
    .update(String(bucket))
    .digest("hex");

  return hmac.slice(0, length);
}
