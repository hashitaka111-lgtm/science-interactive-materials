# index.html の再生成手順

1. 教材HTMLを `html/` に置き、`manifest.json` にその1件分のオブジェクト（`id` / `file` / `subject` / `unit` / `course` / `section` / `order` / `title` / `heading` / `summary` / `topics` / `interactions` / `confidence`）を追記する。`order` は科目内の通し番号で、グループの並び順もこの値で決まる。
2. リポジトリ直下で `node build.mjs` を実行する（依存パッケージなし。`index.template.html` + `manifest.json` → `index.html` を上書き出力）。
3. 出力された `index.html` をブラウザで開き、件数表示・科目タブ・検索が新しい1件を含めて動くことを確認する。見た目や文言を変えるときは `index.html` ではなく `index.template.html` を編集して 2 をやり直す。
