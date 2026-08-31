# sqlc artifact retrieval

The scored sqlc arm uses the official `sqlc` 1.31.1 Windows amd64 archive and
the `sqlc-gen-typescript` 0.1.3 WASM plugin. The benchmark does not commit the
large WASM file. Retrieve both artifacts into a temporary directory and verify
their pinned SHA-256 before extracting or executing either artifact:

```powershell
node fixtures/packet/fetch-sqlc-artifacts.mjs --out C:\tmp\ashiba-v3-sqlc
```

The command is fail-closed: an existing file with a different digest, a
download failure, or a digest mismatch exits nonzero and leaves no `.partial`
file. It prints a verified result only after the complete file has been hashed.
The output directory is outside the repository and must be removed after the
run. The expected digests are also recorded in `PACKET_MANIFEST.md`.

This fetch helper is part of the packet tooling, not a scored candidate and not
a product dependency. The source URL and retrieval metadata are frozen in the
packet manifest; the verifier checks the committed local inputs and package
locks before a scored cell begins.
