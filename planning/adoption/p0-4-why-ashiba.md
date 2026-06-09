# P0-4 Why Ashiba

## この文書の位置づけ

これは Ashiba の存在理由を整理する内部管理文書である。
対外的には README、docs、記事、登壇資料の "Why Ashiba" セクションに転用する。

## 目的

利用者が「なぜ Prisma / Drizzle / sqlc / 生 SQL だけではなく Ashiba が必要なのか」を理解できるようにする。

## 中心仮説

TypeScript の DB アクセスでは、型安全や自動生成は欲しいが、SQL の可視性、レビュー可能性、変更時の壊れ方を犠牲にしたくないチームがいる。
Ashiba は、その層に向けて SQL を主役にしたまま面倒な整合作業を自動化する。

## Why Ashiba の骨子

### 1. SQL を隠したくない

ORM は便利だが、生成 SQL や DB 変更の影響が見えにくくなることがある。
Ashiba は SQL をファイルとして見える形で保つ。

### 2. 手作業の mapper や drift 確認は減らしたい

生 SQL を保つだけでは、DTO、Mapper、Accessor、Test、変更影響確認が手作業になりやすい。
Ashiba はその周辺作業を生成と検証で支える。

### 3. migration はレビュー可能な SQL として扱いたい

DB 変更は自動適用よりも、レビュー可能な SQL として確認したい場面がある。
Ashiba は DDL 差分から reviewable migration SQL を生成する方向に寄せる。

### 4. AI に任せても、人間が読める境界へ戻したい

AI がコードを書くほど、最終的にレビューできる成果物が重要になる。
Ashiba は SQL、生成物、コマンド記述を見える形に保つことで、人間が確認できる開発フローを支える。

## 使うべきチーム

- SQL review を重視する TypeScript チーム。
- PostgreSQL 中心で、SQL を捨てずに型安全と生成を足したいチーム。
- Prisma / Drizzle の抽象化が合わず、SQL-first な運用を求めるチーム。
- DBA やレビュー担当者が DDL / SQL を直接確認するチーム。

## 使わない方がよいチーム

- ORM client API だけで DB 操作を完結させたいチーム。
- SQL をほとんど書きたくないチーム。
- 現時点で PostgreSQL 以外の安定した主導線が必須のチーム。
- 大規模な既存 ORM エコシステムや GUI ツールを最優先するチーム。

## 未決事項

- "Why Ashiba" を README のどの位置に置くか。
- AI 訴求を主張の中心に置くか、補助に置くか。
- Prisma / Drizzle / sqlc への言及をどの程度直接的にするか。
