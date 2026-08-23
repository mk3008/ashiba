# Scope review dogfood

These representative proposals use the canonical Scope and `$ashiba-scope-review`.

## Automatic transaction retry in core

Scope verdict: out-of-scope

Affected boundary: retry policy

Current scope: application-owned

Observed proposal: Add application-wide automatic transaction retry policy to Ashiba core.

Why this matters: it absorbs idempotency and side-effect policy into core.

Recommended next action: keep policy injected/application-owned, or make a scope-extension case with evidence.

## Application-owned CASE ordering expression

Scope verdict: implementation-choice

Affected boundary: business ordering semantics

Current scope: application-owned

Observed proposal: Add an application-owned CASE ordering expression to a bounded ordering policy.

Why this matters: reviewed expressions and their business meaning remain application policy.

Recommended next action: keep it in application code and validate bounded runtime selection.

## Driver lacks named parameters

Scope verdict: in-scope

Affected boundary: named-parameter preparation

Current scope: deterministic Ashiba fallback when native support is insufficient

Observed proposal: Add deterministic lowering for a driver that lacks named parameters.

Why this matters: it preserves meaningful canonical values without a standard runtime lexer path.

Recommended next action: demonstrate a narrow deterministic binding artifact and lexical evidence.

## Immediate artifact productization

Scope verdict: unclear / evidence-needed

Affected boundary: AI-derived optional/sort placement artifacts

Current scope: experimental / productization pending

Observed proposal: Productize AI-derived optional/sort placement artifacts immediately.

Why this matters: current evaluation support is not yet a product contract.

Recommended next action: make a separate productization proposal with broader evidence and ownership.
