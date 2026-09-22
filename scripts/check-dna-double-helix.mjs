// DNAの二重らせん(chem-dna-double-helix)の化学的な整合性を検算する。
// data/dna-double-helix.json と data/nucleotide-structure.json から値を導出し、
// (1) 塩基対の水素結合の本数がbases[].hbondから機械的に導出した対応と一致
// (2) 相補鎖の生成(A⇔T/U、G⇔C、順序の反転)が正しい
// (3) シャルガフの集計(個数・GC含量・水素結合の総本数)が既知の配列に対して手計算と一致
// (4) 二本鎖の分子量がΣ(nucleotidesの分子量)−18×(n−1)の和と一致
// を検査する。Node標準機能のみ。
//   node scripts/check-dna-double-helix.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA = JSON.parse(readFileSync(join(root, "data/dna-double-helix.json"), "utf8"));
const NUC = JSON.parse(readFileSync(join(root, "data/nucleotide-structure.json"), "utf8"));

const failures = [];
function check(label, cond, detail) {
  if (!cond) failures.push(`${label}: ${detail}`);
}

const baseById = new Map(NUC.bases.map((b) => [b.id, b]));
const nucleotideById = new Map(NUC.nucleotides.map((n) => [n.id, n]));

/* ---------- (1) basePairs.bonds が bases[].hbond と整合しているか ---------- */
function hbondEntry(baseId, atomId) {
  const base = baseById.get(baseId);
  return (base.hbond || []).find((h) => h.atom === atomId);
}
const OPPOSITE = { donor: "acceptor", acceptor: "donor" };
for (const pair of DATA.basePairs) {
  const baseIdsB = [pair.baseBId, ...(pair.baseBIdRna ? [pair.baseBIdRna] : [])];
  for (const bond of pair.bonds) {
    const hA = hbondEntry(pair.baseAId, bond.atomA);
    check(
      `${pair.id}: ${pair.baseAId}.${bond.atomA} がhbondに存在`,
      !!hA && hA.role === bond.roleA,
      `hbond=${JSON.stringify(hA)} 期待role=${bond.roleA}`
    );
    for (const baseBId of baseIdsB) {
      const hB = hbondEntry(baseBId, bond.atomB);
      check(
        `${pair.id}: ${baseBId}.${bond.atomB} がhbondに存在`,
        !!hB && hB.role === bond.roleB,
        `hbond=${JSON.stringify(hB)} 期待role=${bond.roleB}`
      );
    }
    check(`${pair.id}: ${bond.atomA}-${bond.atomB}の役割が供与体/受容体で対になっている`, OPPOSITE[bond.roleA] === bond.roleB, `roleA=${bond.roleA} roleB=${bond.roleB}`);
  }
}
const bondsById = Object.fromEntries(DATA.basePairs.map((p) => [p.id, p.bonds.length]));
check("A-T(A-U)の水素結合は2本", bondsById.AT === 2, `本数=${bondsById.AT}`);
check("G-Cの水素結合は3本", bondsById.GC === 3, `本数=${bondsById.GC}`);

/* ---------- (2) 相補鎖の生成 ---------- */
// mode: "dna" | "rna"。RNAではAの相方がUになる(data/dna-double-helix.jsonのcomplementは
// DNA向けにA→Tだが、RNA配列(Uを含む)を渡したときはU→Aが引ける。Aの相方だけmode依存で
// 上書きする。
function complementOf(base, mode) {
  if (mode === "rna" && base === "A") return "U";
  return DATA.complement[base];
}
// 3'→5'に揃えた相補鎖(入力と同じ並び順で1文字ずつ対応)
function complement3to5(seq, mode) {
  return seq
    .split("")
    .map((b) => complementOf(b, mode))
    .join("");
}
// 5'→3'に並べ替えた相補鎖(3'→5'鎖を反転しただけ)
function complement5to3(seq, mode) {
  return complement3to5(seq, mode).split("").reverse().join("");
}

