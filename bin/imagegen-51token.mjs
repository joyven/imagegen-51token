#!/usr/bin/env node

import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import process from "node:process";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function printHelp() {
  console.log(`imagegen-51token\n\n用法：\n  imagegen-51token check\n  imagegen-51token generate --prompt-file <file> --out <file> [选项]\n  imagegen-51token install [--target <skills目录>] [--force]\n\n选项：\n  --prompt <text>              直接传入提示词\n  --prompt-file <file>         从 UTF-8 文件读取提示词\n  --out <file>                 保存生成的图片\n  --size <width>x<height>      图片尺寸\n  --quality <value>            图片质量\n  --model <a,b,c>              模型和回退顺序\n  --response-format <value>    url 或 b64_json\n  --force                      允许覆盖已有输出或安装目录\n  --dry-run                    只打印解析后的请求，不联网\n  -h, --help                   显示帮助\n\n默认模型回退顺序：gpt-image-2-c -> gpt-image-2 -> gpt-image-2-all`);
}

function runNodeScript(script, args) {
  return import(pathToFileURL(script).href).then(({ main }) => main(args));
}

try {
  const [command, ...args] = process.argv.slice(2);
  if (command === "-h" || command === "--help" || !command) {
    printHelp();
  } else if (command === "check") {
    await runNodeScript(path.join(packageRoot, "scripts", "images_image_gen.mjs"), ["--check", ...args]);
  } else if (command === "generate") {
    await runNodeScript(path.join(packageRoot, "scripts", "images_image_gen.mjs"), ["generate", ...args]);
  } else if (command === "install") {
    await runNodeScript(path.join(packageRoot, "bin", "install.mjs"), args);
  } else {
    console.error(`未知命令：${command}`);
    printHelp();
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`错误：${error?.message || String(error)}`);
  process.exitCode = 1;
}
