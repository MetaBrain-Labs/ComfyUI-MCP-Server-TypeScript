// 当前需要特殊处理的结点参数
const supportedKeys = new Set<string>(["seed"]);

/**
 * @METHOD
 * @description 是否是受控 key
 * @author LaiFQZzr
 * @date 2026/02/25 11:29
 */
export function isSupportedKey(key: string): boolean {
  return supportedKeys.has(key.toLowerCase());
}

/**
 * @METHOD
 * @description 处理 key 对应生成随机数逻辑
 * @author LaiFQZzr
 * @date 2026/02/25 11:29
 */
export function handleKey(key: string): number | string {
  const lowerKey = key.toLowerCase();

  switch (lowerKey) {
    case "seed":
      return generateSeed32();

    default:
      return generateSeed32();
  }
}

/**
 * @METHOD
 * @description 生成32位随机数
 * @author LaiFQZzr
 * @date 2026/02/25 11:29
 */
export function generateSeed32(): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0];
}
