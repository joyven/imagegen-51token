param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]] $Arguments
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$NodeScript = Join-Path $ScriptDir "images_image_gen.mjs"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "需要安装 Node.js 18 或更高版本。"
  exit 1
}

& node $NodeScript @Arguments
exit $LASTEXITCODE
