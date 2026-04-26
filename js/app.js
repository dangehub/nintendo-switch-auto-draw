/**
 * NS Auto Draw 主应用
 * 连接 UI 与各模块
 */
import { SwiCCManager } from './swicc-manager.js';
import { ImageProcessor } from './image-processor.js';
import { DrawEngine } from './draw-engine.js';
import { t, initI18n, switchLanguage, getCurrentLang } from './i18n.js';
import { GAME_PRESETS } from './presets.js';

// 初始化多语言
initI18n();

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
        connBadge.textContent = t('status_connected');
        connBadge.className = 'badge badge-on';
        connectBtn.disabled = true;
        disconnectBtn.disabled = false;
        deviceInfo.textContent = swicc.deviceId ?
            `${swicc.deviceId} v${swicc.deviceVersion || '?'}` : '';
        updateStartBtn();
        btnDoubleA.disabled = false;
        btnTestHome.disabled = false;
    } else {
        connBadge.textContent = t('status_disconnected');
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
    catch (e) { log(e.message, 'err'); }
});
disconnectBtn.addEventListener('click', () => swicc.disconnect());

$('langToggleBtn').addEventListener('click', () => {
    switchLanguage();
    connBadge.textContent = swicc.isConnected ? t('status_connected') : t('status_disconnected');
    updateColorStateLabel();
    if (imageLoaded) {
        srcLabel.textContent = `${t('label_src')} ${srcPreview.width}×${srcPreview.height}`;
        outLabel.textContent = `${t('label_out')} ${outPreview.width}×${outPreview.height}`;
    }
    log(getCurrentLang() === 'zh' ? '已切换为中文' : 'Switched to English', 'ok');
    initPresetOptions();
});

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
        srcLabel.textContent = `${t('label_src')} ${src.width}×${src.height}`;

        previewRow.style.display = 'grid';
        processBtn.disabled = false;
        uploadZone.innerHTML = `<div class="icon">✅</div><div>${file.name}</div><div style="font-size:12px;color:var(--text-muted)">${t('upload_text')}</div>`;

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
const p_canvasW = $('canvasW');
const p_canvasH = $('canvasH');
const p_numColors = numColors; // alias
const p_startX = $('startX');
const p_startY = $('startY');
const p_imgScaleX = $('imgScaleX');
const p_imgScaleY = $('imgScaleY');
const p_imgOffsetX = $('imgOffsetX');
const p_imgOffsetY = $('imgOffsetY');
const p_bwThreshold = $('bwThreshold');
const p_pressFrames = $('pressFrames');
const p_releaseFrames = $('releaseFrames');
const p_ditherMode = $('ditherMode');
const p_gamePreset = $('gamePreset');

// 初始化预设选项
function initPresetOptions() {
    p_gamePreset.innerHTML = '';
    const lang = getCurrentLang();
    GAME_PRESETS.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = lang === 'zh' ? p.nameZh : p.nameEn;
        p_gamePreset.appendChild(opt);
    });
}
initPresetOptions();

// 当预设改变时应用参数
p_gamePreset.addEventListener('change', () => {
    const pId = p_gamePreset.value;
    const preset = GAME_PRESETS.find(p => p.id === pId);
    if (preset && preset.settings) {
        const s = preset.settings;
        p_canvasW.value = s.canvasW;
        p_canvasH.value = s.canvasH;
        p_numColors.value = s.numColors;
        p_startX.value = s.startX;
        p_startY.value = s.startY;
        p_imgScaleX.value = s.imgScaleX || s.imgScale || 1.0;
        p_imgScaleY.value = s.imgScaleY || s.imgScale || 1.0;
        p_imgOffsetX.value = s.imgOffsetX;
        p_imgOffsetY.value = s.imgOffsetY;
        p_bwThreshold.value = s.bwThreshold;
        p_pressFrames.value = s.pressFrames;
        p_releaseFrames.value = s.releaseFrames;
        p_ditherMode.value = s.ditherMode;
        
        colorCountLabel.textContent = s.numColors;
        processImage();
    }
});

function markCustomPreset() {
    p_gamePreset.value = 'custom';
}

[p_canvasW, p_canvasH, p_numColors, p_startX, p_startY, p_imgScaleX, p_imgScaleY, 
 p_imgOffsetX, p_imgOffsetY, p_bwThreshold, p_pressFrames, 
 p_releaseFrames, p_ditherMode].forEach(el => {
    el.addEventListener('change', markCustomPreset);
    el.addEventListener('input', markCustomPreset);
});

