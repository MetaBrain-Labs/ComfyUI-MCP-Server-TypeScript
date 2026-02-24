import crypto from "crypto";

/**
 * @METHOD
 * @description 生成随机码（指定时间以及区间内随机码可校验）
 * @author LaiFQZzr
 * @date 2026/02/13 11:21
 */
export function deterministicRandom({
  seed = "my-seed",
  referenceTime = Date.now(),
  timeWindow = 300_000, // 10分钟
  length = 16,
}: {
  seed?: string;
  referenceTime?: number;
  timeWindow?: number;
  length?: number;
}): string {
  const bucket = Math.floor(referenceTime / timeWindow);

  const hmac = crypto
    .createHmac("sha256", String(seed))
    .update(String(bucket))
    .digest("hex");

  return hmac.slice(0, length);
}

/**
 * @METHOD
 * @description 校验随机码
 * @author LaiFQZzr
 * @date 2026/02/13 11:22
 */
export function validateToken({
  token,
  seed = "my-seed",
  referenceTime = Date.now(),
  timeWindow = 300_000,
  length = 16,
  tolerance = 1,
}: {
  token: string;
  seed?: string;
  referenceTime?: number;
  timeWindow?: number;
  length?: number;
  tolerance?: number;
}): boolean {
  const currentBucket = Math.floor(referenceTime / timeWindow);

  for (let offset = -tolerance; offset <= tolerance; offset++) {
    const bucket = currentBucket + offset;

    const expected = crypto
      .createHmac("sha256", String(seed))
      .update(String(bucket))
      .digest("hex")
      .slice(0, length);

    if (expected === token) {
      return true;
    }
  }

  return false;
}
