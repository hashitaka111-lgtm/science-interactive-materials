// ヌクレオチドの構造(chem-nucleotide-structure)の化学的な整合性を検算する。
// data/nucleotide-structure.json と data/monosaccharide-structure.json から値を導出し、
// 指示文(仕様)に書かれた確定値と一致するかを検査する。Node標準機能のみ。
//   node scripts/check-nucleotide-structure.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA = JSON.parse(readFileSync(join(root, "data/nucleotide-structure.json"), "utf8"));
const MONO = JSON.parse(readFileSync(join(root, "data/monosaccharide-structure.json"), "utf8"));

const failures = [];
function check(label, cond, detail) {
  if (!cond) failures.push(`${label}: ${detail}`);
}

const W = DATA.meta.atomicWeights; // {H,C,N,O,P}
const VALENCE = { H: 1, C: 4, N: 3, O: 2, P: 5 };
const baseById = new Map(DATA.bases.map((b) => [b.id, b]));
const sugarById = new Map(DATA.sugars.map((s) => [s.id, s]));
const nucleosideById = new Map(DATA.nucleosides.map((n) => [n.id, n]));

/* ---------- 原子・結合データから分子式(元素ごとの数)を求める汎用関数 ----------
   価数(C=4,N=3,O=2,P=5)から結合本数(order合計)を引いた残りを暗黙のHとする。
   原子idの先頭1文字を元素記号として扱う(このデータではすべての原子id・置換基idが
   元素記号で始まるため、それ以上の元素マップは不要)。 */
function formulaFromGraph(atomIds, bonds) {
  const bondSum = {};
  atomIds.forEach((id) => (bondSum[id] = 0));
  for (const b of bonds) {
    bondSum[b.a] += b.order;
    bondSum[b.b] += b.order;
  }
  const counts = {};
  let totalH = 0;
  for (const id of atomIds) {
    const el = id[0];
    counts[el] = (counts[el] || 0) + 1;
    const h = VALENCE[el] - bondSum[id];
    if (h < 0) throw new Error(`価数超過: ${id} (結合数=${bondSum[id]} 価数=${VALENCE[el]})`);
    totalH += h;
  }
  counts.H = (counts.H || 0) + totalH;
  return counts;
}
function buildBaseGraph(base) {
  const ringSet = new Set([...(base.sixRing || []), ...(base.fiveRing || [])]);
  const atomIds = [...ringSet];
  const bonds = base.ringBonds.map((b) => ({ a: b.a, b: b.b, order: b.order }));
  for (const s of base.substituents || []) {
    const subId = s.id || `${s.group[0]}@${s.atom}`;
    atomIds.push(subId);
    bonds.push({ a: s.atom, b: subId, order: s.order || 1 });
  }
  return { atomIds, bonds };
}
function buildSugarGraph(skeleton, sugar) {
  const atomIds = [...skeleton.ringAtoms, skeleton.exocyclicAtom];
  const bonds = skeleton.ringBonds.map(([a, b]) => ({ a, b, order: 1 }));
  bonds.push({ a: skeleton.exocyclicAttach, b: skeleton.exocyclicAtom, order: 1 });
  for (const s of sugar.substituents || []) {
    const subId = s.id || `${s.group[0]}@${s.atom}`;
    atomIds.push(subId);
    bonds.push({ a: s.atom, b: subId, order: s.order || 1 });
  }
  return { atomIds, bonds };
}
function parseFormula(f) {
  const re = /([A-Z][a-z]?)(\d*)/g;
  const counts = {};
  let m;
  while ((m = re.exec(f))) {
    if (!m[1]) continue;
    counts[m[1]] = (counts[m[1]] || 0) + (m[2] ? parseInt(m[2], 10) : 1);
  }
  return counts;
}
function mwFromCounts(counts, weights) {
  return Object.entries(counts).reduce((s, [el, n]) => s + n * (weights[el] || 0), 0);
}
function formulaEqual(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) if ((a[k] || 0) !== (b[k] || 0)) return false;
  return true;
}

/* ---------- (1) 塩基5種: 原子の価数からHを求め、分子式・分子量が確定値と一致 ---------- */
for (const base of DATA.bases) {
  const { atomIds, bonds } = buildBaseGraph(base);
  const counts = formulaFromGraph(atomIds, bonds);
  const expected = parseFormula(base.formula);
  check(`塩基の分子式[${base.id}]`, formulaEqual(counts, expected), `導出=${JSON.stringify(counts)} 期待=${JSON.stringify(expected)}(${base.formula})`);
  const mw = mwFromCounts(counts, W);
  check(`塩基の分子量[${base.id}]`, mw === base.molecularWeight, `導出=${mw} 期待=${base.molecularWeight}`);
}

