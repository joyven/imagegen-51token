---
name: imagegen-51token
description: 使用 OPENAI_BASE_URL 和 OPENAI_API_KEY 调用 OpenAI 兼容的 Images API 生成位图。默认支持 gpt-image-2-c、gpt-image-2、gpt-image-2-all，失败时按顺序回退；支持 macOS、Linux 和 Windows。用户明确要求 51Token、中转站 Images API、gpt-image-2-c 或调用 imagegen-51token 时使用。
---

# 跨平台图像生成

这个 skill 使用 Node.js 原生 `fetch` 调用：

- Base URL：优先 `OPENAI_BASE_URL`，兼容 `W51TOKEN_BASE_URL`；缺省为 `https://51token.one/v1`
- Endpoint：`POST /images/generations`
- API key：优先 `OPENAI_API_KEY`，兼容 `W51TOKEN_API_KEY` 和 `GPT_IMAGE_TOKEN`
- 模型：`gpt-image-2-c`、`gpt-image-2`、`gpt-image-2-all`
- 平台：macOS、Linux、Windows

禁止打印、回显或写入 API key。不要把 token 放进命令参数、提示词、日志、截图或提交记录。

## 工作流

1. 如需组织复杂生图提示词，完整读取 `${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/SKILL.md`，但只采用其中的提示词、参考图和结果验证规范。
2. 首次联网前运行 `imagegen-51token check` 或 `node bin/imagegen-51token.mjs check`。
3. 将最终提示词写入 UTF-8 文本文件，包含用途、主体、风格、构图、精确文字、约束和禁用项。
4. 每张独立图片调用一次，不要用一次请求替代多个不同画面。
5. 成品保存到当前工作区的 `output/imagegen/`，不要覆盖已有文件，除非明确传入 `--force`。
6. 生成后检查主体、构图、中文文字、参考图一致性、禁用项和尺寸；失败时只针对具体问题迭代。

## 命令

推荐使用跨平台 CLI：

```text
imagegen-51token check
imagegen-51token generate --prompt-file ./prompt.txt --size 1152x1536 --quality high --out ./output/imagegen/result.png
```

没有全局安装时，可在仓库目录执行：

```text
node bin/imagegen-51token.mjs generate --prompt "一张技术教程信息图" --out ./output/imagegen/result.png
```

macOS/Linux 仍支持：

```bash
bash scripts/run_image_gen.sh generate --prompt-file ./prompt.txt --out ./output/imagegen/result.png
```

Windows PowerShell 支持：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run_image_gen.ps1 generate `
  --prompt-file .\prompt.txt `
  --out .\output\imagegen\result.png
```

常用参数：

- `--size`：例如 `1024x1024`、`1152x1536`；宽高建议使用 16 的倍数。
- `--quality`：按中转站支持的值传入，例如 `high`。
- `--model`：逗号分隔并自定义回退顺序，例如 `gpt-image-2,gpt-image-2-all`。
- `--response-format`：`url` 或 `b64_json`，默认 `url`。
- `--force`：允许覆盖已有输出文件。
- `--dry-run`：只显示解析后的请求，不联网；不会显示 API key。

## 配置环境变量

### macOS/Linux

当前终端已经有环境变量时会直接使用。也可以在 `~/.zshenv`、`~/.zshrc`、`~/.bashrc`、`~/.bash_profile` 或 `~/.profile` 中写入简单配置：

```bash
export OPENAI_BASE_URL="https://51token.one/v1"
export OPENAI_API_KEY="替换为你的密钥"
```

脚本只读取简单的赋值行，不执行 shell 配置文件。

### Windows PowerShell

临时设置：

```powershell
$env:OPENAI_BASE_URL = "https://51token.one/v1"
$env:OPENAI_API_KEY = "替换为你的密钥"
```

永久写入当前用户环境变量：

```powershell
[Environment]::SetEnvironmentVariable("OPENAI_BASE_URL", "https://51token.one/v1", "User")
[Environment]::SetEnvironmentVariable("OPENAI_API_KEY", "替换为你的密钥", "User")
```

设置后请重新打开终端，让新进程继承变量。Windows 也会读取 PowerShell profile 中形如 `$env:NAME = "value"` 的简单行，但不会执行 profile。

## 模型回退

默认顺序为：

1. `gpt-image-2-c`
2. `gpt-image-2`
3. `gpt-image-2-all`

请求失败、响应不是 JSON 或响应没有图片数据时才尝试下一个模型；成功后立即停止。下载图片失败会使当前模型失败并继续回退。

## 限制

- 当前实现只调用 `/images/generations`，不处理参考图编辑；需要编辑时应单独扩展 `/images/edits`。
- 只使用 Node.js 18+ 原生能力，不依赖 `openai` SDK。
- 不发送代理可能不识别的 OpenAI 专属字段；文件后缀由 `--out` 决定。
