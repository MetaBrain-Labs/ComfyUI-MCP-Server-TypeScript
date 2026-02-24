import axios from "axios";
import { api } from "../api/api";
import { ExecutePromptRequest } from "../types/execute";
import { ComfyPromptConfig } from "../types/task";
import { WorkflowConverter } from "../utils/workflow-converter";
import { ComfyClient } from "../utils/ws";
import { waitForExecutionInterrupt, waitForExecutionStart } from "./tasks";

/**
 * @METHOD
 * @description 从工作流列表中获取工作流
 * @author LaiFQZzr
 * @date 2026/01/20 11:50
 */
export async function executeWorkflowTask(
  client: ComfyClient,
  converter: WorkflowConverter,
): Promise<string[]> {
  const availableWorkflow: string[] = [];

  const res = await api.getUserData("workflows");

  for (const item of res) {
    const workflowRes = await api.getDetailUserData(item.path);

    const output = converter.convert(workflowRes);

    try {
      const data: ExecutePromptRequest = {
        extra_pnginfo: {
          workflow: workflowRes,
        },
        client_id: client.getClientId(),
        prompt: output as ComfyPromptConfig,
      };
      const promptRes = await api.prompt(data);

      const promptId = promptRes.prompt_id;

      availableWorkflow.push(promptId);

      const startResult = await waitForExecutionStart({
        client,
        promptId,
      });

      if (startResult.success) {
        console.error(`Start workflow ${promptId} success`);
        await api.interrupt(promptId);

        const executionResult = await waitForExecutionInterrupt({
          client,
          promptId,
        });

        if (executionResult.success) {
          console.error(`Interrupt workflow ${promptId} success`);
        } else {
          console.error(
            `Interrupt workflow task ${promptId} failed: ${executionResult.error}`,
          );
        }
      } else {
        console.error(
          `Start workflow task ${promptId} failed: ${startResult.error}`,
        );
      }
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 400) {
        console.error(
          `Skip workflow ${item.path}: bad request (400):\n` +
            JSON.stringify(e.response.data, null, 2),
        );
      }
    }
  }

  return availableWorkflow;
}
