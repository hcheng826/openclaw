import type { GatewayBrowserClient } from "../gateway";
import type { ContextFileEntry, ContextFilesListResult, ContextFileReadResult } from "../types";

export type ContextState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  contextLoading: boolean;
  contextError: string | null;
  contextWorkspacePath: string | null;
  contextCurrentPath: string;
  contextEntries: ContextFileEntry[];
  contextSelectedFile: string | null;
  contextFileContent: string | null;
  contextFileLoading: boolean;
};

export async function loadContextFiles(state: ContextState) {
  if (!state.client || !state.connected) {
    state.contextError = "Not connected to gateway";
    return;
  }
  state.contextLoading = true;
  state.contextError = null;
  try {
    const res = await state.client.request("context.list", {
      path: state.contextCurrentPath || "",
    }) as ContextFilesListResult;
    state.contextWorkspacePath = res.path;
    state.contextEntries = res.entries ?? [];
  } catch (err) {
    state.contextError = String(err);
    state.contextEntries = [];
  } finally {
    state.contextLoading = false;
  }
}

export async function loadContextFile(state: ContextState, filePath: string) {
  if (!state.client || !state.connected) {
    state.contextError = "Not connected to gateway";
    return;
  }
  state.contextSelectedFile = filePath;
  if (!filePath) {
    state.contextFileContent = null;
    return;
  }
  state.contextFileLoading = true;
  state.contextError = null;
  try {
    const res = await state.client.request("context.read", {
      path: filePath,
    }) as ContextFileReadResult;
    state.contextFileContent = res.content;
  } catch (err) {
    state.contextError = String(err);
    state.contextFileContent = null;
  } finally {
    state.contextFileLoading = false;
  }
}

export function navigateContextPath(state: ContextState, path: string) {
  state.contextCurrentPath = path;
  state.contextSelectedFile = null;
  state.contextFileContent = null;
  loadContextFiles(state);
}

export function navigateContextBack(state: ContextState) {
  const parts = state.contextCurrentPath.split("/").filter(Boolean);
  parts.pop();
  state.contextCurrentPath = parts.join("/");
  state.contextSelectedFile = null;
  state.contextFileContent = null;
  loadContextFiles(state);
}
