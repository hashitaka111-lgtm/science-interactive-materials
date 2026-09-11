# アミノ酸20種 レビュー表

`data/amino-acids.json` の内容を人間が目視確認するための一覧。

**注記**: `pI.confidence` は全20種で `low` になっている（高校教科書がpIの数値を精密に扱わないため、出典間で値が割れるという性質上の結果）。そのため「lowを含む行」と「全部highの行」に分けるという指示に対して、全20行がlow側に入り、全部high側は0件になっている。

## 表

| id | 名前 | class | 側鎖 | 官能基 | 不斉炭素 | 不斉炭素数 | 不飽和度 | 元素組成(C,H,N,O,S) | 側鎖分子量 | pI | ニンヒドリン | キサントプロテイン | 硫黄反応 | tier |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| glycine | グリシン | 中性 | -H | なし | なし | 0 | 1 | 2,5,1,2,0 | 1 | 5.97 (要確認) | positive | negative | negative | core |
| alanine | アラニン | 中性 | -CH3 | なし | あり | 1 | 1 | 3,7,1,2,0 | 15 | 6.00 (要確認) | positive | negative | negative | core |
| valine | バリン | 中性 | -CH(CH3)2 | なし | あり | 1 | 1 | 5,11,1,2,0 | 43 | 5.96 (要確認) | positive | negative | negative | core |
| leucine | ロイシン | 中性 | -CH2-CH(CH3)2 | なし | あり | 1 | 1 | 6,13,1,2,0 | 57 | 5.98 (要確認) | positive | negative | negative | extended |
| isoleucine | イソロイシン | 中性 | -CH(CH3)-CH2-CH3 | なし | あり | 2 | 1 | 6,13,1,2,0 | 57 | 6.02 (要確認) | positive | negative | negative | extended |
| serine | セリン | 中性 | -CH2-OH | ヒドロキシ基 | あり | 1 | 1 | 3,7,1,3,0 | 31 | 5.68 (要確認) | positive | negative | negative | core |
| threonine | トレオニン | 中性 | -CH(OH)-CH3 | ヒドロキシ基 | あり | 2 | 1 | 4,9,1,3,0 | 45 | 5.60 (要確認) | positive | negative | negative | extended |
| cysteine | システイン | 中性 | -CH2-SH | チオール基 | あり | 1 | 1 | 3,7,1,2,1 | 47 | 5.07 (要確認) | positive | negative | positive | core |
| methionine | メチオニン | 中性 | -CH2-CH2-S-CH3 | スルフィド | あり | 1 | 1 | 5,11,1,2,1 | 75 | 5.74 (要確認) | positive | negative | conditional (要確認) | core |
| asparagine | アスパラギン | 中性 | -CH2-CO-NH2 | アミド結合 | あり | 1 | 2 | 4,8,2,3,0 | 58 | 5.41 (要確認) | positive | negative | negative | extended |
| glutamine | グルタミン | 中性 | -CH2-CH2-CO-NH2 | アミド結合 | あり | 1 | 2 | 5,10,2,3,0 | 72 | 5.65 (要確認) | positive | negative | negative | extended |
| aspartic_acid | アスパラギン酸 | 酸性 | -CH2-COOH | カルボキシ基 | あり | 1 | 2 | 4,7,1,4,0 | 59 | 2.77 (要確認) | positive | negative | negative | core |
| glutamic_acid | グルタミン酸 | 酸性 | -CH2-CH2-COOH | カルボキシ基 | あり | 1 | 2 | 5,9,1,4,0 | 73 | 3.22 (要確認) | positive | negative | negative | core |
| lysine | リシン | 塩基性 | -(CH2)4-NH2 | アミノ基 | あり | 1 | 1 | 6,14,2,2,0 | 72 | 9.74 (要確認) | positive | negative | negative | core |
| arginine | アルギニン | 塩基性 | -(CH2)3-NH-C(=NH)-NH2 | グアニジノ基 | あり | 1 | 2 | 6,14,4,2,0 | 100 | 10.76 (要確認) | positive | negative | negative | extended |
| histidine | ヒスチジン | 塩基性 | -CH2-C3H3N2（イミダゾール環） | 複素環 | あり | 1 | 4 | 6,9,3,2,0 | 81 | 7.59 (要確認) | positive | negative | negative | extended |
| phenylalanine | フェニルアラニン | 中性 | -CH2-C6H5 | ベンゼン環 | あり | 1 | 5 | 9,11,1,2,0 | 91 | 5.48 (要確認) | positive | conditional (要確認) | negative | core |
| tyrosine | チロシン | 中性 | -CH2-C6H4-OH(p) | フェノール性ヒドロキシ基、ベンゼン環 | あり | 1 | 5 | 9,11,1,3,0 | 107 | 5.66 (要確認) | positive | positive | negative | core |
| tryptophan | トリプトファン | 中性 | -CH2-C8H5NH（インドール環） | ベンゼン環、複素環 | あり | 1 | 7 | 11,12,2,2,0 | 130 | 5.89 (要確認) | positive | positive | negative | extended |
| proline | プロリン | 中性 | -(CH2)3- （Cαのアミノ基Nと環化し五員環を形成） | 複素環 | あり | 1 | 2 | 5,9,1,2,0 | 42 | 6.30 (要確認) | positive (要確認) | negative | negative | extended |

