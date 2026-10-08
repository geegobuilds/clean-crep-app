// Applies patches/ with patch-package (currently none; the Xcode 27 Device Hub patch was dropped
// with Expo SDK 57, which supports Device Hub natively).
//
// Skips when it can't or needn't apply: production installs without devDependencies
// (e.g. Vercel building apps/web, where patch-package isn't installed) or installs
// without @expo/cli. Where it does run, a failure (e.g. patch/version mismatch after
// an Expo upgrade) still fails the install on purpose, as a reminder to update the patch.
const { existsSync } = require('fs');
const { execFileSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const patchPackageBin = path.join(root, 'node_modules', '.bin', 'patch-package');
const expoCli = path.join(root, 'node_modules', '@expo', 'cli', 'package.json');

if (!existsSync(patchPackageBin) || !existsSync(expoCli)) {
  console.log('postinstall: patch-package or @expo/cli not installed; skipping patches/.');
  process.exit(0);
}

execFileSync(patchPackageBin, { cwd: root, stdio: 'inherit' });
