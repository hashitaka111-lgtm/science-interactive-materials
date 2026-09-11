// data/peptide-problems.json の各問題について、全条件を適用した結果が1通りに絞れるかを検証する。
//   node scripts/check-peptide-uniqueness.mjs   単独実行
//
// ラベルのテーブル(tables)は data/amino-acids.json から組み立てる。この組み立て部分だけが
// アミノ酸のデータに触れる。ソルバー本体(peptide-solver.mjs)にはラベルの意味を一切持ち込まない。
//
// data/peptide-problems.json の実際の形（domain フィールドは無い。定義域は conditions と
// answer から推定する。この推定処理(domainSpecOf)は peptide-solver.mjs 側にある。
// HTML教材に埋め込むのは peptide-solver.mjs だけなので、埋め込まないCLI側にロジックを
// 置いてしまうとブラウザ側で同じものを書き直すことになりテストも付かないため）:
//   {
//     "problems": [
//       {
//         "id": "seq-01",
//         "answer": ["Gly", "Ala", "Ser"],
//         "conditions": [
//           { "type": "composition", "reveal": "full" },   // このデータでは定義域=answerの多重集合
//           { "type": "terminus", "end": "N" },
//           ...
//         ]
//       },
//       {
//         "id": "seq-04",
//         "residue_count": 6,
//         "answer": [...],
//         "conditions": [
//           { "type": "composition", "reveal": "pool", "pool": [...] },  // 定義域=pool^residue_count
//           ...
//         ]
//       }
//     ]
//   }
// ラベルは abbr3（3文字表記）を使う。
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDomain, solve, minimizeConditions, domainSpecOf } from "./peptide-solver.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

// data/amino-acids.json の1アミノ酸エントリから、ソルバー用の Tables を組み立てる。
//   abbr3 / molar_mass / chiral は素の値をそのまま使う。
//   tests[testName].result を見て color テーブルを作る（positive→true, negative→false）。
//   conditional はここでは throw しない。テーブルには一旦プレースホルダ(false)を入れて保持し、
//   conditionalLabels に記録する。実際に throw するのは、ある問題の color 条件がその conditional
//   ラベルを定義域内に持つ場合だけ（assertNoConditionalInDomain）。Met/Phe が登場しない問題まで
//   巻き添えで止めないため。
//   side_chain_molar_mass・one_letter・chiral_center_count は使わない。
function buildTables(aminoData) {
  const mass = {};
  const chirality = {};
  const color = {};
  const conditionalLabels = {}; // testName -> Set<label>

  for (const aa of aminoData.amino_acids) {
    const label = aa.abbr3;
    mass[label] = aa.molar_mass;
    chirality[label] = aa.chiral;

    for (const [testName, t] of Object.entries(aa.tests)) {
      if (!color[testName]) color[testName] = {};
      if (!conditionalLabels[testName]) conditionalLabels[testName] = new Set();

      if (t.result === "conditional") {
        conditionalLabels[testName].add(label);
        color[testName][label] = false; // 未使用時のプレースホルダ。guardを通過した問題では参照されない
      } else {
        color[testName][label] = t.result === "positive";
      }
    }
  }

  return { mass, chirality, color, conditionalLabels };
}

// DomainSpec（peptide-solver.mjs 側の型）から、その定義域に含まれるラベル一覧を取り出す。
function domainLabelsOf(domainSpec) {
  if (domainSpec.mode === "counts") return Object.keys(domainSpec.counts);
  if (domainSpec.mode === "kinds") return domainSpec.kinds;
  if (domainSpec.mode === "pool") return domainSpec.pool;
  throw new Error(`未知のdomain mode: ${domainSpec.mode}`);
}

// ある問題の color 条件が、conditional なラベルを定義域内に持っていないか検査する。
// 持っていれば throw する（問題ID・ラベル名・テスト名を含む）。
function assertNoConditionalInDomain(problem, domainSpec, tables) {
  const labels = domainLabelsOf(domainSpec);
  for (const condition of problem.conditions) {
    if (condition.type !== "color") continue;
    const conditionalSet = tables.conditionalLabels[condition.test];
    if (!conditionalSet) continue;
    for (const label of labels) {
      if (conditionalSet.has(label)) {
        throw new Error(
          `${problem.id}: ラベル "${label}" の "${condition.test}" 反応が conditional。` +
            `この問題の color 条件の判定材料にできない`
        );
      }
    }
  }
}

// problems.json を読み込む。トップレベルが { problems: [...] } でも配列そのものでも受け付ける。
function loadProblems(problemsData) {
  return Array.isArray(problemsData) ? problemsData : problemsData.problems;
}

// 各問題を検証する。
//   戻り値: { ok: boolean, report: string[] }
//   report には失敗（0件/2件以上）と、参考情報（この走査順で落とせた条件があること）の両方を積む。
//   ok を false にするのは失敗行があるときだけ。落とせる条件があること自体は異常として扱わない
//   （固定題には解法の足場として意図的に冗長な条件を置いていることがあるため）。
//   minimizeConditions が返すのは「この走査順で落とせた」極小集合のひとつであって、
//   唯一の極小集合ではない（走査順を変えれば別の集合が残りうる）。報告文言もそれに合わせる。
function checkPeptideUniqueness(aminoData, problemsData) {
  const tables = buildTables(aminoData);
  const problems = loadProblems(problemsData);
  const report = [];
  let ok = true;

  for (const problem of problems) {
    const domainSpec = domainSpecOf(problem);
    assertNoConditionalInDomain(problem, domainSpec, tables);

    const domain = buildDomain(domainSpec);
    const result = solve(domain, problem.conditions, problem.answer, tables);

    if (result.final.length !== 1) {
      ok = false;
      report.push(`[FAIL] ${problem.id}: 候補 ${result.final.length} 件（1件である必要がある）`);
      continue;
    }

    const { removed } = minimizeConditions(domain, problem.conditions, problem.answer, tables);
    if (removed.length > 0) {
      report.push(
        `[info] ${problem.id}: 一意には決まっている。この走査順で落とせた条件が${removed.length}件` +
          `（極小集合はひとつとは限らない。走査順を変えれば別の集合が残りうる）: ` +
          `${removed.map((c) => c.type).join(", ")}`
      );
    } else {
      report.push(`[ok] ${problem.id}: 一意に決まる（この走査順では落とせる条件なし）`);
    }
  }

  return { ok, report };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  try {
    const aminoData = JSON.parse(readFileSync(join(root, "data/amino-acids.json"), "utf8"));
    const problemsData = JSON.parse(
      readFileSync(join(root, "data/peptide-problems.json"), "utf8")
    );
    const { ok, report } = checkPeptideUniqueness(aminoData, problemsData);
    console.log(report.join("\n"));
    if (!ok) process.exit(1);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

export { checkPeptideUniqueness, buildTables, loadProblems, domainLabelsOf, assertNoConditionalInDomain };
