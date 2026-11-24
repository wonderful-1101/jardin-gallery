# JARDIN Interactive Archive · GitHub Pages 互动壁纸典藏馆

纯静态零服务器版本，直接托管在 GitHub Pages，同事做好 `.html` 互动壁纸后无需配任何云账号即可直接发布上线：

- **在线画廊首页**：https://wonderful-1101.github.io/jardin-gallery/
- **浏览器拖拽发布**：https://wonderful-1101.github.io/jardin-gallery/upload.html
- **上传文档与规范**：https://wonderful-1101.github.io/jardin-gallery/docs.html
- **纯 Markdown（喂给 AI）**：https://wonderful-1101.github.io/jardin-gallery/docs.md

## 同伴怎么上传作品

1. 到 GitHub **Settings → Developer settings → Personal access tokens → Fine-grained tokens** 生成一个仅勾选 `jardin-gallery` 单仓库、`Contents: Read and write` 权限的 Token 发给同事。
2. 同事打开 [`upload.html`](https://wonderful-1101.github.io/jardin-gallery/upload.html) 填入该 Token（浏览器会自动记住），直接把做好的 `.html` 文件或网页文件夹拖进去，点「发布入藏」即可，约 30-60 秒后线上自动生效。
3. 习惯用命令行或 AI 编程工具，也可直接使用仓库里的零依赖脚本 `cli/jardin-push.mjs`。
