import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import path from "node:path";

const execFileAsync = promisify(execFile);

export const WORKSPACE = "/home/adam/.openclaw/workspace";
export const CAPTURE_DIR = path.join(WORKSPACE, "artifacts", "screen-mcp");

export async function ensureCaptureDir() {
  await fs.mkdir(CAPTURE_DIR, { recursive: true });
}

export async function runCommand(command: string, args: string[] = []) {
  return await execFileAsync(command, args, {
    cwd: WORKSPACE,
    maxBuffer: 10 * 1024 * 1024,
    shell: false,
  });
}

export async function latestCaptureReport(): Promise<string | null> {
  await ensureCaptureDir();
  const entries = await fs.readdir(CAPTURE_DIR);
  const jsons = entries.filter((name) => name.endsWith(".json")).sort().reverse();
  return jsons.length ? path.join(CAPTURE_DIR, jsons[0]) : null;
}

export async function readJson(filePath: string) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

export async function launchTgc2019() {
  await runCommand("/mnt/c/Windows/System32/cmd.exe", ["/c", "start", "", "steam://rungameid/695290"]);
}

export async function pressEnterOnTgc2019() {
  const script = [
    "$wshell = New-Object -ComObject WScript.Shell",
    "$titles = @('The Golf Club', 'The Golf Club™ 2019', 'PGA TOUR')",
    "$activated = $false",
    "foreach ($title in $titles) { if ($wshell.AppActivate($title)) { $activated = $true; break } }",
    "Start-Sleep -Milliseconds 150",
    "$wshell.SendKeys('{ENTER}')",
    "if ($activated) { Write-Output 'ENTER_SENT_TO_TGC' } else { Write-Output 'ENTER_SENT_TO_ACTIVE_WINDOW' }",
  ].join('; ');

  return await runCommand("/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe", [
    "-NoProfile",
    "-Command",
    script,
  ]);
}