const dnaTests = ["AATGGGCC", "ATGCGCTA", "GGATCCAA"];
for (const seq of dnaTests) {
  const c3to5 = complement3to5(seq, "dna");
  // 1文字ずつ、DATA.complementの対応どおりになっているか
  for (let i = 0; i < seq.length; i++) {
    check(`相補鎖[${seq}] 位置${i}`, c3to5[i] === DATA.complement[seq[i]], `seq[${i}]=${seq[i]} 相補=${c3to5[i]} 期待=${DATA.complement[seq[i]]}`);
  }
  const c5to3 = complement5to3(seq, "dna");
  check(`相補鎖(5'→3')[${seq}]は3'→5'鎖の反転`, c5to3 === c3to5.split("").reverse().join(""), `c5to3=${c5to3} c3to5反転=${c3to5.split("").reverse().join("")}`);
}
// 手計算での具体例: AATGGGCC → 3'→5'鎖 TTACCCGG → 5'→3'に並べ替えるとGGCCCATT
check("相補鎖の具体例(3'→5')", complement3to5("AATGGGCC", "dna") === "TTACCCGG", `導出=${complement3to5("AATGGGCC", "dna")}`);
check("相補鎖の具体例(5'→3')", complement5to3("AATGGGCC", "dna") === "GGCCCATT", `導出=${complement5to3("AATGGGCC", "dna")}`);

// RNAモード: Aの相方はU、Uの相方はA
check("RNA相補: Aの相方はU", complementOf("A", "rna") === "U", `導出=${complementOf("A", "rna")}`);
check("RNA相補: Uの相方はA", complementOf("U", "rna") === "A", `導出=${complementOf("U", "rna")}`);
const rnaSeq = "AAUGGGCC";
const rnaC3to5 = complement3to5(rnaSeq, "rna");
check("RNA相補鎖の具体例(3'→5')", rnaC3to5 === "UUACCCGG", `導出=${rnaC3to5}`);

/* ---------- (3) シャルガフの集計 ---------- */
function countBases(seq) {
  const c = { A: 0, T: 0, U: 0, G: 0, C: 0 };
  for (const ch of seq) c[ch]++;
  return c;
}
function bondCountFor(mode, baseA, baseB) {
  // baseA・baseBが1つのA-T(A-U)型塩基対かG-C型塩基対かを判定し、その本数を返す
  const atSet = mode === "rna" ? new Set(["A", "U"]) : new Set(["A", "T"]);
  const gcSet = new Set(["G", "C"]);
  if (atSet.has(baseA) && atSet.has(baseB)) return bondsById.AT;
  if (gcSet.has(baseA) && gcSet.has(baseB)) return bondsById.GC;
  throw new Error(`未対応の塩基対: ${baseA}-${baseB}`);
}
function totalHBonds(seq, mode) {
  // 経路1: 1本の鎖のA・Tの個数の合計×2 + G・Cの個数の合計×3 (data/dna-double-helix.jsonのbondFormulaNoteJaと同じ式)
  const c = countBases(seq);
  const atCount = mode === "rna" ? c.A + c.U : c.A + c.T;
  const gcCount = c.G + c.C;
  const viaFormula = atCount * bondsById.AT + gcCount * bondsById.GC;
  // 経路2: 相補鎖を実際に生成し、1塩基対ずつ本数を足し上げる(独立した計算経路として突き合わせる)
  const comp = complement3to5(seq, mode);
  let viaPositions = 0;
  for (let i = 0; i < seq.length; i++) viaPositions += bondCountFor(mode, seq[i], comp[i]);
  check(`水素結合の総本数[${seq}] 2経路が一致`, viaFormula === viaPositions, `式=${viaFormula} 位置ごとの合計=${viaPositions}`);
  return viaFormula;
}

