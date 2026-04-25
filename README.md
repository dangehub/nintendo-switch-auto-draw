# Nintendo Switch Auto Draw

> [!NOTE]
> **Vibe Coding / AI-Assisted Disclosure**
> Please be aware that this project was heavily developed with the assistance of AI (Vibe Coding). The architecture, logic, and code generation were collaboratively built using an AI agent. 

A Web Serial API based automatic drawing tool for the Nintendo Switch. This tool runs directly in your browser without requiring any local client installations or complex Node.js environment setup.

[👉 **中文文档请点击这里 (Chinese README)**](./docs/README_zh.md)

## 🌟 Features

- **Fully Automated Drawing**: Import an image, and the tool will automatically handle color quantization, dithering, and color extraction. It will auto-change colors in-game and perform smart snake-like scanning to fill the canvas.
- **Smart Pathfinding**: Utilizes a bounding-box algorithm to skip transparent and empty pixels, massively reducing the total drawing time.
- **Zero-Install Web App**: Connects directly to your microcontroller via USB using the Web Serial API. Just open the webpage and play.
- **Intuitive Control Panel**: Real-time preview of scaling and offsets, with full pause/resume capabilities during the drawing process.

## 🚀 How to Use (Zero Setup)

Since this project is a purely static frontend webpage, you can deploy it instantly using **GitHub Pages**:

1. Fork or clone this repository to your GitHub.
2. In your GitHub repository, go to `Settings` -> `Pages`.
3. Under `Source`, select `Deploy from a branch`.
4. Choose the `main` (or `master`) branch, select the `/(root)` folder, and click Save.
5. Wait a minute or two, and GitHub will generate your dedicated URL (e.g., `https://your-username.github.io/nintendo-switch-auto-draw/`).
6. **Open this URL to connect your microcontroller and start drawing! No downloads or environment setup required.**

> **Note**: Due to browser security restrictions, the Web Serial API can only be invoked in an HTTPS environment. Therefore, accessing it via GitHub Pages or Vercel is the easiest and best choice.

## 🛠 Local Development & Testing

If you wish to modify or develop locally:

1. Clone this project.
2. Double-clicking `index.html` directly via the `file:///` protocol will trigger CORS restrictions and the Web Serial API will be disabled.
3. Please start a local web server in the project root directory. For example:
   ```bash
   npx serve -l 3456
   ```
4. Access and debug via `http://localhost:3456`.

## 📁 Directory Structure

- `index.html` - Main drawing control panel
- `css/` - Stylesheets
- `js/` - Core logic modules (image processor, draw engine, serial manager)
- `tests/` - Developer testing pages for hardware tuning and packet tests

## 💖 Acknowledgments

Special thanks to the [**2wiCC**](https://github.com/knflrpn/2wiCC) project, which provided the foundational inspiration and serial communication protocols for Switch USB control.
