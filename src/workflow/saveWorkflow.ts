import { mkdir, writeFile } from "fs/promises";
import path from "path";

export interface SaveWorkflowOptions {
  dir?: string;
  fileName?: string;
}

export async function saveWorkflow(
  data: unknown,
  options: SaveWorkflowOptions = {}
): Promise<{ filePath: string }> {
  const {
    dir = path.resolve(process.cwd(), "workflow"),
    fileName = `workflow.json`,
  } = options;

  await mkdir(dir, { recursive: true });

  const filePath = path.join(dir, fileName);

  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");

  return { filePath };
}
