export const GAME_PRESETS = [
    {
        id: "tomodachi",
        nameZh: "Tomodachi Life 朋友收集",
        nameEn: "Tomodachi Life",
        settings: {
            canvasW: 256,
            canvasH: 256,
            numColors: 16,
            startX: 128,
            startY: 128,
            imgScaleX: 1.0,
            imgScaleY: 1.0,
            imgOffsetX: 0,
            imgOffsetY: 0,
            bwThreshold: 128,
            pressFrames: 3,
            releaseFrames: 3,
            ditherMode: 'fs'
        }
    },
    {
        id: "splatoon3",
        nameZh: "Splatoon 3 (斯普拉遁 3)",
        nameEn: "Splatoon 3",
        settings: {
            canvasW: 320,
            canvasH: 120,
            numColors: 1,
            startX: 160,
            startY: 60,
            imgScaleX: 0.3,
            imgScaleY: 0.3,
            imgOffsetX: 65,
            imgOffsetY: -24,
            bwThreshold: 180,
            pressFrames: 3,
            releaseFrames: 3,
            ditherMode: 'none'
        }
    },
    {
        id: "custom",
        nameZh: "自定义",
        nameEn: "Custom",
        settings: null // 代表不需要覆盖现有设置
    }
];
