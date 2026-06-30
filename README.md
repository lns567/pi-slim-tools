# pi-slim-tools

将 pi 的 7 个内置工具输出压缩为**单行摘要**，终端不再被刷屏。

Compress pi's 7 built-in tool outputs into **single-line summaries**. No more terminal spam.

## 效果 / Preview

![screenshot](https://raw.githubusercontent.com/lns567/pi-slim-tools/master/screenshot.png)

## 安装 / Install

```bash
pi install npm:pi-slim-tools
```

## 手动安装 / Manual

复制到 `~/.pi/agent/extensions/` 然后 `/reload`。

Copy to `~/.pi/agent/extensions/` then `/reload`.

## 使用 / Usage

| 工具 Tool | 折叠时 Collapsed | 展开 Expanded |
|-----------|-----------------|---------------|
| `bash` | `$ command  ✓` | 完整输出 full output |
| `read` | `▸ path  42L` | 文件内容 file content |
| `edit` | `~ path  +5 -3` | diff |
| `write` | `• path (155L)  ✓` | 完整结果 full result |
| `grep` | `# pattern  7 matches` | 匹配结果 matches |
| `find` | `? path  1 files` | 查找结果 files found |
| `ls` | `/ path  15 entries` | 文件列表 file list |

按 **Ctrl+O** 展开/折叠。 Press **Ctrl+O** to expand/collapse.

## License

MIT
