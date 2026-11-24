# JARDIN Gallery · 上传文档（GitHub Pages 版）

在线画廊：https://wonderful-1101.github.io/jardin-gallery/
仓库地址：https://github.com/wonderful-1101/jardin-gallery

> **同伴提交规范（单 HTML 最简单）**
> 1. **单个 `.html` 文件**：直接写好一个带动画与交互的 `.html` 即可上传，脚本/网页会自动将其设为 `index.html`。
> 2. **多文件网页工程**：如果附带了图片或外部 JS/CSS，请放在一个文件夹里，确保根目录有 `index.html`，且全部引用采用相对路径 `./`（Vite 设 `base: './'`）。
> 3. **协作 Token 获取**：在 GitHub → Settings → Developer settings → Fine-grained tokens 新建一个仅勾选 `wonderful-1101/jardin-gallery` 单仓库、权限设为 **Contents: Read and write** 的 Token。

---

## 方式一：网页直接拖入上传（零命令行）

打开 **https://wonderful-1101.github.io/jardin-gallery/upload.html**：
1. 填入仓库专用 Token（浏览器会自动记住）；
2. 把 `.html` 文件拖进去（或点按钮选整个网页文件夹），可选拖一张封面图；
3. 填作品 ID 和标题，点「提交发布至 GitHub」即可（约 30-60 秒后线上自动生效）。

---

## 方式二：零依赖 Node CLI 一键推送（Node 18+，无需 `npm install`）

### 1) 下载脚本
```bash
# macOS / Linux / Git Bash
curl -fsSL "https://wonderful-1101.github.io/jardin-gallery/cli/jardin-push.mjs" -o jardin-push.mjs

# Windows PowerShell
Invoke-WebRequest -Uri "https://wonderful-1101.github.io/jardin-gallery/cli/jardin-push.mjs" -OutFile jardin-push.mjs
```

### 2) 推送单个 `.html` 文件或整个文件夹
```bash
# 推单个 .html
node jardin-push.mjs ./my-artwork.html \
  --repo "wonderful-1101/jardin-gallery" \
  --token "你的GitHub_Token" \
  --id "aurora-drift" \
  --title "极光流影" \
  --author "同伴署名" \
  --tags "风景,鼠标互动" \
  --cover ./cover.jpg

# 或推整个网页目录（根目录需有 index.html）
node jardin-push.mjs ./dist \
  --repo "wonderful-1101/jardin-gallery" \
  --token "你的GitHub_Token" \
  --id "aurora-drift" \
  --title "极光流影"
```

提交后约 30-60 秒访问：
`https://wonderful-1101.github.io/jardin-gallery/play.html?id=<你的id>`
