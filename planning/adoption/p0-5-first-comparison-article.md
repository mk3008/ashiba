# P0-5 最初の比較記事

## この文書の位置づけ

これは最初に出す比較記事を決めるための内部管理文書である。
対外的には docs comparison page、Zenn / blog 記事、README からのリンクに転用する。

## 目的

Ashiba を既存の選択肢と比較して理解できるようにする。
「また別の ORM」ではなく、「SQL を所有したい TypeScript チーム向けの generator」として認識してもらう。

## 比較候補

| 候補 | 期待効果 | 注意点 |
|---|---|---|
| Ashiba vs Prisma | 検索需要が大きく、SQL が見えにくい不満に刺さりやすい。 | Prisma 批判だけに見えないようにする。 |
| Ashiba vs Drizzle | TypeScript DB tooling 文脈で比較しやすい。 | Drizzle は SQL-friendly なので差分を丁寧に書く必要がある。 |
| Ashiba vs sqlc | 思想が近く、Ashiba のカテゴリ定義に向く。 | sqlc の TypeScript 位置づけを正確に扱う必要がある。 |

## 初期推奨

最初の記事は `Ashiba vs Prisma` がよい。

理由:

- Prisma は認知が大きく、比較入口として理解されやすい。
- 「SQL が見えなくなるのが不安」という問題設定が Ashiba の価値に直結する。
- Ashiba が ORM の完全代替ではなく、SQL-first generator であることを説明しやすい。

## 記事の骨子

1. Prisma は強力な ORM であり、多くのチームに向く。
2. ただし、SQL の可視性や migration review を重視するチームでは別の課題が出る。
3. Ashiba は ORM runtime ではなく、SQL-first TypeScript generator である。
4. Ashiba は SQL、DTO、Mapper、Accessor、Test、reviewable migration SQL を見える形で扱う。
5. Prisma を使うべき場合と Ashiba を検討すべき場合を分ける。
6. PostgreSQL starter で試せる導線へつなぐ。

## 書き方の原則

- 競合を下げず、選択基準を明確にする。
- 速度や採用規模など未検証の主張をしない。
- 「万能 ORM ではない」と明記する。
- 最後は quickstart / starter / docs へつなげる。

## 未決事項

- 最初の記事を docs に置くか、Zenn / blog に置くか。
- 英語記事と日本語記事のどちらを先に出すか。
- Prisma の具体 API / migration flow まで踏み込むか。
