import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const WORKFLOW_DIR = path.join(PROJECT_ROOT, "workflow");
const WORKFLOW_FILE = "workflow.json";
const WORKFLOW_PATH = path.join(WORKFLOW_DIR, WORKFLOW_FILE);

export const COMMON = {
  CUI_DESC: "=DESC=",

  PROJECT_ROOT: PROJECT_ROOT,
  WORKFLOW_DIR: WORKFLOW_DIR,
  WORKFLOW_FILE: WORKFLOW_FILE,
  WORKFLOW_PATH: WORKFLOW_PATH,
  WORKFLOW_RESOURCE_URI: "workflow://default",
} as const;
