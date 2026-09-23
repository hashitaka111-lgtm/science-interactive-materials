// 合成繊維(chem-synthetic-fiber)の検算スクリプト。
// (1) html/synthetic-fiber.html に埋め込んだDATAがdata/synthetic-fiber.jsonと完全一致すること
// (2) 6物質の分子量が、各fiberのsourceフィールドに書かれた検算式(原子量からの計算)と一致すること
// を検査する。Node標準機能のみ。
//   node scripts/check-synthetic-fiber.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const ORIGINAL = JSON.parse(readFileSync(join(root, "data/synthetic-fiber.json"), "utf8"));
const HTML = readFileSync(join(root, "html/synthetic-fiber.html"), "utf8");

const failures = [];
function check(label, cond, detail) {
  if (!cond) failures.push(`${label}: ${detail}`);
}

/* ---------- (1) 埋め込みJSONが原本と完全一致するか ---------- */
const m = HTML.match(/^const DATA = (.+);$/m);
check("埋め込みDATAが1行で見つかる", !!m, "html/synthetic-fiber.html に `const DATA = ...;` の行が見つからない");
if (m) {
  const embedded = JSON.parse(m[1]);
  const a = JSON.stringify(embedded);
  const b = JSON.stringify(ORIGINAL);
  check("埋め込みDATAがdata/synthetic-fiber.jsonと完全一致", a === b, a === b ? "" : "JSON.stringifyの結果が一致しない(内容の差分あり)");
}

/* ---------- (2) 原子量からの検算 ---------- */
const AW = ORIGINAL.meta.atomicWeights; // {H:1, C:12, N:14, O:16}
const CL = 35.5; // meta.atomicWeightsには無いが、aramidのsourceフィールドで明示されている値
const byId = Object.fromEntries(ORIGINAL.fibers.map((f) => [f.id, f]));

// nylon66: chem-polymer-degreeの確定値の引用。この教材では計算し直さないが、
// 「引用元と同じ値であること」自体はここで確認する(146+116-2*18=226)。
{
  const f = byId.nylon66;
  const [m1, m2] = f.monomers;
  const sum = m1.weight + m2.weight - f.leavingCountPerUnit * 18;
  check("nylon66: モノマー差引き(146+116-2×18)が226", sum === 226, `導出=${sum}`);
  check("nylon66: repeatUnitWeightが226", f.repeatUnitWeight === 226, `値=${f.repeatUnitWeight}`);
}

// nylon6: C6H11NO(環状) = 6C+11H+1N+1O
{
  const f = byId.nylon6;
  const m0 = f.monomers[0];
  const w = 6 * AW.C + 11 * AW.H + AW.N + AW.O;
  check("nylon6: モノマー分子量(C6H11NO)が113", w === m0.weight, `導出=${w} 値=${m0.weight}`);
  check("nylon6: repeatUnitWeightがモノマー分子量と一致(開環重合で脱離なし)", f.repeatUnitWeight === m0.weight, `repeatUnitWeight=${f.repeatUnitWeight} monomer=${m0.weight}`);
}

// aramid: p-フェニレンジアミン C6H8N2、テレフタル酸ジクロリド C8H4Cl2O2、
// 繰り返し単位 C14H10N2O2。2通りの検算(原子から直接積算／モノマー差引き)が一致すること。
{
  const f = byId.aramid;
  const [m1, m2] = f.monomers;
  const w1 = 6 * AW.C + 8 * AW.H + 2 * AW.N;
  const w2 = 8 * AW.C + 4 * AW.H + 2 * CL + 2 * AW.O;
  check("aramid: p-フェニレンジアミン(C6H8N2)が108", w1 === m1.weight, `導出=${w1} 値=${m1.weight}`);
  check("aramid: テレフタル酸ジクロリド(C8H4Cl2O2)が203", w2 === m2.weight, `導出=${w2} 値=${m2.weight}`);
  const viaAtoms = 14 * AW.C + 10 * AW.H + 2 * AW.N + 2 * AW.O;
  const viaMonomers = w1 + w2 - f.leavingCountPerUnit * (CL + AW.H); // 脱離するのはHCl(塩化水素)であり、Cl単独ではない
  check("aramid: 繰り返し単位(原子から直接積算, C14H10N2O2)が238", viaAtoms === 238, `導出=${viaAtoms}`);
  check("aramid: 繰り返し単位(モノマー差引き)が238", viaMonomers === 238, `導出=${viaMonomers}`);
  check("aramid: 2通りの検算が一致", viaAtoms === viaMonomers, `原子積算=${viaAtoms} モノマー差引き=${viaMonomers}`);
  check("aramid: repeatUnitWeightが238", f.repeatUnitWeight === 238, `値=${f.repeatUnitWeight}`);
  check("aramid: leavingWeight(HCl)が36.5", f.leavingWeight === CL + AW.H, `値=${f.leavingWeight}`);
}

