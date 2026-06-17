import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

test('package exposes Tauri desktop scripts', () => {
  const pkg = readJson('package.json');

  assert.equal(pkg.scripts.tauri, 'tauri');
  assert.equal(pkg.scripts['desktop:dev'], 'tauri dev');
  assert.equal(pkg.scripts['desktop:build'], 'tauri build');
  assert.equal(pkg.scripts['desktop:build:exe'], 'tauri build --no-bundle');
  assert.match(pkg.devDependencies['@tauri-apps/cli'], /^\^2\./);
});

test('Vite uses relative asset paths for desktop packaging', () => {
  const viteConfig = readFileSync('vite.config.ts', 'utf8');

  assert.match(viteConfig, /base:\s*['"]\.\/['"]/);
});

test('Tauri config names the Windows desktop app', () => {
  assert.equal(existsSync('src-tauri/tauri.conf.json'), true);

  const config = readJson('src-tauri/tauri.conf.json');
  const mainWindow = config.app.windows.find((window) => window.label === 'main');

  assert.equal(config.productName, '影像布局工具');
  assert.equal(config.identifier, 'com.maplayout.desktop');
  assert.equal(config.mainBinaryName, 'MapLayout');
  assert.equal(config.build.frontendDist, '../dist');
  assert.equal(config.build.beforeBuildCommand, 'npm run build');
  assert.equal(config.build.beforeDevCommand, 'npm run dev');
  assert.equal(config.build.devUrl, 'http://localhost:3000');
  assert.equal(mainWindow.title, '影像布局工具');
  assert.equal(mainWindow.width, 1280);
  assert.equal(mainWindow.height, 860);
});

test('Tauri Windows bundle targets Windows 10 and 11 without binding a web port', () => {
  const config = readJson('src-tauri/tauri.conf.json');

  assert.deepEqual(config.bundle.targets, ['nsis']);
  assert.equal(config.bundle.windows.webviewInstallMode.type, 'skip');
  assert.equal(config.bundle.windows.nsis.installMode, 'currentUser');
  assert.equal(config.app.withGlobalTauri, false);
});

test('Tauri release binary hides the Windows console window', () => {
  const main = readFileSync('src-tauri/src/main.rs', 'utf8');

  assert.match(
    main,
    /#!\[cfg_attr\(not\(debug_assertions\),\s*windows_subsystem\s*=\s*"windows"\)\]/,
  );
});

test('Tauri Windows resource icon exists', () => {
  assert.equal(existsSync('src-tauri/icons/icon.ico'), true);
});
