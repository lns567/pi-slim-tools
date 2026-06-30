# pi-auto-collapse-tools

默认折叠 pi 的所有工具输出，终(z)端不再被满屏的 bash/read/edit 结果刷屏。

按 **Ctrl+O** 展开查看完整输出。

## 安装

```bash
pi install github:lns567/pi-auto-collapse-tools
```

## 手动安装

放入扩展目录并 `/reload`：

```
~/.pi/agent/extensions/auto-collapse-tools.ts
```

## 效果

| 默认 | Ctrl+O |
|------|--------|
| 只显示命令标题，输出区空白 | 展开显示完整输出 |

覆写的内置工具：bash、read、edit、write、grep、find、ls

## License

MIT
