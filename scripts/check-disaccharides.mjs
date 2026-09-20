// 二糖類の構造・還元性・分解酵素(chem-disaccharides)の化学的な整合性を検算する。
// data/disaccharides.json と data/monosaccharide-structure.json から値を導出し、
// 指示文(仕様)に書かれた確定値と一致するかを検査する。Node標準機能のみ。
//   node scripts/check-disaccharides.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA = JSON.parse(readFileSync(join(root, "data/disaccharides.json"), "utf8"));
const MONO = JSON.parse(readFileSync(join(root, "data/monosaccharide-structure.json"), "utf8"));

const failures = [];
function check(label, cond, detail) {
  if (!cond) failures.push(`${label}: ${detail}`);
}

const byId = new Map(DATA.disaccharides.map((d) => [d.id, d]));
const rings = DATA.ringConfigSource.rings;

/* ---------- (1) すべてC12H22O11=342、加水分解342+18=360=180×2 ---------- */
const { H, C, O } = DATA.meta.atomicWeights;
const diMw = 12 * C + 22 * H + 11 * O;
check("二糖の分子量342", diMw === 342, `計算値=${diMw}`);
const monoMw = 6 * C + 12 * H + 6 * O;
const waterMw = 2 * H + O;
check("加水分解 342+18=360", diMw + waterMw === 360, `計算値=${diMw + waterMw}`);
check("加水分解 360=180×2", diMw + waterMw === monoMw * 2, `計算値=${diMw + waterMw} 単糖×2=${monoMw * 2}`);
check("disaccharides 4種", DATA.disaccharides.length === 4, `件数=${DATA.disaccharides.length}`);
for (const d of DATA.disaccharides) {
  check(`分子量342[${d.id}]`, DATA.formula.disaccharideMolecularWeight === 342, d.id);
}

/* ---------- (2) ハース式の上下を単糖類の構造のフィッシャー配置から導出して一致 ---------- */
function deriveConfig(tree, id) {
  const treeById = new Map(tree.map((n) => [n.id, n]));
  function go(nid) {
    const n = treeById.get(nid);
    if (n.branch === null) return "";
    const parentConfig = n.parentId ? go(n.parentId) : "";
    return n.branch + parentConfig;
  }
  return go(id);
}
const glucoseCfg = deriveConfig(MONO.aldoseTree, "glucose"); // 位置0=C2,1=C3,2=C4,3=C5(D判定)
const galactoseCfg = deriveConfig(MONO.aldoseTree, "galactose");
const fructoseCfg = deriveConfig(MONO.ketoseTree, "fructose"); // 位置0=C3,1=C4,2=C5(D判定)
check("グルコース配置RLRR", glucoseCfg === "RLRR", `導出=${glucoseCfg}`);
check("ガラクトース配置RLLR", galactoseCfg === "RLLR", `導出=${galactoseCfg}`);
check("フルクトース配置LRR", fructoseCfg === "LRR", `導出=${fructoseCfg}`);

// ハース則: 右(R)のOH=環の下(up:false)、左(L)のOH=環の上(up:true)。D系列のC6は常にup:true。
const R2up = (c) => c === "L"; // Rなら下(false)、Lなら上(true)

function expectPyranoseSubstituents(cfg) {
  // cfg = [C2,C3,C4,C5] (C5は末尾のD判定文字。C5自体はCH2OH=C6を介して常にup)
  return [
    { carbon: "C2", group: "OH", up: R2up(cfg[0]) },
    { carbon: "C3", group: "OH", up: R2up(cfg[1]) },
    { carbon: "C4", group: "OH", up: R2up(cfg[2]) },
    { carbon: "C5", group: "CH2OH", labelCarbon: "C6", up: true },
  ];
}
function expectFuranoseSubstituents(cfg) {
  // cfg = [C3,C4,C5] (C5は末尾のD判定文字)
  return [
    { carbon: "C3", group: "OH", up: R2up(cfg[0]) },
    { carbon: "C4", group: "OH", up: R2up(cfg[1]) },
    { carbon: "C5", group: "CH2OH", labelCarbon: "C6", up: true },
  ];
}

check(
  "グルコピラノース上下",
  JSON.stringify(rings.glucopyranose.substituents) === JSON.stringify(expectPyranoseSubstituents(glucoseCfg.split(""))),
  `導出=${JSON.stringify(expectPyranoseSubstituents(glucoseCfg.split("")))}`
);
check(
  "ガラクトピラノース上下",
  JSON.stringify(rings.galactopyranose.substituents) === JSON.stringify(expectPyranoseSubstituents(galactoseCfg.split(""))),
  `導出=${JSON.stringify(expectPyranoseSubstituents(galactoseCfg.split("")))}`
);
check(
  "フルクトフラノース上下",
  JSON.stringify(rings.fructofuranose.substituents) === JSON.stringify(expectFuranoseSubstituents(fructoseCfg.split(""))),
  `導出=${JSON.stringify(expectFuranoseSubstituents(fructoseCfg.split("")))}`
);
// アノマー則: C1(フルクトースはC2)のOHが、C6(CH2OH)と反対側=α(下)・同じ側=β(上)。C6は常に上なので、そのままalphaUp:false, betaUp:true。
for (const [ringId, ring] of Object.entries(rings)) {
  check(`アノマー則[${ringId}]`, ring.anomer.alphaUp === false && ring.anomer.betaUp === true, JSON.stringify(ring.anomer));
}
// ガラクトースはグルコースのC4エピマー(C4だけ向きが違い、他は一致)
const gl = rings.glucopyranose.substituents,
  ga = rings.galactopyranose.substituents;
