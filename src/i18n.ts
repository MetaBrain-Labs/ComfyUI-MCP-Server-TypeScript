import i18n from "i18next";
import Backend from "i18next-fs-backend";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Locale = "zh" | "en";

await i18n.use(Backend).init({
  lng: loadLocaleFromEnv(),
  fallbackLng: "en",
  ns: ["common"],
  defaultNS: "common",
  backend: {
    loadPath: path.join(__dirname, "../locales/{{lng}}.json"),
  },
});

/**
 * @METHOD
 * @description
 * @author LaiFQZzr
 * @date 2026/02/25 17:53
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
