# Zhcw Listening and Speaking Lab

这是 Zhcw 的听说综合网页课程项目，目前包含 Lesson 1 至 Lesson 7。Lesson 2 至 Lesson 7 支持生成并下载 PNG 学习打卡图。

## 本地预览

在项目根目录运行：

```bash
python3 -m http.server 8000
```

然后在浏览器打开 `http://127.0.0.1:8000/`。

## GitHub Pages 发布步骤

1. 在 GitHub 新建一个空仓库，例如 `zhcw-listening-speaking-lab`。
2. 不要勾选自动添加 README、许可证或 `.gitignore`。
3. 把本项目根目录中的全部文件和 lesson 文件夹上传到仓库根目录。
4. 打开仓库的 `Settings`。
5. 在左侧选择 `Pages`。
6. 在 `Build and deployment` 中将 `Source` 设为 `Deploy from a branch`。
7. Branch 选择 `main`，目录选择 `/ (root)`，点击 `Save`。
8. 等待 GitHub 显示站点地址，再打开首页并逐课检查音频和麦克风权限。

## 数据与权限

- 学习记录保存在浏览器本地，不会自动同步到其他设备。
- 录音保存在浏览器 IndexedDB 中，不会自动上传到 GitHub。
- GitHub Pages 使用 HTTPS，浏览器通常可以记住麦克风权限。
- 公开仓库和普通 GitHub Pages 链接可能被任何拿到链接的人访问。真题音频是否适合公开发布，请在上传前确认使用权限。
