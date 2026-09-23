// 熱硬化性樹脂(chem-thermosetting-resin)の検算スクリプト。
// (1) html/thermosetting-resin.html に埋め込んだDATAがdata/thermosetting-resin.jsonと完全一致すること
// (2) 5物質のモノマー分子量が、各resin/monomerのsourceフィールドに書かれた検算式(原子量からの計算)と一致すること
// (3) ホルムアルデヒド(HCHO)の分子量30が、data/aldehyde-ketone-nomenclature.jsonのformaldehyde(分子量30)と一致すること
// を検査する。Node標準機能のみ。
//   node scripts/check-thermosetting-resin.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const ORIGINAL = JSON.parse(readFileSync(join(root, "data/thermosetting-resin.json"), "utf8"));
const HTML = readFileSync(join(root, "html/thermosetting-resin.html"), "utf8");

const failures = [];
function check(label, cond, detail) {
  if (!cond) failures.push(`${label}: ${detail}`);
}

/* ---------- (1) 埋め込みJSONが原本と完全一致するか ---------- */
const m = HTML.match(/^const DATA = (.+);$/m);
check("埋め込みDATAが1行で見つかる", !!m, "html/thermosetting-resin.html に `const DATA = ...;` の行が見つからない");
if (m) {
  const embedded = JSON.parse(m[1]);
  const a = JSON.stringify(embedded);
  const b = JSON.stringify(ORIGINAL);
  check("埋め込みDATAがdata/thermosetting-resin.jsonと完全一致", a === b, a === b ? "" : "JSON.stringifyの結果が一致しない(内容の差分あり)");
}

/* ---------- (2) 原子量からの検算 ---------- */
const AW = ORIGINAL.meta.atomicWeights; // {H:1, C:12, N:14, O:16, Cl:35.5}
const byId = Object.fromEntries(ORIGINAL.resins.map((r) => [r.id, r]));

// ホルムアルデヒド(HCHO = CH2O): 全resinで共通の値。phenolのsourceに明示された式で検算する。
{
  const w = AW.C + 2 * AW.H + AW.O;
  check("ホルムアルデヒド(CH2O)が30", w === 30, `導出=${w}`);
  ["phenol", "urea", "melamine"].forEach((id) => {
    const f = byId[id].monomers.find((mo) => mo.name === "ホルムアルデヒド");
    check(`${id}: ホルムアルデヒドの分子量が30`, f.weight === 30, `値=${f.weight}`);
  });
}

// urea: 尿素 H2N-CO-NH2 = CH4N2O
{
  const mo = byId.urea.monomers.find((x) => x.name === "尿素");
  const w = AW.C + 4 * AW.H + 2 * AW.N + AW.O;
  check("urea: 尿素(CH4N2O)が60", w === mo.weight, `導出=${w} 値=${mo.weight}`);
}

// melamine: メラミン(トリアジン環) C3H6N6
{
  const mo = byId.melamine.monomers.find((x) => x.name.indexOf("メラミン") === 0);
  const w = 3 * AW.C + 6 * AW.H + 6 * AW.N;
  check("melamine: メラミン(C3H6N6)が126", w === mo.weight, `導出=${w} 値=${mo.weight}`);
}

// alkyd: 無水フタル酸 C8H4O3、グリセリン C3H8O3
{
  const [m1, m2] = byId.alkyd.monomers;
  const w1 = 8 * AW.C + 4 * AW.H + 3 * AW.O;
  const w2 = 3 * AW.C + 8 * AW.H + 3 * AW.O;
  check("alkyd: 無水フタル酸(C8H4O3)が148", w1 === m1.weight, `導出=${w1} 値=${m1.weight}`);
  check("alkyd: グリセリン(C3H8O3)が92", w2 === m2.weight, `導出=${w2} 値=${m2.weight}`);
}

// epoxy: ビスフェノールA C15H16O2、エピクロロヒドリン C3H5ClO
{
  const [m1, m2] = byId.epoxy.monomers;
  const w1 = 15 * AW.C + 16 * AW.H + 2 * AW.O;
  const w2 = 3 * AW.C + 5 * AW.H + AW.Cl + AW.O;
  check("epoxy: ビスフェノールA(C15H16O2)が228", w1 === m1.weight, `導出=${w1} 値=${m1.weight}`);
  check("epoxy: エピクロロヒドリン(C3H5ClO)が92.5", w2 === m2.weight, `導出=${w2} 値=${m2.weight}`);
}

/* ---------- (3) 他教材のホルムアルデヒド分子量との一致 ---------- */
{
  const aldehydeData = JSON.parse(readFileSync(join(root, "data/aldehyde-ketone-nomenclature.json"), "utf8"));
  const formaldehyde = aldehydeData.aldehydes.find((x) => x.commonName === "formaldehyde");
  check("aldehyde-ketone-nomenclature.jsonにformaldehydeが見つかる", !!formaldehyde, "commonName===\"formaldehyde\"の項目が見つからない");
  if (formaldehyde) {
    check(
      "data/aldehyde-ketone-nomenclature.jsonのformaldehydeの分子量が30",
      formaldehyde.molecularWeight === 30,
      `値=${formaldehyde.molecularWeight}`
    );
  }
}

/* ---------- 結果出力 ---------- */
if (failures.length) {
  console.error(`[check-thermosetting-resin] ${failures.length}件の不一致\n` + failures.join("\n"));
  process.exit(1);
} else {
  console.log("[check-thermosetting-resin] すべての検算が一致しています");
}
