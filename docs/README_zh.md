# Nintendo Switch Auto Draw (NS 自动画图)

> [!NOTE]
> **Vibe Coding / AI 辅助声明**
> 请悉知：本项目的核心架构、功能逻辑以及大部分代码生成均是通过与 AI 结对编程（Vibe Coding）完成的。

这是一个基于 Web Serial API 和 SwiCC (Switch Control via USB) 的任天堂 Switch 自动绘图工具。可以直接在浏览器中运行，无需安装任何客户端软件或配置复杂的 Node.js 环境。

## 🌟 特性

- **全自动绘画**：导入图片后，自动进行量化、抖动处理、颜色提取，并在游戏中自动换色、全自动进行蛇形智能填色。
- **智能寻路扫描**：利用包围盒算法跳过透明和空白像素，极大缩短绘图耗时。
- **纯网页无端运行**：借助 Web Serial API 直接通过 USB 控制单片机，即点即用。
- **直观的控制面板**：随时进行缩放、偏移预览，支持绘制全过程暂停和停止控制。

## 🚀 如何使用 (零门槛)

本项目完全是一个静态前端网页。为了让小白用户也能零门槛使用，您可以直接使用 **GitHub Pages** 功能将它部署在网上：

1. 将本项目 Fork 或克隆到您的 GitHub。
2. 在您的 GitHub 仓库中，进入 `Settings` -> `Pages`。
3. 在 `Source` 下方，选择 `Deploy from a branch`。
4. Branch 选择 `main` (或 `master`)，文件夹选择 `/(root)`，点击 Save。
5. 等待一两分钟后，GitHub 会生成一个您的专属链接（例如 `https://您的用户名.github.io/nintendo-switch-auto-draw/`）。
6. **打开这个专属链接，即可连接单片机进行画图！完全无需下载和配置环境。**

> **注意**：由于浏览器的安全限制，Web Serial API 必须在 HTTPS 环境下才能调用。所以通过 GitHub Pages 访问是最佳的选择。

## 🛠 本地开发与测试

如果您希望在本地进行二次开发：

1. 克隆本项目到本地。
2. 由于直接双击打开 `index.html` (使用 `file:///` 协议) 会触发跨域限制，且不支持 Web Serial API。
3. 请在项目根目录下启动一个本地 Web 服务，例如：
   ```bash
   npx serve -l 3456
   ```
4. 通过 `http://localhost:3456` 进行访问和调试。

## 📁 目录结构

- `index.html` - 主绘图控制面板
- `css/` - 样式表
- `js/` - 核心逻辑模块（图片量化处理、绘制引擎算法、串口通讯管理器）
- `tests/` - 开发者用的硬件调测与发包测试页面

## 💖 致谢

特别感谢 [**2wiCC**](https://github.com/knflrpn/2wiCC) 项目，该项目为通过 USB 控制 Switch 提供了基础灵感与底层串口通讯协议。
