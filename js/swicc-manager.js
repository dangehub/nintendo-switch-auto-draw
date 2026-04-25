/**
 * SwiCC 串口通信管理器
 * 封装 Web Serial API，提供与 SwiCC 设备通信的高层接口
 */

// Pro Controller 按键到数字状态的映射
// Byte0: Y(0) X(1) B(2) A(3) SR_R(4) SL_R(5) R(6) ZR(7)
// Byte1: Minus(0) Plus(1) RStick(2) LStick(3) Home(4) Capture(5)
// Byte2: Down(0) Up(1) Right(2) Left(3) SR_L(4) SL_L(5) L(6) ZL(7)
export const BUTTONS = {
    Y: 0x010000, X: 0x020000, B: 0x040000, A: 0x080000,
    R: 0x400000, ZR: 0x800000,
    MINUS: 0x000100, PLUS: 0x000200,
    RSTICK: 0x000400, LSTICK: 0x000800,
    HOME: 0x001000, CAPTURE: 0x002000,
    DOWN: 0x000001, UP: 0x000002,
    RIGHT: 0x000004, LEFT: 0x000008,
    L: 0x000040, ZL: 0x000080,
    NONE: 0x000000,
};

/**
 * 将按钮值转为 6 位 HEX 字符串
 */
function toHex6(value) {
    return value.toString(16).padStart(6, '0').toUpperCase();
}

export class SwiCCManager {
    constructor() {
        /** @private */ this._port = null;
        /** @private */ this._reader = null;
        /** @private */ this._writer = null;
        /** @private */ this._reading = false;
        /** @private */ this._deviceId = null;
        /** @private */ this._deviceVersion = null;
        /** @private */ this._queueSize = 250;
        /** @private */ this._queueRemaining = 250;
        /** @private */ this._responseBuffer = '';
        /** @private */ this._responseResolvers = [];

        // 回调
        /** @type {function(string): void} */
        this.onLog = (msg) => console.log(msg);
        /** @type {function(string): void} */
        this.onStatusChange = (status) => {};
    }

    get isConnected() { return this._port !== null && this._writer !== null; }
    get deviceId() { return this._deviceId; }
    get deviceVersion() { return this._deviceVersion; }
    get queueSize() { return this._queueSize; }
    get queueRemaining() { return this._queueRemaining; }

    /**
     * 连接到 SwiCC 设备
     * @param {number} baudRate - 波特率（默认 115200）
     */
    async connect(baudRate = 115200) {
        if (!('serial' in navigator)) {
            throw new Error('浏览器不支持 Web Serial API，请使用 Chrome 或 Edge');
        }

        this._port = await navigator.serial.requestPort();
        await this._port.open({ baudRate });

        this._writer = this._port.writable.getWriter();
        this._reading = true;
        this._reader = this._port.readable.getReader();
        this._startReadLoop();

        this.onLog(`串口已打开（波特率: ${baudRate}）`);
        this.onStatusChange('connected');

        // 探测设备
        try {
            await this._interrogate();
        } catch (e) {
            this.onLog(`⚠️ 设备探测失败: ${e.message}，但连接仍然有效`);
        }
    }

    /**
     * 断开连接
     */
    async disconnect() {
        this._reading = false;
        try {
            if (this._reader) { await this._reader.cancel(); this._reader.releaseLock(); }
            if (this._writer) { await this._writer.close(); this._writer.releaseLock(); }
            if (this._port) { await this._port.close(); }
        } catch (e) { /* ignore */ }
        this._port = null;
        this._reader = null;
        this._writer = null;
        this._deviceId = null;
        this._deviceVersion = null;
        this.onStatusChange('disconnected');
        this.onLog('已断开连接');
    }

    /**
     * 发送原始命令
     */
    async sendRaw(cmd) {
        if (!this._writer) throw new Error('未连接');
        const data = new TextEncoder().encode(cmd + '\n');
        await this._writer.write(data);
    }

