import { api } from "../../api/api";

async function run() {
  const result = await api.pageHistoryTasks(3, 0);

  console.error("结果为：", result);
}

run();
