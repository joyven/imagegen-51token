# imagegen-51token

一个可安装到 Codex skill 目录的跨平台图像生成 skill，同时提供 `npx` CLI。它通过 OpenAI 兼容的 `POST /images/generations` 接口生成图片，默认支持：

`gpt-image-2-c` -> `gpt-image-2` -> `gpt-image-2-all`

支持 macOS、Linux、Windows，运行时只需要 Node.js 18 或更高版本，不需要提交或安装 `openai` SDK。

## 安装 skill

从 GitHub 直接使用 `npx`：

```bash
npx github:joyven/imagegen-51token install
```

默认安装到：

```text
~/.agents/skills/imagegen-51token
```

Windows PowerShell 中同样使用这条命令，Node.js 会按当前用户目录解析默认路径。也可以指定 skill 根目录：

```bash
npx github:joyven/imagegen-51token install --target ~/.codex/skills
```

PowerShell 指定目录时建议使用 `$HOME` 或 `$env:USERPROFILE`：

```powershell
npx github:joyven/imagegen-51token install --target "$HOME/.codex/skills"
```

安装器使用 Node.js 文件 API，不依赖 `cp`、`ln`、`rm` 或 Bash，因此适用于 Windows、macOS 和 Linux。目标目录已存在时，添加 `--force` 覆盖同名文件：

```text
npx github:joyven/imagegen-51token install --force
```

GitHub 仓库发布后，如果将这个包发布到 npm，也可以使用更短的形式：

```text
npx imagegen-51token install
```

当前仓库只负责 GitHub 代码托管和 GitHub `npx` 安装路径，不会在未确认的情况下替用户执行 `npm publish`。

## 配置

推荐使用以下变量：

```text
OPENAI_BASE_URL=https://51token.one/v1
OPENAI_API_KEY=替换为你的密钥
```

macOS/Linux 可以将它们写到 `~/.zshenv`、`~/.zshrc`、`~/.bashrc`、`~/.bash_profile` 或 `~/.profile`。Windows 推荐在 PowerShell 中设置：

```powershell
$env:OPENAI_BASE_URL = "https://51token.one/v1"
$env:OPENAI_API_KEY = "替换为你的密钥"
```

永久保存为当前用户变量：

```powershell
[Environment]::SetEnvironmentVariable("OPENAI_BASE_URL", "https://51token.one/v1", "User")
[Environment]::SetEnvironmentVariable("OPENAI_API_KEY", "替换为你的密钥", "User")
```

兼容旧变量 `51TOKEN_BASE_URL`、`51TOKEN_API_KEY` 和 `GPT_IMAGE_TOKEN`，但新项目应使用 `OPENAI_*`。程序只读取配置文件中的简单赋值行，不会执行 shell 或 PowerShell profile。

## 使用 CLI

检查配置：

```text
imagegen-51token check
```

生成图片：

```text
imagegen-51token generate --prompt-file ./prompt.txt --size 1152x1536 --quality high --out ./output/imagegen/result.png
```

Windows PowerShell 可以将参数写在一行，或使用反引号换行：

```powershell
imagegen-51token generate `
  --prompt-file .\prompt.txt `
  --size 1152x1536 `
  --quality high `
  --out .\output\imagegen\result.png
```

不想安装全局命令时，可以直接运行包内入口：

```text
node bin/imagegen-51token.mjs generate --prompt "一张技术教程信息图" --out ./output/imagegen/result.png
```

`--dry-run` 可检查参数而不联网：

```text
imagegen-51token generate --prompt "测试" --out ./result.png --dry-run
```

## 目录结构

```text
SKILL.md                         Codex skill 说明
agents/openai.yaml               skill 展示信息
bin/imagegen-51token.mjs        跨平台 CLI
bin/install.mjs                  npx skill 安装器
scripts/images_image_gen.mjs    Images API 核心实现
scripts/run_image_gen.sh        macOS/Linux 薄包装
scripts/run_image_gen.ps1       Windows PowerShell 薄包装
```

## node_modules 要不要提交？

不要提交。这个项目现在只用 Node.js 内置模块和原生 `fetch`，运行时没有第三方依赖，因此仓库中不需要 `node_modules`，也不需要 `package-lock.json`。`.gitignore` 已明确排除 `node_modules/`。

如果将来确实增加第三方依赖，只提交 `package.json` 和 `package-lock.json`，让 `npm install` 或 npm/npx 安装过程自动生成 `node_modules`，不要把依赖目录推送到 GitHub。

## 安全提醒

- 不要把 API key 写进 Git、README、提示词、截图或命令历史。
- 不要在公开 issue 或日志中粘贴完整的 Authorization header。
- 如果密钥曾经被公开粘贴，应立即在服务商后台撤销并重新生成。

## License

MIT
