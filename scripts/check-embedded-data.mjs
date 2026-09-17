// 教材HTMLに直接埋め込んだJSON（fetch禁止のため本文にJSリテラルとして埋め込んでいる）が
// data/*.json の原本とずれていないかを検査する。あわせて、scripts/*.mjs をコメント境界で
// 囲ってそのまま丸ごと埋め込んでいる教材(html/peptide-sequencing.html の
// peptide-solver.mjs 埋め込みのような形)についても、埋め込み範囲が原本と一字一句
// 一致しているかを検査する（後者は EMBED_SCRIPT_CHECKS 参照）。Node標準機能のみ。依存パッケージなし。
//   node scripts/check-embedded-data.mjs   単独実行
//   build.mjs からも checkEmbeddedData() を import して index.html 生成前に呼ぶ
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

// 教材ごとの対応表。1教材が複数の埋め込み変数・複数のdata/*.jsonを持つことがあるため
// materialId → checks配列 の形にしている。
//
// 規約: 埋め込みJSONは必ず1行(minify済み)で書くこと。
// pretty-print(整形)したJSONを貼り付けると extractEmbedded() が見つけられず失敗する。
//
// compareKeys: 原本の一部のキーだけを埋め込む教材向け。指定を省略した場合は従来通り
// 原本全体との完全一致を要求する。パスは次の2形式のみ対応（2階層まで）。
//   "foo"        ルート直下のキー。値ごと（ネスト含め）完全一致
//   "foo[].bar"  配列 foo の全要素について、フィールド bar だけを比較対象にする
// 配列は要素数・順序の一致も要求する。どちらの形式にも一致しないパスや、
// 同じ foo に対する2形式の混在は構文エラーとして即座に例外を投げる（exit 1）。
// 指定したパス（キー・配列要素のフィールド）が原本に存在しない場合も即座に例外を投げる。
const EMBED_CHECKS = [
  {
    materialId: "organic-reaction-map",
    html: "html/organic-reaction-map.html",
    checks: [
      { varName: "DATA", dataFile: "data/organic-reaction-map.json" },
      { varName: "PROPS", dataFile: "data/organic-properties.json" },
    ],
  },
  {
    materialId: "amino-acids-matrix",
    html: "html/amino-acids-matrix.html",
    checks: [
      { varName: "DATA", dataFile: "data/amino-acids.json" },
    ],
  },
  {
    materialId: "peptide-sequencing",
    html: "html/peptide-sequencing.html",
    checks: [
      { varName: "PROBLEMS", dataFile: "data/peptide-problems.json" },
      {
        varName: "AMINO",
        dataFile: "data/amino-acids.json",
        compareKeys: ["amino_acids[].abbr3", "amino_acids[].name", "amino_acids[].molar_mass", "amino_acids[].tests", "amino_acids[].chiral"],
      },
    ],
  },
  {
    materialId: "protein-structure",
    html: "html/protein-structure.html",
    checks: [
      {
        varName: "DATA",
        dataFile: "data/protein-structure.json",
        // materialId/title/type/scope/schemaVersion/coverageValues/coverageMeaning/
        // confidenceValues/confidenceMeaning はデータ自身のスキーマ説明、crossReferences/
        // outOfScope は他教材との棲み分けを記した執筆メモで、どちらも生徒向けページには
        // 出さない。それ以外の内容そのもの(各キーは配列・オブジェクトを丸ごと対象)だけ
        // 完全一致を要求する。
        compareKeys: [
          "levels",
          "bonds",
          "matrix",
          "operations",
          "classifications",
          "conjugatedTypes",
          "calculation",
          "calculationSteps",
          "applications",
        ],
      },
    ],
  },
  {
    materialId: "phys-projectile-motion",
    html: "html/phys-projectile-motion.html",
    checks: [
      { varName: "DATA", dataFile: "data/phys-projectile-motion.json" },
    ],
  },
  {
    materialId: "phys-rigid-body-equilibrium",
    html: "html/phys-rigid-body-equilibrium.html",
    checks: [
      { varName: "DATA", dataFile: "data/phys-rigid-body-equilibrium.json" },
    ],
  },
  {
    materialId: "phys-momentum-impulse",
    html: "html/phys-momentum-impulse.html",
    checks: [
      { varName: "DATA", dataFile: "data/phys-momentum-impulse.json" },
    ],
  },
  {
    materialId: "henry-law",
    html: "html/henry-law.html",
    checks: [
      { varName: "DATA", dataFile: "data/henry-law.json" },
    ],
  },
  {
    materialId: "solubility-curve",
    html: "html/solubility-curve.html",
    checks: [
      { varName: "DATA", dataFile: "data/solubility-curve.json" },
    ],
  },
  {
    materialId: "elemental-analysis",
    html: "html/elemental-analysis.html",
    checks: [
      { varName: "DATA", dataFile: "data/elemental-analysis.json" },
    ],
  },
];

