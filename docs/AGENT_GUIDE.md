# Agent Guide

Status: `canonical`
Audience: `agents`, `engineering`
Purpose: `tell AI agents how to work safely in this repository`

## Before Editing

Read:

1. `docs/START_HERE.md`
2. `docs/SOURCE_OF_TRUTH.md`
3. `docs/DESIGN_SYSTEM.md`
4. `docs/INTERACTION_CONTRACTS.md`

## Hard Rules

- Do not hand-edit `dist/`.
- Preserve current style unless explicitly asked to change it.
- Preserve current behavior unless explicitly asked to change it.
- Prefer narrow, behavior-preserving refactors.
- Use existing data, partial, CSS, and JS patterns before introducing new ones.
- Run `npm run check` before finalizing implementation work.
- If you change source ownership, update `docs/SOURCE_OF_TRUTH.md`.
- If you change visual patterns, update `docs/DESIGN_SYSTEM.md`.
- If you change behavior, update `docs/INTERACTION_CONTRACTS.md`.

## Good Refactor Shape

1. Pick one component, page type, or content collection.
2. Move source toward templates/data/modules.
3. Preserve generated output and behavior.
4. Run checks.
5. Explain exactly what changed and what did not.

## Bad Refactor Shape

- Sweeping CSS rewrites.
- Replacing several page interaction systems at once.
- Mixing visual redesign with infrastructure cleanup.
- Adding framework complexity without reducing total maintenance cost.
- Editing generated assets directly.
