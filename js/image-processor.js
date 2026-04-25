/**
 * 图片处理模块
 * 提供缩放、颜色量化（Median Cut）、Floyd-Steinberg 抖动、分层拆分
 */

export class ImageProcessor {
    constructor() {
        /** @type {HTMLCanvasElement} */
        this._srcCanvas = document.createElement('canvas');
        /** @type {HTMLCanvasElement} */
        this._outCanvas = document.createElement('canvas');
        /** @type {ImageData | null} */
        this._srcImageData = null;
        /** @type {{r:number,g:number,b:number}[]} */
        this.palette = [];
        /** @type {Uint8Array | null} 每个像素对应调色板索引 */
        this.indexedPixels = null;
        /** 原始图片尺寸 */
        this.srcWidth = 0;
        this.srcHeight = 0;
    }

    /**
     * 从 File 对象加载图片
     * @param {File} file
     * @returns {Promise<{width:number, height:number}>}
     */
    loadFromFile(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.srcWidth = img.width;
                this.srcHeight = img.height;
                this._srcCanvas.width = img.width;
                this._srcCanvas.height = img.height;
                const ctx = this._srcCanvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                this._srcImageData = ctx.getImageData(0, 0, img.width, img.height);
                URL.revokeObjectURL(img.src);
                resolve({ width: img.width, height: img.height });
            };
            img.onerror = () => reject(new Error('图片加载失败'));
            img.src = URL.createObjectURL(file);
        });
    }

    /**
     * 获取原图 Canvas（用于预览）
     */
    getSrcCanvas() { return this._srcCanvas; }

    /**
     * 获取处理后的 Canvas（用于预览）
     */
    getOutCanvas() { return this._outCanvas; }

    /**
     * 处理图片：缩放 → 量化 → 生成调色板和索引
     */
    process(targetW, targetH, numColors, useDither = true, scale = 1.0, offsetX = 0, offsetY = 0) {
        // 1. 缩放与绘制
        this._outCanvas.width = targetW;
        this._outCanvas.height = targetH;
        const ctx = this._outCanvas.getContext('2d');
        ctx.clearRect(0, 0, targetW, targetH); // 清理画布，保证背景透明
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        const drawW = this.srcWidth * scale;
        const drawH = this.srcHeight * scale;
        ctx.drawImage(this._srcCanvas, offsetX, offsetY, drawW, drawH);

        const imageData = ctx.getImageData(0, 0, targetW, targetH);
        const pixels = imageData.data; // RGBA Uint8ClampedArray

        // 2. 提取非透明 RGB 像素用于生成调色板
        const rgbPixels = [];
        for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i + 3] > 128) {
                rgbPixels.push({ r: pixels[i], g: pixels[i + 1], b: pixels[i + 2] });
            }
        }

        if (rgbPixels.length === 0) {
            this.palette = [];
            this.indexedPixels = new Uint8Array(targetW * targetH).fill(255);
            this._renderOutput(targetW, targetH, pixels);
            return { palette: this.palette, indexedPixels: this.indexedPixels };
        }

        // 3. Median Cut 量化
        this.palette = medianCut(rgbPixels, numColors);

        // 4. 映射像素到调色板（跳过透明像素）
        this.indexedPixels = new Uint8Array(targetW * targetH).fill(255);
        if (useDither) {
            this.indexedPixels = floydSteinbergDitherWithAlpha(pixels, this.palette, targetW, targetH);
        } else {
            for (let i = 0; i < pixels.length; i += 4) {
                const idx = i / 4;
                if (pixels[i + 3] > 128) {
                    this.indexedPixels[idx] = findClosestColor({r: pixels[i], g: pixels[i+1], b: pixels[i+2]}, this.palette);
                }
            }
        }

        // 5. 用量化后的颜色重绘输出 Canvas
        this._renderOutput(targetW, targetH, pixels);

        return { palette: this.palette, indexedPixels: this.indexedPixels };
    }

    /**
     * 获取分层数据：每种颜色一个二值层
     * @returns {Array<{color: {r,g,b}, colorHex: string, pixelCount: number, grid: Uint8Array}>}
     */
    getLayers() {
        if (!this.indexedPixels || !this.palette.length) return [];

        const w = this._outCanvas.width;
        const h = this._outCanvas.height;
        const layers = [];

        for (let ci = 0; ci < this.palette.length; ci++) {
            const grid = new Uint8Array(w * h);
            let count = 0;
            for (let i = 0; i < this.indexedPixels.length; i++) {
                if (this.indexedPixels[i] === ci) {
                    grid[i] = 1;
                    count++;
                }
            }
            if (count === 0) continue; // 跳过空层

            const c = this.palette[ci];
            layers.push({
                color: c,
                colorHex: `#${c.r.toString(16).padStart(2,'0')}${c.g.toString(16).padStart(2,'0')}${c.b.toString(16).padStart(2,'0')}`,
                pixelCount: count,
                grid
            });
        }

        // 按像素数降序排列（先画像素最多的颜色）
        layers.sort((a, b) => b.pixelCount - a.pixelCount);
        return layers;
    }

    /** @private */
    _renderOutput(w, h, origPixels) {
        const ctx = this._outCanvas.getContext('2d');
        const imageData = ctx.createImageData(w, h);
        const out = imageData.data;

        for (let i = 0; i < this.indexedPixels.length; i++) {
            const idx = this.indexedPixels[i];
            if (idx === 255) {
                // 透明区域
                out[i * 4] = origPixels ? origPixels[i*4] : 0;
                out[i * 4 + 1] = origPixels ? origPixels[i*4+1] : 0;
                out[i * 4 + 2] = origPixels ? origPixels[i*4+2] : 0;
                out[i * 4 + 3] = origPixels ? origPixels[i*4+3] : 0;
            } else {
                const c = this.palette[idx];
                out[i * 4] = c.r;
                out[i * 4 + 1] = c.g;
                out[i * 4 + 2] = c.b;
                out[i * 4 + 3] = 255;
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }
}

// ─── Median Cut 颜色量化 ──────────────────────────────

/**
 * Median Cut 算法
 * @param {{r:number,g:number,b:number}[]} pixels
 * @param {number} numColors
 * @returns {{r:number,g:number,b:number}[]}
 */
function medianCut(pixels, numColors) {
    if (pixels.length === 0) return [];
    if (numColors <= 1) return [averageColor(pixels)];

    let buckets = [pixels.slice()];

    while (buckets.length < numColors) {
        // 找到范围最大的桶
        let maxRange = -1, maxIdx = 0;
        for (let i = 0; i < buckets.length; i++) {
            const range = getBucketRange(buckets[i]);
            if (range.maxRange > maxRange) {
                maxRange = range.maxRange;
                maxIdx = i;
            }
        }

        const bucket = buckets[maxIdx];
        if (bucket.length <= 1) break;

        const range = getBucketRange(bucket);

        // 按范围最大的通道排序，在中位数处切分
        bucket.sort((a, b) => a[range.channel] - b[range.channel]);
        const mid = Math.floor(bucket.length / 2);

        buckets.splice(maxIdx, 1, bucket.slice(0, mid), bucket.slice(mid));
    }

    return buckets.map(b => averageColor(b));
}

function getBucketRange(pixels) {
    let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
    for (const p of pixels) {
        if (p.r < rMin) rMin = p.r; if (p.r > rMax) rMax = p.r;
        if (p.g < gMin) gMin = p.g; if (p.g > gMax) gMax = p.g;
        if (p.b < bMin) bMin = p.b; if (p.b > bMax) bMax = p.b;
    }
    const rRange = rMax - rMin, gRange = gMax - gMin, bRange = bMax - bMin;
    const maxRange = Math.max(rRange, gRange, bRange);
    const channel = maxRange === rRange ? 'r' : maxRange === gRange ? 'g' : 'b';
    return { maxRange, channel };
}

function averageColor(pixels) {
    let r = 0, g = 0, b = 0;
    for (const p of pixels) { r += p.r; g += p.g; b += p.b; }
    const n = pixels.length;
    return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
}

// ─── 最近颜色查找 ──────────────────────────────

function colorDistance(a, b) {
    const dr = a.r - b.r, dg = a.g - b.g, db = a.b - b.b;
    return dr * dr + dg * dg + db * db;
}

function findClosestColor(pixel, palette) {
    let minDist = Infinity, minIdx = 0;
    for (let i = 0; i < palette.length; i++) {
        const d = colorDistance(pixel, palette[i]);
        if (d < minDist) { minDist = d; minIdx = i; }
    }
    return minIdx;
}

// ─── Floyd-Steinberg 抖动 ──────────────────────────────

/**
 * Floyd-Steinberg 误差扩散抖动 (带 Alpha 通道支持)
 */
function floydSteinbergDitherWithAlpha(pixelsRGBA, palette, width, height) {
    const buf = [];
    for (let i = 0; i < pixelsRGBA.length; i += 4) {
        buf.push({
            r: pixelsRGBA[i], g: pixelsRGBA[i+1], b: pixelsRGBA[i+2],
            a: pixelsRGBA[i+3]
        });
    }

    const result = new Uint8Array(width * height).fill(255);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const old = buf[idx];

            if (old.a <= 128) continue; // 透明区域不处理

            const ci = findClosestColor(old, palette);
            result[idx] = ci;

            const newColor = palette[ci];
            const errR = old.r - newColor.r;
            const errG = old.g - newColor.g;
            const errB = old.b - newColor.b;

            const spread = [
                [x + 1, y,     7 / 16],
                [x - 1, y + 1, 3 / 16],
                [x,     y + 1, 5 / 16],
                [x + 1, y + 1, 1 / 16],
            ];

            for (const [sx, sy, factor] of spread) {
                if (sx >= 0 && sx < width && sy < height) {
                    const si = sy * width + sx;
                    // 只向非透明像素扩散误差
                    if (buf[si].a > 128) {
                        buf[si].r += errR * factor;
                        buf[si].g += errG * factor;
                        buf[si].b += errB * factor;
                    }
                }
            }
        }
    }

    return result;
}
