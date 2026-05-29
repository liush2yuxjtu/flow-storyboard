---
name: flow-storyboard
description: >-
  Generate a "flow storyboard" — a single horizontal row of phone frames where
  every frame is a LIVE iframe of the real app, each auto-driven to a different
  state of the user flow (screen 1 → screen 2 → … → screen N). Each screen
  self-drives via a deep-link parameter (e.g. ?stage=track), so loading the board
  plays the whole flow at a glance, and you can redesign screen-by-screen on a
  living baseboard instead of static mockups. Use whenever the user wants to see
  a mobile/web app's whole flow side by side, asks for a "流程脚本板", "脚本板",
  "storyboard", "一排手机框", "把整个流程排成一排", "screen flow board",
  "redesign baseboard", "show every screen of the flow at once", "phone frames
  each driven to a state", or points at one screen/simulator and wants every key
  state laid out in order. Works for ANY project whose screens can be reached by
  a URL (deep-link param or distinct paths) — not tied to any one app. Can also
  publish the board as a shareable talk-html page (gist + htmlpreview preview
  link) via --talk mode — use that when the user asks to publish, share, or get a
  preview link for the flow board.
---

# flow-storyboard

Produce a self-contained HTML page that lays the whole user flow out as a single
horizontal strip of **iPhone frames**, each one a live `<iframe>` of the real
running app driven to a specific state. Frame 1 is the first screen of the flow,
frame 2 the next, and so on. Opening the page = watching every key screen boot
itself into the right state, all visible at once.

## Why this form is worth reusing

Static mockups rot the moment the app changes, and a single running simulator
only shows one screen at a time — you lose the shape of the whole journey. This
form keeps both: it's **live** (every frame is the real app, so it never drifts
from production) and it's **the whole flow at once** (you scan boot → … → endgame
in one eye-sweep). That makes it the ideal *redesign baseboard*: you see how
screens relate, spot the weak screen, then click "单开" to open just that one and
edit it in isolation. The board is a lens over the real app, not a copy of it.

## The one hard requirement: each screen must be deep-linkable

The whole thing rests on the app being able to **self-drive to a state from a
URL**. There are two common shapes:

1. **A deep-link param** — one simulator URL plus a query key that selects state,
   e.g. `https://app/simulator/?stage=track`. This is the cleanest case and the
   default the build script assumes.
2. **Distinct paths/URLs** — each screen already lives at its own URL
   (`/onboarding`, `/home`, `/notice`). Then each screen's `param` is just that
   path suffix and there's no shared `paramKey`.

If the app **cannot yet** reach a mid-flow state from a URL (e.g. you can only get
to the "通知书" screen by clicking through three screens live), that gap is the
real work — flag it to the user. The board needs each state addressable. Often the
fix is small: read a `?stage=` / `?screen=` param on boot and fast-forward the
simulator into that state (and optionally a `&sb=1` flag to hide nav chrome so the
frame looks clean). Offer to add that to the app, then build the board on top.

## Workflow

### 1. Pin down the flow

Establish, with the user or by reading the project:

- **base** — the app URL the frames load (the simulator/app root).
- **how states are addressed** — a deep-link param key (`stage`, `screen`,
  `step`…) and its values, OR per-screen paths.
- **the ordered screens** — for each: a short `name` (e.g. 建档/申报/主界面), the
  `stage`/`param` that drives it, and a one-line `desc` of what that screen shows
  and why it's a key step. 5–7 screens is the sweet spot; the strip scrolls
  horizontally so more is fine.
- **optional boot flag** — e.g. `sb=1` appended to every frame to put the app in a
  clean "storyboard" presentation (hide bottom nav, skip splash). Only if the app
  supports it.
- **optional tool buttons** — links shown in the header (open full simulator,
  other versions of the product, etc.).

