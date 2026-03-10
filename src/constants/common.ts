import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const WORKFLOW_DIR = path.join(PROJECT_ROOT, "workflow");
const WORKFLOW_FILE = "workflow.json";
const WORKFLOW_PATH = path.join(WORKFLOW_DIR, WORKFLOW_FILE);

const SKILLS_DIR = path.join(PROJECT_ROOT, "comfyui-mcp-server-skill");
const SKILLS_RULES_DIR = path.join(SKILLS_DIR, "rules");
const DEFAULT_RULE_FILE = "comfyui.md";
const DEFAULT_RULE_PATH = path.join(SKILLS_RULES_DIR, DEFAULT_RULE_FILE);

const ASSETS_DIR = path.join(PROJECT_ROOT, "assets");

export const COMMON = {
  PROJECT_ROOT,
  WORKFLOW_DIR,
  WORKFLOW_FILE,
  WORKFLOW_PATH,
  WORKFLOW_RESOURCE_URI: "workflow://default",

  SKILLS_DIR,
  SKILLS_RULES_DIR,
  DEFAULT_RULE_FILE,
  DEFAULT_RULE_PATH,

  ASSETS_DIR,
} as const;