// HTML本文から `const VAR = {...};` の1行を取り出してJSON.parseする。
function extractEmbedded(html, varName) {
  const re = new RegExp(`^const ${varName} = (.+);$`, "m");
  const m = html.match(re);
  if (!m) {
    throw new Error(
      `${varName} の埋め込みJSONが1行(minify済み)形式で見つかりません。埋め込みJSONは必ず1行にしてください。`
    );
  }
  return JSON.parse(m[1]);
}

// a(data/*.json側) と b(埋め込み側) をインデックス基準で深く比較する。
// 一致すれば空配列、不一致ならキーパスごとの差分（data側の値・埋め込み側の値）を返す。
function diffDeep(a, b, path = "") {
  if (a === b) return [];

  const aIsObj = a !== null && typeof a === "object";
  const bIsObj = b !== null && typeof b === "object";
  if (!aIsObj || !bIsObj) {
    return [{ path: path || "(root)", dataValue: a, embeddedValue: b }];
  }

  const aIsArr = Array.isArray(a);
  const bIsArr = Array.isArray(b);
  if (aIsArr !== bIsArr) {
    return [{ path: path || "(root)", dataValue: a, embeddedValue: b }];
  }

  const diffs = [];
  if (aIsArr) {
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
      const p = `${path}[${i}]`;
      if (i >= a.length) diffs.push({ path: p, dataValue: undefined, embeddedValue: b[i] });
      else if (i >= b.length) diffs.push({ path: p, dataValue: a[i], embeddedValue: undefined });
      else diffs.push(...diffDeep(a[i], b[i], p));
    }
    return diffs;
  }

  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const p = path ? `${path}.${k}` : k;
    if (!Object.prototype.hasOwnProperty.call(a, k)) diffs.push({ path: p, dataValue: undefined, embeddedValue: b[k] });
    else if (!Object.prototype.hasOwnProperty.call(b, k)) diffs.push({ path: p, dataValue: a[k], embeddedValue: undefined });
    else diffs.push(...diffDeep(a[k], b[k], p));
  }
  return diffs;
}

// diffs をレポート用の行配列に変換する。
function formatDiffs(diffs) {
  const lines = [];
  for (const d of diffs) {
    lines.push(
      `  ${d.path}\n    data側     : ${JSON.stringify(d.dataValue)}\n    埋め込み側 : ${JSON.stringify(d.embeddedValue)}`
    );
  }
  return lines;
}

// compareKeys の1要素をパースする。"foo" または "foo[].bar" のみ許可。
// それ以外の構文は例外を投げる。
function parseComparePath(p) {
  const rootMatch = /^[A-Za-z0-9_]+$/.exec(p);
  if (rootMatch) return { kind: "root", rootKey: p };

  const arrayMatch = /^([A-Za-z0-9_]+)\[\]\.([A-Za-z0-9_]+)$/.exec(p);
  if (arrayMatch) return { kind: "arrayField", rootKey: arrayMatch[1], field: arrayMatch[2] };

  throw new Error(
    `compareKeys の未対応のパス構文です: "${p}"（"foo" または "foo[].bar" の2形式のみ対応、2階層まで）`
  );
}

