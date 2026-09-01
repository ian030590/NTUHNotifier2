# NTUHNotifier2 (臺大醫院門診進度桌面通知器)

基於 Electron + React 19 + TypeScript + Vite 打造的跨平台桌面版臺大醫院門診叫號追蹤與通知系統。

## 核心特色 / Features

- **跨平台桌面應用**：獨立於瀏覽器運作，支援常駐 Windows 系統工具列（System Tray）。
- **即時爬蟲解析**：使用 Cheerio 背景解析臺大醫院門診最新叫號資料，精確抓取各科別診間即時號碼。
- **原生桌面通知**：支援 Windows 原生彈出通知與音效警示，可設定「即將看診（提前 N 號）」與「已叫號」。
- **現代化流暢介面**：採用 React 19、TypeScript 與 Lucide 圖示，介面清爽直覺。

## 檔案結構 / File Structure

```text
NTUHNotifier2/
├── electron/          # Electron 主行程（Main Process）與系統整合
├── src/               # React 19 + TypeScript 前端介面原始碼
├── public/            # 靜態圖示與素材
├── package.json       # 專案相依與建置腳本
├── vite.config.ts     # Vite 建置設定
├── tsconfig.json      # TypeScript 設定
└── README.md          # 專案說明文件
```

## 開發與建置 / Development & Build

### 1. 安裝相依套件
```bash
npm install
```

### 2. 本機開發模式
```bash
npm run electron:start
```

### 3. 建置發行安裝檔（MSI / EXE）
```bash
npm run electron:build
```

## 授權 / License

MIT License