If the user just points at an existing single screen ("here's my simulator, make
the board"), infer the flow yourself by exploring the app's states/params, draft
the screen list, and confirm it with them before building.

### 2. Write a spec JSON

Create a spec file (anywhere; `flow-storyboard.spec.json` next to the output is
fine). See `assets/example.spec.json` for a complete, real example. Shape:

```json
{
  "title": "秋招风云 · 完整流程脚本板",
  "heading": "秋招风云 · 完整流程脚本板",
  "intro": "6 个关键界面按顺序排成一排……（HTML allowed）",
  "base": "https://qiuzhaofengyun.vercel.app/simulator/",
  "paramKey": "stage",
  "bootFlag": "sb=1",
  "tools": [
    { "label": "▲ 打开完整模拟器", "href": "https://qiuzhaofengyun.vercel.app/simulator/" }
  ],
  "screens": [
    { "stage": "boot",  "name": "建档",   "param": "",              "desc": "档案封面：身份卡 + 申报方向网格" },
    { "stage": "track", "name": "申报",   "param": "?stage=track",  "desc": "选定志愿方向，受理按钮点亮" }
  ]
}
```

Field notes:

- `param` is the literal query/path string appended to `base` for that frame.
  Frame 1 is usually `""` (lands on the app's default/first state). If you omit
  `param`, the script derives `?<paramKey>=<stage>` (except for the first screen).
- `stage` only feeds the small mono caption under each screen's name — keep it for
  readability even when `param` is explicit.
- `intro` and `foot` may contain real HTML (e.g. `<strong>`, `<code>`); everything
  else is auto-escaped.
- Omit `bootFlag` (or set `""`) if the app has no storyboard flag.

### 3. Build it

```bash
node ~/.claude/skills/flow-storyboard/scripts/build.mjs <spec.json> <out.html>
```

The script reads `assets/template.html`, injects the config, and writes a single
self-contained HTML file (no build step, no dependencies — pure Node, runs
anywhere). Each frame gets a cache-buster on every (re)load so "↻ 重新驱动" and
"全部重新驱动" actually re-run the app rather than show a cached frame.

If you'd rather not run the script, you can copy `assets/template.html` and edit
the `BASE` / `PARAM` / `BOOT_FLAG` / `SCREENS` block at the bottom by hand — the
script just automates exactly that.

### 4. Preview and hand off

Open the result so the user sees it immediately:

```bash
open <out.html>
```

Then tell the user what they're looking at: the strip scrolls horizontally; each
frame's **↻** re-drives that one screen, the header **↻ 全部重新驱动** re-drives
all of them, and **⤢ 单开** opens that single screen full-page in a new tab for
focused editing. Point out that because the frames are the live app, the board
stays true as they redesign — re-drive to see changes land.

### 5. (Optional) Publish & share as a talk-html page

When the board itself is the thing to *share* — a link to send, a durable
breadcrumb — build the **talk-html variant** and publish it. Pass `--talk` to wrap
the live phone-strip inside a zh-CN editorial page (a "这块板是什么" + "逐屏看流程"
explainer above the strip, a "继续修改" copy-prompt, and self-link placeholders).
The strip machinery is **embedded**, so the published page is fully self-contained
— no iframe to a second file, the whole board travels in one gist.

```bash
# build the shareable variant (uses assets/talk-template.html)
node ~/.claude/skills/flow-storyboard/scripts/build.mjs <spec.json> <out>.talk.html --talk

# publish to a gist + get an htmlpreview.github.io preview URL
bash ~/.claude/skills/talk-html/publish.sh <out>.talk.html
```

`publish.sh` (the canonical talk-html publisher) creates a secret gist, fills the
`__TLH_RENDERED_URL__` self-links with the real URL on upload, and prints
`local / gist / raw / rendered` — hand the user the **rendered** one (that's the
clickable preview). Add an editorial `context` field to the spec to control the
"这块板是什么" body (HTML allowed); without it a sensible default is generated.

The iframes point at the app's **absolute** URL, so the preview only works if the
`base` is a deployed/reachable URL (not a `localhost` dev server — that's dead from
a gist). Publish boards built against a deployed base.

## What "good" looks like

- All N frames load the real app and visibly settle into *different* states — if
  two frames look identical, the deep-link param isn't actually driving them;
  recheck the `param`/`stage` values against what the app reads.
- The strip reads as a story left-to-right: each `name` + `desc` makes the step's
  purpose obvious to someone who's never seen the app.
- The page is one file you can open with no server (frames point at the live URL,
  so the app must be reachable — local dev URL or deployed).

## Adapting the frame

The phone frame is tuned for a 390×844 portrait app at `--scale:.6`. For a
different device size or to fit more/fewer frames on screen, adjust `--phoneW`,
`--phoneH`, and `--scale` in the template's `:root`. The horizontal scroller
handles any number of screens.
