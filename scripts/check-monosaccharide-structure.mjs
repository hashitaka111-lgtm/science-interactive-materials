// 単糖類の構造(chem-monosaccharide-structure)の化学的な整合性を検算する。
// data/monosaccharide-structure.json の親子則・軸性規則・分子量式から値を導出し、
// 指示文(仕様)に書かれた確定値の表と一致するかを検査する。Node標準機能のみ。
//   node scripts/check-monosaccharide-structure.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA = JSON.parse(readFileSync(join(root, "data/monosaccharide-structure.json"), "utf8"));

const failures = [];
function check(label, cond, detail) {
  if (!cond) failures.push(`${label}: ${detail}`);
}

/* ---------- (1) 親子則からフィッシャー配置を導出 ---------- */
// config = 親の配置の前に新しいC2の文字(branch)を足したもの(親自身がrootなら branch そのもの)。
// 位置0=C2, 位置1=C3, ... 位置末尾=カルボニルから最も遠い不斉炭素(D/L判定の文字)。
function deriveConfig(tree, id) {
  const byId = new Map(tree.map((n) => [n.id, n]));
  function go(nid) {
    const n = byId.get(nid);
    if (n.branch === null) return "";
    const parentConfig = n.parentId ? go(n.parentId) : "";
    return n.branch + parentConfig;
  }
  return go(id);
}

const EXPECTED_ALDOSE = {
  glyceraldehyde: "R",
  erythrose: "RR", threose: "LR",
  ribose: "RRR", arabinose: "LRR", xylose: "RLR", lyxose: "LLR",
  allose: "RRRR", altrose: "LRRR", glucose: "RLRR", mannose: "LLRR",
  gulose: "RRLR", idose: "LRLR", galactose: "RLLR", talose: "LLLR",
};
check("アルドース15種", DATA.aldoseTree.length === 15, `件数が${DATA.aldoseTree.length}件`);
for (const node of DATA.aldoseTree) {
  const derived = deriveConfig(DATA.aldoseTree, node.id);
  const expected = EXPECTED_ALDOSE[node.id];
  check(`アルドース配置[${node.id}]`, derived === expected, `導出=${derived} 期待=${expected}`);
  // D/L判定文字(最後の文字)は常にRのはず(D系列ツリーのため)
  check(`アルドースD判定[${node.id}]`, derived.at(-1) === "R", `最後の文字=${derived.at(-1)}`);
}

const EXPECTED_KETOSE = {
  dihydroxyacetone: "",
  erythrulose: "R",
  ribulose: "RR", xylulose: "LR",
  psicose: "RRR", fructose: "LRR", sorbose: "RLR", tagatose: "LLR",
};
check("ケトース8種", DATA.ketoseTree.length === 8, `件数が${DATA.ketoseTree.length}件`);
for (const node of DATA.ketoseTree) {
  const derived = deriveConfig(DATA.ketoseTree, node.id);
  const expected = EXPECTED_KETOSE[node.id];
  check(`ケトース配置[${node.id}]`, derived === expected, `導出=${derived} 期待=${expected}`);
}

/* ---------- (2) L体・1か所反転の対応 ---------- */
const flip = (c) => (c === "R" ? "L" : "R");
const flipAll = (s) => s.split("").map(flip).join("");

// configString(D系列、必ず末尾R) → アルドースの名前 の逆引き表
const configToAldoseId = new Map(DATA.aldoseTree.map((n) => [deriveConfig(DATA.aldoseTree, n.id), n.id]));

// 与えられたconfig文字列(D/Lどちらでもよい)から D-または-L-接頭辞つきの名前を決める。
// 末尾がRならそのままD系列で引く。Lなら全反転(鏡像)してD系列で引き、L-を付ける。
function nameFromConfig(configStr) {
  if (configStr.at(-1) === "R") {
    const id = configToAldoseId.get(configStr);
    if (!id) throw new Error(`D系列の逆引きに失敗: ${configStr}`);
    return { prefix: "D", id };
  }
  const mirror = flipAll(configStr);
  const id = configToAldoseId.get(mirror);
  if (!id) throw new Error(`L系列の逆引きに失敗(鏡像${mirror}): ${configStr}`);
  return { prefix: "L", id };
}

const glucoseConfig = deriveConfig(DATA.aldoseTree, "glucose"); // "RLRR"
check("D-グルコース配置", glucoseConfig === "RLRR", `導出=${glucoseConfig}`);

// L体 = 全文字反転
const lGlucose = nameFromConfig(flipAll(glucoseConfig));
check("L体(全部反転)=鏡像=L-グルコース", lGlucose.prefix === "L" && lGlucose.id === "glucose", JSON.stringify(lGlucose));