// compareKeys の配列を rootKey ごとにグループ化する。
// 同じ rootKey に対して "foo" と "foo[].bar" の混在、同一パスの重複指定は例外を投げる。
// 戻り値: Map<rootKey, { kind: "root" } | { kind: "arrayField", fields: string[] }>
function groupCompareKeys(compareKeys) {
  const groups = new Map();
  for (const p of compareKeys) {
    const parsed = parseComparePath(p);
    const existing = groups.get(parsed.rootKey);

    if (parsed.kind === "root") {
      if (existing) {
        throw new Error(`compareKeys で "${parsed.rootKey}" が複数回指定されているか、配列指定と混在しています`);
      }
      groups.set(parsed.rootKey, { kind: "root" });
      continue;
    }

    if (existing && existing.kind === "root") {
      throw new Error(
        `compareKeys で "${parsed.rootKey}" と "${parsed.rootKey}[]..." が混在しています。どちらか一方にしてください`
      );
    }
    if (!existing) {
      groups.set(parsed.rootKey, { kind: "arrayField", fields: [parsed.field] });
    } else {
      if (existing.fields.includes(parsed.field)) {
        throw new Error(`compareKeys で "${parsed.rootKey}[].${parsed.field}" が重複しています`);
      }
      existing.fields.push(parsed.field);
    }
  }
  return groups;
}

// original と compareKeys から「埋め込みJSONがこうあるべき」という期待値オブジェクトを組み立てる。
// compareKeys が未指定なら original をそのまま返す（従来通りの完全一致）。
// 指定されたキー・フィールドが原本に存在しない場合は例外を投げる（呼び出し元で exit 1 になる）。
function buildExpectedEmbedded(original, compareKeys) {
  if (!compareKeys) return original;

  const groups = groupCompareKeys(compareKeys);
  const expected = {};
  for (const [rootKey, group] of groups) {
    if (!Object.prototype.hasOwnProperty.call(original, rootKey)) {
      throw new Error(`compareKeys に指定されたキー "${rootKey}" が原本に存在しません`);
    }

    if (group.kind === "root") {
      expected[rootKey] = original[rootKey];
      continue;
    }

    const arr = original[rootKey];
    if (!Array.isArray(arr)) {
      throw new Error(`compareKeys で "${rootKey}[]" と指定されていますが、原本の "${rootKey}" は配列ではありません`);
    }
    expected[rootKey] = arr.map((el, i) => {
      const picked = {};
      for (const field of group.fields) {
        if (!Object.prototype.hasOwnProperty.call(el, field)) {
          throw new Error(`compareKeys に指定されたフィールド "${rootKey}[${i}].${field}" が原本に存在しません`);
        }
        picked[field] = el[field];
      }
      return picked;
    });
  }
  return expected;
}

// original・embedded・compareKeys から差分を計算する（ファイルI/Oなしの純粋関数）。
// compareKeys の構文エラー・パス不存在は例外を投げる。
function checkOne(original, embedded, compareKeys) {
  const expected = buildExpectedEmbedded(original, compareKeys);
  return diffDeep(expected, embedded);
}

// EMBED_CHECKS に従って全教材を検査する。
// 戻り値: { ok: boolean, report: string[] }  report は不一致がある場合のみ内容を持つ
// compareKeys の構文エラー・パス不存在は report に載せず、例外としてそのまま投げる（exit 1）。
function checkEmbeddedData() {
  const report = [];
  for (const entry of EMBED_CHECKS) {
    const html = readFileSync(join(root, entry.html), "utf8");
    for (const c of entry.checks) {
      let embedded;
      try {
        embedded = extractEmbedded(html, c.varName);
      } catch (e) {
        report.push(`[${entry.materialId}] ${entry.html} : ${e.message}`);
        continue;
      }
      const original = JSON.parse(readFileSync(join(root, c.dataFile), "utf8"));

      let diffs;
      try {
        diffs = checkOne(original, embedded, c.compareKeys);
      } catch (e) {
        throw new Error(`[${entry.materialId}] ${entry.html} の ${c.varName} (${c.dataFile}) : ${e.message}`);
      }

      if (diffs.length) {
        const label = c.compareKeys
          ? `${c.varName} が ${c.dataFile} の指定キー(${c.compareKeys.join(", ")})とずれています`
          : `${c.varName} が ${c.dataFile} とずれています`;
        report.push(`[${entry.materialId}] ${entry.html} の ${label}（${diffs.length}件）`);
        report.push(...formatDiffs(diffs));
      }
    }
  }
  report.push(...checkEmbeddedScripts().report);
  return { ok: report.length === 0, report };
}

