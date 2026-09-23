// 合成ゴム(chem-synthetic-rubber)の検算スクリプト。
// (1) html/synthetic-rubber.html に埋め込んだDATAがdata/synthetic-rubber.jsonと完全一致すること
// (2) 4物質のモノマー分子量が、各rubberのsourceフィールドに書かれた検算式(原子量からの計算)と一致すること
// (3) NBRのアクリロニトリルの分子量53が、data/synthetic-fiber.jsonのacrylicモノマーと同じ値であること
// を検査する。Node標準機能のみ。
//   node scripts/check-synthetic-rubber.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const ORIGINAL = JSON.parse(readFileSync(join(root, "data/synthetic-rubber.json"), "utf8"));
const HTML = readFileSync(join(root, "html/synthetic-rubber.html"), "utf8");

const failures = [];
function check(label, cond, detail) {
  if (!cond) failures.push(`${label}: ${detail}`);
}

/* ---------- (1) 埋め込みJSONが原本と完全一致するか ---------- */
const m = HTML.match(/^const DATA = (.+);$/m);
check("埋め込みDATAが1行で見つかる", !!m, "html/synthetic-rubber.html に `const DATA = ...;` の行が見つからない");
if (m) {
  const embedded = JSON.parse(m[1]);
  const a = JSON.stringify(embedded);
  const b = JSON.stringify(ORIGINAL);
  check("埋め込みDATAがdata/synthetic-rubber.jsonと完全一致", a === b, a === b ? "" : "JSON.stringifyの結果が一致しない(内容の差分あり)");
}

/* ---------- (2) 原子量からの検算 ---------- */
const AW = ORIGINAL.meta.atomicWeights; // {H:1, C:12, N:14}
const byId = Object.fromEntries(ORIGINAL.rubbers.map((r) => [r.id, r]));

// br: 1,3-ブタジエン C4H6 = 54
{
  const r = byId.br;
  const mo = r.monomers[0];
  const w = 4 * AW.C + 6 * AW.H;
  check("br: 1,3-ブタジエン(C4H6)が54", w === mo.weight, `導出=${w} 値=${mo.weight}`);
  check("br: repeatUnitWeightがモノマー分子量と一致(付加重合)", r.repeatUnitWeight === mo.weight, `repeatUnitWeight=${r.repeatUnitWeight} monomer=${mo.weight}`);
  // 1,4-付加・1,2-付加のどちらもモノマーの全原子を繰り返し単位に組み込むため、分子量は変わらない
  check("br: additionModesが2件", r.additionModes.length === 2, `件数=${r.additionModes.length}`);
}

// ir: イソプレン C5H8 = 68
{
  const r = byId.ir;
  const mo = r.monomers[0];
  const w = 5 * AW.C + 8 * AW.H;
  check("ir: イソプレン(C5H8)が68", w === mo.weight, `導出=${w} 値=${mo.weight}`);
  check("ir: repeatUnitWeightがモノマー分子量と一致(付加重合)", r.repeatUnitWeight === mo.weight, `repeatUnitWeight=${r.repeatUnitWeight} monomer=${mo.weight}`);
}

// nbr: アクリロニトリル C3H3N = 53、1,3-ブタジエン C4H6 = 54
{
  const r = byId.nbr;
  const acrylonitrile = r.monomers.find((x) => x.name === "アクリロニトリル");
  const butadiene = r.monomers.find((x) => x.name === "1,3-ブタジエン");
  const wAcn = 3 * AW.C + 3 * AW.H + AW.N;
  const wBd = 4 * AW.C + 6 * AW.H;
  check("nbr: アクリロニトリル(C3H3N)が53", wAcn === acrylonitrile.weight, `導出=${wAcn} 値=${acrylonitrile.weight}`);
  check("nbr: 1,3-ブタジエン(C4H6)が54", wBd === butadiene.weight, `導出=${wBd} 値=${butadiene.weight}`);
  check("nbr: repeatUnitWeightFormulaが'54n + 53m'", r.repeatUnitWeightFormula === "54n + 53m", `値=${r.repeatUnitWeightFormula}`);
}

// sbr: スチレン C8H8 = 104、1,3-ブタジエン C4H6 = 54
{
  const r = byId.sbr;
  const styrene = r.monomers.find((x) => x.name === "スチレン");
  const butadiene = r.monomers.find((x) => x.name === "1,3-ブタジエン");
  const wSty = 8 * AW.C + 8 * AW.H;
  const wBd = 4 * AW.C + 6 * AW.H;
  check("sbr: スチレン(C8H8)が104", wSty === styrene.weight, `導出=${wSty} 値=${styrene.weight}`);
  check("sbr: 1,3-ブタジエン(C4H6)が54", wBd === butadiene.weight, `導出=${wBd} 値=${butadiene.weight}`);
  check("sbr: repeatUnitWeightFormulaが'54n + 104m'", r.repeatUnitWeightFormula === "54n + 104m", `値=${r.repeatUnitWeightFormula}`);
}

/* ---------- (3) 他教材(chem-synthetic-fiber)のアクリロニトリルとの一致 ---------- */
{
  const fiberData = JSON.parse(readFileSync(join(root, "data/synthetic-fiber.json"), "utf8"));
  const acrylic = fiberData.fibers.find((f) => f.id === "acrylic");
  check("data/synthetic-fiber.jsonにacrylicが見つかる", !!acrylic, "id===\"acrylic\"の項目が見つからない");
  if (acrylic) {
    const acrylonitrileFiberSide = acrylic.monomers.find((mo) => mo.name === "アクリロニトリル");
    const acrylonitrileRubberSide = byId.nbr.monomers.find((mo) => mo.name === "アクリロニトリル");
    check(
      "NBRのアクリロニトリルとchem-synthetic-fiber(アクリル繊維)のアクリロニトリルが同じ分子量(53)",
      acrylonitrileFiberSide.weight === acrylonitrileRubberSide.weight && acrylonitrileRubberSide.weight === 53,
      `fiber側=${acrylonitrileFiberSide.weight} rubber側=${acrylonitrileRubberSide.weight}`
    );
  }
}

/* ---------- 結果出力 ---------- */
if (failures.length) {
  console.error(`[check-synthetic-rubber] ${failures.length}件の不一致\n` + failures.join("\n"));
  process.exit(1);
} else {
  console.log("[check-synthetic-rubber] すべての検算が一致しています");
}
