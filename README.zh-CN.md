# Portwhim

<img src="public/brand/mark.svg" width="88" alt="Portwhim logo" />

本机端口与进程管理工具。**Tauri 2 · Rust · React · TypeScript · MIT**

## 已有功能

TCP 监听与 UDP 绑定（IPv4/IPv6）、进程与资源详情、服务识别、搜索和组合筛选、端口/内存排序、进程卡片、关联端口、复制端口/PID、打开 localhost、确认后停止进程、停止后的端口释放复查、自动/手动刷新与暂停。

项目详情包括推断的项目名、目录、识别依据、直接父进程与最多 12 层父进程链。搜索支持项目名和目录。项目识别读取可获取的工作目录及绝对命令路径，寻找 package.json、pyproject.toml、Cargo.toml、go.mod、composer.json 或 .git；跳过 node_modules 依赖包。信息不足时显示未知，原始命令行不传入界面。

## 开发与打包

需要 Node.js 24、pnpm 11、稳定版 Rust；Windows 还需 Microsoft C++ 构建工具和 WebView2。其他系统的依赖见 [Tauri 官方说明](https://v2.tauri.app/start/prerequisites/)。

```sh
pnpm install
pnpm dev          # 打开 Tauri 开发窗口
pnpm build        # 检查类型并构建前端
pnpm test         # Rust 单元测试
pnpm test:live    # 临时 TCP/UDP 进程集成测试
pnpm run pack     # 生产可执行文件
pnpm dist         # 构建安装包
```

生产文件位于 src-tauri/target/release，安装包位于其 bundle 目录。最终应用不包含 Electron、Node.js 或 Rust 编译器。Windows 复用 WebView2，缺失时安装包联网下载。离线电脑需要预先安装 WebView2。

## 使用

选择 All listeners，搜索端口号并点击结果查看详情。`3000`、`:3000`、`http://localhost:3000` 精确匹配端口，`pid:1234` 精确匹配进程；也可搜索项目或进程文本。Ctrl/⌘+K 聚焦搜索，Enter 打开首条结果，Esc 关闭详情。筛选隐藏了匹配项时，可点击 Show all matches 恢复。

Favorite ports 可按 TCP/UDP 保存最多 32 个命名收藏，没有监听的端口也能保存。收藏保存在当前安装的 WebView 本地存储，支持编辑和删除。Recent activity 保留本次会话最近 20 条端口变化及停止结果；占用者改变可能是重启，但不作确定判断。它不是持久化审计日志，可能漏掉两次扫描之间发生的变化。

前台默认 5 秒、后台 30 秒刷新，可暂停或手动刷新。Hide to tray 显式隐藏窗口；托盘展示收藏端口的快照状态，点击后恢复窗口并定位端口。关闭窗口仍退出应用。托盘时间为最后成功扫描时间；暂停、扫描失败或系统后台限流可能让状态过时。

Inspect local Docker 手动读取本机已发布端口，显示容器名和 Compose 项目，不提供容器停止操作。需要 Docker CLI 和已启动的本地引擎；不连接远程 context，忽略 Docker 主机环境覆盖，仅使用默认本地管道/套接字（包含 macOS Desktop 套接字），暂不支持自定义或 rootless 套接字。读取有超时和输出限制。容器映射是独立快照，不等于进程归属或可访问性证明。

Listening sockets 是端口绑定记录数量；Dev services 是规则识别到的相关进程数；Memory footprint 是相关进程去重后的 RSS 合计。Network bound 仅代表非回环绑定，不证明公网可访问。

停止会结束整个进程，影响其全部端口；Windows 立即终止，Unix 发送 SIGTERM，不自动强杀。不允许结束自身、其后代、父进程、受保护或无法核实身份的进程。操作前核对身份并由原生对话框确认；操作后短暂复扫，持续显示目标仍在监听、未观察到监听，或端口已被另一进程接管，可再次检查或查看当前占用者。未观察到监听不保证端口一定能够绑定。父进程信息来自当前快照，不是历史启动记录。

首次扫描失败会显示独立的重试状态，不会把失败误报为“当前没有监听端口”；已有成功数据时仍保留最后一次快照并显示错误。

CPU 改由 Rust 库采样，首轮显示不可用，与旧版和任务管理器数值可能不同。项目归属是推断。普通浏览器无法直接调用本机功能。

## 平台和验证

以 Windows 为主要验证平台；macOS/Linux 已有适配和 CI 配置，仍需真机验证。docs 中截图属于迁移前版本。详见 [验证记录](VALIDATION.md)。

源码：src 为界面；src-tauri 为原生采集、身份检查、确认框与应用配置；public/brand 为批准的品牌资产。