// ---------- スクリプト埋め込み(scripts/*.mjs を丸ごと埋め込む教材向け) ----------
//
// JSONと違って構造比較ができない(パースしても意味のある差分にならない)ので、
// HTML内のコメント境界で囲った範囲を文字列として取り出し、scripts/*.mjs の全文と
// 一字一句突き合わせる。埋め込み側は次の形でコメント境界を置くこと。
//   /* ---------- ここから scripts/<file> をそのまま埋め込み(内容は書き換えない) ---------- */
//   ...ここに scripts/<file> の内容をそのまま貼る...
//   /* ---------- ここまで scripts/<file> の埋め込み ---------- */
//
// materialId → { html, sourceFile, startMarker, endMarker, transformSource? } の配列。
// 対象教材が増えたらここに追加する。EMBED_CHECKS(JSON用)とは独立に管理する。
//
// transformSource: 省略可。埋め込み側が原本の一部を書き換えている教材向け
// (例: 同一<script>内に先に埋め込んだ別ファイルの関数を直接参照できるため、
// importとexport文だけを省いている場合)。原本の全文を受け取り、埋め込み側と
// 比較する前の期待値文字列を返す関数を指定する。省略した場合は原本全文との
// 完全一致を要求する(従来通り)。
// 対象はimport文・export文の2箇所だけに限定し、それ以外の本文が原本とずれていれば
// (変換後の文字列同士の比較として)diffScriptTextが従来通り検出する。

// scripts/phys-momentum-impulse-layout.mjs 用のtransformSource。
// 先頭の `import {...} from "./vector-diagram-engine.mjs";` と、末尾の
// `export {...};` を1箇所ずつ取り除く。どちらも埋め込み側(html/phys-momentum-impulse.html)
// が意図的に省略している箇所で、それ以外は書き換えない。
function stripMomentumImpulseLayoutWiring(text) {
  return text
    .replace(/import\s*{[^}]*}\s*from\s*"\.\/vector-diagram-engine\.mjs";\n\n/, "")
    .replace(/\n\nexport\s*{[^}]*};\n?$/, "");
}

// scripts/projection-engine.mjs 用のtransformSource(phys-circular-motion専用)。
// phys-circular-motionは vector-diagram-engine.mjs と projection-engine.mjs の両方を
// 同じ<script type="module">に埋め込む(円錐振り子の3D投影のため)。ところが両ファイルは
// それぞれ独立に `const D2R = Math.PI / 180;` を持っていて、同じスコープに両方を
// そのまま埋め込むと「Identifier 'D2R' has already been declared」で構文エラーになる。
// vector-diagram-engine.mjsの方を先に埋め込み、projection-engine.mjs側の重複した
// D2R宣言だけを取り除く(値はどちらも Math.PI / 180 で全く同じなので、先に埋め込んだ
// vector-diagram-engine.mjsのD2RをprojectionEngineの関数からもそのまま使い回せる)。
// それ以外の内容は一切変更しない。
function stripProjectionEngineD2RForCircularMotion(text) {
  return text.replace("const D2R = Math.PI / 180;\n\n", "");
}

// scripts/phys-circular-motion-layout.mjs 用のtransformSource。
// 先頭の `import {...} from "./vector-diagram-engine.mjs";` を1箇所取り除く点は
// stripMomentumImpulseLayoutWiring と同じ。加えてこのファイルは単体(Node実行・
// import解決)のために独自の `const D2R`/`const R2D` を持っているが、埋め込み先の
// <script>では直前に埋め込んだ vector-diagram-engine.mjs が同じ値のD2R/R2Dを
// 既に宣言しているため、重複宣言のSyntaxErrorを避けるためにこの2行だけ取り除く
// (`const TAU`はどちらのエンジンにも無いためそのまま残す)。末尾の`export {...};`は
// stripMomentumImpulseLayoutWiring と同じ理由で取り除く。それ以外は書き換えない。
function stripCircularMotionLayoutWiring(text) {
  return text
    .replace(/import\s*{[^}]*}\s*from\s*"\.\/vector-diagram-engine\.mjs";\n\n/, "")
    .replace("const D2R = Math.PI / 180;\nconst R2D = 180 / Math.PI;\n", "")
    .replace(/\n\nexport\s*{[^}]*};\n?$/, "");
}