// 使用 requestAnimationFrame 节流图片处理，避免拖动数值时严重卡顿
let isProcessing = false;
let pendingProcess = false;
function processImageThrottled() {
    if (isProcessing) {
        pendingProcess = true;
        return;
    }
    isProcessing = true;
    requestAnimationFrame(() => {
        processImage();
        isProcessing = false;
        if (pendingProcess) {
            pendingProcess = false;
            processImageThrottled();
        }
    });
}

$('ditherMode').addEventListener('change', processImage);
$('imgScaleX').addEventListener('input', processImageThrottled);
$('imgScaleY').addEventListener('input', processImageThrottled);
$('imgOffsetX').addEventListener('input', processImageThrottled);
$('imgOffsetY').addEventListener('input', processImageThrottled);
$('startX').addEventListener('input', processImageThrottled);
$('startY').addEventListener('input', processImageThrottled);
$('bwThreshold').addEventListener('input', processImageThrottled);
$('bwThreshold').addEventListener('change', processImage);

// ─── 鼠标拖拽标签调节数值 ───
document.querySelectorAll('.drag-label').forEach(label => {
    let startX = 0;
    let startVal = 0;
    let targetInput = null;
    let step = 1;

    label.addEventListener('mousedown', (e) => {
        targetInput = $(label.getAttribute('data-target'));
        if (!targetInput) return;
        
        step = parseFloat(label.getAttribute('data-step')) || 1;
        startX = e.clientX;
        startVal = parseFloat(targetInput.value) || 0;
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        
        // 阻止文本被选中
        e.preventDefault();
    });

    function onMouseMove(e) {
        const dx = e.clientX - startX;
        let newVal = startVal + dx * step;
        
        if (targetInput.hasAttribute('min')) {
            newVal = Math.max(parseFloat(targetInput.getAttribute('min')), newVal);
        }
        if (targetInput.hasAttribute('max')) {
            newVal = Math.min(parseFloat(targetInput.getAttribute('max')), newVal);
        }

        const decimals = step < 1 ? step.toString().split('.')[1].length : 0;
        targetInput.value = newVal.toFixed(decimals);
        
        targetInput.dispatchEvent(new Event('input'));
    }

    function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        if (targetInput) {
            targetInput.dispatchEvent(new Event('change'));
        }
    }
});

// ─── 全屏编辑器 ───
const btnEdit = $('btnEdit');
const editorModal = $('editorModal');
const editorCanvas = $('editorCanvas');
const editorUICanvas = $('editorUICanvas');
const eCtx = editorCanvas.getContext('2d');
const uiCtx = editorUICanvas.getContext('2d');

let currentTool = 'transform';
let isErasing = false;
let isDraggingHandle = null;
let isDraggingBody = false;
let editorDragStart = { x: 0, y: 0 };
let editorStartParams = {};
let maskSnapshot = null;
let paramsSnapshot = null;
let editorPadding = { x: 0, y: 0, w: 0, h: 0 };

// 工具栏切换
['toolTransform', 'toolMove', 'toolEraser'].forEach(id => {
    $(id).addEventListener('click', (e) => {
        document.querySelectorAll('.btn-tool').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentTool = e.currentTarget.getAttribute('data-tool');
        
        $('optsTransform').style.display = currentTool === 'transform' ? 'flex' : 'none';
        $('optsEraser').style.display = currentTool === 'eraser' ? 'flex' : 'none';
        
        editorUICanvas.style.cursor = currentTool === 'eraser' ? 'crosshair' : 'default';
        drawEditorUI();
    });
});

$('editorLockRatio').addEventListener('change', drawEditorUI);

