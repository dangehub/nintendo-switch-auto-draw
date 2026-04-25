const dict = {
    zh: {
        // App / Header
        'title_main': '🎮 NS Auto Draw',
        'subtitle': 'Switch 自动绘图工具',
        'status_disconnected': '未连接',
        'status_connected': '已连接',
        'btn_connect': '连接 SwiCC',
        'btn_disconnect': '断开',

        // Card 1: Image
        'card_image': '📷 图片',
        'upload_text': '拖拽图片到此处 或 <strong>点击上传</strong>',
        'upload_subtext': '支持 JPG / PNG',
        'label_src': '原图',
        'label_out': '量化后',
        'palette_info': '{count} 种颜色',

        // Card 2: Params
        'card_params': '⚙️ 参数',
        'param_width': '画布宽度',
        'param_height': '画布高度',
        'param_colors': '颜色数量',
        'param_startx': '起始 X',
        'param_starty': '起始 Y',
        'param_scale': '图像缩放',
        'param_offsetx': '图像偏移 X',
        'param_offsety': '图像偏移 Y',
        'param_pf': '按键帧数(pf)',
        'param_rf': '释放帧数(rf)',
        'param_dither': '抖动算法',
        'dither_fs': 'Floyd-Steinberg',
        'dither_none': '无（直接量化）',
        'color_count_label': '颜色数: ',
        'btn_process': '🔄 处理图片',

        // Card 3: Control
        'card_control': '🎨 绘图控制',
        'stat_layers': '颜色层',
        'stat_pixels': '总像素',
        'stat_time': '预估时间',
        'progress_ready': '就绪',
        'btn_start': '▶ 开始绘制',
        'btn_pause': '⏸ 暂停',
        'btn_resume': '▶ 继续',
        'btn_stop': '⏹ 停止',

        // Card 4: Hardware
        'card_hardware': '🔧 手柄与校准',
        'btn_test_a': '🎮 按 A 键 (用于配对)',
        'calib_desc_1': '校准测试：如果你不知道起始坐标是多少，可以测试归零。如果画笔超出边界，说明【参数】里的起始 X/Y 设大了。',
        'btn_test_home': '🏠 测归零：移动到 (0,0)',
        'calib_desc_2': '换色校准：如果在游戏里光标已经手动置于纯白色（最左上角，横轴最左），点击下方同步：',
        'btn_reset_color': '🔄 重置网页换色跟踪状态到 (0,0,0)',
        'color_state_label': '当前换色跟踪状态: H:{h}, S:{s}, V:{v}',

        // Log Panel
        'card_log': '📋 日志',
        'btn_clear_log': '清空',

        // Dynamic Logs (App)
        'log_connected': '串口已连接！',
        'log_disconnected': '串口已断开！',
        'log_process_success': '图片处理完成！共生成 {layers} 层，有效像素 {pixels}。',
        'log_test_color': '开始测试换色到 RGB({r},{g},{b})...',
        'log_test_color_done': '换色测试完成！',
        'log_paused': '已暂停',
        'log_resumed': '已恢复',
        'log_draw_start': '═══════════ 开始绘制 ═══════════',
        'log_press_a': '发送：按 A 键...',
        'log_test_home': '发送：测试复位至 (0,0) ...',
        'log_test_home_done': '复位测试完成！',
        'log_reset_color_done': '颜色跟踪状态已重置为 (0,0,0)',

        // Dynamic Logs (DrawEngine)
        'engine_start_init': '初始化画笔，移动至 ({x}, {y}) ...',
        'engine_init_done': '初始化完成。',
        'engine_layer_header': '\n═══ 颜色层 {i}/{total}: {hex} ({px} 像素) ═══',
        'engine_reset_cursor': '复位画笔到 (0,0) [从 ({x}, {y})]...',
        'engine_color_change': '正在自动更换颜色为 {hex}...',
        'engine_drawing_layer': '开始绘制该层像素...',
        'engine_done': '全图绘制完成！耗时: {sec} 秒。',
        'engine_stopped': '绘制已停止。',
        'engine_snaking': '绘制: {sent}/{total} 帧',
        'engine_resetting': '复位画笔: {sent}/{total} 帧',
        'engine_color_changing': '自动换色: {hex}'
    },
    en: {
        // App / Header
        'title_main': '🎮 NS Auto Draw',
        'subtitle': 'Switch Auto Drawing Tool',
        'status_disconnected': 'Disconnected',
        'status_connected': 'Connected',
        'btn_connect': 'Connect SwiCC',
        'btn_disconnect': 'Disconnect',

        // Card 1: Image
        'card_image': '📷 Image',
        'upload_text': 'Drop image here or <strong>Click to upload</strong>',
        'upload_subtext': 'Supports JPG / PNG',
        'label_src': 'Original',
        'label_out': 'Quantized',
        'palette_info': '{count} Colors',

        // Card 2: Params
        'card_params': '⚙️ Parameters',
        'param_width': 'Canvas Width',
        'param_height': 'Canvas Height',
        'param_colors': 'Num Colors',
        'param_startx': 'Start X',
        'param_starty': 'Start Y',
        'param_scale': 'Image Scale',
        'param_offsetx': 'Image Offset X',
        'param_offsety': 'Image Offset Y',
        'param_pf': 'Press Frames (pf)',
        'param_rf': 'Release Frames (rf)',
        'param_dither': 'Dithering',
        'dither_fs': 'Floyd-Steinberg',
        'dither_none': 'None (Direct)',
        'color_count_label': 'Colors: ',
        'btn_process': '🔄 Process Image',

        // Card 3: Control
        'card_control': '🎨 Draw Control',
        'stat_layers': 'Layers',
        'stat_pixels': 'Total Pixels',
        'stat_time': 'Est. Time',
        'progress_ready': 'Ready',
        'btn_start': '▶ Start Drawing',
        'btn_pause': '⏸ Pause',
        'btn_resume': '▶ Resume',
        'btn_stop': '⏹ Stop',

        // Card 4: Hardware
        'card_hardware': '🔧 Hardware & Calib',
        'btn_test_a': '🎮 Press A (Pair)',
        'calib_desc_1': 'Calibration: Test moving to (0,0). If the cursor hits the boundary, decrease Start X/Y in Params.',
        'btn_test_home': '🏠 Test Home: Move to (0,0)',
        'calib_desc_2': 'Color Calib: If the in-game cursor is manually set to pure White (Top-Left, Hue Left), click below:',
        'btn_reset_color': '🔄 Reset Web Tracker to (0,0,0)',
        'color_state_label': 'Color Tracker State: H:{h}, S:{s}, V:{v}',

        // Log Panel
        'card_log': '📋 Logs',
        'btn_clear_log': 'Clear',

        // Dynamic Logs (App)
        'log_connected': 'Serial connected!',
        'log_disconnected': 'Serial disconnected!',
        'log_process_success': 'Image processed! {layers} layers, {pixels} pixels.',
        'log_test_color': 'Testing color change to RGB({r},{g},{b})...',
        'log_test_color_done': 'Color test done!',
        'log_paused': 'Paused',
        'log_resumed': 'Resumed',
        'log_draw_start': '═══════════ Start Drawing ═══════════',
        'log_press_a': 'Sending: Press A...',
        'log_test_home': 'Sending: Home to (0,0)...',
        'log_test_home_done': 'Home test done!',
        'log_reset_color_done': 'Color tracker reset to (0,0,0)',

        // Dynamic Logs (DrawEngine)
        'engine_start_init': 'Init cursor, moving to ({x}, {y}) ...',
        'engine_init_done': 'Init complete.',
        'engine_layer_header': '\n═══ Layer {i}/{total}: {hex} ({px} px) ═══',
        'engine_reset_cursor': 'Reset cursor to (0,0) [from ({x}, {y})]...',
        'engine_color_change': 'Auto changing color to {hex}...',
        'engine_drawing_layer': 'Drawing layer pixels...',
        'engine_done': 'Drawing complete! Time: {sec}s.',
        'engine_stopped': 'Drawing stopped.',
        'engine_snaking': 'Draw: {sent}/{total} frames',
        'engine_resetting': 'Reset: {sent}/{total} frames',
        'engine_color_changing': 'Auto Color: {hex}'
    }
};