不斉炭素数・不飽和度・元素組成・側鎖分子量の内訳と検算根拠は `data/amino-acids.json` の各アミノ酸オブジェクト内 `chiral_center_count` / `degree_of_unsaturation.note` / `atom_counts` / `side_chain_molar_mass.note` を参照。

全20行が「lowを含む行」であるため、上下の区分けは発生していない（=全部highの行は0件）。

## 要確認セルの一覧

| id | 項目 | note |
|---|---|---|
| glycine | pI | 教科書によって値が異なる |
| alanine | pI | 教科書によって値が異なる |
| valine | pI | 教科書によって値が異なる |
| leucine | pI | 教科書によって値が異なる |
| isoleucine | pI | 教科書によって値が異なる |
| serine | pI | 教科書によって値が異なる |
| threonine | pI | 教科書によって値が異なる |
| cysteine | pI | 文献により5.02〜5.07などの幅がある |
| methionine | pI | 教科書によって値が異なる |
| methionine | 硫黄反応 | システインのチオール基とは事情が異なり、側鎖の硫黄はスルフィド(-S-)であるため、通常の硫黄検出反応の条件では検出されない場合がある |
| asparagine | pI | 教科書によって値が異なる |
| glutamine | pI | 教科書によって値が異なる |
| aspartic_acid | pI | 文献により2.77〜2.98などの幅がある |
| glutamic_acid | pI | 文献により3.08〜3.22などの幅がある |
| lysine | pI | 教科書によって値が異なる |
| arginine | pI | 教科書によって値が異なる |
| histidine | pI | 教科書によって値が異なる |
| phenylalanine | pI | 教科書によって値が異なる |
| phenylalanine | キサントプロテイン | 教科書は「ベンゼン環をもつアミノ酸」とキサントプロテイン反応を紹介するが、実際にはっきり呈色するのはチロシンとトリプトファンで、フェニルアラニン単独では呈色が弱く検出されにくい |
| tyrosine | pI | 文献により5.63〜5.66などの幅がある |
| tryptophan | pI | 教科書によって値が異なる |
| proline | pI | 他の中性アミノ酸と異なりpIが6を明確に超える。教科書によって値が異なる |
| proline | ニンヒドリン | 第二級アミン（イミノ酸）のため呈色が黄色になる（通常の青紫ではない） |

## その他の特記事項（confidenceフラグ非対象・amino_acidレベルのnoteのみ）

| id | 内容 |
|---|---|
| arginine | 成長期には準必須アミノ酸とされることがあるが、高校教科書の標準的な9種必須アミノ酸には含まれないため essential: false とした |
| histidine | 統制語彙に「イミダゾール環」がないため「複素環」で代用。側鎖はイミダゾール環（五員環、N原子2個） |
| tryptophan | 統制語彙に「インドール環」がないため、ベンゼン環とピロール環が縮合した構造を「ベンゼン環」「複素環」の2語で近似。実際は独立した2つの環ではなく縮合した1つの二環性インドール環 |
| proline | 側鎖がα-アミノ基に環化した五員環（ピロリジン環）を形成する特殊なアミノ酸（イミノ酸）。他19種の直鎖側鎖表記とは形式が異なる |