function drawEditorUI() {
    const w = editorUICanvas.width;
    const h = editorUICanvas.height;
    uiCtx.clearRect(0, 0, w, h);
    
    if (currentTool !== 'transform') return;
    if (!imgProc.srcWidth) return;

    const padX = editorPadding.x;
    const padY = editorPadding.y;
    
    const scaleX = parseFloat(p_imgScaleX.value) || 1.0;
    const scaleY = parseFloat(p_imgScaleY.value) || 1.0;
    const offX = parseInt(p_imgOffsetX.value) || 0;
    const offY = parseInt(p_imgOffsetY.value) || 0;
    
    const drawW = imgProc.srcWidth * scaleX;
    const drawH = imgProc.srcHeight * scaleY;
    
    const bx = padX + offX;
    const by = padY + offY;

    // 画控制框
    uiCtx.strokeStyle = '#388bfd';
    uiCtx.lineWidth = 1;
    uiCtx.strokeRect(bx, by, drawW, drawH);
    
    // 画手柄
    const handles = getHandles(bx, by, drawW, drawH);
    uiCtx.fillStyle = '#fff';
    uiCtx.strokeStyle = '#388bfd';
    uiCtx.lineWidth = 1;
    handles.forEach(h => {
        uiCtx.fillRect(h.x - 3, h.y - 3, 6, 6);
        uiCtx.strokeRect(h.x - 3, h.y - 3, 6, 6);
    });
}

function getHandles(x, y, w, h) {
    const hw = w / 2;
    const hh = h / 2;
    return [
        { type: 'tl', x: x, y: y, cursor: 'nwse-resize' },
        { type: 'tc', x: x + hw, y: y, cursor: 'ns-resize' },
        { type: 'tr', x: x + w, y: y, cursor: 'nesw-resize' },
        { type: 'ml', x: x, y: y + hh, cursor: 'ew-resize' },
        { type: 'mr', x: x + w, y: y + hh, cursor: 'ew-resize' },
        { type: 'bl', x: x, y: y + h, cursor: 'nesw-resize' },
        { type: 'bc', x: x + hw, y: y + h, cursor: 'ns-resize' },
        { type: 'br', x: x + w, y: y + h, cursor: 'nwse-resize' }
    ];
}

function getHoverHandle(pos) {
    if (currentTool !== 'transform') return null;
    const padX = editorPadding.x;
    const padY = editorPadding.y;
    
    const scaleX = parseFloat(p_imgScaleX.value) || 1.0;
    const scaleY = parseFloat(p_imgScaleY.value) || 1.0;
    const offX = parseInt(p_imgOffsetX.value) || 0;
    const offY = parseInt(p_imgOffsetY.value) || 0;
    const drawW = imgProc.srcWidth * scaleX;
    const drawH = imgProc.srcHeight * scaleY;
    
    const bx = padX + offX;
    const by = padY + offY;
    
    const handles = getHandles(bx, by, drawW, drawH);
    for (let h of handles) {
        if (Math.abs(pos.x - h.x) <= 5 && Math.abs(pos.y - h.y) <= 5) return h;
    }
    return null;
}

btnEdit.addEventListener('click', () => {
    editorModal.style.display = 'flex';
    const w = parseInt($('canvasW').value) || 256;
    const h = parseInt($('canvasH').value) || 256;
    
    // 定义扩展画板区域，方便查看全貌
    const padX = Math.max(200, Math.floor(w / 1.5));
    const padY = Math.max(200, Math.floor(h / 1.5));
    editorPadding = { x: padX, y: padY, w: w, h: h };
    
    const edW = w + padX * 2;
    const edH = h + padY * 2;
    
    editorCanvas.width = edW;
    editorCanvas.height = edH;
    editorUICanvas.width = edW;
    editorUICanvas.height = edH;
    
    // 设置视觉放大
    const container = $('editorCanvasContainer');
    const scale = Math.min(
        (container.clientWidth - 40) / edW,
        (container.clientHeight - 40) / edH
    );
    // 在这里允许非整数比例以充分利用屏幕
    editorCanvas.style.width = `${edW * scale}px`;
    editorCanvas.style.height = `${edH * scale}px`;
    editorCanvas.style.imageRendering = 'pixelated';
    editorUICanvas.style.width = `${edW * scale}px`;
    editorUICanvas.style.height = `${edH * scale}px`;

    // 绘制当前画面
    renderEditorCanvas();
    drawEditorUI();

    // 记录快照以支持“取消”
    paramsSnapshot = {
        scaleX: p_imgScaleX.value,
        scaleY: p_imgScaleY.value,
        offX: p_imgOffsetX.value,
        offY: p_imgOffsetY.value
    };
    
    if (imgProc._srcMaskCanvas) {
        maskSnapshot = document.createElement('canvas');
        maskSnapshot.width = imgProc._srcMaskCanvas.width;
        maskSnapshot.height = imgProc._srcMaskCanvas.height;
        maskSnapshot.getContext('2d').drawImage(imgProc._srcMaskCanvas, 0, 0);
    }
});

