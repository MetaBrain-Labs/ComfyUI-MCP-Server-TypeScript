import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { api } from "../../api/api";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testUpload() {
  const form = new FormData();

  const filePath = path.resolve(__dirname, "test.png");
  const fileBuffer = fs.readFileSync(filePath);

  const blob = new Blob([fileBuffer], { type: "image/png" });

  form.append("image", blob, "test.png");

  if (!fs.existsSync(filePath)) {
    console.error("文件不存在:", filePath);
    return;
  }

  const response = await api.uploadImg(form).catch((error) => {
    console.log(error);
  });

  console.error(response);
}

testUpload();
