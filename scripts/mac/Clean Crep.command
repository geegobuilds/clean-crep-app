#!/bin/zsh -l
# Clean Crep launcher (macOS): pull latest, install deps only if they changed, run the app on
# the iOS Simulator (Xcode 27 Device Hub). Copy to the Desktop and double-click — see README
# "Running on the iOS Simulator (Mac)". Originally built by Cowork on Geego's Mac.

REPO="$HOME/clean-crep-app"
ICON="$REPO/apps/mobile/assets/creppie/success.png"
SELF="${0:A}"

# One-time touch-ups for this launcher file (no-ops after the first run)
xattr -d com.apple.quarantine "$SELF" 2>/dev/null
if [[ -f "$ICON" ]] && ! xattr -p com.apple.ResourceFork "$SELF" >/dev/null 2>&1; then
  osascript -l JavaScript - "$ICON" "$SELF" >/dev/null 2>&1 <<'JXA'
ObjC.import('AppKit');
function run(argv) {
  const img = $.NSImage.alloc.initWithContentsOfFile(argv[0]);
  $.NSWorkspace.sharedWorkspace.setIconForFileOptions(img, argv[1], 0);
}
JXA
fi

# Make sure node/npm are on PATH (Homebrew, nvm)
if ! command -v npm >/dev/null 2>&1; then
  [[ -f "$HOME/.zshrc" ]] && source "$HOME/.zshrc" >/dev/null 2>&1
  export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
fi

echo ""
echo "  Starting Clean Crep…  (press Ctrl+C to stop)"
echo ""

cd "$REPO" || { echo "✖ Can't find $REPO"; read -k1 "?Press any key to close…"; exit 1; }

# package-lock.json is generated, and a newer local npm reformats it after `npm install`.
# If it's the ONLY local change, reset it so it can't block the pull (npm recreates it).
# Any other local change is left alone and the pull falls back to the warning below.
if [[ "$(git status --porcelain --untracked-files=no)" == " M package-lock.json" ]]; then
  git checkout -- package-lock.json
fi

before=$(git rev-parse HEAD 2>/dev/null)
if GIT_TERMINAL_PROMPT=0 git pull --ff-only --quiet; then
  after=$(git rev-parse HEAD)
  if [[ "$before" != "$after" ]]; then
    echo "✔ Pulled latest code (${before:0:7} → ${after:0:7})"
  else
    echo "✔ Already up to date"
  fi
else
  echo "⚠ Couldn't pull latest (offline or local changes) — running the code you already have."
  after="$before"
fi

if [[ "$before" != "$after" ]] && \
   [[ -n "$(git diff --name-only "$before" "$after" -- package-lock.json ':(glob)**/package.json' 'patches/')" ]]; then
  echo "→ Dependencies changed, running npm install…"
  npm install || echo "⚠ npm install failed — trying to start anyway."
else
  echo "✔ Dependencies unchanged, skipping npm install"
fi

cd apps/mobile && npm run ios
