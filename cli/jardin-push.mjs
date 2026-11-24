#!/usr/bin/env node
/**
 * JARDIN Gallery zero-dependency GitHub Pages CLI (Node 18+).
 * Atomically commits a single .html file or static web folder + works/manifest.json
 * directly via GitHub Git Data REST API (no git clone required).
 *
 * Usage:
 *   node jardin-push.mjs <folder-or-html> --repo owner/name --token <PAT> --id <slug> --title <name>
 */

import fs from 'node:fs/promises';
import path from 'node:path';

function printHelp() {
  console.log(`
JARDIN GitHub Pages CLI Uploader (Zero Dependencies, Node 18+)

Usage:
  node jardin-push.mjs <folder-or-html> [options]

Required:
  --token <pat>      GitHub Personal Access Token (or env GITHUB_TOKEN / JARDIN_TOKEN)
  --id <slug>        Work ID matching ^[a-z0-9][a-z0-9-_]{1,63}$
  --title <text>     Display title

Optional:
  --repo <owner/repo> GitHub repo (default: "wonderful-1101/jardin-gallery")
  --branch <name>     Target branch (default: "main")
  --author <text>     Creator name (default: "JARDIN Studio")
  --tags <csv>        Comma-separated tags
  --desc <text>       Short description
  --cover <path>      Cover image path (inside folder or external local image)
  --download <url>    Optional offline wallpaper download URL
  -h, --help          Show this help
`);
}

function parseArgs(argv) {
  const opts = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      opts.help = true;
    } else if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const val = argv[i + 1];
      if (val === undefined || val.startsWith('--')) throw new Error(`Missing value for --${key}`);
      opts[key] = val;
      i += 1;
    } else {
      opts._.push(arg);
    }
  }
  return opts;
}

const SKIP_DIRS = new Set(['node_modules', '.git', '__MACOSX', '.vscode', '.idea']);
const SKIP_FILES = new Set(['.DS_Store', 'Thumbs.db']);

async function walkFiles(rootDir, currentDir = rootDir) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      results.push(...(await walkFiles(rootDir, path.join(currentDir, entry.name))));
    } else if (entry.isFile()) {
      if (SKIP_FILES.has(entry.name)) continue;
      const absPath = path.join(currentDir, entry.name);
      const relPath = path.relative(rootDir, absPath).split(path.sep).join('/');
      results.push({ absPath, relPath });
    }
  }
  return results;
}

async function ghApi(repoSlug, endpoint, token, opts = {}) {
  const res = await fetch(`https://api.github.com/repos/${repoSlug}${endpoint}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GitHub API ${res.status} on ${endpoint}: ${txt}`);
  }
  return res.json();
}

