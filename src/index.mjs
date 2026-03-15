import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const execFileAsync = promisify(execFile);
const WORKSPACE = '/home/adam/.openclaw/workspace';
const DEFAULT_OUTPUT_DIR = path.join(WORKSPACE, 'artifacts', 'mcp-screen-captures');
const SCREEN_CMD = 'screen-capture-ocr';
const WORD_CMD = '/mnt/c/Windows/System32/cmd.exe';
const POWERSHELL_CMD = '/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';
const TGC_URI = 'steam://rungameid/695290';

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function launchWindows(target) {
  await execFileAsync(WORD_CMD, ['/c', 'start', '', target], {
    cwd: 'C:\\Windows',
    windowsHide: true,
  });
}

async function pressEnterOnTgc2019() {
  const script = [
    "$wshell = New-Object -ComObject WScript.Shell",
    "$titles = @('The Golf Club', 'The Golf Club™ 2019', 'PGA TOUR')",
    "$activated = $false",
    "foreach ($title in $titles) { if ($wshell.AppActivate($title)) { $activated = $true; break } }",
    "Start-Sleep -Milliseconds 150",
    "$wshell.SendKeys('{ENTER}')",
    "if ($activated) { Write-Output 'ENTER_SENT_TO_TGC' } else { Write-Output 'ENTER_SENT_TO_ACTIVE_WINDOW' }",
  ].join('; ');

  const { stdout, stderr } = await execFileAsync(POWERSHELL_CMD, ['-NoProfile', '-Command', script], {
    cwd: 'C:\\Windows',
    windowsHide: true,
  });

  return { stdout, stderr };
}

async function runScreenCapture(args = {}) {
  const outputDir = args.outputDir || DEFAULT_OUTPUT_DIR;
  await ensureDir(outputDir);

  const cmdArgs = [
    '--output-dir', outputDir,
    '--capture-backend', args.captureBackend || 'auto',
  ];

  if (args.region) {
    cmdArgs.push('--region', String(args.region.x), String(args.region.y), String(args.region.width), String(args.region.height));
  }
  if (typeof args.psm === 'number') cmdArgs.push('--psm', String(args.psm));
  if (args.noOcr) cmdArgs.push('--no-ocr');
  for (const kw of args.keywords || []) cmdArgs.push('--keyword', kw);

  const { stdout, stderr } = await execFileAsync(SCREEN_CMD, cmdArgs, {
    cwd: WORKSPACE,
    maxBuffer: 2 * 1024 * 1024,
  });

  const match = stdout.match(/Saved analysis report to (.+)$/m);
  if (!match) {
    throw new Error(`Could not find report path in output. stdout=${stdout} stderr=${stderr}`);
  }

  const reportPath = match[1].trim();
  const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
  const text = await fs.readFile(report.ocr_text_file, 'utf8').catch(() => '');

  return { reportPath, report, text, stdout, stderr };
}

async function findLatestCapture(outputDir = DEFAULT_OUTPUT_DIR) {
  const entries = await fs.readdir(outputDir, { withFileTypes: true }).catch(() => []);
  const files = entries.filter((e) => e.isFile() && e.name.endsWith('.json'));
  if (files.length === 0) throw new Error(`No capture reports found in ${outputDir}`);

  let latest = null;
  for (const file of files) {
    const full = path.join(outputDir, file.name);
    const stat = await fs.stat(full);
    if (!latest || stat.mtimeMs > latest.mtimeMs) latest = { full, mtimeMs: stat.mtimeMs };
  }

  const report = JSON.parse(await fs.readFile(latest.full, 'utf8'));
  const text = await fs.readFile(report.ocr_text_file, 'utf8').catch(() => '');
  return { reportPath: latest.full, report, text };
}

function summarizeCapture(report, text) {
  const lines = report?.metrics?.top_text_lines || [];
  const snippet = (text || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean).slice(0, 8).join('\n');
  return {
    screenSize: `${report?.metrics?.width || '?'}x${report?.metrics?.height || '?'}`,
    topTextLines: lines,
    snippet,
    rawImage: report?.raw_image,
    ocrImage: report?.ocr_image,
    textFile: report?.ocr_text_file,
  };
}

const server = new McpServer({
  name: 'tgc-screen-mcp',
  version: '1.0.0',
});

server.tool(
  'capture_screen',
  'Capture the Windows screen with OCR and return the latest recognized text plus artifact paths.',
  {
    outputDir: z.string().optional(),
    captureBackend: z.enum(['auto', 'windows', 'mss', 'pillow']).optional(),
    psm: z.number().int().positive().optional(),
    noOcr: z.boolean().optional(),
    keywords: z.array(z.string()).optional(),
    region: z.object({
      x: z.number().int(),
      y: z.number().int(),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    }).optional(),
  },
  async (args) => {
    try {
      const { reportPath, report, text } = await runScreenCapture(args);
      const summary = summarizeCapture(report, text);
      return {
        content: [{ type: 'text', text: JSON.stringify({ reportPath, ...summary }, null, 2) }],
      };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }
  }
);

server.tool(
  'get_last_capture',
  'Read the most recent OCR capture report and return the recognized text and artifact paths.',
  {
    outputDir: z.string().optional(),
  },
  async (args) => {
    try {
      const { reportPath, report, text } = await findLatestCapture(args.outputDir || DEFAULT_OUTPUT_DIR);
      const summary = summarizeCapture(report, text);
      return {
        content: [{ type: 'text', text: JSON.stringify({ reportPath, ...summary }, null, 2) }],
      };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }
  }
);

server.tool(
  'launch_tgc_2019',
  'Launch The Golf Club 2019 through Steam on Windows.',
  {},
  async () => {
    try {
      await launchWindows(TGC_URI);
      return { content: [{ type: 'text', text: 'Launched The Golf Club 2019 via Steam.' }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }
  }
);

server.tool(
  'open_word',
  'Open Microsoft Word on Windows.',
  {},
  async () => {
    try {
      await launchWindows('winword');
      return { content: [{ type: 'text', text: 'Opened Microsoft Word.' }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }
  }
);

server.tool(
  'press_enter_tgc_2019',
  'Attempt to activate The Golf Club 2019 window and simulate pressing Enter.',
  {},
  async () => {
    try {
      const result = await pressEnterOnTgc2019();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }
  }
);

server.tool(
  'screen_tool_status',
  'Check whether the screen OCR command and Windows launch helpers are available.',
  {},
  async () => {
    const exists = async (p) => {
      try { await fs.access(p); return true; } catch { return false; }
    };
    const status = {
      screenCaptureOcrCommand: SCREEN_CMD,
      powershellExists: await exists(POWERSHELL_CMD),
      cmdExists: await exists(WORD_CMD),
      enterToolAvailable: true,
      defaultOutputDir: DEFAULT_OUTPUT_DIR,
    };
    return { content: [{ type: 'text', text: JSON.stringify(status, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('tgc-screen-mcp started');
