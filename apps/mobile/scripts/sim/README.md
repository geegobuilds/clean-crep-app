# Phone walkthrough ("the simulator")

The real app, built for web by Expo, driven in Chromium with the **iPhone 15 Pro** and
**Pixel 7** profiles (screen size, pixel density, touch, mobile user agent) through every
section, against a fake Supabase with realistic data. It is how the team checks screens
from a cloud session (no Mac, no KVM). The real iOS Simulator needs a Mac session; CI's
phone checks (`e2e/`) run the same profiles against a real local Supabase.

```bash
# 1. Fake Supabase (port 54321)
node apps/mobile/scripts/sim/mock-supabase.js &
# 2. The app for web, pointed at it (port 8099). Metro's watcher can miss edits in a
#    container: restart with --clear after changing code.
cd apps/mobile && EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 EXPO_PUBLIC_SUPABASE_ANON_KEY=anon \
  CI=1 BROWSER=none npx expo start --web --port 8099 --offline --clear &
# 3. Walk every section on both phones (exit 1 if anything is wrong)
node scripts/sim/walkthrough.js .sim
# 4. Review the screens at a glance
node scripts/sim/contact-sheet.js "$PWD/.sim" iPhone .sim/iphone.png 4
```

`issues.txt` lists console errors, anything wider than the screen, and `undefined` /
`NaN` / `null` showing on screen. Change the data in `mock-supabase.js` (e.g.
`/__mode?m=active` switches the Club membership to active).
