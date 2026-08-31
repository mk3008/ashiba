# E1-P treatment-removal record

- Removed dependency and generated/configuration state: the prior data-access package, its CLI development dependency, and its generated contract/runtime imports.
- Replacement: direct `pg` pool and client calls execute the existing visible SQL with positional parameters.
- Replaced commands: the TypeScript build and Node test commands are unchanged; no generator command remains.
