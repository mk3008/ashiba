# @ashiba-ts/transfer-dogfood Guidance

## 転送制御モデル

destination、dirty key、work item、transfer request、key map、active black、lineage、generated transfer SQL、転送実行に関わる実装を行う前に、以下を読むこと。

- `dogfood/transfer/docs/concepts/README.md`
- `dogfood/transfer/docs/concepts/destination/concept.json`
- `dogfood/transfer/docs/concepts/dirty-key/concept.json`
- `dogfood/transfer/docs/concepts/transfer-setting/concept.json`

destination、dirty key、transfer setting の意味をIssueやfeature内で再定義しないこと。

上記ドキュメントを、destination、dirty key management、transfer setting に関する現在の仕様正本として扱うこと。