// 具体例: AATGGGCC (DNA, n=8) → A=2,T=1,G=3,C=2。AT対=3、GC対=5。総本数=3*2+5*3=21
{
  const seq = "AATGGGCC";
  const c = countBases(seq);
  check("シャルガフ集計 A=2", c.A === 2, `A=${c.A}`);
  check("シャルガフ集計 T=1", c.T === 1, `T=${c.T}`);
  check("シャルガフ集計 G=3", c.G === 3, `G=${c.G}`);
  check("シャルガフ集計 C=2", c.C === 2, `C=${c.C}`);
  const total = totalHBonds(seq, "dna");
  check("水素結合の総本数(AATGGGCC)は21", total === 21, `導出=${total}`);

  // 二本鎖(両方の鎖を合わせて数える)では[A]=[T]、[G]=[C]
  const comp = complement3to5(seq, "dna");
  const cComp = countBases(comp);
  const totalA = c.A + cComp.A,
    totalT = c.T + cComp.T,
    totalG = c.G + cComp.G,
    totalC = c.C + cComp.C;
  check("二本鎖(両鎖合計)で[A]=[T]", totalA === totalT, `A合計=${totalA} T合計=${totalT}`);
  check("二本鎖(両鎖合計)で[G]=[C]", totalG === totalC, `G合計=${totalG} C合計=${totalC}`);
  const purineTotal = totalA + totalG,
    pyrimidineTotal = totalT + totalC;
  check("二本鎖でプリン総量=ピリミジン総量", purineTotal === pyrimidineTotal, `プリン=${purineTotal} ピリミジン=${pyrimidineTotal}`);

  // GC含量%
  const gcContent = ((c.G + c.C) / seq.length) * 100;
  check("GC含量(AATGGGCC)は62.5%", Math.abs(gcContent - 62.5) < 1e-9, `導出=${gcContent}`);
}

// 一本鎖RNAではシャルガフの法則(単鎖内の等量性)が成り立たない具体例
{
  const seq = "AAUGGGCC"; // A=2,U=1,G=3,C=2 (1本の鎖だけで数えると不一致)
  const c = countBases(seq);
  check("一本鎖RNAの例でA≠U(法則が成り立たないことの確認)", c.A !== c.U, `A=${c.A} U=${c.U}`);
}

/* ---------- (4) 鎖・二本鎖の分子量 ---------- */
function strandMolecularWeight(seq, mode) {
  const map = DATA.nucleotideIdByBase[mode];
  let sum = 0;
  for (const ch of seq) {
    const nt = nucleotideById.get(map[ch]);
    if (!nt) throw new Error(`nucleotideIdByBaseに対応がありません: mode=${mode} base=${ch}`);
    sum += nt.molecularWeight;
  }
  return sum - 18 * (seq.length - 1);
}
{
  const seq = "AATGGGCC";
  const mw = strandMolecularWeight(seq, "dna");
  check("鎖の分子量(AATGGGCC)は2513", mw === 2513, `導出=${mw}`);
  const comp = complement3to5(seq, "dna");
  const mwComp = strandMolecularWeight(comp, "dna");
  check("相補鎖の分子量(TTACCCGG)は2464", mwComp === 2464, `導出=${mwComp}`);
  const duplex = mw + mwComp;
  check("二本鎖の分子量(AATGGGCC/TTACCCGG)は4977", duplex === 4977, `導出=${duplex}`);
}

/* ---------- presetsのdna配列がすべてA/T/G/Cのみで構成されている ---------- */
for (const seq of DATA.presets.dna) {
  check(`preset[${seq}]がA/T/G/Cのみ`, /^[ATGC]+$/.test(seq), `配列=${seq}`);
}

/* ---------- 結果出力 ---------- */
if (failures.length) {
  console.error(`[check-dna-double-helix] ${failures.length}件の不一致\n` + failures.join("\n"));
  process.exit(1);
} else {
  console.log("[check-dna-double-helix] すべての検算が一致しています");
}
