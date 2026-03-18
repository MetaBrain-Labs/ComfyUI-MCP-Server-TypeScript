import i18n from "i18next";
import Backend from "i18next-fs-backend";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Locale = "zh" | "en";

const currentLocale = loadLocaleFromEnv();

await i18n.use(Backend).init({
  lng: currentLocale,
  fallbackLng: currentLocale === "en" ? "zh" : "en",
  ns: ["common"],
  defaultNS: "common",
  backend: {
    loadPath: path.join(__dirname, "../locales/{{lng}}.json"),
  },
});

/**
 * @METHOD
 * @description 从环境变量加载语言设置
 */
function loadLocaleFromEnv(): Locale {
  const envLocale = process.env.LOCALE?.toLowerCase();

  if (envLocale === "zh" || envLocale === "en") {
    console.error(`Locale loaded from .env: ${envLocale}`);
    return envLocale;
  }

  console.error("Locale not set in .env, using default: zh");
  return "zh";
}

export default i18n;
