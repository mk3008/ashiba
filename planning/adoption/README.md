# Adoption planning

このディレクトリは、Ashiba の普及、ポジショニング、対外コミュニケーションのための内部原本を管理する場所です。

ここにあるファイルは、最終的な公開ドキュメント本文ではありません。README、docs、npm metadata、比較ページ、記事、スターターガイドなどへ展開するための source materials として扱います。

## 運用方針

- 公開する言葉を揃えるための台帳として更新する。
- 公開 docs のナビゲーションには直接載せない。
- 外部ユーザー向けページにするときは、別途 `Why Ashiba`、`DB Support`、`Compare with Prisma` などの公開向けタイトルと構成に整える。
- `P0-*` のような優先度つきファイル名は、内部管理用のまま扱う。
- docs 配下が自動公開される構成になった場合は、`planning/adoption/` または `docs/_adoption/` への移動を検討する。

## 現在のファイル

- `plan.md`: 普及計画の全体台帳。
- `p0-1-positioning-language-ledger.md`: ポジショニングと言葉の固定。
- `p0-2-db-support-expectations.md`: DB 対応状況の期待値整理。
- `p0-3-entrypoint-reinforcement.md`: README / docs / npm の導線補強。
- `p0-4-why-ashiba.md`: Why Ashiba の原本。
- `p0-5-first-comparison-article.md`: 最初の比較記事の原本。
- `demos/`: 普及用 demo 企画。最初は R / read-heavy demo を扱い、CUD は別 lane として後続管理する。
