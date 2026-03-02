import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(process.cwd(), '..');
const distDir = path.resolve(process.cwd(), 'dist');

const legacyFiles = [
  'index.html',
  'login.html',
  'admin.html',
  'admin-imgtc.html',
  'admin-waterfall.html',
  'gallery.html',
  'preview.html',
  'block-img.html',
  'whitelist-on.html',
  'theme.css',
  'theme.js',
  'mobile-refactor.css',
  'admin-imgtc.css',
  'favicon.ico',
  'favicon.svg',
  'logo.png',
  'bg.svg',
  'music.svg',
];

const legacyDirs = ['_nuxt'];

function copyEntry(relativePath) {
  const from = path.resolve(rootDir, relativePath);
  if (!fs.existsSync(from)) return;

  const to = path.resolve(distDir, relativePath);
  fs.mkdirSync(path.dirname(to), { recursive: true });

  const stat = fs.statSync(from);
  if (stat.isDirectory()) {
    fs.cpSync(from, to, { recursive: true, force: true });
    return;
  }

  fs.copyFileSync(from, to);
}

fs.mkdirSync(distDir, { recursive: true });

for (const file of legacyFiles) {
  copyEntry(file);
}
for (const dir of legacyDirs) {
  copyEntry(dir);
}

console.log('[frontend] legacy assets copied to dist root');