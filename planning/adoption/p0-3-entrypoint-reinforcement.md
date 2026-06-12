# P0-3 README / docs / npm の導線補強

## この文書の位置づけ

これは Ashiba の最初の接点を補強するための内部管理文書である。
README、docs top、npm metadata が同じ言葉で Ashiba を説明できるようにする。

## 目的

初回訪問者が短時間で次を理解できるようにする。

- Ashiba は何か。
- どの課題に効くか。
- Prisma / Drizzle / sqlc とどう違うか。
- どの DB で試せるか。
- どう始めるか。

## 対象導線

- GitHub README
- docs top
- npm package description
- npm README
- package keywords
- starter README
- comparison page へのリンク

## ファーストビューで伝えること

- SQL-first TypeScript generator。
- ORM runtime ではない。
- SQL を見える形で保つ。
- DTO / Mapper / Accessor / Test / migration review を生成する。
- PostgreSQL の quickstart へ進める。

## README / docs の推奨構成

1. What Ashiba is
2. Show me the SQL
3. What Ashiba generates
4. Drift checks and reviewable migrations
5. Safe optional filters and safe sort
6. How Ashiba differs from Prisma, Drizzle, and sqlc
7. Try the PostgreSQL starter
8. Who should use Ashiba
9. Who should not use Ashiba
10. DB support status

## npm metadata で確認すること

- package description が主カテゴリを含むか。
- keywords に discovery 用語が入っているか。
- README が GitHub / docs と矛盾しないか。
- package scope と名前が `@ashiba-ts` として伝わるか。

## 未決事項

- README と docs top の役割分担。
- npm description の短い最終文言。
- docs top で comparison をどこまで前面に出すか。