// 1か所反転の検算(指示文の検算用セクションと一致させる)
const singleFlipCases = [
  { index: 0, expectedPrefix: "D", expectedId: "mannose", labelJa: "C2反転" },
  { index: 1, expectedPrefix: "D", expectedId: "allose", labelJa: "C3反転" },
  { index: 2, expectedPrefix: "D", expectedId: "galactose", labelJa: "C4反転" },
  { index: 3, expectedPrefix: "L", expectedId: "idose", labelJa: "C5反転" },
];
for (const c of singleFlipCases) {
  const chars = glucoseConfig.split("");
  chars[c.index] = flip(chars[c.index]);
  const flipped = chars.join("");
  const result = nameFromConfig(flipped);
  check(
    `${c.labelJa}(D-グルコース)`,
    result.prefix === c.expectedPrefix && result.id === c.expectedId,
    `導出=${result.prefix}-${result.id} 期待=${c.expectedPrefix}-${c.expectedId}`
  );
}

/* ---------- (3) いす形アキシアル置換基数 ---------- */
const CARBON_JA = { allose: "アロース", altrose: "アルトロース", glucose: "グルコース", mannose: "マンノース", gulose: "グロース", idose: "イドース", galactose: "ガラクトース", talose: "タロース" };
function axialCarbonsFor(id) {
  const cfg = deriveConfig(DATA.aldoseTree, id); // 4文字: C2,C3,C4,C5
  const rule = DATA.chairAxialRule.conditionsJa;
  const result = [];
  for (const r of rule) {
    if (cfg[r.positionIndex] === r.axialIfConfig) result.push(r.carbon);
  }
  return result;
}
for (const expected of DATA.chairAxialRule.expectedAxialCounts) {
  const derived = axialCarbonsFor(expected.id);
  const ok = JSON.stringify(derived) === JSON.stringify(expected.axialCarbonsJa);
  check(
    `アキシアル置換基[${CARBON_JA[expected.id]}]`,
    ok,
    `導出=${JSON.stringify(derived)} 期待=${JSON.stringify(expected.axialCarbonsJa)}`
  );
}
// 「アキシアル0個はグルコースだけ」という表の要点も検証する
const zeroAxialIds = DATA.chairAxialRule.expectedAxialCounts.filter((e) => e.axialCarbonsJa.length === 0).map((e) => e.id);
check("アキシアル0個はグルコースのみ", zeroAxialIds.length === 1 && zeroAxialIds[0] === "glucose", JSON.stringify(zeroAxialIds));

/* ---------- (4) 分子量 ---------- */
const { H, C, O } = DATA.meta.atomicWeights;
const monoMw = 6 * C + 12 * H + 6 * O; // C6H12O6
check("単糖の分子量180", monoMw === 180, `計算値=${monoMw}`);
const diMw = 12 * C + 22 * H + 11 * O; // C12H22O11
check("二糖の分子量342", diMw === 342, `計算値=${diMw}`);
function polyMw(x) {
  // H-[C6(H2O)5]x-OH = 繰り返し単位(C6H10O5, 式量162)がx個 + 両端のH・OH(18)
  const unit = 6 * C + 10 * H + 5 * O;
  return unit * x + (H + (O + H));
}
check("多糖 x=1で単糖と一致(180)", polyMw(1) === 180, `計算値=${polyMw(1)}`);
check("多糖 x=2で二糖と一致(342)", polyMw(2) === 342, `計算値=${polyMw(2)}`);

/* ---------- (5) いす形・舟形の3D座標と結合長 ---------- */
const D2R = Math.PI / 180;
function chairAtom(k) {
  const { ringRadiusAngstrom: r, zAmplitudeAngstrom: z } = DATA.chairGeometry;
  const ang = k * 60 * D2R;
  return { x: r * Math.cos(ang), y: r * Math.sin(ang), z: k % 2 === 0 ? z : -z };
}
function boatAtom(k) {
  const { ringRadiusAngstrom: r, zAmplitudeAngstrom: z, flagpoleIndices } = DATA.boatGeometry;
  const ang = k * 60 * D2R;
  return { x: r * Math.cos(ang), y: r * Math.sin(ang), z: flagpoleIndices.includes(k) ? z : 0 };
}
function dist3(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}
function checkRingBondLengths(label, atomFn) {
  for (let k = 0; k < 6; k++) {
    const a = atomFn(k);
    const b = atomFn((k + 1) % 6);
    const d = dist3(a, b);
    check(`${label} C${k + 1}-C${((k + 1) % 6) + 1}結合長`, d >= 1.5 && d <= 1.56, `${d.toFixed(4)}Å`);
  }
}
checkRingBondLengths("いす形", chairAtom);
checkRingBondLengths("舟形", boatAtom);

/* ---------- 結果出力 ---------- */
if (failures.length) {
  console.error(`[check-monosaccharide-structure] ${failures.length}件の不一致\n` + failures.join("\n"));
  process.exit(1);
} else {
  console.log("[check-monosaccharide-structure] すべての検算が一致しています");
}