    /**
     * 发送命令并等待包含指定前缀的响应
     */
    async sendAndWait(cmd, responsePrefix, timeoutMs = 1000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this._responseResolvers = this._responseResolvers.filter(r => r !== resolver);
                reject(new Error(`等待响应 "${responsePrefix}" 超时`));
            }, timeoutMs);

            const resolver = { prefix: responsePrefix, resolve: (line) => {
                clearTimeout(timer);
                resolve(line);
            }};
            this._responseResolvers.push(resolver);
            this.sendRaw(cmd).catch(reject);
        });
    }

    /**
     * 设置播放模式
     * @param {'RT' | 'BUF'} mode
     */
    async setPlayMode(mode) {
        await this.sendRaw(`+SPM ${mode}`);
        this.onLog(`播放模式: ${mode === 'BUF' ? '缓冲' : '实时'}`);
    }

    /**
     * 发送数字状态帧（入队）
     * @param {number} state - 按钮组合值
     */
    async queueDigital(state) {
        if (!this._writer) throw new Error('未连接');
        const cmd = `+QD ${toHex6(state)}\n`;
        await this._writer.write(new TextEncoder().encode(cmd));
    }

    /**
     * 查询队列剩余空间
     */
    async getQueueRemaining() {
        try {
            const resp = await this.sendAndWait('+GQR ', '+GQR', 500);
            const val = parseInt(resp.split(' ')[1]);
            if (!isNaN(val)) this._queueRemaining = val;
            return this._queueRemaining;
        } catch {
            return this._queueRemaining;
        }
    }

    /**
     * 查询队列大小
     */
    async getQueueSize() {
        try {
            const resp = await this.sendAndWait('+GQS ', '+GQS', 500);
            const val = parseInt(resp.split(' ')[1]);
            if (!isNaN(val)) this._queueSize = val;
            return this._queueSize;
        } catch {
            return this._queueSize;
        }
    }

    /**
     * 批量发送帧序列到 SwiCC 队列（带流控）
     * @param {number[]} frames - 帧数组（每个元素是按钮组合值）
     * @param {object} callbacks
     * @param {function(number, number): void} callbacks.onProgress - (sent, total)
     * @param {function(): boolean} callbacks.shouldStop - 返回 true 则中止
     * @param {function(): boolean} callbacks.shouldPause - 返回 true 则暂停
     * @returns {Promise<boolean>} 是否全部发送完成
     */
    async sendFrames(frames, { onProgress, shouldStop, shouldPause } = {}) {
        // 先切 RT 模式发 NONE 清空当前状态
        await this.sendRaw('+SPM RT');
        await this.sendRaw(`+QD ${toHex6(BUTTONS.NONE)}`);
        await this._sleep(100);

        // 切换到 BUF 模式
        await this.sendRaw('+SPM BUF');
        this.onLog('播放模式: 缓冲');
        await this._sleep(100);

        // 前后加垫帧
        const padded = [
            ...Array(5).fill(BUTTONS.NONE),
            ...frames,
            ...Array(5).fill(BUTTONS.NONE)
        ];
        const total = padded.length;
        let sent = 0;

        this.onLog(`[sendFrames] 总帧数(含缓冲): ${total}`);

        // ★ 完全采用测试中最稳健的无脑分块发送法
        const BATCH = 80;
        
        while (sent < total) {
            if (shouldStop?.()) {
                this.onLog('发送已中止');
                return false;
            }

            while (shouldPause?.()) {
                await this._sleep(100);
                if (shouldStop?.()) return false;
            }

            const chunk = Math.min(BATCH, total - sent);
            let batchStr = '';
            for (let i = 0; i < chunk; i++) {
                batchStr += `+QD ${toHex6(padded[sent + i])}\n`;
            }
            
            await this._writer.write(new TextEncoder().encode(batchStr));
            sent += chunk;
            onProgress?.(sent, total);

            // 让系统休眠略长于硬件消化这段数据的时间（比如 80 帧理论消耗 1.33秒，我们给 1.45 秒左右）
            // 确保硬件永远有余力处理，绝不会溢出 400 帧队列
            if (sent < total) {
                await this._sleep(Math.ceil((chunk / 55) * 1000));
            }
        }

        this.onLog(`[sendFrames] 帧发送完毕，等待播放结束...`);
        // 等待最后一块播放完
        await this._sleep(Math.ceil((BATCH / 60) * 1000) + 200);

        // 切回 RT
        await this.sendRaw('+SPM RT');
        await this.sendRaw(`+QD ${toHex6(BUTTONS.NONE)}`);
        
        this.onLog(`[sendFrames] 全部任务完成`);
        return true;
    }

    // ─── 内部方法 ────────────────────────────────────

    /** @private */
    async _interrogate() {
        const idResp = await this.sendAndWait('+ID ', '+', 1500);
        if (idResp.includes('2wiCC') || idResp.includes('SwiCC')) {
            this._deviceId = idResp.trim().replace(/^\+/, '');
            this.onLog(`设备: ${this._deviceId}`);
        }

        try {
            const verResp = await this.sendAndWait('+VER ', '+VER', 1000);
            this._deviceVersion = verResp.replace('+VER ', '').trim();
            this.onLog(`固件版本: ${this._deviceVersion}`);
        } catch { /* optional */ }

        await this.getQueueSize();
        this.onLog(`队列大小: ${this._queueSize}`);
    }

    /** @private */
    _startReadLoop() {
        const decoder = new TextDecoder();
        const loop = async () => {
            try {
                while (this._reading) {
                    const { value, done } = await this._reader.read();
                    if (done) break;
                    if (value) {
                        this._responseBuffer += decoder.decode(value);
                        this._processBuffer();
                    }
                }
            } catch (e) {
                if (this._reading) this.onLog(`读取错误: ${e.message}`);
            }
        };
        loop();
    }

    /** @private */
    _processBuffer() {
        let nlIdx;
        while ((nlIdx = this._responseBuffer.indexOf('\n')) !== -1) {
            const line = this._responseBuffer.substring(0, nlIdx).trim();
            this._responseBuffer = this._responseBuffer.substring(nlIdx + 1);
            if (!line) continue;

            // 检查是否有等待此响应的 resolver
            const matchIdx = this._responseResolvers.findIndex(
                r => line.startsWith(r.prefix)
            );
            if (matchIdx !== -1) {
                const [resolver] = this._responseResolvers.splice(matchIdx, 1);
                resolver.resolve(line);
            }

            // 更新队列状态
            if (line.startsWith('+GQR')) {
                const val = parseInt(line.split(' ')[1]);
                if (!isNaN(val)) this._queueRemaining = val;
            }
        }
    }

    /** @private */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
