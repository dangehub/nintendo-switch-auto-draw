/**
 * 绘图引擎
 * 将像素层转换为 SwiCC 帧序列，并管理绘制流程
 */
import { BUTTONS, SwiCCManager } from './swicc-manager.js';

/**
 * 绘图引擎配置
 * @typedef {Object} DrawConfig
 * @property {number} canvasWidth - 画布宽度（像素）
 * @property {number} canvasHeight - 画布高度（像素）
 * @property {number} startX - 画笔初始 X 坐标（画布坐标系，0-based）
 * @property {number} startY - 画笔初始 Y 坐标
 * @property {number} pressFrames - 每次按键持续帧数
 * @property {number} releaseFrames - 每次按键后的释放帧数
 */

/** @type {DrawConfig} */
const DEFAULT_CONFIG = {
    canvasWidth: 256,
    canvasHeight: 256,
    startX: 128,  // 画笔从画布正中间开始
    startY: 128,
    pressFrames: 3,
    releaseFrames: 3,
};

export class DrawEngine {
    /**
     * @param {SwiCCManager} swicc
     * @param {Partial<DrawConfig>} config
     */
    constructor(swicc, config = {}) {
        this.swicc = swicc;
        this.config = { ...DEFAULT_CONFIG, ...config };

        // 绘制状态
        this._stopped = false;
        this._paused = false;
        this.colorState = { h: 0, s: 0, v: 0 };

        // 回调
        /** @type {function(string): void} */
        this.onLog = (msg) => console.log(msg);
        /** @type {function(object): void} */
        this.onProgress = (info) => {};
        /** @type {function(object): void} */
        this.onLayerComplete = (info) => {};
    }

    /**
     * 生成从当前位置移到 (0, 0) 的初始化帧
     * 画笔可以超出画布！必须精确控制移动像素数
     */
    generateInitFrames() {
        const { startX, startY, pressFrames, releaseFrames } = this.config;
        const frames = [];

        for (let i = 0; i < startX; i++) {
            for (let p = 0; p < pressFrames; p++) frames.push(BUTTONS.LEFT);
            for (let r = 0; r < releaseFrames; r++) frames.push(BUTTONS.NONE);
        }

        for (let i = 0; i < startY; i++) {
            for (let p = 0; p < pressFrames; p++) frames.push(BUTTONS.UP);
            for (let r = 0; r < releaseFrames; r++) frames.push(BUTTONS.NONE);
        }

        return frames;
    }

    /**
     * 生成从画布某位置回到 (0, 0) 的复位帧
     */
    generateResetFrames(endX, endY) {
        const { pressFrames, releaseFrames } = this.config;
        const frames = [];

        for (let i = 0; i < endX; i++) {
            for (let p = 0; p < pressFrames; p++) frames.push(BUTTONS.LEFT);
            for (let r = 0; r < releaseFrames; r++) frames.push(BUTTONS.NONE);
        }

        for (let i = 0; i < endY; i++) {
            for (let p = 0; p < pressFrames; p++) frames.push(BUTTONS.UP);
            for (let r = 0; r < releaseFrames; r++) frames.push(BUTTONS.NONE);
        }

        return frames;
    }

