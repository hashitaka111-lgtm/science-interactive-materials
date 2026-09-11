// index.html を生成する。Node 標準機能のみ。依存パッケージなし。
//   node build.mjs
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkEmbeddedData } from "./scripts/check-embedded-data.mjs";
import { checkPeptideUniqueness } from "./scripts/check-peptide-uniqueness.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
const template = readFileSync(join(root, "index.template.html"), "utf8");

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// 科目の並び順
const SUBJECTS = ["chemistry", "physics"];

// type の値と日本語ラベルの対応表
const TYPE_LABEL = {
  simulator: "シミュレーター",
  diagram: "系統図",
  matrix: "マトリクス",
  procedure: "手順分解",
};

// manifest の整合性を検証する。異常があれば id を含めて例外を投げ、生成を中止する。
function validate(list) {
  const ids = new Set(list.map((m) => m.id));
  const byId = new Map(list.map((m) => [m.id, m]));

  for (const m of list) {
    if (!Object.prototype.hasOwnProperty.call(TYPE_LABEL, m.type)) {
      throw new Error(
        `[${m.id}] type が不正です（${JSON.stringify(m.type)}）。simulator/diagram/matrix/procedure のいずれかにしてください。`
      );
    }
    if (!Array.isArray(m.related)) {
      throw new Error(`[${m.id}] related が配列ではありません。`);
    }
    if (m.related.length < 1 || m.related.length > 4) {
      throw new Error(`[${m.id}] related の件数が範囲外です（${m.related.length}件）。1〜4件にしてください。`);
    }
    if (new Set(m.related).size !== m.related.length) {
      throw new Error(`[${m.id}] related に重複した id があります。`);
    }
    if (m.related.includes(m.id)) {
      throw new Error(`[${m.id}] related に自分自身が含まれています。`);
    }
    for (const r of m.related) {
      if (!ids.has(r)) {
        throw new Error(`[${m.id}] related に manifest に存在しない id があります（${r}）。`);
      }
    }
    if (!existsSync(join(root, m.file))) {
      throw new Error(`[${m.id}] file に対応するHTMLが html/ に存在しません（${m.file}）。`);
    }
  }

  // related の双方向チェック
  for (const m of list) {
    for (const r of m.related) {
      const other = byId.get(r);
      if (!other.related.includes(m.id)) {
        throw new Error(`[${m.id}] related が双方向になっていません（${r} 側の related に ${m.id} がありません）。`);
      }
    }
  }

  // html/*.html にあって manifest に無いファイルを検出（教材以外の .md / .js は対象外）
  const htmlFiles = readdirSync(join(root, "html")).filter((f) => f.endsWith(".html"));
  const registered = new Set(list.map((m) => m.file.replace(/^html\//, "")));
  const orphans = htmlFiles.filter((f) => !registered.has(f));
  if (orphans.length) {
    throw new Error(`manifest.json に登録されていないHTMLがあります: ${orphans.join(", ")}`);
  }

  return byId;
}

const byId = validate(manifest);

// unit の "A / B" のうち B を返す。スラッシュが無ければ全体。
function unitTail(unit) {
  const i = unit.indexOf("/");
  return i === -1 ? unit.trim() : unit.slice(i + 1).trim();
}

// 見出し。発展は course だけを出す。
function groupLabel(course, section) {
  return course === "発展"
    ? esc(course)
    : `${esc(course)}<span class="sep">›</span>${esc(section)}`;
}

// course → section でまとめ、group 内は order 昇順。
// group 同士は「その group の最小 order」の昇順（order は科目内で通し番号）。
const groups = [];
for (const subject of SUBJECTS) {
  const map = new Map();
  for (const m of manifest.filter((x) => x.subject === subject)) {
    const key = `${m.course} ${m.section}`;
    if (!map.has(key)) map.set(key, { subject, course: m.course, section: m.section, items: [] });
    map.get(key).items.push(m);
  }
  const list = [...map.values()];
  for (const g of list) {
    g.items.sort((a, b) => a.order - b.order);
    g.minOrder = g.items[0].order;
  }
  list.sort((a, b) => a.minOrder - b.minOrder);
  groups.push(...list);
}

function card(m) {
  const tags = [];
  if (m.course === "発展") tags.push('<span class="tag adv">発展</span>');
  if (m.type !== "simulator") tags.push(`<span class="tag type">${esc(TYPE_LABEL[m.type])}</span>`);
  for (const it of m.interactions || []) tags.push(`<span class="tag">${esc(it)}</span>`);

  const relatedLinks = m.related
    .map((id) => byId.get(id))
    .map((r) => `<a href="${esc(r.file)}" target="_blank" rel="noopener">${esc(r.title)}</a>`)
    .join(" / ");

  return [
    `    <article class="card" data-id="${esc(m.id)}" data-subject="${esc(m.subject)}">`,
    `      <h3><a href="${esc(m.file)}" target="_blank" rel="noopener">${esc(m.title)}</a></h3>`,
    `      <p class="s">${esc(m.summary)}</p>`,
    `      <p class="u">${esc(unitTail(m.unit))}</p>`,
    `      <p class="tags">${tags.join("")}</p>`,
    `      <p class="rel">関連: ${relatedLinks}</p>`,
    `    </article>`,
  ].join("\n");
}

const list = groups
  .map((g) =>
    [
      `<section class="group">`,
      `  <div class="grouphead"><h2>${groupLabel(g.course, g.section)}</h2><span class="gn">${g.items.length}</span></div>`,
      `  <div class="cards">`,
      g.items.map(card).join("\n"),
      `  </div>`,
      `</section>`,
    ].join("\n")
  )
  .join("\n");

const count = (s) => manifest.filter((m) => m.subject === s).length;
const buildDate = new Date().toLocaleDateString("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// </script> がJSON中に現れてもタグが閉じないようにする
const manifestJson = JSON.stringify(manifest).replace(/<\//g, "<\\/");

const out = template
  .replace("{{LIST}}", list)
  .replace("{{MANIFEST_JSON}}", manifestJson)
  .replaceAll("{{COUNT_ALL}}", String(manifest.length))
  .replaceAll("{{COUNT_CHEM}}", String(count("chemistry")))
  .replaceAll("{{COUNT_PHYS}}", String(count("physics")))
  .replace("{{BUILD_DATE}}", buildDate);

// data/peptide-problems.json の各問題が、全条件を適用した結果1通りに絞れるかを検証する。
// 1件でも一意に決まらない問題があればビルドを止める。詳細は scripts/check-peptide-uniqueness.mjs 参照
const peptideAmino = JSON.parse(readFileSync(join(root, "data/amino-acids.json"), "utf8"));
const peptideProblems = JSON.parse(readFileSync(join(root, "data/peptide-problems.json"), "utf8"));
const peptideCheck = checkPeptideUniqueness(peptideAmino, peptideProblems);
console.log(peptideCheck.report.join("\n"));
if (!peptideCheck.ok) {
  process.exit(1);
}

// 教材HTMLに埋め込んだJSONが data/*.json の原本とずれていないかを検査する。
// 埋め込みJSONは必ず1行(minify済み)で書く規約。詳細・対応表は scripts/check-embedded-data.mjs 参照
const embedCheck = checkEmbeddedData();
if (!embedCheck.ok) {
  console.error(embedCheck.report.join("\n"));
  process.exit(1);
}

writeFileSync(join(root, "index.html"), out);
console.log(
  `index.html を出力しました（教材 ${manifest.length} 件 / グループ ${groups.length} 件 / 更新日 ${buildDate}）`
);