// scripts/phys-gravitation-layout.mjs 用のtransformSource。
// 先頭の `import {...} from "./vector-diagram-engine.mjs";` を1箇所取り除く点は
// stripMomentumImpulseLayoutWiring と同じ。このファイルはD2Rを使わない(未使用のため
// 定義自体を削ってある)ので、vector-diagram-engine.mjsと重複する`const R2D`の宣言
// だけを取り除けばよい(`const TAU`はどちらのエンジンにも無いためそのまま残す)。
// 末尾の`export {...};`も同じ理由で取り除く。それ以外は書き換えない。
function stripGravitationLayoutWiring(text) {
  return text
    .replace(/import\s*{[^}]*}\s*from\s*"\.\/vector-diagram-engine\.mjs";\n\n/, "")
    .replace("const R2D = 180 / Math.PI;\n", "")
    .replace(/\n\nexport\s*{[^}]*};\n?$/, "");
}

const EMBED_SCRIPT_CHECKS = [
  {
    materialId: "protein-structure",
    html: "html/protein-structure.html",
    sourceFile: "scripts/projection-engine.mjs",
    startMarker: "/* ---------- ここから scripts/projection-engine.mjs をそのまま埋め込み(内容は書き換えない) ---------- */",
    endMarker: "/* ---------- ここまで scripts/projection-engine.mjs の埋め込み ---------- */",
  },
  {
    materialId: "phys-projectile-motion",
    html: "html/phys-projectile-motion.html",
    sourceFile: "scripts/vector-diagram-engine.mjs",
    startMarker: "/* ---------- ここから scripts/vector-diagram-engine.mjs をそのまま埋め込み(内容は書き換えない) ---------- */",
    endMarker: "/* ---------- ここまで scripts/vector-diagram-engine.mjs の埋め込み ---------- */",
  },
  {
    materialId: "phys-rigid-body-equilibrium",
    html: "html/phys-rigid-body-equilibrium.html",
    sourceFile: "scripts/vector-diagram-engine.mjs",
    startMarker: "/* ---------- ここから scripts/vector-diagram-engine.mjs をそのまま埋め込み(内容は書き換えない) ---------- */",
    endMarker: "/* ---------- ここまで scripts/vector-diagram-engine.mjs の埋め込み ---------- */",
  },
  {
    materialId: "phys-momentum-impulse",
    html: "html/phys-momentum-impulse.html",
    sourceFile: "scripts/vector-diagram-engine.mjs",
    startMarker: "/* ---------- ここから scripts/vector-diagram-engine.mjs をそのまま埋め込み(内容は書き換えない) ---------- */",
    endMarker: "/* ---------- ここまで scripts/vector-diagram-engine.mjs の埋め込み ---------- */",
  },
  {
    materialId: "phys-momentum-impulse",
    html: "html/phys-momentum-impulse.html",
    sourceFile: "scripts/phys-momentum-impulse-layout.mjs",
    startMarker: "/* ---------- ここから scripts/phys-momentum-impulse-layout.mjs をそのまま埋め込み ----------\n   ただし先頭の import 文だけは省略している(vector-diagram-engine.mjsを直前に同じ\n   <script type=\"module\">内へ埋め込み済みで、同一スコープの関数をそのまま参照できるため。\n   相対パスの import 文をそのまま残すと、ブラウザが実ファイルへのfetchを試みてしまい、\n   単一ファイル完結・fetch不使用の方針に反する)。それ以外の内容は書き換えていない。 ---------- */",
    endMarker: "/* ---------- ここまで scripts/phys-momentum-impulse-layout.mjs の埋め込み ---------- */",
    transformSource: stripMomentumImpulseLayoutWiring,
  },
  {
    materialId: "phys-circular-motion",
    html: "html/phys-circular-motion.html",
    sourceFile: "scripts/vector-diagram-engine.mjs",
    startMarker: "/* ---------- ここから scripts/vector-diagram-engine.mjs をそのまま埋め込み(内容は書き換えない) ---------- */",
    endMarker: "/* ---------- ここまで scripts/vector-diagram-engine.mjs の埋め込み ---------- */",
  },
  {
    materialId: "phys-circular-motion",
    html: "html/phys-circular-motion.html",
    sourceFile: "scripts/projection-engine.mjs",
    startMarker: "/* ---------- ここから scripts/projection-engine.mjs をそのまま埋め込み ----------\n   ただし vector-diagram-engine.mjs と同じスコープに埋め込むため、重複する\n   `const D2R = Math.PI / 180;` の宣言だけを省略している(値は同じで、直前に\n   埋め込んだ vector-diagram-engine.mjs のD2Rをそのまま使い回せる)。\n   それ以外の内容は書き換えていない。 ---------- */",
    endMarker: "/* ---------- ここまで scripts/projection-engine.mjs の埋め込み ---------- */",
    transformSource: stripProjectionEngineD2RForCircularMotion,
  },
  {
    materialId: "phys-circular-motion",
    html: "html/phys-circular-motion.html",
    sourceFile: "scripts/phys-circular-motion-layout.mjs",
    startMarker: "/* ---------- ここから scripts/phys-circular-motion-layout.mjs をそのまま埋め込み ----------\n   ただし先頭の import 文と、vector-diagram-engine.mjsと重複する\n   `const D2R`/`const R2D` の宣言は省略している(直前に埋め込んだ vector-diagram-engine.mjs・\n   projection-engine.mjsの関数・定数を同一スコープでそのまま参照できるため。相対パスの\n   import 文をそのまま残すと、ブラウザが実ファイルへのfetchを試みてしまい、単一ファイル\n   完結・fetch不使用の方針に反する)。それ以外の内容は書き換えていない。 ---------- */",
    endMarker: "/* ---------- ここまで scripts/phys-circular-motion-layout.mjs の埋め込み ---------- */",
    transformSource: stripCircularMotionLayoutWiring,
  },
  {
    materialId: "phys-gravitation",
    html: "html/phys-gravitation.html",
    sourceFile: "scripts/vector-diagram-engine.mjs",
    startMarker: "/* ---------- ここから scripts/vector-diagram-engine.mjs をそのまま埋め込み(内容は書き換えない) ---------- */",
    endMarker: "/* ---------- ここまで scripts/vector-diagram-engine.mjs の埋め込み ---------- */",
  },
  {
    materialId: "phys-gravitation",
    html: "html/phys-gravitation.html",
    sourceFile: "scripts/phys-gravitation-layout.mjs",
    startMarker: "/* ---------- ここから scripts/phys-gravitation-layout.mjs をそのまま埋め込み ----------\n   ただし先頭の import 文と、vector-diagram-engine.mjsと重複する\n   `const R2D` の宣言は省略している(直前に埋め込んだ vector-diagram-engine.mjs の\n   関数・定数を同一スコープでそのまま参照できるため。相対パスの import 文をそのまま\n   残すと、ブラウザが実ファイルへのfetchを試みてしまい、単一ファイル完結・fetch不使用の\n   方針に反する)。それ以外の内容は書き換えていない。 ---------- */",
    endMarker: "/* ---------- ここまで scripts/phys-gravitation-layout.mjs の埋め込み ---------- */",
    transformSource: stripGravitationLayoutWiring,
  },
];

