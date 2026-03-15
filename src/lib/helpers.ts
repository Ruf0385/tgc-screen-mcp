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

/**
 * Send one or more keystrokes to TGC 2019 via PowerShell SendKeys.
 * Activates the TGC window first, then sends each key in sequence.
 */
export async function sendKeysToTgc(keys: string[], delayMs: number = 150): Promise<{ stdout: string; stderr: string; activated: boolean }> {
  const sendLines = keys.map((k) => `$wshell.SendKeys('${k}')`);
  const delayLine = delayMs > 0 ? `Start-Sleep -Milliseconds ${delayMs}` : "";

  const script = [
    "$wshell = New-Object -ComObject WScript.Shell",
    "$titles = @('The Golf Club', 'The Golf Club™ 2019', 'PGA TOUR')",
    "$activated = $false",
    "foreach ($title in $titles) { if ($wshell.AppActivate($title)) { $activated = $true; break } }",
    delayLine,
    ...sendLines,
    "if ($activated) { Write-Output 'KEYS_SENT_TO_TGC' } else { Write-Output 'KEYS_SENT_TO_ACTIVE_WINDOW' }",
  ].filter(Boolean).join('; ');

  const { stdout, stderr } = await runCommand(
    "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe",
    ["-NoProfile", "-Command", script]
  );

  return {
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    activated: stdout.includes("KEYS_SENT_TO_TGC"),
  };
}

/**
 * Check if TGC 2019 is currently running.
 */
export async function isTgcRunning(): Promise<boolean> {
  try {
    const { stdout } = await runCommand(
      "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe",
      ["-NoProfile", "-Command", "Get-Process -Name 'TGC2019' -ErrorAction SilentlyContinue | Select-Object -First 1 Id | ConvertTo-Json"]
    );
    return stdout.trim().length > 0 && stdout.trim() !== "null";
  } catch {
    return false;
  }
}

/** Map of club names to their keyboard shortcut */
export const CLUB_KEYS: Record<string, string> = {
  driver: "{`}",
  "3wood": "1", "3-wood": "1", "3w": "1",
  "5wood": "2", "5-wood": "2", "5w": "2",
  "3iron": "3", "3-iron": "3", "3i": "3",
  "4iron": "4", "4-iron": "4", "4i": "4",
  "5iron": "5", "5-iron": "5", "5i": "5",
  "6iron": "6", "6-iron": "6", "6i": "6",
  "7iron": "7", "7-iron": "7", "7i": "7",
  "8iron": "8", "8-iron": "8", "8i": "8",
  "9iron": "9", "9-iron": "9", "9i": "9",
  pw: "0", "pitching wedge": "0", "pitching-wedge": "0",
  sw: "{-}", "sand wedge": "{-}", "sand-wedge": "{-}",
  lw: "{=}", "lob wedge": "{=}", "lob-wedge": "{=}",
  putter: "p", putt: "p",
};

/** Map of camera mode names to keys */
export const CAMERA_KEYS: Record<string, string> = {
  scout: "q",
  green: "e", "green overhead": "e", overhead: "e", aerial: "e",
  flyover: "h", "hole flyover": "h",
  cycle: "v", view: "v", perspective: "v",
};

/** Map of overlay toggle names to keys */
export const OVERLAY_KEYS: Record<string, string> = {
  "green grid": "g", "green-grid": "g", grid: "g",
  "lie grid": "l", "lie-grid": "l", lie: "l",
  flag: "f", pin: "f",
  "shot data": "i", "shot-data": "i", data: "i", info: "i",
};

/** Map of game actions to keys */
export const ACTION_KEYS: Record<string, string> = {
  pause: "{ESC}", menu: "{ESC}", escape: "{ESC}",
  advance: "{ENTER}", next: "{ENTER}", "next hole": "{ENTER}", enter: "{ENTER}",
  rewind: "r", mulligan: "r", redo: "r",
  "change shot": "c", "shot type": "c", chip: "c", flop: "c", punch: "c",
  windowed: "%{ENTER}", "toggle windowed": "%{ENTER}",
};

/** Map of aim/move directions to keys */
export const DIRECTION_KEYS: Record<string, string> = {
  left: "{LEFT}",
  right: "{RIGHT}",
  forward: "w", up: "w",
  backward: "s", back: "s", down: "s",
};