// pet: chem-polymer-degreeの確定値の引用。166+62-2*18=192であることを確認する。
{
  const f = byId.pet;
  const [m1, m2] = f.monomers;
  const sum = m1.weight + m2.weight - f.leavingCountPerUnit * 18;
  check("pet: モノマー差引き(166+62-2×18)が192", sum === 192, `導出=${sum}`);
  check("pet: repeatUnitWeightが192", f.repeatUnitWeight === 192, `値=${f.repeatUnitWeight}`);
}

// vinylon: 3段階。酢酸ビニルC4H6O2=86、PVA繰り返し単位C2H4O=44、
// アセタール化単位 = PVA単位2個(44×2=88) + ホルムアルデヒド(30) - 水(18) = 100
{
  const f = byId.vinylon;
  const [s1, s2, s3] = f.stages;
  const w1 = 4 * AW.C + 6 * AW.H + 2 * AW.O;
  check("vinylon step1: 酢酸ビニル(C4H6O2)が86", w1 === s1.monomer.weight, `導出=${w1} 値=${s1.monomer.weight}`);
  const w2 = 2 * AW.C + 4 * AW.H + AW.O;
  check("vinylon step2: PVA繰り返し単位(C2H4O)が44", w2 === s2.repeatUnitWeight, `導出=${w2} 値=${s2.repeatUnitWeight}`);
  const w3reagent = AW.C + 2 * AW.H + AW.O;
  check("vinylon step3: ホルムアルデヒド(HCHO)が30", w3reagent === s3.reagent.weight, `導出=${w3reagent} 値=${s3.reagent.weight}`);
  const w3leaving = 2 * AW.H + AW.O;
  check("vinylon step3: 脱離する水(H2O)が18", w3leaving === s3.leavingWeight, `導出=${w3leaving} 値=${s3.leavingWeight}`);
  const acetalized = s2.repeatUnitWeight * 2 + s3.reagent.weight - s3.leavingWeight;
  check("vinylon step3: アセタール化単位(88+30-18)が100", acetalized === 100, `導出=${acetalized}`);
  check("vinylon step3: acetalizedRepeatUnitWeightが100", s3.acetalizedRepeatUnitWeight === 100, `値=${s3.acetalizedRepeatUnitWeight}`);
}

// acrylic: アクリロニトリル C3H3N = 53
{
  const f = byId.acrylic;
  const m0 = f.monomers[0];
  const w = 3 * AW.C + 3 * AW.H + AW.N;
  check("acrylic: アクリロニトリル(C3H3N)が53", w === m0.weight, `導出=${w} 値=${m0.weight}`);
  check("acrylic: repeatUnitWeightがモノマー分子量と一致(付加重合)", f.repeatUnitWeight === m0.weight, `repeatUnitWeight=${f.repeatUnitWeight} monomer=${m0.weight}`);
}

/* ---------- 結果出力 ---------- */
if (failures.length) {
  console.error(`[check-synthetic-fiber] ${failures.length}件の不一致\n` + failures.join("\n"));
  process.exit(1);
} else {
  console.log("[check-synthetic-fiber] すべての検算が一致しています");
}