/* ---------- (2) 糖2種: 同様に分子式・分子量が確定値(150・134)と一致 ---------- */
for (const sugar of DATA.sugars) {
  const { atomIds, bonds } = buildSugarGraph(DATA.sugarSkeleton, sugar);
  const counts = formulaFromGraph(atomIds, bonds);
  const expected = parseFormula(sugar.formula);
  check(`糖の分子式[${sugar.id}]`, formulaEqual(counts, expected), `導出=${JSON.stringify(counts)} 期待=${JSON.stringify(expected)}(${sugar.formula})`);
  const mw = mwFromCounts(counts, W);
  check(`糖の分子量[${sugar.id}]`, mw === sugar.molecularWeight, `導出=${mw} 期待=${sugar.molecularWeight}`);
}

/* ---------- (3) ヌクレオシド=塩基+糖−18、ヌクレオチド=ヌクレオシド+80 (16個の値と一致) ---------- */
for (const ns of DATA.nucleosides) {
  const base = baseById.get(ns.baseId);
  const sugar = sugarById.get(ns.sugarId);
  const derived = base.molecularWeight + sugar.molecularWeight - DATA.assembly.waterLoss;
  check(`ヌクレオシド分子量[${ns.id}]`, derived === ns.molecularWeight, `導出=${derived} 期待=${ns.molecularWeight}`);
}
for (const nt of DATA.nucleotides) {
  const ns = nucleosideById.get(nt.nucleosideId);
  const derived = ns.molecularWeight + DATA.assembly.phosphateNetGain;
  check(`ヌクレオチド分子量[${nt.id}]`, derived === nt.molecularWeight, `導出=${derived} 期待=${nt.molecularWeight}`);
}
check("ヌクレオシド8種", DATA.nucleosides.length === 8, `件数=${DATA.nucleosides.length}`);
check("ヌクレオチド8種", DATA.nucleotides.length === 8, `件数=${DATA.nucleotides.length}`);

/* ---------- (4) ATP・ADP・AMPの分子式と分子量(507・427・347) ---------- */
{
  const amp = DATA.atp.amp,
    adp = DATA.atp.adp,
    atpEntry = DATA.atp.atpEntry;
  for (const [label, entry] of [
    ["AMP", amp],
    ["ADP", adp],
    ["ATP", atpEntry],
  ]) {
    const mw = mwFromCounts(parseFormula(entry.formula), W);
    check(`${label}の分子量`, mw === entry.molecularWeight, `導出=${mw} 期待=${entry.molecularWeight}(${entry.formula})`);
  }
  check("ADP=AMP+80", adp.molecularWeight === amp.molecularWeight + DATA.assembly.phosphateNetGain, `AMP=${amp.molecularWeight} ADP=${adp.molecularWeight}`);
  check("ATP=ADP+80", atpEntry.molecularWeight === adp.molecularWeight + DATA.assembly.phosphateNetGain, `ADP=${adp.molecularWeight} ATP=${atpEntry.molecularWeight}`);
  const ampNucleotide = DATA.nucleotides.find((n) => n.id === "AMP");
  check("AMPの分子量がヌクレオチド一覧のAMPと一致", ampNucleotide.molecularWeight === amp.molecularWeight, `nucleotides.AMP=${ampNucleotide.molecularWeight} atp.amp=${amp.molecularWeight}`);
}

/* ---------- (5) 糖のハース式の上下を、monosaccharide-structure.jsonのリボースRRRから規則で導出して一致 ---------- */
function fischerChain(tree, id) {
  // 対象のidから親をたどってbranchを push すると、そのまま[C2,C3,...]の配置文字列になる
  // (単糖類の構造の炭素鎖延長では、新しく増える不斉炭素が常にC2になり、既存の配置は
  // 1つずつCの番号が繰り下がる〈値そのものは変わらない〉ため)。
  const byId = new Map(tree.map((n) => [n.id, n]));
  const chain = [];
  let cur = byId.get(id);
  while (cur) {
    chain.push(cur.branch);
    cur = cur.parentId ? byId.get(cur.parentId) : null;
  }
  return chain; // [C2,C3,C4,...]
}
const riboseCfg = fischerChain(MONO.aldoseTree, "ribose"); // [C2,C3,C4]
check("リボース配置RRR", riboseCfg.join("") === "RRR", `導出=${riboseCfg.join("")}`);

const rightIsDown = (c) => c === "R"; // 右(R)のOH=環の下、左(L)のOH=環の上
const derivedC2 = rightIsDown(riboseCfg[0]) ? "down" : "up"; // C2'
const derivedC3 = rightIsDown(riboseCfg[1]) ? "down" : "up"; // C3'
const derivedC5 = "up"; // D系列の末端CH2OH(C5')は常に上(C4自身のR/L配置ではなく固定則)
check("C2'のハース式上下", derivedC2 === DATA.sugarSkeleton.haworthJa["C2'"], `導出=${derivedC2} データ=${DATA.sugarSkeleton.haworthJa["C2'"]}`);
check("C3'のハース式上下", derivedC3 === DATA.sugarSkeleton.haworthJa["C3'"], `導出=${derivedC3} データ=${DATA.sugarSkeleton.haworthJa["C3'"]}`);
check("C5'(末端CH2OH)のハース式上下", derivedC5 === DATA.sugarSkeleton.haworthJa["C5'"], `導出=${derivedC5} データ=${DATA.sugarSkeleton.haworthJa["C5'"]}`);

