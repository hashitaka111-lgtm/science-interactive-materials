// コドン表と遺伝暗号(chem-genetic-code)の整合性を検算する。
// html/genetic-code.html の「CORE-LOGIC」区間(翻訳・点変異の判定・鋳型鎖との変換)をそのまま取り出して実行し、
// (1) コドン表が64通りすべて埋まっていて、標準遺伝暗号(NCBI translation table 1)と一致する
// (2) 開始コドンAUG=Met、終止コドン3種(UAA・UAG・UGA)が正しくフラグされている
// (3) 縮重度の分布(1コドン=2種、2コドン=9種、3コドン=1種、4コドン=5種、6コドン=3種)が一致する
// (4) mRNA配列からアミノ酸配列への変換が、既知の配列で手計算と一致する
// (5) 点変異の判定(サイレント/ミスセンス/ナンセンス)が、既知の変異例で正しい
// (6) DNA鋳型鎖→mRNAの変換が、data/dna-double-helix.json の相補鎖生成の規則と矛盾しない
// を検査する。Node標準機能のみ。
//   node scripts/check-genetic-code.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA = JSON.parse(readFileSync(join(root, "data/genetic-code.json"), "utf8"));
const AMINO_FULL = JSON.parse(readFileSync(join(root, "data/amino-acids.json"), "utf8"));
const DNA_FULL = JSON.parse(readFileSync(join(root, "data/dna-double-helix.json"), "utf8"));
const html = readFileSync(join(root, "html/genetic-code.html"), "utf8");

const failures = [];
function check(label, cond, detail) {
  if (!cond) failures.push(`${label}: ${detail}`);
}

