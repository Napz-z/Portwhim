# Portwhim

<img src="public/brand/mark.svg" width="88" alt="Portwhim Logo" />

已采用直角版 Logo：中心冒号对应 localhost 端口语法，右侧薄荷绿色块代表占用的端口。原始确认稿保存在 `docs/brand/approved-reference.png`，可编辑图标在 `public/brand/mark.svg`。

一个小而美的本机端口与进程查看工具。桌面界面使用 Electron、React 和 TypeScript，数据保留在本机。

## 直接运行

本次交付包含 Windows x64 免安装 ZIP。解压整个文件夹，再双击其中的 `Portwhim.exe`。不要只移动 exe，旁边的运行库和 resources 目录也是应用的一部分。不需要另装 Node.js。

该本地构建未签名，尚未发布到应用商店。macOS 和 Linux 的采集适配与打包配置已经保留，但这次未进行对应真机验证。

## 从源码运行

安装 Node.js 24 和 pnpm 11，在本目录执行：

```sh
pnpm install
pnpm dev
```

生产构建与启动：

```sh
pnpm build
pnpm start
```

在目标系统上打包：

```sh
pnpm run pack
pnpm dist
```

注意 `pnpm run pack` 是桌面打包脚本，`pnpm pack` 是包管理器生成源码 tarball 的另一条命令。

## MVP 能力

- 读取本机 TCP 监听端口和 UDP 绑定，展示 PID、进程、协议、端口、绑定地址。
- 能读取时展示启动时间、CPU、常驻内存；不可用信息显示 `—`。
- 识别 Next.js、Vite、Laravel、Node.js、Docker、PostgreSQL、Redis 等常见特征；只按端口推断的数据库标记为 port hint。
- 搜索、协议筛选、开发服务筛选、内存排序、5 秒自动刷新和暂停。
- 进程与端口的所有权可视化、进程详情与同进程其他端口。
- 复制 PID/端口、打开 localhost、经原生确认后终止进程。

终止操作针对整个进程，所有对应端口都会关闭。Windows 上立即终止，Unix 上发送 SIGTERM。操作前会复核 PID、名称与启动时间；身份无法验证时禁用终止。测试仅终止测试自行创建的临时进程。

## 当前边界

UDP 没有 TCP 意义上的监听状态。CPU/内存属于进程，同一进程的多行端口共享这些数值，汇总内存按 PID 去重。“Network bound”只说明绑定地址不是回环地址，不代表已暴露到公网。打开 localhost 使用 HTTP，数据库、HTTPS 和只绑定 LAN 地址的服务不一定能打开。

Docker 目前仅识别宿主进程，不包含容器清单、容器控制或端口映射查询。进程图展示本地进程与 socket 的所属关系，远端连接图、WebSocket 推送和 SSH 远程主机属于后续扩展。

普通账户可能拿不到其他用户进程的详细信息；本程序不会自动提权。Electron 便于跨平台开发，但安装包包含完整桌面运行时，体积不会像原生单文件命令行工具一样小。

## 验证与开发

```sh
pnpm test
pnpm test:live
pnpm build
```

架构、接口、安全边界、命名检索依据和扩展路线见 [English README](README.md)。本次验证记录见 [VALIDATION.md](VALIDATION.md)。