/* ---------- (6) 環の結合長が、各環で平均の±5%以内(正六角形・正五角形のテンプレートから座標を作って検算) ----------
   html/nucleotide-structure.html の描画と同じアルゴリズム(独立に実装したもの)。 */
function regularPolygon(n, R) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const ang = ((90 - (360 / n) * i) * Math.PI) / 180;
    pts.push([R * Math.cos(ang), R * Math.sin(ang)]);
  }
  return pts;
}
function dist(p, q) {
  return Math.hypot(p[0] - q[0], p[1] - q[1]);
}
function normAngle(deg) {
  let a = deg % 360;
  if (a > 180) a -= 360;
  if (a <= -180) a += 360;
  return a;
}
// 六員環の辺(p4,p5)に融合する正五員環の残り3点を求め、[p4,x1,x2,x3,p5]の順で返す
function fusePentagonOnEdge(p4, p5, hexCenter) {
  const L = dist(p4, p5);
  const mid = [(p4[0] + p5[0]) / 2, (p4[1] + p5[1]) / 2];
  let out = [mid[0] - hexCenter[0], mid[1] - hexCenter[1]];
  const outLen = Math.hypot(out[0], out[1]) || 1;
  out = [out[0] / outLen, out[1] / outLen];
  const apothem = L / 2 / Math.tan(Math.PI / 5);
  const R5 = L / 2 / Math.sin(Math.PI / 5);
  const pc = [mid[0] + apothem * out[0], mid[1] + apothem * out[1]];
  const angOf = (p) => (Math.atan2(p[1] - pc[1], p[0] - pc[0]) * 180) / Math.PI;
  const angC4 = angOf(p4),
    angC5 = angOf(p5);
  const step = normAngle(angC4 - angC5); // ±72°
  const pts = [p4];
  for (let k = 1; k <= 3; k++) {
    const a = ((angC4 + step * k) * Math.PI) / 180;
    pts.push([pc[0] + R5 * Math.cos(a), pc[1] + R5 * Math.sin(a)]);
  }
  pts.push(p5);
  return pts;
}
function checkRingLengths(label, lengths) {
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  lengths.forEach((len, i) => {
    const dev = Math.abs(len - mean) / mean;
    check(`結合長±5%以内[${label}][辺${i}]`, dev <= 0.05, `長さ=${len.toFixed(3)} 平均=${mean.toFixed(3)} 偏差=${(dev * 100).toFixed(2)}%`);
  });
}
const HEX_R = 60,
  SUGAR_R = 55;
for (const base of DATA.bases) {
  const hex = regularPolygon(6, HEX_R);
  const hexIdx = Object.fromEntries(base.sixRing.map((a, i) => [a, i]));
  const hexLens = base.sixRing.map((_, i) => dist(hex[i], hex[(i + 1) % 6]));
  checkRingLengths(`${base.id}:六員環`, hexLens);
  if (base.kind === "purine") {
    const p4 = hex[hexIdx["C4"]],
      p5 = hex[hexIdx["C5"]];
    const penta = fusePentagonOnEdge(p4, p5, [0, 0]); // [C4,N9,C8,N7,C5]
    const pentaLens = [dist(penta[0], penta[1]), dist(penta[1], penta[2]), dist(penta[2], penta[3]), dist(penta[3], penta[4])];
    checkRingLengths(`${base.id}:五員環`, pentaLens);
  }
}
{
  const sugarPts = regularPolygon(5, SUGAR_R);
  const sugarLens = sugarPts.map((_, i) => dist(sugarPts[i], sugarPts[(i + 1) % 5]));
  checkRingLengths("糖(フラノース)", sugarLens);
}

/* ---------- (7) 糖と結合する窒素が、プリンでN9、ピリミジンでN1 ---------- */
for (const base of DATA.bases) {
  const expected = base.kind === "purine" ? "N9" : "N1";
  check(`糖と結合する原子[${base.id}]`, base.glycosidicAtom === expected, `導出=${base.glycosidicAtom} 期待=${expected}`);
}

/* ---------- 結果出力 ---------- */
if (failures.length) {
  console.error(`[check-nucleotide-structure] ${failures.length}件の不一致\n` + failures.join("\n"));
  process.exit(1);
} else {
  console.log("[check-nucleotide-structure] すべての検算が一致しています");
}
