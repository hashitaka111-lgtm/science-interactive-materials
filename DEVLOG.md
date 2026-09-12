# 開発ログ

運用ルールは [scripts/DEVLOG-CONVENTION.md](scripts/DEVLOG-CONVENTION.md) を参照。
全ての作業セッションの最後に、このファイルへの追記・コミット・pushを行う。

## 2026-09-12 — リポジトリ初期化とGitHub公開

- 変更: リポジトリ全体を新規git初期化(既存git履歴は存在しなかったため1コミットで開始)、`.gitignore`、`scripts/DEVLOG-CONVENTION.md`、`DEVLOG.md`
- 教材数: 化学21件・物理12件、合計33件(manifest.jsonのidを`chem-`/`phys-`で集計。初回記載時にアミノ酸・タンパク質・酵素反応系を「生物」として誤って別枠に数えていたため訂正)
- 保留: 特になし
- 次: 特になし

## 2026-09-12 — 力学シリーズ4本目「円運動」の実装

- 変更: `html/phys-circular-motion.html`(新規)、`scripts/phys-circular-motion-layout.mjs`(新規)、`scripts/check-phys-circular-motion-overlaps.mjs`(新規)、`scripts/check-embedded-data.mjs`(EMBED_SCRIPT_CHECKSに3エントリ追加、`stripProjectionEngineD2RForCircularMotion`・`stripCircularMotionLayoutWiring`を追加)、`manifest.json`(`phys-circular-motion`を新規追加、`phys-shm-oscillation`・`phys-rigid-body-equilibrium`・`phys-momentum-impulse`のrelatedに相互リンクを追加)、`index.html`(build.mjsで再生成)
- UNIFORM(等速円運動)・HORIZONTAL(水平面、摩擦力が向心力)・VERTICAL(鉛直面、N(θ)の境界条件)・CONICAL PENDULUM(円錐振り子、3D)の4シーンを実装。shm-oscillation.htmlが天下り的に使っていたv=rω・a=rω²を、弧度法と相似な三角形から導出するDERIVATIONカードと、UNIFORMシーンに連動する読み取り専用のBRIDGE表(shm-oscillation.htmlへのリンク付き)を用意し、単振動教材との内容の重複を避けた
- 実装中に判明した注意点: vector-diagram-engine.mjsとprojection-engine.mjsは共に独自に`const D2R`を持っており、円錐振り子のために両方を同じ`<script type="module">`に埋め込むと`Identifier 'D2R' has already been declared`でSyntaxErrorになる。先に埋め込んだvector-diagram-engine.mjs側のD2R(値は同じ)を後続のprojection-engine.mjs・phys-circular-motion-layout.mjsの埋め込みから使い回す形にし、重複する宣言行だけをtransformSourceで取り除いて解消した(値そのものは変更していない)
- 教材数: 化学21件・物理13件、合計34件
- 保留: manifest.jsonの`phys-circular-motion`のrelatedに`phys-gravitation`をまだ含めていない(5本目「万有引力」がまだ存在しないため、含めるとbuild.mjsのvalidateが落ちる)。5本目の実装時にrelatedへの追加と、phys-gravitation側からの逆リンクを両方行うこと
- 次: 力学シリーズ5本目「万有引力」(phys-gravitation)の実装