/* ---------- HTMLのCORE-LOGIC区間を取り出して実行する ---------- */
const m = html.match(/\/\* === CORE-LOGIC BEGIN[^\n]*\n([\s\S]*?)\/\* === CORE-LOGIC END === \*\//);
if (!m) {
  console.error("html/genetic-code.html に CORE-LOGIC 区間が見つからない");
  process.exit(1);
}
const AMINO = { amino_acids: AMINO_FULL.amino_acids };
const DNA = { complement: DNA_FULL.complement };
const L = new Function(
  "DATA",
  "AMINO",
  "DNA",
  m[1] +
    "\nreturn {CODON, AA, codonsOf, stopCodons, degeneracySummary, positionSynonymPairs, fourfoldBoxes, mrnaToTemplate, templateToMrna, mrnaToSense, translate, peptide, classifyMutation};"
)(DATA, AMINO, DNA);

/* ---------- (1) 64通り・標準遺伝暗号との突き合わせ ---------- */
// NCBI translation table 1 の公開表記(塩基の並びはT,C,A,G。*は終止)。
const NCBI_AAS = "FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG";
const NCBI_BASE1 = "TTTTTTTTTTTTTTTTCCCCCCCCCCCCCCCCAAAAAAAAAAAAAAAAGGGGGGGGGGGGGGGG";
const NCBI_BASE2 = "TTTTCCCCAAAAGGGGTTTTCCCCAAAAGGGGTTTTCCCCAAAAGGGGTTTTCCCCAAAAGGGG";
const NCBI_BASE3 = "TCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAG";
const NCBI_STARTS_STANDARD = "AUG";

check("コドンの件数", DATA.codons.length === 64, `件数=${DATA.codons.length}`);
check("コドンに重複がない", new Set(DATA.codons.map((c) => c.codon)).size === 64, "重複あり");
const oneLetterById = new Map(AMINO_FULL.amino_acids.map((a) => [a.id, a.one_letter.value]));
for (let i = 0; i < 64; i++) {
  const codon = (NCBI_BASE1[i] + NCBI_BASE2[i] + NCBI_BASE3[i]).replace(/T/g, "U");
  const e = L.CODON[codon];
  check(`${codon} がコドン表にある`, !!e, "見つからない");
  if (!e) continue;
  const got = e.stop ? "*" : oneLetterById.get(e.aminoAcidId);
  check(`${codon} の対応`, got === NCBI_AAS[i], `表=${got} NCBI=${NCBI_AAS[i]}`);
  check(`${codon} のstopフラグとaminoAcidIdの整合`, e.stop === (e.aminoAcidId === null), `stop=${e.stop} aminoAcidId=${e.aminoAcidId}`);
}
const usedIds = new Set(DATA.codons.filter((c) => !c.stop).map((c) => c.aminoAcidId));
check("20種のアミノ酸がすべて使われている", usedIds.size === 20 && AMINO_FULL.amino_acids.every((a) => usedIds.has(a.id)), `使われている種類=${usedIds.size}`);

/* ---------- (2) 開始コドン・終止コドン ---------- */
const starts = DATA.codons.filter((c) => c.start).map((c) => c.codon);
check("開始コドンはAUGの1つ", starts.length === 1 && starts[0] === NCBI_STARTS_STANDARD, `開始=${starts.join(",")}`);
check("AUGはメチオニン", L.CODON.AUG.aminoAcidId === "methionine" && L.AA.methionine.abbr3 === "Met", `AUG=${L.CODON.AUG.aminoAcidId}`);
const stops = L.stopCodons().sort().join(",");
check("終止コドンはUAA・UAG・UGA", stops === "UAA,UAG,UGA", `終止=${stops}`);

/* ---------- (3) 縮重度の分布 ---------- */
const deg = L.degeneracySummary();
const abbr = (ids) => ids.map((id) => L.AA[id].abbr3).sort().join(",");
check("1コドンのアミノ酸はMet・Trp", abbr(deg[1] || []) === "Met,Trp", `1: ${abbr(deg[1] || [])}`);
check("6コドンのアミノ酸はLeu・Ser・Arg", abbr(deg[6] || []) === "Arg,Leu,Ser", `6: ${abbr(deg[6] || [])}`);
check("2コドンのアミノ酸は9種", (deg[2] || []).length === 9 && abbr(deg[2]) === "Asn,Asp,Cys,Gln,Glu,His,Lys,Phe,Tyr", `2: ${abbr(deg[2] || [])}`);
check("3コドンのアミノ酸はIleの1種", abbr(deg[3] || []) === "Ile", `3: ${abbr(deg[3] || [])}`);
check("4コドンのアミノ酸は5種", abbr(deg[4] || []) === "Ala,Gly,Pro,Thr,Val", `4: ${abbr(deg[4] || [])}`);
check("縮重度は1・2・3・4・6のみ", Object.keys(deg).sort().join(",") === "1,2,3,4,6", `keys=${Object.keys(deg).join(",")}`);
const senseTotal = Object.entries(deg).reduce((s, [n, ids]) => s + Number(n) * ids.length, 0);
check("アミノ酸を指定するコドンは61通り", senseTotal === 61, `合計=${senseTotal}`);
// 3文字目への集中: 1か所だけ違う同義コドン対の数(手計算: 1文字目4組、2文字目0組、3文字目63組)
const pairs = L.positionSynonymPairs();
check("1か所だけ違う同義コドン対(1・2・3文字目)", pairs.join(",") === "4,0,63", `対の数=${pairs.join(",")}`);
check("3文字目によらず同じアミノ酸になる枠は8組", L.fourfoldBoxes().join(",") === "UC,CU,CC,CG,AC,GU,GC,GG", `枠=${L.fourfoldBoxes().join(",")}`);

/* ---------- (4) 翻訳 ---------- */
const trCases = [
  { seq: "AUGGCUUUUUAA", start: 0, three: "Met-Ala-Phe", one: "MAF", stopped: true },
  { seq: "GCAUGAAACGCUGGUAGCA", start: 2, three: "Met-Lys-Arg-Trp", one: "MKRW", stopped: true },
  { seq: "AUGUCUAGCCGUAGGUUAUGA", start: 0, three: "Met-Ser-Ser-Arg-Arg-Leu", one: "MSSRRL", stopped: true },
  { seq: "AUGGGAGGCGGG", start: 0, three: "Met-Gly-Gly-Gly", one: "MGGG", stopped: false },
  { seq: "AUGCCCUG", start: 0, three: "Met-Pro", one: "MP", stopped: false, leftover: "UG" },
  { seq: "CCCGGGUUU", start: -1, three: "", one: "", stopped: false },
];
for (const c of trCases) {
  const tr = L.translate(c.seq);
  check(`翻訳[${c.seq}] 開始位置`, tr.start === c.start, `start=${tr.start} 期待=${c.start}`);
  check(`翻訳[${c.seq}] 3文字表記`, L.peptide(tr, "three").join("-") === c.three, `${L.peptide(tr, "three").join("-")} 期待=${c.three}`);
  check(`翻訳[${c.seq}] 1文字表記`, L.peptide(tr, "one").join("") === c.one, `${L.peptide(tr, "one").join("")} 期待=${c.one}`);
  check(`翻訳[${c.seq}] 終止`, tr.stopped === c.stopped, `stopped=${tr.stopped} 期待=${c.stopped}`);
  if (c.leftover !== undefined) check(`翻訳[${c.seq}] 余り`, tr.leftover === c.leftover, `leftover=${tr.leftover} 期待=${c.leftover}`);
}
for (const p of DATA.translate.presets) {
  check(`プリセット[${p}]がA・U・G・Cのみで上限以内`, /^[AUGC]+$/.test(p) && p.length <= DATA.translate.maxLength, `len=${p.length}`);
}

/* ---------- (5) 点変異の判定 ---------- */
const orig = DATA.mutation.original;
check("変異の元配列はMet-Ala-Phe-Trp-Glnで終止", L.peptide(L.translate(orig), "three").join("-") === "Met-Ala-Phe-Trp-Gln" && L.translate(orig).stopped, L.peptide(L.translate(orig), "three").join("-"));
const expectMut = {
  silent: { type: "silent", before: "GCU", after: "GCC" },
  missense: { type: "missense", before: "UUU", after: "UCU" },
  nonsense: { type: "nonsense", before: "UGG", after: "UAG" },
  missense1: { type: "missense", before: "CAA", after: "GAA" },
};
for (const ex of DATA.mutation.examples) {
  const r = L.classifyMutation(orig, ex.index, ex.to);
  const e = expectMut[ex.id];
  check(`変異例[${ex.id}] 判定`, e && r.type === e.type, `判定=${r.type} 期待=${e && e.type}`);
  check(`変異例[${ex.id}] コドン`, e && r.before.codon === e.before && r.after.codon === e.after, `${r.before.codon}→${r.after.codon}`);
}
// 例以外の既知の変異(独立の手計算)
const extra = [
  { seq: "AUGCUAUAA", index: 3, to: "U", type: "silent" }, // CUA→UUA: Leu→Leu(1文字目の同義置換)
  { seq: "AUGGAAUAA", index: 5, to: "U", type: "missense" }, // GAA→GAU: Glu→Asp(3文字目でもミスセンス)
  { seq: "AUGUACUAA", index: 5, to: "A", type: "nonsense" }, // UAC→UAA
  { seq: "AUGUGGUAA", index: 5, to: "A", type: "nonsense" }, // UGG→UGA
  { seq: "AUGCGAUAA", index: 3, to: "A", type: "silent" }, // CGA→AGA: Arg→Arg
];
for (const c of extra) {
  const r = L.classifyMutation(c.seq, c.index, c.to);
  check(`変異[${c.seq} ${c.index}→${c.to}]`, r.type === c.type, `判定=${r.type} 期待=${c.type}`);
}
// 開始コドンと終止コドンの間にある全塩基×3通りの置換を、判定規則そのものと照合する
const tr0 = L.translate(orig);
let counts = { silent: 0, missense: 0, nonsense: 0 };
for (let i = tr0.start + 3; i < tr0.stopIndex; i++) {
  for (const b of "AUGC") {
    if (b === orig[i]) continue;
    const r = L.classifyMutation(orig, i, b);
    counts[r.type]++;
    const cs = i - ((i - tr0.start) % 3);
    const a0 = L.CODON[orig.slice(cs, cs + 3)];
    const a1 = L.CODON[r.mutant.slice(cs, cs + 3)];
    const want = a1.stop ? "nonsense" : a1.aminoAcidId === a0.aminoAcidId ? "silent" : "missense";
    check(`全置換[${i}→${b}]`, r.type === want && r.codonStart === cs, `判定=${r.type} 期待=${want}`);
  }
}

/* ---------- (6) 鋳型鎖→mRNA が dna-double-helix の相補鎖生成と矛盾しない ---------- */
// dna-double-helix の complementOf(base, mode) と同じ規則(RNAモードではAの相方がU)
function complementOfDH(base, mode) {
  if (mode === "rna" && base === "A") return "U";
  return DNA_FULL.complement[base];
}
const templates = ["TACCGAAAAATT", "CGTACTTTGCGACCATCGT", "AATGGGCC", "ATGCGCTA"];
for (const t of templates) {
  const mrna = L.templateToMrna(t);
  const viaDH = t.split("").map((b) => complementOfDH(b, "rna")).join("");
  check(`鋳型鎖[${t}]→mRNA が dna-double-helix(RNAモード)の相補と一致`, mrna === viaDH, `${mrna} vs ${viaDH}`);
  check(`鋳型鎖[${t}]→mRNA→鋳型鎖 で元に戻る`, L.mrnaToTemplate(mrna) === t, `${L.mrnaToTemplate(mrna)}`);
  // センス鎖 = 鋳型鎖のDNA相補(dna-double-helixのDNAモード)で、mRNAとはT/Uだけが違う
  const senseDH = t.split("").map((b) => complementOfDH(b, "dna")).join("");
  check(`鋳型鎖[${t}]のセンス鎖(DNA相補)とmRNAはT→Uだけの違い`, L.mrnaToSense(mrna) === senseDH, `${L.mrnaToSense(mrna)} vs ${senseDH}`);
}
check("鋳型鎖3'-TAC-5' → mRNA 5'-AUG-3'", L.templateToMrna("TAC") === "AUG", L.templateToMrna("TAC"));
for (const p of DATA.translate.presets) {
  check(`プリセット[${p}]の鋳型鎖→mRNA往復`, L.templateToMrna(L.mrnaToTemplate(p)) === p, "往復で一致しない");
}

if (failures.length) {
  console.error(`check-genetic-code: ${failures.length}件の不一致`);
  for (const f of failures) console.error("  " + f);
  process.exit(1);
}
console.log(
  `check-genetic-code: OK (コドン64通り・NCBI table 1と一致、縮重度 1:${deg[1].length} 2:${deg[2].length} 3:${deg[3].length} 4:${deg[4].length} 6:${deg[6].length}、同義コドン対 1/2/3文字目=${pairs.join("/")}、翻訳${trCases.length}例、変異例${DATA.mutation.examples.length + extra.length}件+全置換${counts.silent + counts.missense + counts.nonsense}通り〈サイレント${counts.silent}・ミスセンス${counts.missense}・ナンセンス${counts.nonsense}〉、鋳型鎖${templates.length}例)`
);
