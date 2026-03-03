/**
 * Chrome 插件 esbuild 打包脚本
 * - 4 个 TS 入口 → JS
 * - 复制静态资源（manifest, html, icons）到 dist/
 */
import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = resolve(__dirname, 'dist');
const isWatch = process.argv.includes('--watch');

// ─── 1. esbuild 编译 TS → JS ───────────────────────

// ESM 入口（service worker, popup, sidepanel 均为 module）
const esmEntries = [
  'background/service-worker.ts',
  'popup/popup.ts',
  'sidepanel/sidepanel.ts',
];

// IIFE 入口（content script 不支持 ESM）
const iifeEntries = [
  'content/zhaopin.ts',
];

const commonOptions = {
  bundle: true,
  sourcemap: true,
  target: 'chrome120',
  outdir: dist,
  outbase: __dirname,
};

async function build() {
  // 清理 dist
  if (existsSync(dist)) {
    cpSync(dist, dist, { recursive: true }); // noop, just to ensure exists
  }
  mkdirSync(dist, { recursive: true });

  // ESM bundle
  const esmCtx = await esbuild.context({
    ...commonOptions,
    entryPoints: esmEntries.map((e) => resolve(__dirname, e)),
    format: 'esm',
  });

  // IIFE bundle
  const iifeCtx = await esbuild.context({
    ...commonOptions,
    entryPoints: iifeEntries.map((e) => resolve(__dirname, e)),
    format: 'iife',
  });

  if (isWatch) {
    console.log('[build] watching for changes...');
    await esmCtx.watch();
    await iifeCtx.watch();
  } else {
    await esmCtx.rebuild();
    await iifeCtx.rebuild();
    await esmCtx.dispose();
    await iifeCtx.dispose();
  }

  // ─── 2. 复制静态资源 ───────────────────────────────

  // manifest.json
  cpSync(resolve(__dirname, 'manifest.json'), resolve(dist, 'manifest.json'));

  // HTML 文件
  cpSync(resolve(__dirname, 'popup/popup.html'), resolve(dist, 'popup/popup.html'));
  cpSync(resolve(__dirname, 'sidepanel/sidepanel.html'), resolve(dist, 'sidepanel/sidepanel.html'));

  // Icons
  if (existsSync(resolve(__dirname, 'icons'))) {
    cpSync(resolve(__dirname, 'icons'), resolve(dist, 'icons'), { recursive: true });
  }

  console.log('[build] done → extension/dist/');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
