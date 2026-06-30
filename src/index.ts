/**
 * Auto-collapse tool outputs - override built-in tool renderers
 * to show only command titles by default. Use Ctrl+O to expand.
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
} from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";

export default function (pi: ExtensionAPI) {
  const cwd = process.cwd();

  // ── bash: show command only ──
  const origBash = createBashTool(cwd);
  pi.registerTool({
    ...origBash,
    renderCall(args, theme) {
      const cmd = args.command.length > 80 ? `${args.command.slice(0, 77)}...` : args.command;
      return new Text(theme.fg("toolTitle", theme.bold("$ ")) + cmd, 0, 0);
    },
    renderResult(result, { expanded }, theme) {
      if (!expanded) return new Text("", 0, 0); // show nothing collapsed

      const content = result.content[0];
      const output = content?.type === "text" ? content.text : "";
      return new Text(output, 0, 0);
    },
  });

  // ── read: show path + line count ──
  const origRead = createReadTool(cwd);
  pi.registerTool({
    ...origRead,
    renderCall(args, theme) {
      return new Text(theme.fg("toolTitle", theme.bold("read ")) + theme.fg("accent", args.path), 0, 0);
    },
    renderResult(result, { expanded }, theme) {
      const content = result.content[0];
      if (content?.type !== "text") return new Text("", 0, 0);

      const lines = content.text.split("\n").length;
      if (!expanded)
        return new Text(theme.fg("dim", `${lines} lines`), 0, 0); // compact

      return new Text(content.text, 0, 0);
    },
  });

  // ── edit: show path + diff stats ──
  const origEdit = createEditTool(cwd);
  pi.registerTool({
    ...origEdit,
    renderCall(args, theme) {
      return new Text(theme.fg("toolTitle", theme.bold("edit ")) + theme.fg("accent", args.path), 0, 0);
    },
    renderResult(result, { expanded }, theme) {
      const content = result.content[0];
      if (content?.type === "text" && content.text.startsWith("Error"))
        return new Text(theme.fg("error", content.text.split("\n")[0]), 0, 0);

      if (!expanded) return new Text(theme.fg("dim", "✓ applied"), 0, 0);

      const details = result.details as EditToolDetails | undefined;
      return new Text(details?.diff ?? "Applied", 0, 0);
    },
  });

  // ── write: show path ──
  const origWrite = createWriteTool(cwd);
  pi.registerTool({
    ...origWrite,
    renderCall(args, theme) {
      return new Text(theme.fg("toolTitle", theme.bold("write ")) + theme.fg("accent", args.path), 0, 0);
    },
    renderResult(result, { expanded }, theme) {
      if (!expanded) return new Text("", 0, 0);
      const content = result.content[0];
      return new Text(content?.type === "text" ? content.text : "Written", 0, 0);
    },
  });

  // ── grep: show pattern + path ──
  const origGrep = createGrepTool(cwd);
  pi.registerTool({
    ...origGrep,
    renderCall(args, theme) {
      return new Text(
        theme.fg("toolTitle", theme.bold("grep ")) + theme.fg("accent", args.pattern),
        0,
        0,
      );
    },
    renderResult(_result, { expanded }, theme) {
      if (!expanded) return new Text("", 0, 0);
      const content = _result.content[0];
      return new Text(content?.type === "text" ? content.text : "", 0, 0);
    },
  });

  // ── find: show query ──
  const origFind = createFindTool(cwd);
  pi.registerTool({
    ...origFind,
    renderCall(args, theme) {
      return new Text(theme.fg("toolTitle", theme.bold("find ")) + args.path, 0, 0);
    },
    renderResult(_result, { expanded }, theme) {
      if (!expanded) return new Text("", 0, 0);
      const content = _result.content[0];
      return new Text(content?.type === "text" ? content.text : "", 0, 0);
    },
  });

  // ── ls: show path ──
  const origLs = createLsTool(cwd);
  pi.registerTool({
    ...origLs,
    renderCall(args, theme) {
      return new Text(
        theme.fg("toolTitle", theme.bold("ls ")) + (args.path ?? "."),
        0,
        0,
      );
    },
    renderResult(_result, { expanded }, theme) {
      if (!expanded) return new Text("", 0, 0);
      const content = _result.content[0];
      return new Text(content?.type === "text" ? content.text : "", 0, 0);
    },
  });
}
