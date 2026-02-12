import crypto from "crypto";

/**
 * @METHOD
 * @description 写入随机码到文件中
 * @author LaiFQZzr
 * @date 2026/02/09 11:49
 */
// export function validateToken(token: string): boolean {
//   const validateToken = deterministicRandom({
//     seed: "my-seed",
//     referenceTime: Date.now(),
//   });

//   if (token === validateToken) {
//     return true;
//   }
//   return false;
// }

// export function deterministicRandom({
//   seed = "my-seed",
//   referenceTime = Date.now(),
//   timeWindow = 600_000,
//   length = 16,
// }): string {
//   const bucket = Math.floor(referenceTime / timeWindow);

//   const hmac = crypto
//     .createHmac("sha256", String(seed))
//     .update(String(bucket))
//     .digest("hex");

//   return hmac.slice(0, length);
// }

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

  // 遍历当前窗口前后 tolerance 个 bucket
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
