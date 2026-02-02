import fs from "node:fs";
import path from "node:path";
import type { GatewayRequestHandlers } from "./types.js";
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../../agents/agent-scope.js";
import { loadConfig } from "../../config/config.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";

// Files/directories to exclude from listing
const EXCLUDED_NAMES = new Set([
  ".git",
  ".DS_Store",
  "node_modules",
  ".env",
  ".env.local",
  ".secrets",
]);

// Maximum file size to read (1MB)
const MAX_FILE_SIZE = 1024 * 1024;

// Allowed file extensions for reading
const ALLOWED_EXTENSIONS = new Set([
  ".md",
  ".txt",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".js",
  ".ts",
  ".py",
  ".sh",
  ".bash",
  ".zsh",
  ".fish",
  ".conf",
  ".ini",
  ".cfg",
  ".log",
  ".csv",
  "",
]);

function isPathSafe(basePath: string, requestedPath: string): boolean {
  const resolved = path.resolve(basePath, requestedPath);
  const relative = path.relative(basePath, resolved);
  // Prevent path traversal
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

function shouldIncludeEntry(name: string): boolean {
  if (EXCLUDED_NAMES.has(name)) {
    return false;
  }
  if (name.startsWith(".") && name !== ".") {
    // Allow common dotfiles that are useful for context
    const allowedDotfiles = new Set([".env.example", ".gitignore", ".editorconfig"]);
    return allowedDotfiles.has(name);
  }
  return true;
}

function canReadFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

export const contextHandlers: GatewayRequestHandlers = {
  "context.list": async ({ params, respond }) => {
    try {
      const cfg = loadConfig();
      const agentId = resolveDefaultAgentId(cfg);
      const workspaceDir = resolveAgentWorkspaceDir(cfg, agentId);

      if (!workspaceDir || !fs.existsSync(workspaceDir)) {
        respond(true, {
          path: workspaceDir ?? "",
          entries: [],
        });
        return;
      }

      const requestedPath = (params as { path?: string })?.path ?? "";

      if (!isPathSafe(workspaceDir, requestedPath)) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "invalid path"));
        return;
      }

      const targetDir = path.resolve(workspaceDir, requestedPath);

      if (!fs.existsSync(targetDir)) {
        respond(true, {
          path: workspaceDir,
          entries: [],
        });
        return;
      }

      const stat = fs.statSync(targetDir);
      if (!stat.isDirectory()) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "path is not a directory"),
        );
        return;
      }

      const dirEntries = fs.readdirSync(targetDir, { withFileTypes: true });
      const entries = dirEntries
        .filter((entry) => shouldIncludeEntry(entry.name))
        .map((entry) => {
          const entryPath = path.join(targetDir, entry.name);
          const relativePath = requestedPath ? path.join(requestedPath, entry.name) : entry.name;

          let size = 0;
          let modifiedAt = Date.now();

          try {
            const entryStat = fs.statSync(entryPath);
            size = entryStat.size;
            modifiedAt = entryStat.mtimeMs;
          } catch {
            // Ignore stat errors
          }

          return {
            name: entry.name,
            path: relativePath,
            size,
            modifiedAt,
            isDirectory: entry.isDirectory(),
          };
        })
        .sort((a, b) => {
          // Directories first, then alphabetically
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });

      respond(true, {
        path: workspaceDir,
        entries,
      });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.UNAVAILABLE, `failed to list context files: ${err}`),
      );
    }
  },

  "context.read": async ({ params, respond }) => {
    try {
      const cfg = loadConfig();
      const agentId = resolveDefaultAgentId(cfg);
      const workspaceDir = resolveAgentWorkspaceDir(cfg, agentId);

      if (!workspaceDir || !fs.existsSync(workspaceDir)) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "workspace not configured"),
        );
        return;
      }

      const requestedPath = (params as { path?: string })?.path;

      if (!requestedPath) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "path is required"));
        return;
      }

      if (!isPathSafe(workspaceDir, requestedPath)) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "invalid path"));
        return;
      }

      const targetPath = path.resolve(workspaceDir, requestedPath);

      if (!fs.existsSync(targetPath)) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "file not found"));
        return;
      }

      const stat = fs.statSync(targetPath);

      if (stat.isDirectory()) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "path is a directory"));
        return;
      }

      if (!canReadFile(targetPath)) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "file type not supported for viewing"),
        );
        return;
      }

      if (stat.size > MAX_FILE_SIZE) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "file too large (max 1MB)"),
        );
        return;
      }

      const content = fs.readFileSync(targetPath, "utf-8");

      respond(true, {
        path: requestedPath,
        content,
        size: stat.size,
        modifiedAt: stat.mtimeMs,
      });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.UNAVAILABLE, `failed to read context file: ${err}`),
      );
    }
  },
};
