// check-peptide-uniqueness.mjs の conditional 遅延throwのテスト。node:test のみ使用。
// buildTables自体はthrowせず、その問題の定義域(pool/counts)にconditionalラベルが
// 含まれるときだけ throw することを確認する。
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTables, assertNoConditionalInDomain } from "./check-peptide-uniqueness.mjs";
import { domainSpecOf } from "./peptide-solver.mjs";

const AMINO_DATA = {
  amino_acids: [
    {
      abbr3: "Gly",
      molar_mass: 75,
      chiral: false,
      tests: { sulfur: { result: "negative" }, xanthoproteic: { result: "negative" } },
    },
    {
      abbr3: "Ala",
      molar_mass: 89,
      chiral: true,
      tests: { sulfur: { result: "negative" }, xanthoproteic: { result: "negative" } },
    },
    {
      abbr3: "Met",
      molar_mass: 149,
      chiral: true,
      tests: { sulfur: { result: "conditional" }, xanthoproteic: { result: "negative" } },
    },
  ],
};

test("buildTables: conditionalがあってもthrowせず保持する", () => {
  const tables = buildTables(AMINO_DATA);
  assert.equal(tables.conditionalLabels.sulfur.has("Met"), true);
  assert.equal(tables.color.sulfur.Gly, false);
});

test("conditionalなラベルが定義域に含まれない問題は通る", () => {
  const tables = buildTables(AMINO_DATA);
  const problem = {
    id: "no-met",
    answer: ["Gly", "Ala"],
    conditions: [
      { type: "composition", reveal: "full" },
      { type: "color", test: "sulfur" },
    ],
  };
  const domainSpec = domainSpecOf(problem);
  assert.doesNotThrow(() => assertNoConditionalInDomain(problem, domainSpec, tables));
});

test("conditionalなラベルが定義域に含まれる問題はthrowする(問題ID・ラベル名・テスト名を含む)", () => {
  const tables = buildTables(AMINO_DATA);
  const problem = {
    id: "has-met",
    residue_count: 2,
    answer: ["Gly", "Met"],
    conditions: [
      { type: "composition", reveal: "pool", pool: ["Gly", "Met"] },
      { type: "color", test: "sulfur" },
    ],
  };
  const domainSpec = domainSpecOf(problem);
  assert.throws(
    () => assertNoConditionalInDomain(problem, domainSpec, tables),
    (e) => e.message.includes("has-met") && e.message.includes("Met") && e.message.includes("sulfur")
  );
});
