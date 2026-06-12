# P0-2 DB 対応状況の期待値整理

## この文書の位置づけ

これは Ashiba の DB 対応状況を、対外的に誤解なく伝えるための内部管理文書である。
実装状況、公開パッケージ、README / docs の説明がずれないようにする。

## 目的

利用者が「今どの DB で安心して試せるのか」「どこからが preview / experimental なのか」を判断できるようにする。

## 決めること

- 現時点で安定導線として案内する DB。
- preview として案内する DB。
- experimental または planned として扱う DB。
- README、docs、npm、記事で使う成熟度ラベル。
- adapter package が存在する場合の期待値表現。

## 初期方針

PostgreSQL を最初の安定導線として扱う。
他の adapter は、実装や package が存在しても、ドキュメント、テスト、スターター、実利用証拠が揃うまでは成熟度を明示する。

## 成熟度ラベル案

| ラベル | 意味 | 対外的な扱い |
|---|---|---|
| stable | 推奨導線。docs、starter、検証コマンド、実行例が揃っている。 | README / docs の主要導線に載せる。 |
| preview | 試用可能だが、利用条件や制約が残る。 | 制約つきで案内する。 |
| experimental | 実験的。API や挙動が変わる可能性が高い。 | 主導線には置かず、期待値を強く下げる。 |
| planned | 今後対応予定または検討中。 | roadmap に置く。 |

## 確認すること

- 現在公開されている adapter package。
- 各 adapter の README / docs / test / starter の有無。
- CI で継続検証されている DB。
- npm 上の説明と docs の説明の一致。

## 未決事項

- PostgreSQL 以外をどのラベルに置くか。
- multi-DB 対応をいつ、どの条件で主要訴求に入れるか。
- DB ごとのスターターを作る順序。
