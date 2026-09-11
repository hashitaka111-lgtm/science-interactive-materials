# index.html デザイン決定ログ

index.html 制作時に、既存教材3本（`html/crystal-lattice.html` / `html/thermochemistry.html` / `html/shm-oscillation.html`）を読み取り専用で監査し、値の一致・不一致を確認した上で決定した内容の記録。

トークンの正本は [html/distribution-series-design-system.md](html/distribution-series-design-system.md)。色・フォント・角丸・影なし・430pxブレークポイントなど基本トークンは3本とも同一で、そちらにすでに定義されている。このログはそこには載っていない、**3本の間で食い違っていた項目について index.html でどちらを採用したか**だけを残す。

## 3本の間で食い違っていた項目と、index.html での採用値

| 項目 | crystal-lattice | shm-oscillation | thermochemistry | index.html 採用値 |
|---|---|---|---|---|
| 本文サイズ | 13.5px（430px以下13px） | 13.5px（430px以下13px） | 14px（縮小なし） | `13.5px`（430px以下 `13px`）多数派を採用 |
| h2サイズ | 13.5px（本文と同寸） | 13.5px | 15px | `15px`（thermochemistry側）。index.htmlは階層が深く、本文同寸だと見出しがカードのタイトルに埋もれるため少数派を採用 |
| コンテンツ幅 `.wrap max-width` | 820px | 820px | 810px | `1200px`。索引は3カラムグリッド表示のため、教材本体（820px基準）より広げた |
| `.wrap` パディング | 20px 14px 72px | 20px 14px 72px | 18px 14px 60px | `20px 14px 72px`（多数派）。430px以下は `14px 10px 56px` |
| アクセント色の変数名 | `--c0`〜`--c5` | `--c0`〜`--c5` | `--s0`〜`--s5` | `--c0`〜`--c5`（多数派、値は完全同一） |
| sansフォントの指定方法 | bodyに直接記述 | bodyに直接記述 | `--sans` 変数で定義 | `--sans` 変数方式（thermochemistry側） |

## Webフォントの扱い

3本とも `<head>` で Google Fonts（IBM Plex Sans JP / IBM Plex Mono）を読み込んでいる。当初は「外部CDNを読み込まない」という制約との衝突が論点だったが、**教材本体との見た目統一を優先し、index.html にも同じ Google Fonts リンクを張る**方針を採用した（3本と同一の `<link>` 行）。

## 反映状況

上記はすべて [index.html](index.html) に実装済み。今後 index.html のデザインを変更する際は、このログではなく実装（index.html 自体）と `html/distribution-series-design-system.md` を正とする。
