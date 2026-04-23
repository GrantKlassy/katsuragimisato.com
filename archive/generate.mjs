import {
  readdirSync,
  statSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  rmSync,
} from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS = resolve(HERE, "..", "assets");
const OUT = resolve(HERE, "dist");
const HOST = "files.katsuragimisato.com";
const SERVER_SIGNATURE = `Apache/2.4.58 (Fedora) Server at ${HOST} Port 443`;
const NAME_WIDTH = 40;

const IMG_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif"]);
const VID_EXT = new Set([".mp4", ".webm", ".mov", ".mkv"]);
const TXT_EXT = new Set([".meta", ".txt", ".md", ".nfo"]);

function iconFor(name) {
  const dot = name.lastIndexOf(".");
  const ext = dot < 0 ? "" : name.slice(dot).toLowerCase();
  if (IMG_EXT.has(ext)) return "[IMG]";
  if (VID_EXT.has(ext)) return "[VID]";
  if (TXT_EXT.has(ext)) return "[TXT]";
  return "[   ]";
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}M`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)}G`;
}

function formatMtime(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function padVisible(name, width) {
  return name.length >= width ? " " : " ".repeat(width - name.length);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const entries = readdirSync(ASSETS)
  .map((name) => {
    const stat = statSync(join(ASSETS, name));
    return { name, size: stat.size, mtime: stat.mtime };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

for (const e of entries) {
  copyFileSync(join(ASSETS, e.name), join(OUT, e.name));
}

const rows = entries
  .map((e) => {
    const icon = iconFor(e.name);
    const namePad = padVisible(e.name, NAME_WIDTH);
    const size = formatSize(e.size).padStart(5);
    return `${icon} <a href="${e.name}">${e.name}</a>${namePad}${formatMtime(e.mtime)}  ${size}`;
  })
  .join("\n");

const headerName = "Name".padEnd(NAME_WIDTH + 6);
const headerDate = "Last modified".padEnd(18);
const header = `      ${headerName}${headerDate}Size`;

const html = `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 3.2 Final//EN">
<html>
 <head>
  <title>Index of /</title>
 </head>
 <body>
<h1>Index of /</h1>
<pre>${header}
<hr>
${rows}
<hr></pre>
<address>${SERVER_SIGNATURE}</address>
</body></html>
`;

writeFileSync(join(OUT, "index.html"), html);
console.log(`wrote ${OUT}/index.html (${entries.length} entries)`);
