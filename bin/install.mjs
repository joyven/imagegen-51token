#!/usr/bin/env node

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const filesToInstall = ["SKILL.md", "README.md", "agents", "scripts"];

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const options = { target: path.join(os.homedir(), ".agents", "skills"), force: false };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--force") options.force = true;
    else if (flag === "--target") {
      options.target = argv[++index];
      if (!options.target) fail("--target 缺少目录参数。");
    } else fail(`不支持的参数：${flag}`);
  }
  return options;
}

async function copyEntry(source, destination, force) {
  const stat = await fs.stat(source);
  if (stat.isDirectory()) {
    await fs.mkdir(destination, { recursive: true });
    for (const entry of await fs.readdir(source)) {
      await copyEntry(path.join(source, entry), path.join(destination, entry), force);
    }
    return;
  }
  if (!force) {
    try {
      await fs.access(destination);
      return;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(source, destination);
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const destinationRoot = path.resolve(options.target, "imagegen-51token");
  if (!options.force) {
    try {
      await fs.access(destinationRoot);
      fail(`安装目录已存在：${destinationRoot}。使用 --force 覆盖文件。`);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }

  for (const entry of filesToInstall) {
    await copyEntry(path.join(packageRoot, entry), path.join(destinationRoot, entry), options.force);
  }
  console.log(`已安装 skill：${destinationRoot}`);
  console.log("提示：如需让 Codex 立即发现 skill，请重启 Codex 或刷新 skill 索引。");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`错误：${error?.message || String(error)}`);
    process.exitCode = 1;
  });
}