for (let i = 0; i < gl.length; i++) {
  const same = gl[i].carbon !== "C4" ? gl[i].up === ga[i].up : gl[i].up !== ga[i].up;
  check(`C4エピマー一致[${gl[i].carbon}]`, same, `glucose.up=${gl[i].up} galactose.up=${ga[i].up}`);
}

/* ---------- (3) 還元性: 遊離のヘミアセタール性OHの有無から算出 ---------- */
// 各unitについて、bondCarbonがそのring(anomericCarbon)と一致すれば結合に使われた側=ヘミアセタールなし。
// 一致しなければ、その環自身のアノマー炭素は結合に使われておらず遊離のヘミアセタール性OHが残る=還元性あり。
function unitHasFreeHemiacetal(unit) {
  const ring = rings[unit.ring];
  return unit.bondCarbon !== ring.anomericCarbon;
}
function isReducing(d) {
  return d.units.some(unitHasFreeHemiacetal);
}
const EXPECTED_REDUCING = { maltose: true, sucrose: false, lactose: true, cellobiose: true };
for (const [id, expected] of Object.entries(EXPECTED_REDUCING)) {
  const d = byId.get(id);
  const derived = isReducing(d);
  check(`還元性[${id}]`, derived === expected, `導出=${derived} 期待=${expected}`);
}

/* ---------- (4) OCH3の数と分子量(メチル化による結合位置の決定) ---------- */
// 全positionsは5個(ヘキソース1分子あたりOHは常に5箇所)。bondCarbonの1箇所は結合で失われ、
// 残りはすべてメチル化される(還元末端自身のヘミアセタール性OHもメチル化されメチルグリコシドになる)。
// 加水分解では、bondCarbonが再び遊離OHになるのに加え、
// 「自分自身のアノマー炭素がbondCarbonと異なる(=還元末端)」場合はそのメチルグリコシドも加水分解されて遊離OHに戻る。
function methylationFor(unit) {
  const ring = rings[unit.ring];
  const positions = ring.positions; // 5箇所
  const pre = positions.filter((p) => p !== unit.bondCarbon);
  const ownAnomericFree = unit.bondCarbon !== ring.anomericCarbon;
  const post = ownAnomericFree ? pre.filter((p) => p !== ring.anomericCarbon) : pre;
  return { pre, post, preCount: pre.length, postCount: post.length };
}
function methylationForDisaccharide(d) {
  const results = d.units.map(methylationFor);
  return {
    preTotal: results.reduce((s, r) => s + r.preCount, 0),
    postTotal: results.reduce((s, r) => s + r.postCount, 0),
    units: results,
  };
}
const sucroseMeth = methylationForDisaccharide(byId.get("sucrose"));
check("スクロース 完全メチル化8個", sucroseMeth.preTotal === 8, `導出=${sucroseMeth.preTotal}`);
check("スクロース 加水分解後8個", sucroseMeth.postTotal === 8, `導出=${sucroseMeth.postTotal}`);
check(
  "スクロース 両ユニットともテトラ(4個)",
  sucroseMeth.units.every((u) => u.postCount === 4),
  JSON.stringify(sucroseMeth.units)
);

const maltoseMeth = methylationForDisaccharide(byId.get("maltose"));
check("マルトース 完全メチル化8個", maltoseMeth.preTotal === 8, `導出=${maltoseMeth.preTotal}`);
check("マルトース 加水分解後7個", maltoseMeth.postTotal === 7, `導出=${maltoseMeth.postTotal}`);
check(
  "マルトース 非還元末端テトラ(4)・還元末端トリ(3)",
  maltoseMeth.units[0].postCount === 4 && maltoseMeth.units[1].postCount === 3,
  JSON.stringify(maltoseMeth.units)
);
check(
  "マルトース還元末端の遊離OH位置=C1・C4",
  JSON.stringify(rings.glucopyranose.positions.filter((p) => !maltoseMeth.units[1].post.includes(p))) === JSON.stringify(["C1", "C4"]),
  JSON.stringify(maltoseMeth.units[1])
);

// 分子量: テトラ-O-メチルヘキソース236、トリ-O-メチルヘキソース222
const methylMw = (methylCount) => monoMw + 14 * methylCount;
check("テトラ-O-メチルヘキソース236", methylMw(4) === 236, `計算値=${methylMw(4)}`);
check("トリ-O-メチルヘキソース222", methylMw(3) === 222, `計算値=${methylMw(3)}`);

/* ---------- 結果出力 ---------- */
if (failures.length) {
  console.error(`[check-disaccharides] ${failures.length}件の不一致\n` + failures.join("\n"));
  process.exit(1);
} else {
  console.log("[check-disaccharides] すべての検算が一致しています");
}