// HTML本文から、startMarker と endMarker に囲まれた範囲を取り出す。
// どちらかが見つからない場合は例外を投げる。
function extractEmbeddedScript(html, startMarker, endMarker) {
  const startIdx = html.indexOf(startMarker);
  if (startIdx === -1) {
    throw new Error(`開始境界のコメントが見つかりません: ${JSON.stringify(startMarker)}`);
  }
  const bodyStart = startIdx + startMarker.length;
  const endIdx = html.indexOf(endMarker, bodyStart);
  if (endIdx === -1) {
    throw new Error(`終了境界のコメントが見つかりません: ${JSON.stringify(endMarker)}`);
  }
  return html.slice(bodyStart, endIdx);
}

// 埋め込みテキスト(embedded)と原本(original, scripts/*.mjs の全文)を突き合わせる。
// 境界コメント自身の前後に入る改行だけを許容するため、双方とも前後の空白だけをtrimする。
// それ以外(中身のインデント・空行・コメント)は一切変更せず、完全一致を要求する。
// 一致すれば null、不一致なら最初にずれた行番号とその行の内容を返す。
function diffScriptText(original, embedded) {
  const a = original.trim();
  const b = embedded.trim();
  if (a === b) return null;

  const aLines = a.split("\n");
  const bLines = b.split("\n");
  const len = Math.max(aLines.length, bLines.length);
  for (let i = 0; i < len; i++) {
    if (aLines[i] !== bLines[i]) {
      return { line: i + 1, sourceLine: aLines[i], embeddedLine: bLines[i] };
    }
  }
  return { line: len + 1, sourceLine: undefined, embeddedLine: undefined };
}

