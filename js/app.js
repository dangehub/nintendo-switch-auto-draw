/**
 * NS Auto Draw 主应用
 * 连接 UI 与各模块
 */
import { SwiCCManager } from './swicc-manager.js';
import { ImageProcessor } from './image-processor.js';
import { DrawEngine } from './draw-engine.js';

// ─── 实例化 ───
const swicc = new SwiCCManager();
const imgProc = new ImageProcessor();
let drawEngine = null;
let layers = [];

// ─── DOM 引用 ───
const $ = id => document.getElementById(id);

const connBadge     = $('connBadge');
const deviceInfo    = $('deviceInfo');
const connectBtn    = $('connectBtn');
const disconnectBtn = $('disconnectBtn');
const uploadZone    = $('uploadZone');
const fileInput     = $('fileInput');
const previewRow    = $('previewRow');
const srcPreview    = $('srcPreview');
const outPreview    = $('outPreview');
const srcLabel      = $('srcLabel');
const outLabel      = $('outLabel');
const paletteDisplay= $('paletteDisplay');
const paletteInfo   = $('paletteInfo');
const processBtn    = $('processBtn');
const numColors     = $('numColors');
const colorCountLabel = $('colorCountLabel');
const startBtn      = $('startBtn');
const pauseBtn      = $('pauseBtn');
const stopBtn       = $('stopBtn');
const statsPanel    = $('statsPanel');
const progressContainer = $('progressContainer');
const progressFill  = $('progressFill');
const progressText  = $('progressText');
const logBox        = $('logBox');
const colorModal    = $('colorModal');
const btnDoubleA    = $('btnDoubleA');
const btnTestHome   = $('btnTestHome');

// ─── 日志 ───
function log(msg, type = 'info') {
    const span = document.createElement('span');
    span.className = type;
    const t = new Date().toLocaleTimeString('zh-CN');
    span.textContent = `[${t}] ${msg}\n`;
    logBox.appendChild(span);
    logBox.scrollTop = logBox.scrollHeight;
}

swicc.onLog = (msg) => log(msg, 'info');

// ─── 连接 ───
swicc.onStatusChange = (status) => {
    if (status === 'connected') {
        connBadge.textContent = '已连接';
        connBadge.className = 'badge badge-on';
        connectBtn.disabled = true;
        disconnectBtn.disabled = false;
        deviceInfo.textContent = swicc.deviceId ?
            `${swicc.deviceId} v${swicc.deviceVersion || '?'}` : '';
        updateStartBtn();
        btnDoubleA.disabled = false;
        btnTestHome.disabled = false;
    } else {
        connBadge.textContent = '未连接';
        connBadge.className = 'badge badge-off';
        connectBtn.disabled = false;
        disconnectBtn.disabled = true;
        deviceInfo.textContent = '';
        updateStartBtn();
        btnDoubleA.disabled = true;
        btnTestHome.disabled = true;
    }
};

connectBtn.addEventListener('click', async () => {
    try { await swicc.connect(); }
    catch (e) { log(`连接失败: ${e.message}`, 'err'); }
});
disconnectBtn.addEventListener('click', () => swicc.disconnect());

// ─── 图片上传 ───
uploadZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => { if (e.target.files[0]) loadImage(e.target.files[0]); });
uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) loadImage(e.dataTransfer.files[0]);
});

let imageLoaded = false;

async function loadImage(file) {
    try {
        const size = await imgProc.loadFromFile(file);
        log(`图片已加载: ${size.width}×${size.height}`, 'ok');
        imageLoaded = true;

        // 显示原图预览
        const src = imgProc.getSrcCanvas();
        const sCtx = srcPreview.getContext('2d');
        srcPreview.width = src.width;
        srcPreview.height = src.height;
        sCtx.drawImage(src, 0, 0);
        srcLabel.textContent = `原图 ${src.width}×${src.height}`;

        previewRow.style.display = 'grid';
        processBtn.disabled = false;
        uploadZone.innerHTML = `<div class="icon">✅</div><div>${file.name}</div><div style="font-size:12px;color:var(--text-muted)">点击重新上传</div>`;

        // 自动处理
        processImage();
    } catch (e) {
        log(`图片加载失败: ${e.message}`, 'err');
    }
}

// ─── 参数变化 ───
numColors.addEventListener('input', () => {
    colorCountLabel.textContent = numColors.value;
});

processBtn.addEventListener('click', processImage);
$('canvasW').addEventListener('change', processImage);
$('canvasH').addEventListener('change', processImage);
numColors.addEventListener('change', processImage);
$('ditherMode').addEventListener('change', processImage);
$('imgScale').addEventListener('input', processImage);
$('imgOffsetX').addEventListener('input', processImage);
$('imgOffsetY').addEventListener('input', processImage);

