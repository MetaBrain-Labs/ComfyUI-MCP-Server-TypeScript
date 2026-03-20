/**
 * @file special-node-handler.test.ts
 * @description 测试特殊节点处理函数
 * 
 * 【分支覆盖分析】
 * 1. isSupportedKey() 函数:
 *    - 正常路径: key 在 supportedKeys 中 (如 "seed")
 *    - 边界: key 不在 supportedKeys 中
 *    - 边界: 大小写不敏感匹配 ("SEED", "Seed", "SeEd")
 * 
 * 2. handleKey() 函数:
 *    - 分支: key === "seed" (小写)
 *    - 分支: key !== "seed" (走 default 分支)
 *    - 边界: 大小写混合 ("Seed", "SEED")
 * 
 * 3. generateSeed32() 函数:
 *    - 正常路径: 返回 32 位随机数
 *    - 验证: 返回值在有效范围内 (0 到 2^32-1)
 * 
 * 【Mock 策略】
 * - crypto.getRandomValues: Mock 为返回固定值以确保可预测性
 */

import {
  isSupportedKey,
  handleKey,
  generateSeed32,
} from '../../src/utils/special-node-handler';

describe('special-node-handler', () => {
  describe('isSupportedKey()', () => {
    it('should return true for "seed" (lowercase)', () => {
      expect(isSupportedKey('seed')).toBe(true);
    });

    it('should return true for "SEED" (uppercase)', () => {
      expect(isSupportedKey('SEED')).toBe(true);
    });

    it('should return true for "Seed" (mixed case)', () => {
      expect(isSupportedKey('Seed')).toBe(true);
    });

    it('should return true for "SeEd" (random case)', () => {
      expect(isSupportedKey('SeEd')).toBe(true);
    });

    it('should return false for unsupported key "random"', () => {
      expect(isSupportedKey('random')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isSupportedKey('')).toBe(false);
    });

    it('should return false for similar but different key "seeds"', () => {
      expect(isSupportedKey('seeds')).toBe(false);
    });

    it('should return false for key containing "seed" substring', () => {
      expect(isSupportedKey('my_seed')).toBe(false);
      expect(isSupportedKey('seed_value')).toBe(false);
    });
  });

  describe('handleKey()', () => {
    // 保存原始 crypto 对象
    const originalCrypto = global.crypto;

    beforeEach(() => {
      // Mock crypto.getRandomValues
      global.crypto = {
        getRandomValues: jest.fn((array: Uint32Array) => {
          array[0] = 12345;
          return array;
        }),
      } as unknown as Crypto;
    });

    afterEach(() => {
      global.crypto = originalCrypto;
    });

    it('should handle "seed" key and return 32-bit random number', () => {
      const result = handleKey('seed');
      
      expect(global.crypto.getRandomValues).toHaveBeenCalledWith(expect.any(Uint32Array));
      expect(result).toBe(12345);
    });

    it('should handle "SEED" key (uppercase) and return random number', () => {
      const result = handleKey('SEED');
      
      expect(global.crypto.getRandomValues).toHaveBeenCalledWith(expect.any(Uint32Array));
      expect(result).toBe(12345);
    });

    it('should handle "Seed" key (mixed case) and return random number', () => {
      const result = handleKey('Seed');
      
      expect(global.crypto.getRandomValues).toHaveBeenCalledWith(expect.any(Uint32Array));
      expect(result).toBe(12345);
    });

    it('should handle unsupported key and return random number (default case)', () => {
      const result = handleKey('unsupported');
      
      expect(global.crypto.getRandomValues).toHaveBeenCalledWith(expect.any(Uint32Array));
      expect(result).toBe(12345);
    });

    it('should handle empty string key and return random number (default case)', () => {
      const result = handleKey('');
      
      expect(global.crypto.getRandomValues).toHaveBeenCalledWith(expect.any(Uint32Array));
      expect(result).toBe(12345);
    });
  });

  describe('generateSeed32()', () => {
    const originalCrypto = global.crypto;

    beforeEach(() => {
      global.crypto = {
        getRandomValues: jest.fn((array: Uint32Array) => {
          array[0] = 987654321;
          return array;
        }),
      } as unknown as Crypto;
    });

    afterEach(() => {
      global.crypto = originalCrypto;
    });

    it('should return a 32-bit random number', () => {
      const result = generateSeed32();

      expect(global.crypto.getRandomValues).toHaveBeenCalledWith(expect.any(Uint32Array));
      expect(typeof result).toBe('number');
      expect(result).toBe(987654321);
    });

    it('should return value within 32-bit unsigned integer range', () => {
      global.crypto = {
        getRandomValues: jest.fn((array: Uint32Array) => {
          array[0] = 4294967295; // Max 32-bit unsigned int
          return array;
        }),
      } as unknown as Crypto;

      const result = generateSeed32();
      expect(result).toBe(4294967295);
    });

    it('should return 0 when crypto returns 0', () => {
      global.crypto = {
        getRandomValues: jest.fn((array: Uint32Array) => {
          array[0] = 0;
          return array;
        }),
      } as unknown as Crypto;

      const result = generateSeed32();
      expect(result).toBe(0);
    });

    it('should modify the provided array in place', () => {
      const mockArray = new Uint32Array(1);
      
      global.crypto = {
        getRandomValues: jest.fn((array: Uint32Array) => {
          array[0] = 55555;
          return array;
        }),
      } as unknown as Crypto;

      generateSeed32();
      
      expect(global.crypto.getRandomValues).toHaveBeenCalled();
      const calledArray = (global.crypto.getRandomValues as jest.Mock).mock.calls[0][0] as Uint32Array;
      expect(calledArray).toBeInstanceOf(Uint32Array);
      expect(calledArray.length).toBe(1);
    });
  });
});