// EMBED_SCRIPT_CHECKS に従って全教材を検査する。戻り値の形は checkEmbeddedData() と同じ
// { ok: boolean, report: string[] }。
function checkEmbeddedScripts() {
  const report = [];
  for (const entry of EMBED_SCRIPT_CHECKS) {
    const html = readFileSync(join(root, entry.html), "utf8");
    const rawOriginal = readFileSync(join(root, entry.sourceFile), "utf8");
    const original = entry.transformSource ? entry.transformSource(rawOriginal) : rawOriginal;

    let embedded;
    try {
      embedded = extractEmbeddedScript(html, entry.startMarker, entry.endMarker);
    } catch (e) {
      report.push(`[${entry.materialId}] ${entry.html} : ${e.message}`);
      continue;
    }

    const diff = diffScriptText(original, embedded);
    if (diff) {
      report.push(
        `[${entry.materialId}] ${entry.html} の埋め込みが ${entry.sourceFile} の${diff.line}行目付近からずれています`
      );
      report.push(`  ${entry.sourceFile}側 : ${JSON.stringify(diff.sourceLine)}`);
      report.push(`  埋め込み側         : ${JSON.stringify(diff.embeddedLine)}`);
    }
  }
  return { ok: report.length === 0, report };
}

// EMBED_CHECKS から指定した教材・変数のチェック定義を探す。見つからなければ例外を投げる。
function findCheck(materialId, varName) {
  const entry = EMBED_CHECKS.find((e) => e.materialId === materialId);
  if (!entry) throw new Error(`materialId "${materialId}" が EMBED_CHECKS に見つかりません`);
  const c = entry.checks.find((ch) => ch.varName === varName);
  if (!c) throw new Error(`varName "${varName}" が [${materialId}] の checks に見つかりません`);
  return c;
}

// 指定したチェックエントリについて、原本から compareKeys に従って埋め込み用JSONを
// 1行minifyで生成する。compareKeys 未指定なら原本をそのまま1行minifyで返す。
// 出力はそのままHTMLの `const VAR = ...;` に貼れば検証を通る。
function emitEmbed(materialId, varName) {
  const c = findCheck(materialId, varName);
  const original = JSON.parse(readFileSync(join(root, c.dataFile), "utf8"));
  const expected = buildExpectedEmbedded(original, c.compareKeys);
  return JSON.stringify(expected).replace(/<\//g, "<\\/");
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const args = process.argv.slice(2);
  try {
    if (args[0] === "emit") {
      const [, materialId, varName] = args;
      if (!materialId || !varName) {
        throw new Error("使い方: node scripts/check-embedded-data.mjs emit <materialId> <varName>");
      }
      console.log(emitEmbed(materialId, varName));
    } else {
      const { ok, report } = checkEmbeddedData();
      if (ok) {
        console.log("[check-embedded-data] 埋め込みJSONは data/*.json と一致しています");
      } else {
        console.error(report.join("\n"));
        process.exit(1);
      }
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

export {
  checkEmbeddedData,
  emitEmbed,
  parseComparePath,
  groupCompareKeys,
  buildExpectedEmbedded,
  checkOne,
  checkEmbeddedScripts,
  extractEmbeddedScript,
  diffScriptText,
  stripMomentumImpulseLayoutWiring,
  stripProjectionEngineD2RForCircularMotion,
  stripCircularMotionLayoutWiring,
  stripGravitationLayoutWiring,
};
