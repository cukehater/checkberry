# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Checkberry is an offline-only habit and schedule app (Expo SDK 58, React Native 0.88, Expo Router, pnpm). All data lives in a local SQLite file on the device; there is no server, login, or sync.

@AGENTS.md
@ARCHITECTURE.md

## Commands

```bash
pnpm start                      # dev server (use `npx expo start -c` after any dependency change)
pnpm verify                     # lint + prettier --check + steiger (FSD) + knip; any error OR warning fails it (eslint --max-warnings 0, steiger --fail-on-warnings); runs on every commit via husky
pnpm typecheck                  # tsc --noEmit (not in the commit hook, run it yourself)
pnpm test                       # jest (jest-expo preset)
pnpm test src/entities/habit    # tests under one path
pnpm test -t 'streak'           # tests whose name matches
pnpm format                     # prettier --write .
pnpm knip:fix                   # remove unused exports/deps (never deletes files)
npx expo install <pkg>          # add deps; append `-- -D` for devDependencies
CI=1 npx expo export --platform ios --output-dir <tmp>   # build the JS bundle without a device
```

Xcode and iOS simulators are installed, but `xcode-select` points to Command Line Tools, so prefix simulator commands with `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer` (plain `xcrun simctl` fails with "unable to find utility"). There is no dev client or `ios/` folder; the app runs in Expo Go:

```bash
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
xcrun simctl list devices booted                          # use the UDID when several are booted
xcrun simctl terminate <udid> host.exp.Exponent           # Expo Go can keep an old bundle; relaunch to load current code
xcrun simctl openurl <udid> exp://127.0.0.1:8081          # open the app (Metro must be running)
xcrun simctl openurl <udid> exp://127.0.0.1:8081/--/tasks # deep link a tab: /--/, /--/tasks, /--/habits, /--/calendar
xcrun simctl io <udid> screenshot <file>.png
xcrun simctl ui <udid> appearance dark|light
```

Start your own Metro without `CI=1` (for example `npx expo start --port 8082 < /dev/null` in the background): `CI=1` turns off file watching, so the simulator keeps getting the first bundle and later edits never show. `simctl` cannot tap or swipe. Maestro is installed (`/opt/homebrew/bin/maestro`, needs the same `DEVELOPER_DIR`): `maestro --device <udid> test flow.yaml` taps by visible text. The first `openurl` on a simulator shows an "'Expo Go'에서 열겠습니까?" prompt; tap `열기` with Maestro. `takeScreenshot` only writes inside `--test-output-dir`, so take screenshots with `simctl io` instead. Maestro cannot type Korean with `inputText` (use ASCII test text). Pressables with an accessibility role merge their children's text into one label (a task row reads `제목, D-Day, 11월 21일`, its checkbox `제목 완료`), so select with that exact label or a regex like `'제목, .*'`, and target text inputs by placeholder. To see a sub-second animation, record with `xcrun simctl io <udid> recordVideo --codec h264 <file>.mov` (stop with SIGINT) and pull frames with an `AVAssetImageGenerator` swift script; `simctl screenshot` is too slow to catch it. Haptics and real-device timing still need a phone. Verify with typecheck, tests, `pnpm verify`, a bundle export, and simulator screenshots (light and dark), and say plainly what was not checked by interaction. Impeccable review screenshots go in `.impeccable/review/`.

## Runtime flow

1. `src/app/_layout.tsx` wraps everything in `HeroUINativeProvider`, holds the system splash (`expo-splash-screen`), and opens `justdoit.db` through `SQLiteProvider` with `onInit={initDb}` (runs `migrate`, then `normalizeHabitIcons` to move old habit icon keys to `ph:<Phosphor name>`, then `loadTheme`; suspends until done) and `enableChangeListener`. Once the DB is ready it hides the system splash and shows `BrandSplash` for 0.7s.
2. `src/app/(tabs)/_layout.tsx` reads the `onboarded` setting and redirects to `/welcome` until it is `'1'`.
3. Screens read with `useQuery` (`src/shared/db/useQuery.ts`), which re-runs its SQL on any DB change event. Writes go through repo functions in `src/entities/*/model/repo.ts`, so saving in a sheet refreshes every mounted tab without manual state passing.
4. `event` and `habits/*` routes are `presentation: 'modal'` sheets with the system header off; forms inside them use `FormScreen header={<SheetHeader title onSave />}` and `useFocusAfterTransition` (see ARCHITECTURE.md for why).

## Before every commit

Update the md docs in the same commit as the code, never later. Check each one against what changed:

- `DESIGN.md`: any visual or interaction change (colors, tokens, sizes, copy patterns, components, motion, screen layout). Remove descriptions of things that no longer exist.
- `ARCHITECTURE.md`: new or removed shared components and exports, layer or folder rules, conventions, verify harness changes.
- `CLAUDE.md`: commands, runtime flow, data notes (schema, stored value formats), simulator or tooling pitfalls learned.
- `PRODUCT.md`: user-facing capabilities or constraints (for example a level count or a dependency named there).
- `assets/lottie/README.md` and other folder READMEs: assets added or removed.

If none needs a change, say so in the commit report. `pnpm verify` runs prettier on the md files too.

## Design docs

- `PRODUCT.md`: users, purpose, capabilities, brand commitments (product truth for design work).
- `DESIGN.md`: the current visual system (tokens, components, motion). Update it whenever UI conventions change.

## Data notes

- Tables: `settings` (key/value), `task_groups`, `events` (dated or undated tasks, `start_date`/`end_date` as `YYYY-MM-DD`), `habits`, `habit_logs` (a row means done; unchecking deletes the row).
- `events.title` may start with an emoji picked in the sheet, stored as `<emoji> <title>` in the same column; the sheet splits it back (`splitEmoji`/`joinEmoji` in `pages/event/model/emoji.ts`).
- `events.priority` uses three levels stored as 1 (낮음), 3 (보통), 5 (높음); old 2/4 values are read by range (`priorityOf`). `habits.icon_key` is `ph:<Phosphor name>`; old keys are normalized on startup and after restore.
- Dates are device-local calendar strings; date math in `src/shared/lib/dates.ts` parses them as UTC midnight to avoid DST issues.
- `snapshot()` copies the whole DB file to `documents/snapshots/` (keeps 7) before migrations, restore, and wipe. Backups are JSON via the share sheet (`src/features/backup`).
