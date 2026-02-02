import { html, nothing } from "lit";
import type { ContextFileEntry } from "../types";

export type ContextProps = {
  loading: boolean;
  error: string | null;
  workspacePath: string | null;
  currentPath: string;
  entries: ContextFileEntry[];
  selectedFile: string | null;
  fileContent: string | null;
  fileLoading: boolean;
  onRefresh: () => void;
  onNavigate: (path: string) => void;
  onSelectFile: (path: string) => void;
  onBack: () => void;
};

// SVG Icons
const icons = {
  folder: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </svg>
  `,
  file: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  `,
  markdown: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
    </svg>
  `,
  back: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  `,
  refresh: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  `,
  close: html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  `,
};

function getFileIcon(name: string, isDirectory: boolean) {
  if (isDirectory) {
    return icons.folder;
  }
  if (name.endsWith(".md")) {
    return icons.markdown;
  }
  return icons.file;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

// Context files that are commonly used
const CONTEXT_FILE_DESCRIPTIONS: Record<string, string> = {
  "AGENTS.md": "Agent behavior and instructions",
  "SOUL.md": "Agent personality and identity",
  "USER.md": "Information about the user",
  "IDENTITY.md": "Agent identity configuration",
  "TOOLS.md": "Tool-specific notes and preferences",
  "MEMORY.md": "Long-term memory and notes",
  "HEARTBEAT.md": "Heartbeat task configuration",
  "BOOTSTRAP.md": "Initial setup instructions",
};

export function renderContext(props: ContextProps) {
  const isRoot = props.currentPath === "" || props.currentPath === ".";
  const breadcrumbs = props.currentPath ? props.currentPath.split("/").filter(Boolean) : [];

  return html`
    <div class="context-layout">
      <!-- File browser sidebar -->
      <aside class="context-sidebar">
        <div class="context-sidebar__header">
          <div class="context-sidebar__title">Context Files</div>
          <button
            class="btn btn--icon btn--sm"
            ?disabled=${props.loading}
            @click=${props.onRefresh}
            title="Refresh"
          >
            ${icons.refresh}
          </button>
        </div>

        ${
          props.workspacePath
            ? html`<div class="context-workspace-path muted" style="padding: 0 16px 8px; font-size: 12px;">
                ${props.workspacePath}
              </div>`
            : nothing
        }

        <!-- Breadcrumbs -->
        <div class="context-breadcrumbs">
          <button
            class="context-breadcrumb ${isRoot ? "active" : ""}"
            @click=${() => props.onNavigate("")}
          >
            workspace
          </button>
          ${breadcrumbs.map(
            (segment, index) => html`
              <span class="context-breadcrumb-separator">/</span>
              <button
                class="context-breadcrumb ${index === breadcrumbs.length - 1 ? "active" : ""}"
                @click=${() => props.onNavigate(breadcrumbs.slice(0, index + 1).join("/"))}
              >
                ${segment}
              </button>
            `,
          )}
        </div>

        ${
          props.error
            ? html`<div class="callout danger" style="margin: 12px 16px;">${props.error}</div>`
            : nothing
        }

        ${
          props.loading
            ? html`<div class="context-loading" style="padding: 24px; text-align: center;">
                <div class="muted">Loading files...</div>
              </div>`
            : nothing
        }

        <!-- File list -->
        <div class="context-file-list">
          ${
            !isRoot
              ? html`
                <button class="context-file-item context-file-item--back" @click=${props.onBack}>
                  <span class="context-file-icon">${icons.back}</span>
                  <span class="context-file-name">..</span>
                </button>
              `
              : nothing
          }
          ${props.entries.map(
            (entry) => html`
              <button
                class="context-file-item ${props.selectedFile === entry.path ? "selected" : ""} ${entry.isDirectory ? "context-file-item--dir" : ""}"
                @click=${() =>
                  entry.isDirectory ? props.onNavigate(entry.path) : props.onSelectFile(entry.path)}
              >
                <span class="context-file-icon">${getFileIcon(entry.name, entry.isDirectory)}</span>
                <span class="context-file-name">${entry.name}</span>
                ${
                  !entry.isDirectory
                    ? html`<span class="context-file-size muted">${formatFileSize(entry.size)}</span>`
                    : nothing
                }
              </button>
            `,
          )}
          ${
            !props.loading && props.entries.length === 0
              ? html`<div class="muted" style="padding: 24px; text-align: center;">
                  No files found in this directory.
                </div>`
              : nothing
          }
        </div>
      </aside>

      <!-- File content viewer -->
      <main class="context-main">
        ${
          props.selectedFile
            ? html`
              <div class="context-file-header">
                <div class="context-file-header__info">
                  <div class="context-file-header__name">
                    ${props.selectedFile.split("/").pop()}
                  </div>
                  ${
                    CONTEXT_FILE_DESCRIPTIONS[props.selectedFile.split("/").pop() ?? ""]
                      ? html`<div class="context-file-header__desc muted">
                        ${CONTEXT_FILE_DESCRIPTIONS[props.selectedFile.split("/").pop() ?? ""]}
                      </div>`
                      : nothing
                  }
                </div>
                <button
                  class="btn btn--icon btn--sm"
                  @click=${() => props.onSelectFile("")}
                  title="Close"
                >
                  ${icons.close}
                </button>
              </div>
              <div class="context-file-content">
                ${
                  props.fileLoading
                    ? html`<div class="muted" style="padding: 24px;">Loading file...</div>`
                    : props.fileContent !== null
                      ? html`<pre class="context-file-pre">${props.fileContent}</pre>`
                      : html`<div class="muted" style="padding: 24px;">Select a file to view its contents.</div>`
                }
              </div>
            `
            : html`
              <div class="context-empty">
                <div class="context-empty__icon">${icons.file}</div>
                <div class="context-empty__title">Select a file to view</div>
                <div class="context-empty__desc muted">
                  Context files define how the agent behaves, what it knows about you, and its personality.
                </div>
                <div class="context-file-hints" style="margin-top: 24px; text-align: left; max-width: 400px;">
                  <div class="context-file-hint__title" style="font-weight: 600; margin-bottom: 12px;">Common context files:</div>
                  ${Object.entries(CONTEXT_FILE_DESCRIPTIONS).map(
                    ([name, desc]) => html`
                      <div class="context-file-hint" style="margin-bottom: 8px;">
                        <span class="mono" style="color: var(--accent);">${name}</span>
                        <span class="muted"> — ${desc}</span>
                      </div>
                    `,
                  )}
                </div>
              </div>
            `
        }
      </main>
    </div>

    <style>
      .context-layout {
        display: grid;
        grid-template-columns: 320px 1fr;
        gap: 0;
        height: 100%;
        min-height: 500px;
        background: var(--bg);
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid var(--border);
      }

      .context-sidebar {
        background: var(--bg-surface);
        border-right: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .context-sidebar__header {
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid var(--border);
      }

      .context-sidebar__title {
        font-weight: 600;
        font-size: 15px;
      }

      .context-breadcrumbs {
        padding: 8px 16px;
        display: flex;
        align-items: center;
        gap: 4px;
        flex-wrap: wrap;
        font-size: 13px;
        border-bottom: 1px solid var(--border);
        background: var(--bg);
      }

      .context-breadcrumb {
        background: none;
        border: none;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        color: var(--text-muted);
        font-size: 13px;
      }

      .context-breadcrumb:hover {
        background: var(--bg-hover);
        color: var(--text);
      }

      .context-breadcrumb.active {
        color: var(--text);
        font-weight: 500;
      }

      .context-breadcrumb-separator {
        color: var(--text-muted);
      }

      .context-file-list {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
      }

      .context-file-item {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 10px 12px;
        background: none;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        text-align: left;
        font-size: 14px;
        color: var(--text);
        transition: background 0.15s;
      }

      .context-file-item:hover {
        background: var(--bg-hover);
      }

      .context-file-item.selected {
        background: var(--accent-bg);
        color: var(--accent);
      }

      .context-file-item--dir .context-file-name {
        font-weight: 500;
      }

      .context-file-item--back {
        color: var(--text-muted);
      }

      .context-file-icon {
        flex-shrink: 0;
        opacity: 0.7;
      }

      .context-file-name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .context-file-size {
        font-size: 12px;
        flex-shrink: 0;
      }

      .context-main {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background: var(--bg);
      }

      .context-file-header {
        padding: 16px;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        border-bottom: 1px solid var(--border);
        background: var(--bg-surface);
      }

      .context-file-header__name {
        font-weight: 600;
        font-size: 16px;
      }

      .context-file-header__desc {
        font-size: 13px;
        margin-top: 4px;
      }

      .context-file-content {
        flex: 1;
        overflow: auto;
        padding: 16px;
      }

      .context-file-pre {
        font-family: var(--font-mono);
        font-size: 13px;
        line-height: 1.6;
        white-space: pre-wrap;
        word-break: break-word;
        margin: 0;
        color: var(--text);
      }

      .context-empty {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px;
        text-align: center;
      }

      .context-empty__icon {
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
        color: var(--text-muted);
        opacity: 0.5;
      }

      .context-empty__icon svg {
        width: 100%;
        height: 100%;
      }

      .context-empty__title {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 8px;
      }

      .context-empty__desc {
        font-size: 14px;
        max-width: 320px;
      }

      .btn--icon {
        padding: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    </style>
  `;
}