async function runPool(items, concurrency, fn) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || opts._.length === 0) {
    printHelp();
    process.exit(opts.help ? 0 : 1);
  }

  const targetPath = path.resolve(opts._[0]);
  const repoSlug = (opts.repo || process.env.JARDIN_REPO || 'wonderful-1101/jardin-gallery').trim();
  const branch = (opts.branch || 'main').trim();
  const token = opts.token || process.env.GITHUB_TOKEN || process.env.JARDIN_TOKEN || '';
  const id = (opts.id || '').trim();
  const title = (opts.title || '').trim();

  if (!token) throw new Error('Missing --token (or GITHUB_TOKEN env)');
  if (!/^[a-z0-9][a-z0-9-_]{1,63}$/.test(id)) {
    throw new Error('Invalid --id: use 2-64 chars matching ^[a-z0-9][a-z0-9-_]{1,63}$');
  }
  if (!title) throw new Error('Missing --title');

  const stat = await fs.stat(targetPath).catch(() => null);
  if (!stat || (!stat.isDirectory() && !stat.isFile())) {
    throw new Error(`Target not found: ${targetPath}`);
  }

  let files = [];
  if (stat.isFile()) {
    if (!/\.(html|htm)$/i.test(targetPath)) {
      throw new Error(`Expected .html or .htm file, got: ${targetPath}`);
    }
    files = [{ absPath: targetPath, relPath: 'index.html' }];
  } else {
    files = await walkFiles(targetPath);
    if (!files.some((f) => f.relPath === 'index.html')) {
      throw new Error(`Missing index.html at root of ${targetPath}`);
    }
  }

  let detectedCover = '';
  if (opts.cover) {
    const insideHit = files.find((f) => f.relPath === opts.cover);
    if (insideHit) {
      detectedCover = insideHit.relPath;
    } else {
      const extCover = path.resolve(opts.cover);
      const cStat = await fs.stat(extCover).catch(() => null);
      if (!cStat || !cStat.isFile()) throw new Error(`Cover not found: ${opts.cover}`);
      const ext = path.extname(extCover).toLowerCase() || '.jpg';
      const coverRel = `preview${ext}`;
      files = files.filter((f) => f.relPath !== coverRel);
      files.push({ absPath: extCover, relPath: coverRel });
      detectedCover = coverRel;
    }
  } else {
    const auto = ['preview.jpg', 'preview.jpeg', 'preview.png', 'preview.webp', 'cover.jpg', 'cover.png', 'cover.webp'];
    const hit = auto.find((c) => files.some((f) => f.relPath.toLowerCase() === c));
    if (hit) detectedCover = files.find((f) => f.relPath.toLowerCase() === hit).relPath;
  }

  console.log(`Uploading "${title}" (${id}) to ${repoSlug}@${branch} (${files.length} files)...`);

  let works = [];
  const mfRes = await fetch(`https://api.github.com/repos/${repoSlug}/contents/works/manifest.json?ref=${encodeURIComponent(branch)}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.raw' },
  });
  if (mfRes.ok) {
    const parsed = await mfRes.json();
    works = Array.isArray(parsed) ? parsed : parsed.works || [];
  }

  const refData = await ghApi(repoSlug, `/git/ref/heads/${encodeURIComponent(branch)}`, token);
  const headSha = refData.object.sha;
  const commitData = await ghApi(repoSlug, `/git/commits/${headSha}`, token);
  const baseTreeSha = commitData.tree.sha;

  let totalBytes = 0;
  let uploaded = 0;
  const treeEntries = [];

  await runPool(files, 6, async (file) => {
    const buf = await fs.readFile(file.absPath);
    totalBytes += buf.byteLength;
    const blob = await ghApi(repoSlug, '/git/blobs', token, {
      method: 'POST',
      body: JSON.stringify({ content: buf.toString('base64'), encoding: 'base64' }),
    });
    treeEntries.push({
      path: `works/${id}/${file.relPath}`,
      mode: '100644',
      type: 'blob',
      sha: blob.sha,
    });
    uploaded += 1;
    if (uploaded % 25 === 0 || uploaded === files.length) {
      console.log(`  [${uploaded}/${files.length}] blobs created`);
    }
  });

  const tags = (opts.tags || '').split(/[,，]/).map((t) => t.trim()).filter(Boolean);
  const now = new Date().toISOString();
  const prevIdx = works.findIndex((w) => w.id === id);
  const prev = prevIdx >= 0 ? works[prevIdx] : {};
  const record = {
    id,
    title,
    author: opts.author || prev.author || 'JARDIN Studio',
    tags: tags.length ? tags : prev.tags || [],
    description: opts.desc ?? prev.description ?? '',
    cover: detectedCover || prev.cover || '',
    downloadUrl: opts.download ?? prev.downloadUrl ?? '',
    fileCount: files.length,
    totalBytes,
    createdAt: prev.createdAt || now,
    updatedAt: now,
  };
  if (prevIdx >= 0) works[prevIdx] = record;
  else works.unshift(record);
  works.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));

  const mfBlob = await ghApi(repoSlug, '/git/blobs', token, {
    method: 'POST',
    body: JSON.stringify({
      content: Buffer.from(JSON.stringify(works, null, 2) + '\n', 'utf8').toString('base64'),
      encoding: 'base64',
    }),
  });
  treeEntries.push({ path: 'works/manifest.json', mode: '100644', type: 'blob', sha: mfBlob.sha });

  const newTree = await ghApi(repoSlug, '/git/trees', token, {
    method: 'POST',
    body: JSON.stringify({ base_tree: baseTreeSha, tree: treeEntries }),
  });
  const newCommit = await ghApi(repoSlug, '/git/commits', token, {
    method: 'POST',
    body: JSON.stringify({ message: `feat(gallery): publish ${id}`, tree: newTree.sha, parents: [headSha] }),
  });
  await ghApi(repoSlug, `/git/refs/heads/${encodeURIComponent(branch)}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ sha: newCommit.sha }),
  });

  const [owner, repoName] = repoSlug.split('/');
  const baseUrl = `https://${owner}.github.io/${repoName}`;
  console.log('\nCommitted! GitHub Pages will publish in ~30-60s:');
  console.log(`  Gallery : ${baseUrl}/`);
  console.log(`  Play URL: ${baseUrl}/play.html?id=${id}`);
}

main().catch((err) => {
  console.error('\nError:', err.message || err);
  process.exit(1);
});
