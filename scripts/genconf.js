// Generate conf.toml with encrypted sudo password.
// Auto-run: reads $NUSER and $USER_PASSWORD, writes conf.toml next to project's coresetting.toml
// Manual: node genconf.js --project=/opt/share/prj/myapp --sudopwd=wkloh1234

const { readFileSync, writeFileSync } = require("fs");
const { join } = require("path");
const crypto = require("crypto");

// ── Argument parsing ──
const argv = {};
process.argv.forEach((arg) => {
  if (arg.includes("=")) {
    const [key, ...rest] = arg.split("=");
    argv[key.replace(/^--/, "")] = rest.join("=");
  }
});

// ── Auto-run mode: read from environment ──
const nuser = process.env.NUSER || process.env.USER_NAME || "sshadmin";
const userPwd = process.env.USER_PASSWORD;

const isAutoRun = !!userPwd;

if (isAutoRun && !argv.sudopwd) {
  argv.sudopwd = userPwd;
}

const project = argv.project;
const sudopwd = argv.sudopwd;
const output = argv.output;

if (!sudopwd) {
  console.error("Error: --sudopwd or $USER_PASSWORD is required");
  process.exit(1);
}

// ── Encryption config (hard-coded) ──
const algorithm = "aes-256-cbc";
const secretKey = Buffer.from("7a2b0184ba8d9bb1d4128bf8d2e377264183faf7f0e7a9f535d6e830f881f5af", "hex");
const iv = Buffer.from("0fbf5915a7658c12ab1bbf6d94c3830b", "hex");

// ── Encrypt password ──
const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
let encrypted = cipher.update(sudopwd, "utf8", "hex");
encrypted += cipher.final("hex");

// ── Determine output path ──
let outPath;
if (output) {
  outPath = output;
} else if (project) {
  outPath = join(project, "conf.toml");
} else {
  outPath = join(process.env.HOME || "/root", "conf.toml");
}

// ── Write conf.toml ──
const tomlString = `encryptpwd.iv = '${iv.toString("hex")}'
encryptpwd.encryptedData = '${encrypted}'
`;
writeFileSync(outPath, tomlString);
console.log(`conf.toml written to ${outPath}`);
