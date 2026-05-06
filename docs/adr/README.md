# Architecture Decision Records

Each ADR captures a single architectural decision: the context, the decision itself, the trade-offs accepted, and the alternatives considered — including ones we explicitly chose **not** to pursue, so they aren't re-litigated later.

## Format

- One file per decision, named `NNNN-kebab-case-slug.md`
- Numbers are assigned sequentially and never reused
- Status is one of: `Proposed`, `Accepted`, `Superseded by NNNN`, `Deprecated`
- Once `Accepted`, ADRs are immutable. To change a decision, write a new ADR that supersedes it; do not rewrite the old one
- Body sections, in order:
  - **Context** — what state were we in, what problem prompted the decision
  - **Decision** — what we chose
  - **Consequences** — what this means going forward (good and bad)
  - **Alternatives Considered** — including rejected ones, with reasons
  - **Triggers to Revisit** — under what conditions should this decision be reopened

## When to write one

- Architectural choices with non-trivial trade-offs
- Approaches we explicitly **rejected** and want recorded
- Cross-service / cross-module protocol decisions
- Decisions that took meaningful discussion to arrive at

Bug fixes and routine refactors do not need ADRs — commit messages cover them.
