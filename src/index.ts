/**
 * Auto-collapse tool outputs - compact single-line display with expand controls.
 * ▶ click row / Ctrl+O to expand, ▼ to collapse.
 */
import type {
  BashToolDetails,
  EditToolDetails,
  ExtensionAPI,
  ReadToolDetails,
} from "@earendil-works/pi-coding-agent";
import {
  createBashTool,
  createEditTool,
  createFindTool,
  createGrepTool,
  createLsTool,
  createReadTool,
  createWriteTool,
  keyHint,
} from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";

function expandBadge(expanded: boolean): string {
  return expanded ? " ▼" : ` ▶ ${keyHint("app.tools.expand", "展开")}`;
}

// Apply tool background (fills the full terminal width)
function bg(theme: any, color: string, text: string): string {
  return theme.bg(color, text);
}

export default function (pi: ExtensionAPI) {
  const cwd = process.cwd();

  // ── bash ──
  const origBash = createBashTool(cwd);
  pi.registerTool({
    ...origBash,
    renderShell: "self",
    renderCall(args, theme) {
      const cmd = args.command.length > 70 ? `${args.command.slice(0, 67)}…` : args.command;
      return new Text(bg(theme, "toolPendingBg", theme.fg("bashMode", `$ ${cmd}`)), 0, 0);
    },
    renderResult(result, { expanded }, theme) {
      const color = result.isError ? "toolErrorBg" : "toolSuccessBg";

      if (!expanded) {
        const content = result.content[0];
        const output = content?.type === "text" ? content.text : "";
        const exitMatch = output.match(/exit code: (\d+)/);
        const ok = !exitMatch || exitMatch[1] === "0";
        const status = ok ? theme.fg("success", "✓") : theme.fg("error", `✗ ${exitMatch![1]}`);
        return new Text(bg(theme, color, `${status}${expandBadge(false)}`), 0, 0);
      }

      const content = result.content[0];
      const text = content?.type === "text" ? content.text : "";
      return new Text(bg(theme, color, `${text}\n${expandBadge(true)}`), 0, 0);
    },
  });

  // ── read ──
  const origRead = createReadTool(cwd);
  pi.registerTool({
    ...origRead,
    renderShell: "self",
    renderCall(args, theme) {
      let text = theme.fg("toolTitle", "📄 ") + theme.fg("accent", args.path);
      if (args.offset) text += theme.fg("dim", ` @L${args.offset}`);
      return new Text(bg(theme, "toolPendingBg", text), 0, 0);
    },
    renderResult(result, { expanded }, theme) {
      const content = result.content[0];
      const color = result.isError ? "toolErrorBg" : "toolSuccessBg";

      if (content?.type === "image")
        return new Text(bg(theme, color, theme.fg("dim", "🖼 image")), 0, 0);
      if (content?.type !== "text") return new Text("", 0, 0);

      const lines = content.text.split("\n").length;
      if (!expanded)
        return new Text(bg(theme, color, theme.fg("dim", `${lines} lines${expandBadge(false)}`)), 0, 0);

      return new Text(bg(theme, color, `${content.text}\n${expandBadge(true)}`), 0, 0);
    },
  });

  // ── edit ──
  const origEdit = createEditTool(cwd);
  pi.registerTool({
    ...origEdit,
    renderShell: "self",
    renderCall(args, theme) {
      return new Text(bg(theme, "toolPendingBg", theme.fg("toolTitle", "✏️ ") + theme.fg("accent", args.path)), 0, 0);
    },
    renderResult(result, { expanded }, theme) {
      const content = result.content[0];
      const color = result.isError ? "toolErrorBg" : "toolSuccessBg";

      if (content?.type === "text" && content.text.startsWith("Error"))
        return new Text(bg(theme, color, theme.fg("error", `✗ ${content.text.split("\n")[0]}`)), 0, 0);

      const details = result.details as EditToolDetails | undefined;
      const diffLines = details?.diff?.split("\n") ?? [];
      let adds = 0, dels = 0;
      for (const l of diffLines) {
        if (l.startsWith("+") && !l.startsWith("+++")) adds++;
        if (l.startsWith("-") && !l.startsWith("---")) dels++;
      }

      if (!expanded)
        return new Text(
          bg(
            theme,
            color,
            `${theme.fg("success", `+${adds}`)} ${theme.fg("error", `-${dels}`)}${expandBadge(false)}`,
          ),
          0,
          0,
        );

      return new Text(bg(theme, color, `${details?.diff ?? "Applied"}\n${expandBadge(true)}`), 0, 0);
    },
  });

  // ── write ──
  const origWrite = createWriteTool(cwd);
  pi.registerTool({
    ...origWrite,
    renderShell: "self",
    renderCall(args, theme) {
      const n = args.content.split("\n").length;
      return new Text(
        bg(theme, "toolPendingBg", theme.fg("toolTitle", "📝 ") + theme.fg("accent", args.path) + theme.fg("dim", ` (${n}L)`)),
        0,
        0,
      );
    },
    renderResult(result, { expanded }, theme) {
      const color = result.isError ? "toolErrorBg" : "toolSuccessBg";

      if (!expanded)
        return new Text(bg(theme, color, theme.fg("success", `✓ written${expandBadge(false)}`)), 0, 0);

      const content = result.content[0];
      const text = content?.type === "text" ? content.text : "Written";
      return new Text(bg(theme, color, `${text}\n${expandBadge(true)}`), 0, 0);
    },
  });

  // ── grep ──
  const origGrep = createGrepTool(cwd);
  pi.registerTool({
    ...origGrep,
    renderShell: "self",
    renderCall(args, theme) {
      return new Text(bg(theme, "toolPendingBg", theme.fg("toolTitle", "🔍 ") + theme.fg("accent", args.pattern)), 0, 0);
    },
    renderResult(result, { expanded }, theme) {
      const content = result.content[0];
      const output = content?.type === "text" ? content.text : "";
      const matchCount = output.split("\n").filter((l) => l.trim()).length;
      const color = result.isError ? "toolErrorBg" : "toolSuccessBg";

      if (!expanded) {
        if (!output.trim())
          return new Text(bg(theme, color, theme.fg("dim", `0 matches${expandBadge(false)}`)), 0, 0);
        return new Text(bg(theme, color, theme.fg("dim", `${matchCount} matches${expandBadge(false)}`)), 0, 0);
      }
      return new Text(bg(theme, color, `${output}\n${expandBadge(true)}`), 0, 0);
    },
  });

  // ── find ──
  const origFind = createFindTool(cwd);
  pi.registerTool({
    ...origFind,
    renderShell: "self",
    renderCall(args, theme) {
      return new Text(bg(theme, "toolPendingBg", theme.fg("toolTitle", "📁 ") + args.path), 0, 0);
    },
    renderResult(result, { expanded }, theme) {
      const content = result.content[0];
      const output = content?.type === "text" ? content.text : "";
      const fileCount = output.split("\n").filter((l) => l.trim()).length;
      const color = result.isError ? "toolErrorBg" : "toolSuccessBg";

      if (!expanded) return new Text(bg(theme, color, theme.fg("dim", `${fileCount} files${expandBadge(false)}`)), 0, 0);
      return new Text(bg(theme, color, `${output}\n${expandBadge(true)}`), 0, 0);
    },
  });

  // ── ls ──
  const origLs = createLsTool(cwd);
  pi.registerTool({
    ...origLs,
    renderShell: "self",
    renderCall(args, theme) {
      return new Text(bg(theme, "toolPendingBg", theme.fg("toolTitle", "📂 ") + (args.path ?? ".")), 0, 0);
    },
    renderResult(result, { expanded }, theme) {
      const content = result.content[0];
      const output = content?.type === "text" ? content.text : "";
      const entryCount = output.split("\n").filter((l) => l.trim()).length;
      const color = result.isError ? "toolErrorBg" : "toolSuccessBg";

      if (!expanded) return new Text(bg(theme, color, theme.fg("dim", `${entryCount} entries${expandBadge(false)}`)), 0, 0);
      return new Text(bg(theme, color, `${output}\n${expandBadge(true)}`), 0, 0);
    },
  });
}
