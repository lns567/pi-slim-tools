/**
 * Auto-collapse tool outputs - compact display with right-aligned expand hint.
 * Ctrl+O to expand/collapse.
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
import { Text, visibleWidth } from "@earendil-works/pi-tui";

function expandBadge(expanded: boolean): string {
  return expanded ? " ▼" : ` ▶ ${keyHint("app.tools.expand", "展开")}`;
}

/** Right-align badge: pushes the expand badge to the end of the line */
function alignRight(
  theme: any,
  bgColor: string,
  left: string,
  right: string,
): (width: number) => string[] {
  const leftText = theme.bg(bgColor, left);
  const rightText = theme.bg(bgColor, right);
  return (width: number) => {
    const lw = visibleWidth(leftText);
    const rw = visibleWidth(rightText);
    const pad = Math.max(1, width - lw - rw);
    // pad with background-colored spaces
    return [leftText + theme.bg(bgColor, " ".repeat(pad)) + rightText];
  };
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
      const left = theme.fg("bashMode", `$ ${cmd}`);
      const right = theme.fg("dim", "running…");
      const fn = alignRight(theme, "toolPendingBg", left, right);
      return {
        render: (w: number) => fn(w),
        invalidate() {},
      };
    },
    renderResult(result, { expanded }, theme) {
      const color = result.isError ? "toolErrorBg" : "toolSuccessBg";
      const rightStr = expandBadge(expanded);
      const right = theme.fg("dim", rightStr);

      if (!expanded) {
        const content = result.content[0];
        const output = content?.type === "text" ? content.text : "";
        const exitMatch = output.match(/exit code: (\d+)/);
        const ok = !exitMatch || exitMatch[1] === "0";
        const status = ok ? theme.fg("success", "✓") : theme.fg("error", `✗ ${exitMatch![1]}`);
        const fn = alignRight(theme, color, status, right);
        return { render: (w: number) => fn(w), invalidate() {} };
      }

      const content = result.content[0];
      const text = content?.type === "text" ? content.text : "";
      const all = text.split("\n");
      // first lines: output; last line: badge right-aligned
      const fn = (w: number) => {
        const result: string[] = [];
        for (const line of all) {
          result.push(theme.bg(color, line));
        }
        const rw = visibleWidth(right);
        const pad = Math.max(1, w - rw);
        result.push(theme.bg(color, " ".repeat(pad)) + right);
        return result;
      };
      return { render: fn, invalidate() {} };
    },
  });

  // ── read ──
  const origRead = createReadTool(cwd);
  pi.registerTool({
    ...origRead,
    renderShell: "self",
    renderCall(args, theme) {
      let left = theme.fg("toolTitle", "📄 ") + theme.fg("accent", args.path);
      if (args.offset) left += theme.fg("dim", ` @L${args.offset}`);
      const right = theme.fg("dim", "reading…");
      const fn = alignRight(theme, "toolPendingBg", left, right);
      return { render: (w: number) => fn(w), invalidate() {} };
    },
    renderResult(result, { expanded }, theme) {
      const content = result.content[0];
      const color = result.isError ? "toolErrorBg" : "toolSuccessBg";
      const right = theme.fg("dim", expandBadge(expanded));

      if (content?.type === "image") {
        const fn = alignRight(theme, color, theme.fg("dim", "🖼 image"), right);
        return { render: (w: number) => fn(w), invalidate() {} };
      }
      if (content?.type !== "text") return new Text("", 0, 0);

      const lines = content.text.split("\n").length;
      if (!expanded) {
        const fn = alignRight(theme, color, theme.fg("dim", `${lines} lines`), right);
        return { render: (w: number) => fn(w), invalidate() {} };
      }

      const all = content.text.split("\n");
      const fn = (w: number) => {
        const result: string[] = all.map((l) => theme.bg(color, l));
        const rw = visibleWidth(right);
        const pad = Math.max(1, w - rw);
        result.push(theme.bg(color, " ".repeat(pad)) + right);
        return result;
      };
      return { render: fn, invalidate() {} };
    },
  });

  // ── edit ──
  const origEdit = createEditTool(cwd);
  pi.registerTool({
    ...origEdit,
    renderShell: "self",
    renderCall(args, theme) {
      const left = theme.fg("toolTitle", "✏️ ") + theme.fg("accent", args.path);
      const right = theme.fg("dim", "editing…");
      const fn = alignRight(theme, "toolPendingBg", left, right);
      return { render: (w: number) => fn(w), invalidate() {} };
    },
    renderResult(result, { expanded }, theme) {
      const content = result.content[0];
      const color = result.isError ? "toolErrorBg" : "toolSuccessBg";
      const right = theme.fg("dim", expandBadge(expanded));

      if (content?.type === "text" && content.text.startsWith("Error")) {
        const fn = alignRight(theme, color, theme.fg("error", `✗ ${content.text.split("\n")[0]}`), right);
        return { render: (w: number) => fn(w), invalidate() {} };
      }

      const details = result.details as EditToolDetails | undefined;
      const diffLines = details?.diff?.split("\n") ?? [];
      let adds = 0, dels = 0;
      for (const l of diffLines) {
        if (l.startsWith("+") && !l.startsWith("+++")) adds++;
        if (l.startsWith("-") && !l.startsWith("---")) dels++;
      }

      if (!expanded) {
        const left = `${theme.fg("success", `+${adds}`)} ${theme.fg("error", `-${dels}`)}`;
        const fn = alignRight(theme, color, left, right);
        return { render: (w: number) => fn(w), invalidate() {} };
      }

      const all = (details?.diff ?? "Applied").split("\n");
      const fn = (w: number) => {
        const result: string[] = all.map((l) => theme.bg(color, l));
        const rw = visibleWidth(right);
        const pad = Math.max(1, w - rw);
        result.push(theme.bg(color, " ".repeat(pad)) + right);
        return result;
      };
      return { render: fn, invalidate() {} };
    },
  });

  // ── write ──
  const origWrite = createWriteTool(cwd);
  pi.registerTool({
    ...origWrite,
    renderShell: "self",
    renderCall(args, theme) {
      const n = args.content.split("\n").length;
      const left = theme.fg("toolTitle", "📝 ") + theme.fg("accent", args.path) + theme.fg("dim", ` (${n}L)`);
      const right = theme.fg("dim", "writing…");
      const fn = alignRight(theme, "toolPendingBg", left, right);
      return { render: (w: number) => fn(w), invalidate() {} };
    },
    renderResult(result, { expanded }, theme) {
      const color = result.isError ? "toolErrorBg" : "toolSuccessBg";
      const right = theme.fg("dim", expandBadge(expanded));

      if (!expanded) {
        const fn = alignRight(theme, color, theme.fg("success", "✓ written"), right);
        return { render: (w: number) => fn(w), invalidate() {} };
      }

      const content = result.content[0];
      const text = content?.type === "text" ? content.text : "Written";
      const all = text.split("\n");
      const fn = (w: number) => {
        const result: string[] = all.map((l) => theme.bg(color, l));
        const rw = visibleWidth(right);
        const pad = Math.max(1, w - rw);
        result.push(theme.bg(color, " ".repeat(pad)) + right);
        return result;
      };
      return { render: fn, invalidate() {} };
    },
  });

  // ── grep ──
  const origGrep = createGrepTool(cwd);
  pi.registerTool({
    ...origGrep,
    renderShell: "self",
    renderCall(args, theme) {
      const left = theme.fg("toolTitle", "🔍 ") + theme.fg("accent", args.pattern);
      const right = theme.fg("dim", "searching…");
      const fn = alignRight(theme, "toolPendingBg", left, right);
      return { render: (w: number) => fn(w), invalidate() {} };
    },
    renderResult(result, { expanded }, theme) {
      const content = result.content[0];
      const output = content?.type === "text" ? content.text : "";
      const matchCount = output.split("\n").filter((l) => l.trim()).length;
      const color = result.isError ? "toolErrorBg" : "toolSuccessBg";
      const right = theme.fg("dim", expandBadge(expanded));

      if (!expanded) {
        const left = !output.trim()
          ? theme.fg("dim", "0 matches")
          : theme.fg("dim", `${matchCount} matches`);
        const fn = alignRight(theme, color, left, right);
        return { render: (w: number) => fn(w), invalidate() {} };
      }

      const all = output.split("\n");
      const fn = (w: number) => {
        const result: string[] = all.map((l) => theme.bg(color, l));
        const rw = visibleWidth(right);
        const pad = Math.max(1, w - rw);
        result.push(theme.bg(color, " ".repeat(pad)) + right);
        return result;
      };
      return { render: fn, invalidate() {} };
    },
  });

  // ── find ──
  const origFind = createFindTool(cwd);
  pi.registerTool({
    ...origFind,
    renderShell: "self",
    renderCall(args, theme) {
      const left = theme.fg("toolTitle", "📁 ") + args.path;
      const right = theme.fg("dim", "finding…");
      const fn = alignRight(theme, "toolPendingBg", left, right);
      return { render: (w: number) => fn(w), invalidate() {} };
    },
    renderResult(result, { expanded }, theme) {
      const content = result.content[0];
      const output = content?.type === "text" ? content.text : "";
      const fileCount = output.split("\n").filter((l) => l.trim()).length;
      const color = result.isError ? "toolErrorBg" : "toolSuccessBg";
      const right = theme.fg("dim", expandBadge(expanded));

      if (!expanded) {
        const fn = alignRight(theme, color, theme.fg("dim", `${fileCount} files`), right);
        return { render: (w: number) => fn(w), invalidate() {} };
      }

      const all = output.split("\n");
      const fn = (w: number) => {
        const result: string[] = all.map((l) => theme.bg(color, l));
        const rw = visibleWidth(right);
        const pad = Math.max(1, w - rw);
        result.push(theme.bg(color, " ".repeat(pad)) + right);
        return result;
      };
      return { render: fn, invalidate() {} };
    },
  });

  // ── ls ──
  const origLs = createLsTool(cwd);
  pi.registerTool({
    ...origLs,
    renderShell: "self",
    renderCall(args, theme) {
      const left = theme.fg("toolTitle", "📂 ") + (args.path ?? ".");
      const right = theme.fg("dim", "listing…");
      const fn = alignRight(theme, "toolPendingBg", left, right);
      return { render: (w: number) => fn(w), invalidate() {} };
    },
    renderResult(result, { expanded }, theme) {
      const content = result.content[0];
      const output = content?.type === "text" ? content.text : "";
      const entryCount = output.split("\n").filter((l) => l.trim()).length;
      const color = result.isError ? "toolErrorBg" : "toolSuccessBg";
      const right = theme.fg("dim", expandBadge(expanded));

      if (!expanded) {
        const fn = alignRight(theme, color, theme.fg("dim", `${entryCount} entries`), right);
        return { render: (w: number) => fn(w), invalidate() {} };
      }

      const all = output.split("\n");
      const fn = (w: number) => {
        const result: string[] = all.map((l) => theme.bg(color, l));
        const rw = visibleWidth(right);
        const pad = Math.max(1, w - rw);
        result.push(theme.bg(color, " ".repeat(pad)) + right);
        return result;
      };
      return { render: fn, invalidate() {} };
    },
  });
}
