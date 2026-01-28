import "dotenv/config";

type Locale = "zh" | "en";
type MessageValue = string | ((...args: any[]) => string) | Record<string, any>;

interface Messages {
  [locale: string]: Record<string, any>;
}

class I18n {
  private locale: Locale = "zh";
  private messages: Messages = {};
  private fallbackLocale: Locale = "zh";

  constructor(options?: {
    locale?: Locale;
    fallbackLocale?: Locale;
    messages?: Messages;
  }) {
    if (options?.locale) {
      this.locale = options.locale;
    } else {
      this.locale = this.loadLocaleFromEnv();
    }

    if (options?.fallbackLocale) {
      this.fallbackLocale = options.fallbackLocale;
    } else {
      this.fallbackLocale = this.locale;
    }

    if (options?.messages) this.messages = options.messages;
  }

  setLocale(locale: Locale) {
    this.locale = locale;
  }

  getLocale(): Locale {
    return this.locale;
  }

  addMessages(locale: Locale, messages: Record<string, any>) {
    if (!this.messages[locale]) {
      this.messages[locale] = {};
    }
    Object.assign(this.messages[locale], messages);
  }

  /**
   * @METHOD
   * @description 从环境变量加载语言设置
   * @author LaiFQZzr
   * @date 2026/01/27 15:45
   */
  private loadLocaleFromEnv(): Locale {
    const envLocale = process.env.LOCALE?.toLowerCase();

    if (envLocale === "zh" || envLocale === "en") {
      console.error(`Locale loaded from .env: ${envLocale}`);
      return envLocale;
    }

    console.error("Locale not set in .env, using default: zh");
    return "zh";
  }

  /**
   * @METHOD
   * @description 支持嵌套路径访问，如 'workflow.mode.append' 就等于访问workflow文件中的mode.append字段
   * @author LaiFQZzr
   * @date 2026/01/27 15:37
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }

  t(key: string, ...args: any[]): string {
    let message =
      this.getNestedValue(this.messages[this.locale], key) ||
      this.getNestedValue(this.messages[this.fallbackLocale], key);

    if (!message) {
      console.error(
        `Translation key "${key}" not found for locale "${this.locale}"`,
      );
      return key;
    }

    if (typeof message === "function") {
      return message(...args);
    }

    if (typeof message === "object") {
      console.error(
        `Translation key "${key}" points to an object, not a string`,
      );
      return key;
    }

    return message;
  }
}

/**
 * @METHOD
 * @description 创建全局实例
 * @author LaiFQZzr
 * @date 2026/01/27 15:36
 */
export const i18n = new I18n({});

export const t = i18n.t.bind(i18n);
export const setLocale = i18n.setLocale.bind(i18n);
export const getLocale = i18n.getLocale.bind(i18n);
export const addMessages = i18n.addMessages.bind(i18n);
