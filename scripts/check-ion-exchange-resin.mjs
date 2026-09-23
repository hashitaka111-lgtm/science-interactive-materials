// イオン交換樹脂(chem-ion-exchange-resin)の検算スクリプト。
// (1) html/ion-exchange-resin.html に埋め込んだDATAがdata/ion-exchange-resin.jsonと完全一致すること
// (2) スチレン(104)・ジビニルベンゼン(130)・SO3基(80)の分子量/式量が原子量からの計算値と一致すること
// (3) スチレンの分子量104が、data/synthetic-rubber.jsonのSBR側のスチレンと同じ値であること
// を検査する。Node標準機能のみ。
//   node scripts/check-ion-exchange-resin.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const ORIGINAL = JSON.parse(readFileSync(join(root, "data/ion-exchange-resin.json"), "utf8"));
const HTML = readFileSync(join(root, "html/ion-exchange-resin.html"), "utf8");

const failures = [];
function check(label, cond, detail) {
  if (!cond) failures.push(`${label}: ${detail}`);
}

/* ---------- (1) 埋め込みJSONが原本と完全一致するか ---------- */
const m = HTML.match(/^const DATA = (.+);$/m);
check("埋め込みDATAが1行で見つかる", !!m, "html/ion-exchange-resin.html に `const DATA = ...;` の行が見つからない");
if (m) {
  const embedded = JSON.parse(m[1]);
  const a = JSON.stringify(embedded);
  const b = JSON.stringify(ORIGINAL);
  check("埋め込みDATAがdata/ion-exchange-resin.jsonと完全一致", a === b, a === b ? "" : "JSON.stringifyの結果が一致しない(内容の差分あり)");
}

/* ---------- (2) 原子量からの検算 ---------- */
const AW = ORIGINAL.meta.atomicWeights; // {H:1, C:12, O:16, S:32, Cl:35.5, Na:23}

// スチレン C8H8 = 104
{
  const styrene = ORIGINAL.synthesis.monomers.find((x) => x.name === "スチレン");
  const w = 8 * AW.C + 8 * AW.H;
  check("スチレン(C8H8)が104", w === styrene.weight, `導出=${w} 値=${styrene.weight}`);
}

// ジビニルベンゼン C10H10 = 130
{
  const dvb = ORIGINAL.synthesis.monomers.find((x) => x.name.indexOf("ジビニルベンゼン") === 0);
  const w = 10 * AW.C + 10 * AW.H;
  check("ジビニルベンゼン(C10H10)が130", w === dvb.weight, `導出=${w} 値=${dvb.weight}`);
}

// SO3基 = 80
{
  const mc = ORIGINAL.cationExchangeResin.massChange;
  const w = AW.S + 3 * AW.O;
  check("SO3基の式量が80", w === mc.formulaWeight, `導出=${w} 値=${mc.formulaWeight}`);
}

/* ---------- (3) 他教材(chem-synthetic-rubber)のスチレンとの一致 ---------- */
{
  const rubberData = JSON.parse(readFileSync(join(root, "data/synthetic-rubber.json"), "utf8"));
  const sbr = rubberData.rubbers.find((r) => r.id === "sbr");
  check("data/synthetic-rubber.jsonにsbrが見つかる", !!sbr, 'id==="sbr"の項目が見つからない');
  if (sbr) {
    const styreneRubberSide = sbr.monomers.find((mo) => mo.name === "スチレン");
    const styreneResinSide = ORIGINAL.synthesis.monomers.find((mo) => mo.name === "スチレン");
    check(
      "この教材のスチレンとchem-synthetic-rubber(SBR)のスチレンが同じ分子量(104)",
      styreneRubberSide.weight === styreneResinSide.weight && styreneResinSide.weight === 104,
      `rubber側=${styreneRubberSide.weight} resin側=${styreneResinSide.weight}`
    );
  }
}

/* ---------- 結果出力 ---------- */
if (failures.length) {
  console.error(`[check-ion-exchange-resin] ${failures.length}件の不一致\n` + failures.join("\n"));
  process.exit(1);
} else {
  console.log("[check-ion-exchange-resin] すべての検算が一致しています");
}