function processImage() {
    if (!imageLoaded) return;

    const w = parseInt($('canvasW').value) || 256;
    const h = parseInt($('canvasH').value) || 256;
    const nc = parseInt(numColors.value) || 16;
    const dither = $('ditherMode').value === 'fs';
    
    const scale = parseFloat($('imgScale').value) || 1.0;
    const offX = parseInt($('imgOffsetX').value) || 0;
    const offY = parseInt($('imgOffsetY').value) || 0;

    log(`处理图片: ${w}×${h}, 缩放=${scale}, 偏移=(${offX},${offY}), ${nc} 色, 抖动=${dither ? '开' : '关'}`, 'info');

    const result = imgProc.process(w, h, nc, dither, scale, offX, offY);

    // 更新量化预览
    const out = imgProc.getOutCanvas();
    const oCtx = outPreview.getContext('2d');
    outPreview.width = out.width;
    outPreview.height = out.height;
    oCtx.drawImage(out, 0, 0);
    outLabel.textContent = `量化后 ${w}×${h}`;

    // 显示调色板
    layers = imgProc.getLayers();
    renderPalette(layers);

    // 统计
    const totalPixels = layers.reduce((s, l) => s + l.pixelCount, 0);
    $('statLayers').textContent = layers.length;
    $('statPixels').textContent = totalPixels.toLocaleString();

    // 时间估算
    const engine = new DrawEngine(swicc, {
        canvasWidth: w, canvasHeight: h,
        startX: parseInt($('startX').value) || 128,
        startY: parseInt($('startY').value) || 128,
        pressFrames: parseInt($('pressFrames').value) || 3,
        releaseFrames: parseInt($('releaseFrames').value) || 3,
    });
    const est = engine.estimateTime(layers, w, h);
    const mins = Math.ceil(est.totalMinutes);
    $('statTime').textContent = mins < 60 ? `${mins} 分钟` : `${Math.floor(mins/60)}h${mins%60}m`;
    statsPanel.style.display = 'grid';

    log(`量化完成: ${layers.length} 色, ${totalPixels} 像素, 预估 ${mins} 分钟`, 'ok');
    updateStartBtn();
}

function renderPalette(layers) {
    paletteDisplay.innerHTML = '';
    
    // 实例化一个临时的 drawEngine 来使用 rgbToHsvSteps 算法
    const tempEngine = new DrawEngine(swicc, {});

    layers.forEach((l, i) => {
        const sw = document.createElement('div');
        sw.className = 'palette-swatch';
        sw.style.backgroundColor = l.colorHex;
        
        const steps = tempEngine.rgbToHsvSteps(l.color.r, l.color.g, l.color.b);
        sw.title = `点击测试换色: ${l.colorHex} (${l.pixelCount} px)\n目标步长: 横轴(Hue)=${steps.h}, 二维X(Sat)=${steps.s}, 二维Y(Val)=${steps.v}`;
        sw.style.cursor = 'pointer';
        
        // 绑定点击事件，直接点击色块进行测试
        sw.onclick = (e) => {
            e.stopPropagation();
            testColorChange(l.color);
        };

        paletteDisplay.appendChild(sw);
    });
    paletteInfo.textContent = `${layers.length} 种颜色`;
}

// ─── 测试换色 ───
let globalColorState = { h: 0, s: 0, v: 0 };

function updateColorStateLabel() {
    $('colorStateLabel').textContent = `当前换色跟踪状态: H:${globalColorState.h}, S:${globalColorState.s}, V:${globalColorState.v}`;
}

$('btnResetColorState').addEventListener('click', () => {
    globalColorState = { h: 0, s: 0, v: 0 };
    updateColorStateLabel();
    log('网页换色状态已重置为 (0,0,0)', 'ok');
});

async function testColorChange(targetRGB) {
    if (!swicc.isConnected) return log('串口未连接', 'err');
    
    const w = parseInt($('canvasW').value) || 256;
    const h = parseInt($('canvasH').value) || 256;
    
    const engine = new DrawEngine(swicc, {
        canvasWidth: w, canvasHeight: h,
        startX: parseInt($('startX').value) || 128,
        startY: parseInt($('startY').value) || 128,
        pressFrames: parseInt($('pressFrames').value) || 3,
        releaseFrames: parseInt($('releaseFrames').value) || 3,
    });
    
    // 把当前的全局颜色状态给它
    engine.colorState = { ...globalColorState };
    
    const frames = engine.generateColorChangeFrames(targetRGB);
    
    log(`开始测试换色到 RGB(${targetRGB.r},${targetRGB.g},${targetRGB.b})...`, 'info');
    const ok = await swicc.sendFrames(frames, {
        shouldStop: () => false,
        shouldPause: () => false
    });
    
    if (ok) {
        // 测试成功，保存新的颜色状态
        globalColorState = { ...engine.colorState };
        updateColorStateLabel();
        log('换色测试完成！', 'ok');
    }
}

// ─── 绘图控制 ───
function updateStartBtn() {
    startBtn.disabled = !(swicc.isConnected && layers.length > 0);
}

