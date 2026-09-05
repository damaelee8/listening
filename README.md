# listening — 听见 · TOEFL Listening Lab

一个面向个人使用的托福听力精听网页应用。导入音频后，本地 Whisper 服务会自动转写、断句并生成时间戳，网页端提供单句循环、听写对照、错误标签、错句复习和训练统计。

## 功能

- 导入 MP3、WAV、M4A 等常见音频
- 使用 `faster-whisper` 在本机转写英文并生成词级时间戳
- 按标点、停顿和长度自动断句
- 单句播放、循环、重播和倍速
- 单词级听写差异高亮
- 错误标签与错句复习
- 浏览器本地保存练习记录和统计

## 启动

项目默认使用 Codex 桌面自带的 Node.js 和 Python 运行时。在 PowerShell 中运行：

```powershell
.\start.ps1 -Install
```

首次运行会安装依赖，并在首次转写时下载 `medium.en` 模型。之后可使用：

```powershell
.\start.ps1
```

网页地址为 `http://localhost:3000`，本地转写服务为 `http://127.0.0.1:8765`。

## 转写配置

可以在启动前设置以下环境变量：

- `WHISPER_MODEL`：默认 `medium.en`，内存较小可使用 `small.en`
- `WHISPER_DEVICE`：默认 `auto`
- `WHISPER_COMPUTE_TYPE`：默认 `int8`

音频只发送到本机的转写服务，不会上传到项目服务器。