    /**
     * 为单个颜色层生成智能蛇形扫描帧序列
     * 采用“方案 C”并在局部包围盒内扫描，跳过空白行和列
     */
    generateLayerFrames(grid, width, height) {
        const { pressFrames, releaseFrames } = this.config;
        const frames = [];

        // 1. 寻找当前颜色层的包围盒
        let minX = width, maxX = -1, minY = height, maxY = -1;
        const rowHasPixel = new Array(height).fill(false);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (grid[y * width + x]) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                    rowHasPixel[y] = true;
                }
            }
        }

        if (maxX === -1) return { frames: [], endX: 0, endY: 0 };

        // 2. 移动画笔到包围盒左上角 (minX, minY)
        let cx = 0, cy = 0;

        const moveX = (targetX) => {
            while (cx < targetX) {
                for (let p = 0; p < pressFrames; p++) frames.push(BUTTONS.RIGHT);
                for (let r = 0; r < releaseFrames; r++) frames.push(BUTTONS.NONE);
                cx++;
            }
            while (cx > targetX) {
                for (let p = 0; p < pressFrames; p++) frames.push(BUTTONS.LEFT);
                for (let r = 0; r < releaseFrames; r++) frames.push(BUTTONS.NONE);
                cx--;
            }
        };

        const moveY = (targetY) => {
            while (cy < targetY) {
                for (let p = 0; p < pressFrames; p++) frames.push(BUTTONS.DOWN);
                for (let r = 0; r < releaseFrames; r++) frames.push(BUTTONS.NONE);
                cy++;
            }
            while (cy > targetY) {
                for (let p = 0; p < pressFrames; p++) frames.push(BUTTONS.UP);
                for (let r = 0; r < releaseFrames; r++) frames.push(BUTTONS.NONE);
                cy--;
            }
        };

        moveY(minY);
        moveX(minX);

        // 3. 智能蛇形扫描
        let isHoldingA = false;
        let scanLeftToRight = true;

        for (let y = minY; y <= maxY; y++) {
            // 如果此行没有该颜色的像素，直接向下移动跳过
            if (!rowHasPixel[y]) {
                if (y < maxY) moveY(y + 1);
                continue;
            }

            // 校准 X 到扫描起点
            if (scanLeftToRight && cx !== minX) moveX(minX);
            else if (!scanLeftToRight && cx !== maxX) moveX(maxX);

            const rowWidth = maxX - minX + 1;
            for (let i = 0; i < rowWidth; i++) {
                const x = scanLeftToRight ? (minX + i) : (maxX - i);
                const pixelIdx = y * width + x;
                const shouldDraw = (grid[pixelIdx] === 1);

                if (shouldDraw && !isHoldingA) {
                    for (let p = 0; p < pressFrames; p++) frames.push(BUTTONS.A);
                    isHoldingA = true;
                } else if (!shouldDraw && isHoldingA) {
                    for (let r = 0; r < releaseFrames; r++) frames.push(BUTTONS.NONE);
                    isHoldingA = false;
                }

                if (i < rowWidth - 1) {
                    const nextX = scanLeftToRight ? (x + 1) : (x - 1);
                    const nextIdx = y * width + nextX;
                    const nextShouldDraw = (grid[nextIdx] === 1);
                    const dir = scanLeftToRight ? BUTTONS.RIGHT : BUTTONS.LEFT;

                    if (nextShouldDraw) {
                        if (isHoldingA) {
                            for (let p = 0; p < pressFrames; p++) frames.push(BUTTONS.A | dir);
                            for (let r = 0; r < releaseFrames; r++) frames.push(BUTTONS.A);
                        } else {
                            for (let p = 0; p < pressFrames; p++) frames.push(dir);
                            for (let r = 0; r < releaseFrames; r++) frames.push(BUTTONS.NONE);
                        }
                    } else {
                        if (isHoldingA) {
                            for (let r = 0; r < releaseFrames; r++) frames.push(BUTTONS.NONE);
                            isHoldingA = false;
                        }
                        for (let p = 0; p < pressFrames; p++) frames.push(dir);
                        for (let r = 0; r < releaseFrames; r++) frames.push(BUTTONS.NONE);
                    }
                    cx = nextX;
                }
            }

            if (isHoldingA) {
                for (let r = 0; r < releaseFrames; r++) frames.push(BUTTONS.NONE);
                isHoldingA = false;
            }

            scanLeftToRight = !scanLeftToRight;

            if (y < maxY) {
                moveY(y + 1);
            }
        }

        return { frames, endX: cx, endY: cy };
    }

    /**
     * 计算蛇形扫描结束时画笔的 X 坐标
     */
    getEndX(width, height) {
        const lastRowIsLeftToRight = ((height - 1) % 2 === 0);
        return lastRowIsLeftToRight ? width - 1 : 0;
    }

    /**
     * 估算绘图时间 (精准包围盒算法预估)
     */
    estimateTime(layers, width, height) {
        const { pressFrames, releaseFrames, startX, startY } = this.config;
        const framesPerSec = 60;
        const stepFrames = pressFrames + releaseFrames;

        const initFrames = (startX + startY) * stepFrames;
        let totalDrawFrames = 0;
        let totalResetFrames = 0;
        let totalMoveFrames = 0;

        for (let i = 0; i < layers.length; i++) {
            const grid = layers[i].grid;
            let minX = width, maxX = -1, minY = height, maxY = -1;
            const rowHasPixel = new Array(height).fill(false);
            
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (grid[y * width + x]) {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                        rowHasPixel[y] = true;
                    }
                }
            }
            if (maxX === -1) continue;

            // Move to (minX, minY)
            totalMoveFrames += (minX + minY) * stepFrames;

            let cx = minX;
            let cy = minY;
            let scanLeftToRight = true;

            for (let y = minY; y <= maxY; y++) {
                if (!rowHasPixel[y]) {
                    if (y < maxY) cy++;
                    continue;
                }
                
                const rowWidth = maxX - minX;
                totalMoveFrames += rowWidth * stepFrames;
                cx = scanLeftToRight ? maxX : minX;
                scanLeftToRight = !scanLeftToRight;

                if (y < maxY) {
                    cy++;
                    totalMoveFrames += stepFrames;
                }
            }

            totalDrawFrames += layers[i].pixelCount * stepFrames;

            if (i < layers.length - 1) {
                totalResetFrames += (cx + cy) * stepFrames;
            }
        }

        const totalFrames = initFrames + totalMoveFrames + totalDrawFrames + totalResetFrames;

        return {
            initSeconds: initFrames / framesPerSec,
            totalFrames,
            totalSeconds: totalFrames / framesPerSec,
            totalMinutes: totalFrames / framesPerSec / 60,
            layerCount: layers.length,
        };
    }

    /**
     * 执行完整绘制流程
     * @param {Array} layers - ImageProcessor.getLayers() 的返回值
     * @param {number} width
     * @param {number} height
     */
    async drawAll(layers, width, height) {
        this._stopped = false;
        this._paused = false;

        const totalLayers = layers.length;
        this.onLog(`开始绘制: ${totalLayers} 个颜色层, ${width}×${height}`);

        // 步骤 1：初始化画笔位置
        this.onLog(`移动画笔到 (0,0)：左 ${this.config.startX} + 上 ${this.config.startY}`);
        this.onProgress({ phase: 'init', text: '初始化画笔位置...' });

        const initFrames = this.generateInitFrames();
        const initOk = await this.swicc.sendFrames(initFrames, {
            onProgress: (s, t) => this.onProgress({
                phase: 'init', sent: s, total: t,
                text: `初始化: ${s}/${t} 帧`
            }),
            shouldStop: () => this._stopped,
            shouldPause: () => this._paused,
        });
        if (!initOk) return;

        // 等待初始化帧播放完
        await this._waitQueueDrain();

        // 步骤 2：逐层绘制
        let lastEndX = 0;
        let lastEndY = 0;

        for (let li = 0; li < totalLayers; li++) {
            if (this._stopped) break;

            const layer = layers[li];
            this.onLog(`\n═══ 颜色层 ${li + 1}/${totalLayers}: ${layer.colorHex} (${layer.pixelCount} 像素) ═══`);

            // 1. 如果不是第一层，需要先从上一层的终点复位画笔到 (0,0)
            if (li > 0) {
                this.onLog(`复位画笔到 (0,0) [从 (${lastEndX}, ${lastEndY})]...`);
                const resetFrames = this.generateResetFrames(lastEndX, lastEndY);
                const resetOk = await this.swicc.sendFrames(resetFrames, {
                    onProgress: (s, t) => this.onProgress({
                        phase: 'reset', sent: s, total: t,
                        text: `复位画笔: ${s}/${t} 帧`
                    }),
                    shouldStop: () => this._stopped,
                    shouldPause: () => false,
                });
                if (!resetOk) break;
                await this._waitQueueDrain();
            }

            // 2. 自动换色（每一层都需要，包含第一层）
            this.onLog(`正在自动更换颜色为 ${layer.colorHex}...`);
            this.onProgress({
                phase: 'color-change', layerIndex: li, totalLayers,
                text: `自动换色: ${layer.colorHex}`
            });
            const colorFrames = this.generateColorChangeFrames(layer.color);
            const colorOk = await this.swicc.sendFrames(colorFrames, {
                shouldStop: () => this._stopped,
                shouldPause: () => this._paused
            });
            if (!colorOk) break;
            await this._waitQueueDrain();

            // 生成并发送该层帧序列
            const layerData = this.generateLayerFrames(layer.grid, width, height);
            lastEndX = layerData.endX;
            lastEndY = layerData.endY;
            const layerFrames = layerData.frames;
            
            this.onLog(`层 ${li + 1} 帧序列: ${layerFrames.length} 帧`);

            const drawOk = await this.swicc.sendFrames(layerFrames, {
                onProgress: (s, t) => this.onProgress({
                    phase: 'drawing',
                    layerIndex: li,
                    totalLayers,
                    sent: s, total: t,
                    colorHex: layer.colorHex,
                    percent: ((li + s / t) / totalLayers * 100).toFixed(1),
                    text: `绘制层 ${li + 1}/${totalLayers} (${layer.colorHex}): ${Math.round(s / t * 100)}%`
                }),
                shouldStop: () => this._stopped,
                shouldPause: () => this._paused,
            });

            if (!drawOk) break;

            // 等待该层帧播放完
            await this._waitQueueDrain();
            this.onLog(`颜色层 ${li + 1} 完成`);
        }

        if (!this._stopped) {
            this.onLog('\n🎉 全部绘制完成！');
            this.onProgress({ phase: 'done', text: '绘制完成！' });
        }
    }

    pause() { this._paused = true; }
    resume() { this._paused = false; }
    stop() { this._stopped = true; this._paused = false; }
    get isPaused() { return this._paused; }
    get isStopped() { return this._stopped; }

    /**
     * 等待 SwiCC 队列基本排空
     * @private
     */
    async _waitQueueDrain() {
        // 等待队列消耗到接近空
        for (let i = 0; i < 600; i++) { // 最多等 30 秒
            const rem = await this.swicc.getQueueRemaining();
            if (rem >= this.swicc.queueSize - 5) return;
            await new Promise(r => setTimeout(r, 50));
        }
        this.onLog('⚠️ 等待队列排空超时');
    }

    // ─── 自动换色相关逻辑 ───

    /**
     * 将 RGB 转换为 HSV，并映射到游戏调色板的步数
     * 横轴 (Hue): 0-200 步
     * 二维 X轴 (Sat): 0-213 步
     * 二维 Y轴 (Val): 0-112 步 (0是100%明度，112是0%明度)
     */
    rgbToHsvSteps(r, g, b) {
        let r_ = r / 255, g_ = g / 255, b_ = b / 255;
        let cmax = Math.max(r_, g_, b_), cmin = Math.min(r_, g_, b_);
        let delta = cmax - cmin;
        
        let h = 0;
        if (delta === 0) h = 0;
        else if (cmax === r_) h = 60 * (((g_ - b_) / delta) % 6);
        else if (cmax === g_) h = 60 * (((b_ - r_) / delta) + 2);
        else if (cmax === b_) h = 60 * (((r_ - g_) / delta) + 4);
        if (h < 0) h += 360;
        
        let s = cmax === 0 ? 0 : delta / cmax;
        let v = cmax;
        
        // 修复色相翻转：游戏内的色相条从左到右是 红(360)->紫(300)->蓝(240)->绿(120)->黄(60)->红(0)
        let gameHue = (360 - h) % 360;
        let h_step = Math.round((gameHue / 360) * 200);
        if (h_step > 200) h_step = 200;
        
        let s_step = Math.round(s * 213);
        
        let v_step = Math.round((1 - v) * 112);
        
        return { h: h_step, s: s_step, v: v_step };
    }

    /**
     * 生成自动换色所需要的帧序列
     */
    generateColorChangeFrames(targetRGB) {
        const targetSteps = this.rgbToHsvSteps(targetRGB.r, targetRGB.g, targetRGB.b);
        const { pressFrames, releaseFrames } = this.config;
        const frames = [];
        
        const pushBtn = (btn, count) => {
            for (let i = 0; i < count; i++) {
                for (let p = 0; p < pressFrames; p++) frames.push(btn);
                for (let r = 0; r < releaseFrames; r++) frames.push(BUTTONS.NONE);
            }
        };

        const pushWait = (framesCount) => {
            for (let i = 0; i < framesCount; i++) frames.push(BUTTONS.NONE);
        };

        // 1. 按两次 Y 键进入自定义调色板
        // 第一下：打开选色界面。给足 30 帧 (0.5s) 动画时间
        pushBtn(BUTTONS.Y, 1);
        pushWait(30);
        // 第二下：切换到自定义颜色选项卡
        pushBtn(BUTTONS.Y, 1);
        pushWait(30);

        // 2. 移动横轴 (Hue) ZL / ZR
        const diffH = targetSteps.h - this.colorState.h;
        if (diffH > 0) pushBtn(BUTTONS.ZR, diffH);
        else if (diffH < 0) pushBtn(BUTTONS.ZL, -diffH);

        // 3. 移动二维 X轴 (Sat) L / R
        const diffS = targetSteps.s - this.colorState.s;
        if (diffS > 0) pushBtn(BUTTONS.RIGHT, diffS);
        else if (diffS < 0) pushBtn(BUTTONS.LEFT, -diffS);

        // 4. 移动二维 Y轴 (Val) U / D
        const diffV = targetSteps.v - this.colorState.v;
        if (diffV > 0) pushBtn(BUTTONS.DOWN, diffV);
        else if (diffV < 0) pushBtn(BUTTONS.UP, -diffV);

        // 5. 确认选择
        pushBtn(BUTTONS.A, 1);
        pushWait(30);

        // 更新状态
        this.colorState = targetSteps;

        return frames;
    }
}