startBtn.addEventListener('click', startDrawing);
pauseBtn.addEventListener('click', () => {
    if (!drawEngine) return;
    if (drawEngine.isPaused) {
        drawEngine.resume();
        pauseBtn.textContent = '⏸ 暂停';
        log('已恢复', 'info');
    } else {
        drawEngine.pause();
        pauseBtn.textContent = '▶ 继续';
        log('已暂停', 'warn');
    }
});
stopBtn.addEventListener('click', () => {
    if (drawEngine) drawEngine.stop();
    colorModal.classList.remove('show');
});

$('modalContinueBtn').addEventListener('click', () => {
    colorModal.classList.remove('show');
    if (drawEngine) drawEngine.resume();
});
$('modalStopBtn').addEventListener('click', () => {
    colorModal.classList.remove('show');
    if (drawEngine) drawEngine.stop();
});

async function startDrawing() {
    const w = parseInt($('canvasW').value) || 256;
    const h = parseInt($('canvasH').value) || 256;

    drawEngine = new DrawEngine(swicc, {
        canvasWidth: w, canvasHeight: h,
        startX: parseInt($('startX').value) || 128,
        startY: parseInt($('startY').value) || 128,
        pressFrames: parseInt($('pressFrames').value) || 3,
        releaseFrames: parseInt($('releaseFrames').value) || 3,
    });
    // 绘图时也继承全局换色状态
    drawEngine.colorState = { ...globalColorState };
    drawEngine.onLog = (msg) => log(msg, 'info');

    drawEngine.onProgress = (info) => {
        progressContainer.style.display = 'block';
        progressText.textContent = info.text || '';
        if (info.percent) {
            progressFill.style.width = info.percent + '%';
        } else if (info.sent && info.total) {
            progressFill.style.width = (info.sent / info.total * 100) + '%';
        }
        if (info.phase === 'done') {
            progressFill.style.width = '100%';
        }
    };

    drawEngine.onLayerComplete = (info) => {
        // 由于现在是全自动换色，不需要弹窗了
    };

    // UI 状态
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    stopBtn.disabled = false;
    processBtn.disabled = true;

    log('═══════════ 开始绘制 ═══════════', 'ok');

    await drawEngine.drawAll(layers, w, h);

    // 绘制结束/停止后，同步引擎最后停下的颜色状态，以便下次继续
    globalColorState = { ...drawEngine.colorState };
    updateColorStateLabel();

    // 恢复 UI
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
    processBtn.disabled = false;
    pauseBtn.textContent = '⏸ 暂停';
    btnTestHome.disabled = false;
    btnDoubleA.disabled = false;
}

// ─── 独立控制与测试 ───
import { BUTTONS } from './swicc-manager.js';

btnDoubleA.addEventListener('click', async () => {
    if (!swicc.isConnected) return;
    
    // 双击 A (配对用)
    log('发送：按 A 键...', 'info');
    // 使用 RT 模式直接发命令
    const hexA = '080000';
    const hexNone = '000000';
    
    try {
        await swicc.sendRaw('+SPM RT');
        await swicc.sendRaw(`+QD ${hexA}`);
        await new Promise(r => setTimeout(r, 60)); // 按下 60ms
        await swicc.sendRaw(`+QD ${hexNone}`);
        await new Promise(r => setTimeout(r, 50)); // 释放 50ms
        await swicc.sendRaw(`+QD ${hexA}`);
        await new Promise(r => setTimeout(r, 60)); // 按下 60ms
        await swicc.sendRaw(`+QD ${hexNone}`);
        log('A 键已发送', 'ok');
    } catch(e) {
        log('发送失败: ' + e.message, 'err');
    }
});

btnTestHome.addEventListener('click', async () => {
    if (!swicc.isConnected) return;

    const w = parseInt($('canvasW').value) || 256;
    const h = parseInt($('canvasH').value) || 256;
    
    const engine = new DrawEngine(swicc, {
        canvasWidth: w, canvasHeight: h,
        startX: parseInt($('startX').value) || 128,
        startY: parseInt($('startY').value) || 128,
        pressFrames: parseInt($('pressFrames').value) || 3,
        releaseFrames: parseInt($('releaseFrames').value) || 3,
    });
    engine.onLog = (msg) => log(msg, 'info');
    
    const frames = engine.generateInitFrames();
    
    btnTestHome.disabled = true;
    startBtn.disabled = true;
    btnDoubleA.disabled = true;
    
    log(`开始测试归零: 左 ${engine.config.startX} + 上 ${engine.config.startY} (${frames.length} 帧)`, 'info');
    
    await swicc.sendFrames(frames, {
        shouldStop: () => false,
        shouldPause: () => false
    });
    
    log('归零测试完成。请观察画笔是否恰好到达左上角边缘。如果超出边界停在半空，请减小 起始X / 起始Y。', 'warn');
    
    btnTestHome.disabled = false;
    btnDoubleA.disabled = false;
    updateStartBtn();
});

// ─── 杂项 ───
$('clearLogBtn').addEventListener('click', () => { logBox.innerHTML = ''; });

// 启动日志
log('NS Auto Draw 就绪', 'ok');
log('请先连接 SwiCC，然后上传图片', 'info');
