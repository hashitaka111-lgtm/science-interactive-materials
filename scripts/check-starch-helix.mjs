// デンプンとシクロデキストリンのらせん構造(chem-starch-helix)の化学的な整合性を検算する。
// data/starch-helix.json に書かれた確定値が、原子量H=1.0,C=12.0,O=16.0からの計算式と
// 一致するかを検査する。Node標準機能のみ。
//   node scripts/check-starch-helix.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA = JSON.parse(readFileSync(join(root, "data/starch-helix.json"), "utf8"));
const { H, C, O } = DATA.meta.atomicWeights;

const failures = [];
function check(label, cond, detail) {
  if (!cond) failures.push(`${label}: ${detail}`);
}

/* ---------- (1) マルトースの分子量 ---------- */
// C12H22O11 = グルコース(C6H12O6=180)×2 − H2O(18)
const glucoseMw = 6 * C + 12 * H + 6 * O;
check("グルコースの分子量180", glucoseMw === 180, `計算値=${glucoseMw}`);
const maltoseMw = 12 * C + 22 * H + 11 * O;
check("マルトースの分子量342(C12H22O11)", maltoseMw === 342, `計算値=${maltoseMw}`);
check("マルトース=グルコース×2−水", maltoseMw === glucoseMw * 2 - (2 * H + O), `342 !== ${glucoseMw * 2 - (2 * H + O)}`);
check(
  "data.jsonのマルトース分子量が342と一致",
  DATA.glycosidicBond.maltose.molecularWeight === 342,
  `data.json=${DATA.glycosidicBond.maltose.molecularWeight}`
);

/* ---------- (2) アミロース 162n+18 ---------- */
// 繰り返し単位(C6H10O5, 式量162)がn個+両端のH・OH(18)。n=2で二糖(342)と一致することを確認。
function amylosePolyMw(n) {
  const unit = 6 * C + 10 * H + 5 * O;
  return unit * n + (H + (O + H));
}
check("アミロース単位式量162", 6 * C + 10 * H + 5 * O === 162, `計算値=${6 * C + 10 * H + 5 * O}`);
check("アミロース n=2で342(二糖と一致)", amylosePolyMw(2) === 342, `計算値=${amylosePolyMw(2)}`);
check("アミロース n=1で180(単糖と一致)", amylosePolyMw(1) === 180, `計算値=${amylosePolyMw(1)}`);

/* ---------- (3) シクロデキストリン 162n(環状で+18が付かない) ---------- */
const EXPECTED_CD = { alpha: { units: 6, mw: 972 }, beta: { units: 7, mw: 1134 }, gamma: { units: 8, mw: 1296 } };
for (const v of DATA.cyclodextrin.variants) {
  const exp = EXPECTED_CD[v.id];
  check(`シクロデキストリン[${v.id}]の単位数`, v.units === exp.units, `data.json=${v.units} 期待=${exp.units}`);
  const calcMw = 162 * v.units;
  check(`シクロデキストリン[${v.id}]の分子量=162×単位数`, calcMw === exp.mw, `計算値=${calcMw} 期待=${exp.mw}`);
  check(`シクロデキストリン[${v.id}]のdata.json分子量`, v.molecularWeight === exp.mw, `data.json=${v.molecularWeight} 期待=${exp.mw}`);
}
// 単位数6・7・8そのものの検算(α<β<γの順で1つずつ増える)
const units = DATA.cyclodextrin.variants.map((v) => v.units);
check("シクロデキストリンの単位数が6,7,8の順", JSON.stringify(units) === JSON.stringify([6, 7, 8]), JSON.stringify(units));

/* ---------- (4) らせん: 60°×6残基=360°(1巻き) ---------- */
const { residuesPerTurn, degPerResidue } = DATA.helix;
check("らせんの残基数6", residuesPerTurn === 6, `data.json=${residuesPerTurn}`);
check("らせんの1残基あたり60°", degPerResidue === 60, `data.json=${degPerResidue}`);
check("60°×6残基=360°(1巻き)", degPerResidue * residuesPerTurn === 360, `計算値=${degPerResidue * residuesPerTurn}`);
// α-シクロデキストリンの単位数(6)とらせんの1巻きの残基数(6)が一致すること
// (「α-シクロデキストリンはアミロースのらせん1巻き分を環に閉じた形」という説明の前提)
check(
  "α-シクロデキストリンの単位数とらせん1巻きの残基数が一致",
  EXPECTED_CD.alpha.units === residuesPerTurn,
  `α単位数=${EXPECTED_CD.alpha.units} 残基数=${residuesPerTurn}`
);

/* ---------- (5) ヨウ素デンプン反応: 呈色する糖・しない糖の整合 ---------- */
const reactingSugars = DATA.iodineReaction.sugars.filter((s) => s.reacts);
const nonReactingSugars = DATA.iodineReaction.sugars.filter((s) => !s.reacts);
for (const s of reactingSugars) {
  check(`呈色する[${s.id}]は色コードを持つ`, typeof s.colorHex === "string" && /^#[0-9A-Fa-f]{6}$/.test(s.colorHex), `colorHex=${s.colorHex}`);
}
for (const s of nonReactingSugars) {
  check(`呈色しない[${s.id}]は色コードを持たない`, s.colorHex === null, `colorHex=${s.colorHex}`);
}
check("呈色する糖が3種(アミロース・アミロペクチン・グリコーゲン)", reactingSugars.length === 3, `件数=${reactingSugars.length}`);
check("呈色しない糖が2種(セルロース・単糖二糖)", nonReactingSugars.length === 2, `件数=${nonReactingSugars.length}`);

/* ---------- 結果出力 ---------- */
if (failures.length) {
  console.error(`[check-starch-helix] ${failures.length}件の不一致\n` + failures.join("\n"));
  process.exit(1);
} else {
  console.log("[check-starch-helix] すべての検算が一致しています");
}