let currentLang = 'zh';

export function initI18n() {
    // Check local storage
    const saved = localStorage.getItem('ns_lang');
    if (saved) {
        currentLang = saved;
    } else {
        // Auto detect
        const navLang = navigator.language || navigator.userLanguage;
        if (!navLang.toLowerCase().startsWith('zh')) {
            currentLang = 'en';
        }
    }
    translateDOM();
}

export function switchLanguage() {
    currentLang = currentLang === 'zh' ? 'en' : 'zh';
    localStorage.setItem('ns_lang', currentLang);
    translateDOM();
    return currentLang;
}

export function getCurrentLang() {
    return currentLang;
}

export function t(key, vars = {}) {
    let text = dict[currentLang][key];
    if (!text) return key;
    
    for (const [k, v] of Object.entries(vars)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
    return text;
}

export function translateDOM() {
    const els = document.querySelectorAll('[data-i18n]');
    els.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[currentLang][key]) {
            if (el.tagName === 'INPUT' && el.type === 'button') {
                el.value = dict[currentLang][key];
            } else {
                el.innerHTML = dict[currentLang][key];
            }
        }
    });

    // Toggle button text
    const langBtn = document.getElementById('langToggleBtn');
    if (langBtn) {
        langBtn.textContent = currentLang === 'zh' ? '🌐 English' : '🌐 中文';
    }
}
