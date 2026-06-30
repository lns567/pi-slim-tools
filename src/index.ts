/**
 * Auto-collapse tool outputs - everything on one line when collapsed.
 * Ctrl+O to expand.
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
import { visibleWidth } from "@earendil-works/pi-tui";

function expandBadge(expanded: boolean): string {
  return expanded ? " ▼" : ` ▶ ${keyHint("app.tools.expand", "展开")}`;
}

function bgLine(
  theme: any,
  bgColor: string,
  left: string,
  right: string,
): (width: number) => string[] {
  const l = theme.bg(bgColor, left);
  const r = theme.bg(bgColor, right);
  return (width: number) => {
    const pad = Math.max(1, width - visibleWidth(l) - visibleWidth(r));
    return [l + theme.bg(bgColor, " ".repeat(pad)) + r];
  };
}

export default function (pi: ExtensionAPI) {
  const cwd = process.cwd();

  // ── bash ──
  const origBash = createBashTool(cwd);
  pi.registerTool({
    ...origBash,
    renderShell: "self",
    renderCall(args, theme, context) {
      const cmd = context.argsComplete && args.command
        ? args.command.length > 60
          ? `${args.command.slice(0, 57)}…`
          : args.command
        : "…";
      let left = theme.fg("bashMode", args.command ? `$ ${cmd}` : "$ …");
      if (context.state._status) left += "  " + context.state._status;

      const badge = expandBadge(context.expanded);
      const fn = bgLine(theme, "toolPendingBg", left, theme.fg("dim", badge));
      return { render: (w: number) => fn(w), invalidate() {} };
    },
    renderResult(result, { expanded }, theme, context) {
      const color = result.isError ? "toolErrorBg" : "toolSuccessBg";
      const content = result.content[0];
      const output = content?.type === "text" ? content.text : "";
      const exitMatch = output.match(/exit code: (\d+)/);
      const ok = !exitMatch || exitMatch[1] === "0";
      const newStatus = ok ? theme.fg("success", "✓") : theme.fg("error", `✗ ${exitMatch![1]}`);

      if (context.state._status !== newStatus) {
        context.state._status = newStatus;
        context.state._bg = color;
        context.invalidate();
      }

      if (!expanded) return { render: () => [], invalidate() {} };

      const all = output.split("\n");
      const badge = theme.fg("dim", expandBadge(true));
      const fn = (w: number) => {
        const result: string[] = all.map((l) => theme.bg(color, l));
        const r = theme.bg(color, badge);
        const pad = Math.max(1, w - visibleWidth(r));
        result.push(theme.bg(color, " ".repeat(pad)) + r);
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
    renderCall(args, theme, context) {
      let left = theme.fg("toolTitle", "📄 ") + theme.fg("accent", args.path || "…");
      if (args.offset) left += theme.fg("dim", ` @L${args.offset}`);
      if (context.state._status) left += "  " + context.state._status;
      const badge = expandBadge(context.expanded);
      const fn = bgLine(theme, "toolPendingBg", left, theme.fg("dim", badge));
      return { render: (w: number) => fn(w), invalidate() {} };
    },
    renderResult(result, { expanded }, theme, context) {
      const content = result.content[0];
      const color = result.isError ? "toolErrorBg" : "toolSuccessBg";
      let newStatus: string;
      if (content?.type === "image") {
        newStatus = theme.fg("dim", "🖼");
      } else if (content?.type === "text") {
        newStatus = theme.fg("dim", `${content.text.split("\n").length}L`);
      } else {
        newStatus = "";
      }

      if (context.state._status !== newStatus) {
        context.state._status = newStatus;
        context.state._bg = color;
        context.invalidate();
      }

      if (!expanded) return { render: () => [], invalidate() {} };
      if (content?.type !== "text") return { render: () => [], invalidate() {} };

      const badge = theme.fg("dim", expandBadge(true));
      const all = content.text.split("\n");
      const fn = (w: number) => {
        const result: string[] = all.map((l) => theme.bg(color, l));
        const r = theme.bg(color, badge);
        const pad = Math.max(1, w - visibleWidth(r));
        result.push(theme.bg(color, " ".repeat(pad)) + r);
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
    renderCall(args, theme, context) {
      let left = theme.fg("toolTitle", "✏️ ") + theme.fg("accent", args.path || "…");
      if (context.state._status) left += "  " + context.state._status;
      const badge = expandBadge(context.expanded);
      const fn = bgLine(theme, "toolPendingBg", left, theme.fg("dim", badge));
      return { render: (w: number) => fn(w), invalidate() {} };
    },
    renderResult(result, { expanded }, theme, context) {
      const content = result.content[0];
      const color = result.isError ? "toolErrorBg" : "toolSuccessBg";
      let newStatus: string;

      if (content?.type === "text" && content.text.startsWith("Error")) {
        newStatus = theme.fg("error", "✗");
      } else {
        const details = result.details as EditToolDetails | undefined;
        const diffLines = details?.diff?.split("\n") ?? [];
        let adds = 0, dels = 0;
        for (const l of diffLines) {
          if (l.startsWith("+") && !l.startsWith("+++")) adds++;
          if (l.startsWith("-") && !l.startsWith("---")) dels++;
        }
        newStatus = `${theme.fg("success", `+${adds}`)} ${theme.fg("error", `-${dels}`)}`;
      }

      if (context.state._status !== newStatus) {
        context.state._status = newStatus;
        context.state._bg = color;
        context.invalidate();
      }

      if (!expanded) return { render: () => [], invalidate() {} };

      const badge = theme.fg("dim", expandBadge(true));
      const details = result.details as EditToolDetails | undefined;
      const all = (details?.diff ?? "Applied").split("\n");
      const fn = (w: number) => {
        const result: string[] = all.map((l) => theme.bg(color, l));
        const r = theme.bg(color, badge);
        const pad = Math.max(1, w - visibleWidth(r));
        result.push(theme.bg(color, " ".repeat(pad)) + r);
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
    renderCall(args, theme, context) {
      const n = args.content ? args.content.split("\n").length : 0;
      let left = theme.fg("toolTitle", "📝 ") + theme.fg("accent", args.path || "…") + theme.fg("dim", ` (${n}L)`);
      if (context.state._status) left += "  " + context.state._status;
      const badge = expandBadge(context.expanded);
      const fn = bgLine(theme, "toolPendingBg", left, theme.fg("dim", badge));
      return { render: (w: number) => fn(w), invalidate() {} };
    },
    renderResult(result, { expanded }, theme, context) {
      const color = result.isError ? "toolErrorBg" : "toolSuccessBg";
      const newStatus = theme.fg("success", "✓");

      if (context.state._status !== newStatus) {
        context.state._status = newStatus;
        context.state._bg = color;
        context.invalidate();
      }

      if (!expanded) return { render: () => [], invalidate() {} };

      const content = result.content[0];
      const text = content?.type === "text" ? content.text : "Written";
      const badge = theme.fg("dim", expandBadge(true));
      const all = text.split("\n");
      const fn = (w: number) => {
        const result: string[] = all.map((l) => theme.bg(color, l));
        const r = theme.bg(color, badge);
        const pad = Math.max(1, w - visibleWidth(r));
        result.push(theme.bg(color, " ".repeat(pad)) + r);
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
    renderCall(args, theme, context) {
      let left = theme.fg("toolTitle", "🔍 ") + theme.fg("accent", args.pattern || "…");
      if (context.state._status) left += "  " + context.state._status;
      const badge = expandBadge(context.expanded);
      const fn = bgLine(theme, "toolPendingBg", left, theme.fg("dim", badge));
      return { render: (w: number) => fn(w), invalidate() {} };
    },
    renderResult(result, { expanded }, theme, context) {
      const content = result.content[0];
      const output = content?.type === "text" ? content.text : "";
      const matchCount = output.split("\n").filter((l) => l.trim()).length;
      const color = result.isError ? "toolErrorBg" : "toolSuccessBg";
      const newStatus = theme.fg("dim", !output.trim() ? "0 matches" : `${matchCount} matches`);

      if (context.state._status !== newStatus) {
        context.state._status = newStatus;
        context.state._bg = color;
        context.invalidate();
      }

      if (!expanded) return { render: () => [], invalidate() {} };

      const badge = theme.fg("dim", expandBadge(true));
      const all = output.split("\n");
      const fn = (w: number) => {
        const result: string[] = all.map((l) => theme.bg(color, l));
        const r = theme.bg(color, badge);
        const pad = Math.max(1, w - visibleWidth(r));
        result.push(theme.bg(color, " ".repeat(pad)) + r);
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
    renderCall(args, theme, context) {
      let left = theme.fg("toolTitle", "📁 ") + (args.path || "…");
      if (context.state._status) left += "  " + context.state._status;
      const badge = expandBadge(context.expanded);
      const fn = bgLine(theme, "toolPendingBg", left, theme.fg("dim", badge));
      return { render: (w: number) => fn(w), invalidate() {} };
    },
    renderResult(result, { expanded }, theme, context) {
      const content = result.content[0];
      const output = content?.type === "text" ? content.text : "";
      const fileCount = output.split("\n").filter((l) => l.trim()).length;
      const color = result.isError ? "toolErrorBg" : "toolSuccessBg";
      const newStatus = theme.fg("dim", `${fileCount} files`);

      if (context.state._status !== newStatus) {
        context.state._status = newStatus;
        context.state._bg = color;
        context.invalidate();
      }

      if (!expanded) return { render: () => [], invalidate() {} };

      const badge = theme.fg("dim", expandBadge(true));
      const all = output.split("\n");
      const fn = (w: number) => {
        const result: string[] = all.map((l) => theme.bg(color, l));
        const r = theme.bg(color, badge);
        const pad = Math.max(1, w - visibleWidth(r));
        result.push(theme.bg(color, " ".repeat(pad)) + r);
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
    renderCall(args, theme, context) {
      let left = theme.fg("toolTitle", "📂 ") + (args.path || "…");
      if (context.state._status) left += "  " + context.state._status;
      const badge = expandBadge(context.expanded);
      const fn = bgLine(theme, "toolPendingBg", left, theme.fg("dim", badge));
      return { render: (w: number) => fn(w), invalidate() {} };
    },
    renderResult(result, { expanded }, theme, context) {
      const content = result.content[0];
      const output = content?.type === "text" ? content.text : "";
      const entryCount = output.split("\n").filter((l) => l.trim()).length;
      const color = result.isError ? "toolErrorBg" : "toolSuccessBg";
      const newStatus = theme.fg("dim", `${entryCount} entries`);

      if (context.state._status !== newStatus) {
        context.state._status = newStatus;
        context.state._bg = color;
        context.invalidate();
      }

      if (!expanded) return { render: () => [], invalidate() {} };

      const badge = theme.fg("dim", expandBadge(true));
      const all = output.split("\n");
      const fn = (w: number) => {
        const result: string[] = all.map((l) => theme.bg(color, l));
        const r = theme.bg(color, badge);
        const pad = Math.max(1, w - visibleWidth(r));
        result.push(theme.bg(color, " ".repeat(pad)) + r);
        return result;
      };
      return { render: fn, invalidate() {} };
    },
  });
}