$('editorCancelBtn').addEventListener('click', () => {
    editorModal.style.display = 'none';
    if (paramsSnapshot) {
        p_imgScaleX.value = paramsSnapshot.scaleX;
        p_imgScaleY.value = paramsSnapshot.scaleY;
        p_imgOffsetX.value = paramsSnapshot.offX;
        p_imgOffsetY.value = paramsSnapshot.offY;
    }
    if (maskSnapshot && imgProc._srcMaskCanvas) {
        const mCtx = imgProc._srcMaskCanvas.getContext('2d');
        mCtx.clearRect(0, 0, maskSnapshot.width, maskSnapshot.height);
        mCtx.drawImage(maskSnapshot, 0, 0);
    }
    processImage();
});

$('editorSaveBtn').addEventListener('click', () => {
    editorModal.style.display = 'none';
    // 因为是实时预览，点击保存只需关闭弹窗并刷新侧边栏数据即可
    processImage();
});

function getUIPos(e) {
    const rect = editorUICanvas.getBoundingClientRect();
    const scaleX = editorUICanvas.width / rect.width;
    const scaleY = editorUICanvas.height / rect.height;
    return {
        x: Math.floor((e.clientX - rect.left) * scaleX),
        y: Math.floor((e.clientY - rect.top) * scaleY)
    };
}

editorUICanvas.addEventListener('mousedown', (e) => {
    const pos = getUIPos(e);
    
    if (currentTool === 'eraser') {
        isErasing = true;
        eraseOnEditor(pos);
        return;
    }
    
    if (currentTool === 'transform') {
        const handle = getHoverHandle(pos);
        if (handle) {
            isDraggingHandle = handle.type;
        } else {
            isDraggingBody = true;
        }
    } else if (currentTool === 'move') {
        isDraggingBody = true;
    }
    
    if (isDraggingHandle || isDraggingBody) {
        editorDragStart = pos;
        editorStartParams = {
            scaleX: parseFloat(p_imgScaleX.value) || 1.0,
            scaleY: parseFloat(p_imgScaleY.value) || 1.0,
            offX: parseInt(p_imgOffsetX.value) || 0,
            offY: parseInt(p_imgOffsetY.value) || 0
        };
    }
});

editorUICanvas.addEventListener('mousemove', (e) => {
    const pos = getUIPos(e);
    
    if (currentTool === 'eraser') {
        if (isErasing) eraseOnEditor(pos);
        return;
    }
    
    if (currentTool === 'transform' && !isDraggingHandle && !isDraggingBody) {
        const handle = getHoverHandle(pos);
        editorUICanvas.style.cursor = handle ? handle.cursor : 'move';
    } else if (currentTool === 'move' && !isDraggingBody) {
        editorUICanvas.style.cursor = 'move';
    }
    
    if (isDraggingBody) {
        const dx = pos.x - editorDragStart.x;
        const dy = pos.y - editorDragStart.y;
        p_imgOffsetX.value = Math.round(editorStartParams.offX + dx);
        p_imgOffsetY.value = Math.round(editorStartParams.offY + dy);
        markCustomPreset();
        processImageThrottled();
        drawEditorUI();
    } else if (isDraggingHandle) {
        const dx = pos.x - editorDragStart.x;
        const dy = pos.y - editorDragStart.y;
        
        const origW = imgProc.srcWidth * editorStartParams.scaleX;
        const origH = imgProc.srcHeight * editorStartParams.scaleY;
        
        let newW = origW;
        let newH = origH;
        let newOffX = editorStartParams.offX;
        let newOffY = editorStartParams.offY;
        
        if (isDraggingHandle.includes('r')) newW = origW + dx;
        if (isDraggingHandle.includes('l')) { newW = origW - dx; newOffX = editorStartParams.offX + dx; }
        if (isDraggingHandle.includes('b')) newH = origH + dy;
        if (isDraggingHandle.includes('t')) { newH = origH - dy; newOffY = editorStartParams.offY + dy; }
        
        if (newW < 1) { newW = 1; newOffX = p_imgOffsetX.value; }
        if (newH < 1) { newH = 1; newOffY = p_imgOffsetY.value; }
        
        if ($('editorLockRatio').checked && isDraggingHandle.length === 2) {
            const ratio = origW / origH;
            if (Math.abs(dx) > Math.abs(dy)) {
                newH = newW / ratio;
                if (isDraggingHandle.includes('t')) newOffY = editorStartParams.offY + (origH - newH);
            } else {
                newW = newH * ratio;
                if (isDraggingHandle.includes('l')) newOffX = editorStartParams.offX + (origW - newW);
            }
        }
        
        p_imgScaleX.value = (newW / imgProc.srcWidth).toFixed(3);
        p_imgScaleY.value = (newH / imgProc.srcHeight).toFixed(3);
        p_imgOffsetX.value = Math.round(newOffX);
        p_imgOffsetY.value = Math.round(newOffY);
        markCustomPreset();
        processImageThrottled();
        drawEditorUI();
    }
});

