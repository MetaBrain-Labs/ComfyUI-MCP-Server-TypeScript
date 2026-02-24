import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types";
import axios, { HttpStatusCode } from "axios";
import { ExecutePromptResult } from "../types/execute";
import { ComfyPromptConfig, WorkflowSimpleData } from "../types/task";
import { ComfyUIWorkflow } from "../types/workflow";
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
  baseUrl: string,
  client: ComfyClient,
): Promise<string[]> {
  const availableWorkflow: string[] = [];

  // 获取用户的工作流列表
  const url = `${baseUrl}/userdata?dir=workflows&recurse=true&split=false&full_info=true`;

  const res = await axios.get<WorkflowSimpleData[]>(url);

  if (res.data === null) {
    throw new McpError(ErrorCode.InternalError, "Not Exist Workflow response");
  }

  const converter = new WorkflowConverter(baseUrl);
  await converter.init();

  for (const item of res.data) {
    const workflowUrl = `${baseUrl}/userdata/workflows%2F${item.path}`;
    const workflowRes = await axios.get<ComfyUIWorkflow>(workflowUrl);

    const output = converter.convert(workflowRes.data);

    try {
      const promptRes = await axios.post<ExecutePromptResult>(
        `${baseUrl}/prompt`,
        {
          extra_pnginfo: {
            workflow: workflowRes.data,
          },
          client_id: client.getClientId(),
          prompt: output as ComfyPromptConfig,
        },
      );

      if (promptRes.status === HttpStatusCode.Ok) {
        const promptId = promptRes.data.prompt_id;

        availableWorkflow.push(promptId);

        const startResult = await waitForExecutionStart({
          client,
          promptId,
        });

        if (startResult.success) {
          console.error(`Start workflow ${promptId} success`);
          await axios.post(`${baseUrl}/interrupt`, {
            prompt_id: promptId,
          });

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
