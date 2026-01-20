import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

export interface SaveWorkflowOptions {
  // 文件夹
  dir?: string;
  // 文件名
  fileName?: string;
  // 是否启用追加模式
  append?: boolean;
}

// 必须在文件最顶部添加这两行
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * @METHOD
 * @description 保存历史任务到本地（允许分页数据以追加数据的形式保存到文件中）
 * @author LaiFQZzr
 * @date 2026/01/20 11:51
 */
export async function saveWorkflow(
  data: unknown,
  options: SaveWorkflowOptions = {},
): Promise<{ filePath: string }> {
  const projectRoot = path.resolve(__dirname, "..", "..");

  const {
    dir = path.join(projectRoot, "workflow"),
    fileName = `workflow.json`,
    append = true,
  } = options;

  await mkdir(dir, { recursive: true });

  const filePath = path.join(dir, fileName);

  let finalData: any[] = [];

  // 如果是追加模式，则追加workflow.json之前的文件
  if (append) {
    try {
      const existingContent = await readFile(filePath, "utf-8");
      const existingData = JSON.parse(existingContent);

      if (Array.isArray(existingData)) {
        finalData = existingData.flat(Infinity);
      }
    } catch (error) {
      console.error("读取现有文件失败,将创建新文件:", error);
    }
  }

  // 处理新数据
  let newData: any[] = [];

  if (Array.isArray(data)) {
    newData = data.flat(Infinity);
  } else if (typeof data === "object" && data !== null) {
    // 将对象转换为数组
    newData = Object.entries(data).map(([promptId, workflow]) => ({
      prompt_id: promptId,
      ...workflow,
    }));
  } else {
    newData = [data];
  }

  // 合并数据
  finalData = [...finalData, ...newData];

  // 过滤掉空对象
  finalData = finalData.filter((item) => {
    if (typeof item === "object" && item !== null && !Array.isArray(item)) {
      return Object.keys(item).length > 0;
    }
    return true;
  });

  await writeFile(filePath, JSON.stringify(finalData, null, 2), "utf-8");

  return { filePath };
}

// export async function saveWorkflow(
//   data: unknown,
//   options: SaveWorkflowOptions = {},
// ): Promise<{ filePath: string }> {
//   const projectRoot = path.resolve(__dirname, "..", "..");

//   const {
//     dir = path.join(projectRoot, "workflow"),
//     fileName = `workflow.json`,
//     append = true,
//   } = options;

//   await mkdir(dir, { recursive: true });

//   const filePath = path.join(dir, fileName);

//   let finalData: any[] = [];

//   if (append) {
//     try {
//       // 尝试读取现有文件
//       const existingContent = await readFile(filePath, "utf-8");
//       const existingData = JSON.parse(existingContent);

//       // 扁平化现有数据
//       if (Array.isArray(existingData)) {
//         finalData = existingData.flat(Infinity);
//       }
//     } catch (error) {
//       // 文件不存在或读取失败,使用空数组
//       console.error("读取现有文件失败,将创建新文件:", error);
//     }
//   }

//   // 扁平化新数据
//   let newData: any[] = [];
//   if (Array.isArray(data)) {
//     newData = data.flat(Infinity);
//   } else {
//     newData = [data];
//   }

//   // 合并数据
//   finalData = [...finalData, ...newData];

//   // 过滤掉空对象 {}
//   finalData = finalData.filter((item) => {
//     // 检查是否为空对象
//     if (typeof item === "object" && item !== null && !Array.isArray(item)) {
//       return Object.keys(item).length > 0;
//     }
//     return true;
//   });

//   await writeFile(filePath, JSON.stringify(finalData, null, 2), "utf-8");

//   return { filePath };
// }