editorUICanvas.addEventListener('mouseup', () => {
    isErasing = false;
    isDraggingHandle = null;
    isDraggingBody = false;
});
editorUICanvas.addEventListener('mouseleave', () => {
    isErasing = false;
    isDraggingHandle = null;
    isDraggingBody = false;
});

// 负责绘制带有画板边界的画布
function renderEditorCanvas() {
    if ($('editorModal').style.display !== 'flex') return;
    
    const ew = editorCanvas.width;
    const eh = editorCanvas.height;
    eCtx.clearRect(0, 0, ew, eh);
    
    const padX = editorPadding.x;
    const padY = editorPadding.y;
    const cw = editorPadding.w;
    const ch = editorPadding.h;

    // 外部背景颜色
    eCtx.fillStyle = '#1e1e1e';
    eCtx.fillRect(0, 0, ew, eh);

    // 画板区域白底
    eCtx.fillStyle = '#FFFFFF';
    eCtx.fillRect(padX, padY, cw, ch);
    
    // 在底层用半透明绘制原图，用于“画板外”参考
    if (imgProc.srcWidth) {
        const scaleX = parseFloat(p_imgScaleX.value) || 1.0;
        const scaleY = parseFloat(p_imgScaleY.value) || 1.0;
        const offX = parseInt(p_imgOffsetX.value) || 0;
        const offY = parseInt(p_imgOffsetY.value) || 0;
        const drawW = imgProc.srcWidth * scaleX;
        const drawH = imgProc.srcHeight * scaleY;
        
        eCtx.save();
        eCtx.globalAlpha = 0.3;
        eCtx.drawImage(imgProc.getSrcCanvas(), padX + offX, padY + offY, drawW, drawH);
        
        // 连同挖洞蒙版一起画
        if (imgProc._srcMaskCanvas) {
            eCtx.globalCompositeOperation = 'destination-out';
            eCtx.globalAlpha = 1.0;
            eCtx.drawImage(imgProc._srcMaskCanvas, padX + offX, padY + offY, drawW, drawH);
        }
        eCtx.restore();
    }

    // 绘制量化后的图像(自带透明度洞)在中心画板
    eCtx.drawImage(outPreview, padX, padY);

    // 画板边界线
    eCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    eCtx.setLineDash([5, 5]);
    eCtx.lineWidth = 1;
    eCtx.strokeRect(padX - 1, padY - 1, cw + 2, ch + 2);
    eCtx.setLineDash([]);
}

// 在底层蒙版打洞并触发重新量化
function eraseOnEditor(pos) {
    const size = parseInt($('eraserSize').value) || 10;
    const scaleX = parseFloat(p_imgScaleX.value) || 1.0;
    const scaleY = parseFloat(p_imgScaleY.value) || 1.0;
    const offX = parseInt(p_imgOffsetX.value) || 0;
    const offY = parseInt(p_imgOffsetY.value) || 0;
    
    // 扣除 Padding，转为相对于画布的坐标
    const cx = pos.x - editorPadding.x;
    const cy = pos.y - editorPadding.y;
    
    imgProc.erasePixel(cx, cy, size/2, scaleX, scaleY, offX, offY);
    processImageThrottled();
}

