#!/usr/bin/env node
/**
 * flow-storyboard build script.
 *
 * Usage:
 *   node build.mjs <spec.json> [out.html] [--talk]
 *
 * Reads a spec describing the flow and emits a self-contained storyboard HTML
 * (a horizontal row of live, self-driving phone frames). No dependencies.
 *
 * --talk : wrap the live phone-strip inside a talk-html editorial page — adds a
 *   zh-CN "这块板是什么" + "逐屏看流程" explainer above the strip, a talk-html-meta
 *   comment, a "继续修改" copy-prompt, and __TLH_*__ self-link placeholders that
 *   talk-html's publish.sh fills on upload. Use this when the board itself is the
 *   shareable deliverable (publish → gist → htmlpreview). The strip machinery is
 *   embedded, so the published page is fully self-contained (no iframe to a 2nd file).
 *
 * Spec shape (all fields except base + screens are optional):
 * {
 *   "title":   "<browser tab title>",
 *   "heading": "<H1 shown on the board>",
 *   "intro":   "<one paragraph explaining the board>",
 *   "foot":    "<footer note, HTML allowed>",
 *   "base":    "https://app.example.com/simulator/",   // REQUIRED
 *   "paramKey":"stage",        // query key each screen drives on (default "stage")
 *   "bootFlag":"sb=1",         // extra flag appended to every iframe url ("" to omit)
 *   "tools":   [ {"label":"▲ 打开完整模拟器","href":"https://..."} ],
 *   "screens": [               // REQUIRED, ordered
 *     { "stage":"boot", "name":"建档", "param":"",             "desc":"..." },
 *     { "stage":"track","name":"申报", "param":"?stage=track", "desc":"..." }
 *   ]
 * }
 *
 * Notes:
 *  - `param` is the literal query string appended to `base` for that screen.
 *    If omitted but `stage` is set, it defaults to "?<paramKey>=<stage>"
 *    (the first screen typically uses "" so it lands on the default state).
 *  - `stage` is only used for the small mono label under the screen name.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
const talk = argv.includes("--talk");
const positional = argv.filter((a) => !a.startsWith("--"));
const specPath = positional[0];
const outPath = positional[1] || (talk ? "flow-storyboard.talk.html" : "flow-storyboard.html");
if (!specPath) {
  console.error("usage: node build.mjs <spec.json> [out.html] [--talk]");
  process.exit(1);
}

const TEMPLATE = resolve(
  __dirname,
  talk ? "../assets/talk-template.html" : "../assets/template.html"
);

const spec = JSON.parse(readFileSync(specPath, "utf8"));
if (!spec.base) throw new Error("spec.base is required");
if (!Array.isArray(spec.screens) || spec.screens.length === 0)
  throw new Error("spec.screens must be a non-empty array");

const paramKey = spec.paramKey || "stage";

// Normalise screens: derive `param` from `stage` when not given.
const screens = spec.screens.map((s, i) => {
  let param = s.param;
  if (param === undefined) {
    param = i === 0 || !s.stage ? "" : `?${paramKey}=${s.stage}`;
  }
  return {
    stage: s.stage || "",
    name: s.name || `屏 ${i + 1}`,
    param,
    desc: s.desc || "",
  };
});

const toolButtons = (spec.tools || [])
  .map(
    (t) =>
      `<a class="tbtn" href="${esc(t.href)}" target="_blank">${esc(t.label)}</a>`
  )
  .join("\n      ");

const heading = spec.heading || spec.title || "流程脚本板";
const title = spec.title || heading;
const intro =
  spec.intro ||
  "每个手机框都是<strong style=\"color:var(--ink)\">线上真实页面</strong>，加载后自动驱动到对应状态。" +
    "拿它当重设计的底板：一眼看全流程，逐屏改。点任意框右下角 ↻ 重新驱动，左下角「单开」进入该屏专注编辑。";
const foot =
  spec.foot ||
  `数据源：<code>${esc(spec.base)}?${paramKey}=…</code> · 每屏由 <code>?${paramKey}</code> 参数自驱动 · 流程脚本板`;

let html = readFileSync(TEMPLATE, "utf8");
html = html
  .replaceAll("__TITLE__", esc(title))
  .replaceAll("__HEADING__", esc(heading))
  .replace("__INTRO__", intro) // intro may contain intentional HTML
  .replace("__FOOT__", foot) // foot may contain intentional HTML
  .replace("__TOOLBUTTONS__", toolButtons)
  .replace("__BASE__", esc(spec.base))
  .replace("__PARAMKEY__", esc(paramKey))
  .replace("__BOOTFLAG__", spec.bootFlag === undefined ? "" : esc(spec.bootFlag))
  .replace("__SCREENS__", JSON.stringify(screens, null, 2));

if (talk) {
  // Editorial body. `context` may contain intentional HTML; default explains the form.
  const context =
    spec.context ||
    "把整个用户流程的关键界面按顺序排成一排手机框，每屏都是<strong>线上真实页面</strong>、加载即自驱动到对应状态。" +
      "它既是<strong>说明</strong>（一眼看全流程），也是<strong>底板</strong>（点任意屏「单开」专注重设计）——因为每帧都是活的真站，重设计后重新驱动即可看到落地。";
  const screenList = screens
    .map((s) => {
      const rt = s.stage ? `${paramKey}=${s.stage}` : s.param || "(default)";
      return (
        `<li><div class="n"></div><div class="t">` +
        `<b>${esc(s.name)}</b><span class="rt">${esc(rt)}</span>` +
        `<span>${esc(s.desc)}</span></div></li>`
      );
    })
    .join("\n          ");
  html = html
    .replace("__CONTEXT__", context)
    .replace("__SCREENTABLE__", screenList);
}

writeFileSync(outPath, html);
console.log(
  `wrote ${outPath} (${screens.length} screens, base=${spec.base}${talk ? ", talk-html" : ""})`
);

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
