import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SELF_PATH = "script/security-check.mjs";

const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
]);

const CONTENT_SCAN_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".yml",
  ".yaml",
  ".sh",
  ".bash",
  ".zsh",
  ".ps1",
]);

const CONTENT_SCAN_BASENAMES = new Set(["Dockerfile"]);

const SUSPICIOUS_PATTERNS = [
  {
    id: "dynamic-eval",
    reason: "dynamic code execution",
    regex: /\beval\s*\(/,
  },
  {
    id: "dynamic-function",
    reason: "runtime function construction",
    regex: /\bnew\s+Function\s*\(/,
  },
  {
    id: "node-vm-module",
    reason: "VM sandbox execution surface",
    regex: /\bfrom\s+["']node:vm["']|\bfrom\s+["']vm["']|\brequire\s*\(\s*["']node:vm["']\s*\)|\brequire\s*\(\s*["']vm["']\s*\)/,
  },
  {
    id: "child-process-module",
    reason: "OS command execution surface",
    regex: /\bfrom\s+["']node:child_process["']|\bfrom\s+["']child_process["']|\brequire\s*\(\s*["']node:child_process["']\s*\)|\brequire\s*\(\s*["']child_process["']\s*\)/,
  },
  {
    id: "child-process-call",
    reason: "direct process execution call",
    regex: /\b(exec|execSync|execFile|execFileSync|spawn|spawnSync|fork)\s*\(/,
  },
  {
    id: "remote-dynamic-import",
    reason: "remote module loading",
    regex: /\b(import|require)\s*\(\s*["']https?:\/\//,
  },
  {
    id: "pipe-to-shell",
    reason: "remote download piped to shell",
    regex: /\b(curl|wget)\b[^\n|]*\|\s*(sh|bash)\b/,
  },
  {
    id: "raw-tcp-shell",
    reason: "raw shell transport primitive",
    regex: /\/dev\/tcp|mkfifo/,
  },
];

async function walkFiles(dir) {
  const absDir = path.join(ROOT, dir);
  const entries = await readdir(absDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const rel = dir ? path.join(dir, entry.name) : entry.name;
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) {
        continue;
      }
      files.push(...(await walkFiles(rel)));
      continue;
    }
    if (entry.isFile()) {
      files.push(rel);
    }
  }

  return files;
}

function shouldScanContent(relPath) {
  if (relPath === SELF_PATH) {
    return false;
  }

  const ext = path.extname(relPath);
  if (CONTENT_SCAN_EXTENSIONS.has(ext)) {
    return true;
  }

  return CONTENT_SCAN_BASENAMES.has(path.basename(relPath));
}

async function checkSuspiciousContent(files, findings) {
  for (const relPath of files) {
    if (!shouldScanContent(relPath)) {
      continue;
    }

    const absPath = path.join(ROOT, relPath);
    const content = await readFile(absPath, "utf8");
    const lines = content.split("\n");

    for (const pattern of SUSPICIOUS_PATTERNS) {
      const match = content.match(pattern.regex);
      if (!match) {
        continue;
      }

      const upToMatch = content.slice(0, match.index ?? 0);
      const line = upToMatch.split("\n").length;
      const snippet = lines[line - 1]?.trim() ?? "";
      findings.push({
        type: "pattern",
        id: pattern.id,
        reason: pattern.reason,
        file: relPath,
        line,
        snippet,
      });
    }
  }
}

async function checkLifecycleScripts(findings) {
  const packageJsonPath = path.join(ROOT, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const scripts = packageJson.scripts || {};

  const lifecycleNames = new Set([
    "preinstall",
    "install",
    "postinstall",
    "prepare",
    "prepublish",
    "postpublish",
    "preuninstall",
    "uninstall",
    "postuninstall",
  ]);

  for (const scriptName of Object.keys(scripts)) {
    if (!lifecycleNames.has(scriptName)) {
      continue;
    }
    findings.push({
      type: "lifecycle-script",
      file: "package.json",
      detail: `Found disallowed npm lifecycle script: "${scriptName}"`,
    });
  }
}

async function checkLockfileDomains(findings) {
  const lockfilePath = path.join(ROOT, "package-lock.json");
  const lockContent = await readFile(lockfilePath, "utf8");

  const resolvedRegex = /"resolved"\s*:\s*"https?:\/\/([^/"]+)/g;
  const domains = new Set();
  let match;
  while ((match = resolvedRegex.exec(lockContent)) !== null) {
    domains.add(match[1]);
  }

  const allowedDomains = new Set(["registry.npmjs.org"]);
  for (const domain of domains) {
    if (allowedDomains.has(domain)) {
      continue;
    }
    findings.push({
      type: "lockfile-domain",
      file: "package-lock.json",
      detail: `Found non-allowlisted registry domain: "${domain}"`,
    });
  }
}

function printFindings(findings) {
  console.error("Security check failed. Findings:");
  for (const finding of findings) {
    if (finding.type === "pattern") {
      console.error(
        `- [${finding.id}] ${finding.file}:${finding.line} (${finding.reason})`,
      );
      if (finding.snippet) {
        console.error(`  ${finding.snippet}`);
      }
      continue;
    }
    console.error(`- [${finding.type}] ${finding.file}: ${finding.detail}`);
  }
}

async function main() {
  const findings = [];
  const files = (await walkFiles("")).sort((a, b) => a.localeCompare(b));

  await checkSuspiciousContent(files, findings);
  await checkLifecycleScripts(findings);
  await checkLockfileDomains(findings);

  if (findings.length > 0) {
    printFindings(findings);
    process.exitCode = 1;
    return;
  }

  console.log("Security check passed.");
}

main().catch((err) => {
  console.error("Security check failed unexpectedly.");
  console.error(err);
  process.exit(1);
});