function processImage() {
    if (!imageLoaded) return;

    const w = parseInt($('canvasW').value) || 256;
    const h = parseInt($('canvasH').value) || 256;
    const nc = parseInt(numColors.value) || 16;
    const dither = $('ditherMode').value === 'fs';
    
    const scaleX = parseFloat($('imgScaleX').value) || 1.0;
    const scaleY = parseFloat($('imgScaleY').value) || 1.0;
    const offX = parseInt($('imgOffsetX').value) || 0;
    const offY = parseInt($('imgOffsetY').value) || 0;
    const bwThreshold = parseInt($('bwThreshold').value) || 128;

    log(`处理图片: ${w}×${h}, 缩放=(${scaleX},${scaleY}), 偏移=(${offX},${offY}), ${nc} 色, 抖动=${dither ? '开' : '关'}`, 'info');

    const result = imgProc.process(w, h, nc, dither, scaleX, scaleY, offX, offY, bwThreshold);

    // 允许使用编辑器
    $('btnEdit').disabled = false;

    // 更新量化预览
    const out = imgProc.getOutCanvas();
    const oCtx = outPreview.getContext('2d');
    outPreview.width = out.width;
    outPreview.height = out.height;
    oCtx.drawImage(out, 0, 0);
    outLabel.textContent = `${t('label_out')} ${w}×${h}`;
    
    // 同步刷新编辑器画布
    renderEditorCanvas();
    drawEditorUI();

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
    $('statTime').textContent = mins < 60 ? `${mins} ${getCurrentLang()==='zh'?'分钟':'min'}` : `${Math.floor(mins/60)}h${mins%60}m`;
    statsPanel.style.display = 'grid';

    log(t('log_process_success', { layers: layers.length, pixels: totalPixels }), 'ok');
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
    paletteInfo.textContent = t('palette_info', { count: layers.length });
}

// ─── 测试换色 ───
let globalColorState = { h: 0, s: 0, v: 0 };

function updateColorStateLabel() {
    $('colorStateLabel').textContent = t('color_state_label', { h: globalColorState.h, s: globalColorState.s, v: globalColorState.v });
}

$('btnResetColorState').addEventListener('click', () => {
    globalColorState = { h: 0, s: 0, v: 0 };
    updateColorStateLabel();
    log(t('log_reset_color_done'), 'ok');
});

async function testColorChange(targetRGB) {
    if (!swicc.isConnected) return log(t('status_disconnected'), 'err');
    
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
    
    log(t('log_test_color', { r: targetRGB.r, g: targetRGB.g, b: targetRGB.b }), 'info');
    const ok = await swicc.sendFrames(frames, {
        shouldStop: () => false,
        shouldPause: () => false
    });
    
    if (ok) {
        // 测试成功，保存新的颜色状态
        globalColorState = { ...engine.colorState };
        updateColorStateLabel();
        log(t('log_test_color_done'), 'ok');
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
        pauseBtn.textContent = t('btn_pause');
        log(t('log_resumed'), 'info');
    } else {
        drawEngine.pause();
        pauseBtn.textContent = t('btn_resume');
        log(t('log_paused'), 'warn');
    }
});
stopBtn.addEventListener('click', () => {
    if (drawEngine) drawEngine.stop();
});

// $('modalContinueBtn').addEventListener('click', ... removed
// $('modalStopBtn').addEventListener('click', ... removed

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

    log(t('log_draw_start'), 'ok');

    await drawEngine.drawAll(layers, w, h);

    // 绘制结束/停止后，同步引擎最后停下的颜色状态，以便下次继续
    globalColorState = { ...drawEngine.colorState };
    updateColorStateLabel();

    // 恢复 UI
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
    processBtn.disabled = false;
    pauseBtn.textContent = t('btn_pause');
    btnTestHome.disabled = false;
    btnDoubleA.disabled = false;
}

// ─── 独立控制与测试 ───
import { BUTTONS } from './swicc-manager.js';

btnDoubleA.addEventListener('click', async () => {
    if (!swicc.isConnected) return;
    
    // 双击 A (配对用)
    log(t('log_press_a'), 'info');
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
        log('A OK', 'ok');
    } catch(e) {
        log('Error: ' + e.message, 'err');
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
    
    log(t('log_test_home', { x: engine.config.startX, y: engine.config.startY }), 'info');
    
    await swicc.sendFrames(frames, {
        shouldStop: () => false,
        shouldPause: () => false
    });
    
    log(t('log_test_home_done'), 'warn');
    
    btnTestHome.disabled = false;
    btnDoubleA.disabled = false;
    updateStartBtn();
});

// ─── 杂项 ───
$('clearLogBtn').addEventListener('click', () => { logBox.innerHTML = ''; });

// 启动日志
log('NS Auto Draw 就绪', 'ok');
log('请先连接 SwiCC，然后上传图片', 'info');
