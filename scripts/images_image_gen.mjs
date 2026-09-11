#!/usr/bin/env node

// OpenAI-compatible Images API client. It intentionally uses only Node.js built-ins.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const VALID_MODELS = ["gpt-image-2-c", "gpt-image-2", "gpt-image-2-all"];
const DEFAULT_MODEL_ORDER = [...VALID_MODELS];
const ENV_NAMES = {
  baseUrl: ["OPENAI_BASE_URL", "51TOKEN_BASE_URL"],
  apiKey: ["OPENAI_API_KEY", "51TOKEN_API_KEY", "GPT_IMAGE_TOKEN"],
};

export function fail(message) {
  throw new Error(message);
}

function firstNonEmpty(...values) {
  return values.find((value) => typeof value === "string" && value.trim())?.trim() || "";
}

function parseEnvFile(text) {
  const values = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    const powershellMatch = line.match(/^\$env:([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/i);
    const parsed = match || powershellMatch;
    if (!parsed) continue;
    let value = parsed[2].trim();
    if (value.includes(" #")) value = value.split(" #", 1)[0].trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[parsed[1].toUpperCase()] = value;
  }
  return values;
}

function configCandidates() {
  const home = os.homedir();
  const candidates = [
    path.join(home, ".zshenv"),
    path.join(home, ".zshrc"),
    path.join(home, ".bashrc"),
    path.join(home, ".bash_profile"),
    path.join(home, ".profile"),
  ];
  if (process.platform === "win32") {
    const documents = process.env.USERPROFILE
      ? path.join(process.env.USERPROFILE, "Documents")
      : path.join(home, "Documents");
    candidates.push(
      path.join(documents, "PowerShell", "profile.ps1"),
      path.join(documents, "WindowsPowerShell", "profile.ps1"),
    );
  }
  return candidates;
}

async function loadConfigFileValues() {
  const values = {};
  for (const candidate of configCandidates()) {
    try {
      const parsed = parseEnvFile(await fs.readFile(candidate, "utf8"));
      for (const [name, value] of Object.entries(parsed)) {
        if (!values[name] && value) values[name] = value;
      }
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return values;
}

export async function resolveConfig() {
  const fileValues = await loadConfigFileValues();
  const env = process.env;
  const baseUrl = firstNonEmpty(
    ...ENV_NAMES.baseUrl.map((name) => env[name]),
    ...ENV_NAMES.baseUrl.map((name) => fileValues[name]),
    "https://51token.one/v1",
  ).replace(/\/+$/, "");
  const apiKey = firstNonEmpty(
    ...ENV_NAMES.apiKey.map((name) => env[name]),
    ...ENV_NAMES.apiKey.map((name) => fileValues[name]),
  );
  return { baseUrl, apiKey };
}

function takeValue(args, flag) {
  const value = args.shift();
  if (!value || value.startsWith("--")) fail(`${flag} 缺少参数值。`);
  return value;
}

export function parseArgs(argv) {
  const args = [...argv];
  const first = args[0];
  if (first === "--check" || first === "check") {
    args.shift();
    return { command: "check", dryRun: false };
  }
  if (first === "generate") args.shift();
  const options = {
    command: "generate",
    responseFormat: "url",
    force: false,
    dryRun: false,
    images: [],
    models: null,
  };
  while (args.length) {
    const flag = args.shift();
    switch (flag) {
      case "--prompt": options.prompt = takeValue(args, flag); break;
      case "--prompt-file": options.promptFile = takeValue(args, flag); break;
      case "--image": options.images.push(takeValue(args, flag)); break;
      case "--out": options.out = takeValue(args, flag); break;
      case "--size": options.size = takeValue(args, flag); break;
      case "--quality": options.quality = takeValue(args, flag); break;
      case "--response-format": options.responseFormat = takeValue(args, flag); break;
      case "--model": {
        const requested = takeValue(args, flag).split(",").map((item) => item.trim()).filter(Boolean);
        for (const model of requested) {
          if (!VALID_MODELS.includes(model)) fail(`不支持的模型：${model}。可选：${VALID_MODELS.join(", ")}`);
        }
        options.models = requested;
        break;
      }
      case "--force": options.force = true; break;
      case "--dry-run": options.dryRun = true; break;
      case "-h":
      case "--help": options.help = true; break;
      default: fail(`不支持的参数：${flag}`);
    }
  }
  if (options.help) return options;
  if (options.prompt && options.promptFile) fail("--prompt 和 --prompt-file 只能使用一个。");
  if (!options.prompt && !options.promptFile) fail("必须提供 --prompt 或 --prompt-file。");
  if (!options.dryRun && !options.out) fail("必须提供 --out。");
  if (options.images.length) fail("当前接口不支持参考图编辑，请改用 /v1/images/edits。");
  return options;
}

export async function readPrompt(options) {
  const prompt = options.promptFile
    ? (await fs.readFile(path.resolve(options.promptFile), "utf8")).trim()
    : options.prompt.trim();
  if (!prompt) fail("提示词不能为空。");
  const requirements = [];
  if (options.size) requirements.push(`Output canvas size: ${options.size} (must be 16-aligned).`);
  if (options.quality) requirements.push(`Render quality: ${options.quality}.`);
  requirements.push("Return the generated image directly in the response.");
  return `${prompt}\n\nExecution requirements:\n${requirements.join("\n")}`;
}

async function callModel(baseUrl, apiKey, model, prompt, options) {
  const body = { model, prompt, n: 1, response_format: options.responseFormat };
  if (options.size) body.size = options.size;
  if (options.quality) body.quality = options.quality;
  const response = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, ok: response.ok, text: await response.text() };
}

function parseImageFromResponse(json) {
  const item = Array.isArray(json?.data) ? json.data[0] : json?.data;
  if (!item) return null;
  if (typeof item.url === "string") return { kind: "url", value: item.url };
  if (typeof item.b64_json === "string") return { kind: "base64", value: item.b64_json, mime: "image/png" };
  return null;
}

async function downloadImage(url, apiKey) {
  let response = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!response.ok) response = await fetch(url);
  if (!response.ok) fail(`下载生成图片失败：HTTP ${response.status}。`);
  return { bytes: Buffer.from(await response.arrayBuffer()), mime: response.headers.get("content-type") || "application/octet-stream" };
}

async function writeResult(candidate, out, apiKey, force) {
  const target = path.resolve(out);
  if (!force) {
    try {
      await fs.access(target);
      fail(`输出文件已存在：${target}。使用 --force 才能覆盖。`);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  const result = candidate.kind === "base64"
    ? { bytes: Buffer.from(candidate.value, "base64"), mime: candidate.mime }
    : await downloadImage(candidate.value, apiKey);
  if (result.bytes.length < 1024) fail("返回的图片数据异常小，拒绝写入。");
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, result.bytes);
  console.log(`已写入 ${target}`);
  console.log(`响应图片类型：${result.mime}，字节数 ${result.bytes.length}`);
}

function redact(text, apiKey) {
  let safe = String(text);
  if (apiKey) safe = safe.split(apiKey).join("[REDACTED]");
  return safe.replace(/(Bearer\s+)[^\s"']+/gi, "$1[REDACTED]");
}

function truncate(text, apiKey, max = 240) {
  const oneLine = redact(text, apiKey).replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}...` : oneLine;
}

async function assertOutputAvailable(out, force) {
  if (force) return;
  try {
    await fs.access(path.resolve(out));
    fail(`输出文件已存在：${path.resolve(out)}。使用 --force 才能覆盖。`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log("用法：imagegen-51token generate --prompt-file <file> --out <file> [--size 1152x1536] [--quality high]");
    return;
  }
  const { baseUrl, apiKey } = await resolveConfig();
  if (options.command === "check") {
    const nodeMajor = Number(process.versions.node.split(".")[0]);
    if (nodeMajor < 18) fail("需要 Node.js 18 或更高版本。");
    if (!apiKey) fail("未找到 OPENAI_API_KEY / 51TOKEN_API_KEY / GPT_IMAGE_TOKEN。");
    console.log("检查通过：Node.js 18+、Base URL 和 API key 均已就绪。");
    console.log(`Base URL：${baseUrl}`);
    console.log(`模型回退顺序：${DEFAULT_MODEL_ORDER.join(" → ")}`);
    return;
  }
  const prompt = await readPrompt(options);
  const models = options.models || DEFAULT_MODEL_ORDER;
  if (options.dryRun) {
    console.log(JSON.stringify({ baseUrl, endpoint: "/images/generations", models, out: options.out || null, prompt }, null, 2));
    return;
  }
  if (!apiKey) fail("未找到 OPENAI_API_KEY / 51TOKEN_API_KEY / GPT_IMAGE_TOKEN。");
  await assertOutputAvailable(options.out, options.force);
  console.error(`Base URL：${baseUrl}`);
  console.error(`模型顺序：${models.join(" → ")}`);
  const attempts = [];
  for (const model of models) {
    console.error(`[${model}] 发送请求...`);
    try {
      const result = await callModel(baseUrl, apiKey, model, prompt, options);
      if (!result.ok) {
        const error = `HTTP ${result.status}: ${truncate(result.text, apiKey)}`;
        console.error(`[${model}] 失败：${error}`);
        attempts.push({ model, error });
        continue;
      }
      let json;
      try { json = JSON.parse(result.text); } catch { json = null; }
      const candidate = parseImageFromResponse(json);
      if (!candidate) {
        const error = `响应中无图片数据：${truncate(result.text, apiKey)}`;
        console.error(`[${model}] 失败：${error}`);
        attempts.push({ model, error });
        continue;
      }
      await writeResult(candidate, options.out, apiKey, options.force);
      console.error(`[${model}] 完成。`);
      return;
    } catch (error) {
      const message = error?.message || String(error);
      console.error(`[${model}] 异常：${message}`);
      attempts.push({ model, error: message });
    }
  }
  fail(`所有模型均失败（共 ${attempts.length} 次尝试）：\n${attempts.map((item) => `  - ${item.model}: ${item.error}`).join("\n")}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`错误：${error?.message || String(error)}`);
    process.exitCode = 1;
  });
}
