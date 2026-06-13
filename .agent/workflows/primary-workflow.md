---
description: The Primary SDLC Workflow for Antigravity Kit (Full Lifecycle)
---
# Primary SDLC Workflow

This is the core end-to-end integration workflow for bringing a new feature or project from idea to production in the Antigravity Kit.
The `orchestrator-manager` MUST enforce this sequence.

## The Multi-Agent Pipeline

### Phase 1: Requirements & Brainstorming
**Agent:** `product-brainstormer`
- Analyze the raw user prompt.
- Perform external research or search if necessary.
- Formulate 3 distinct approaches.
- Finalize the Product Requirements Document (PRD).

### Phase 2: System Architecture
**Agent:** `engine-architect`
- Read the PRD from Phase 1.
- Choose the tech stack and database schema.
- Draw the structural flow using Mermaid diagrams.
- Write the Architecture Decision Record (ADR).

### Phase 3: Design & UI Specs (If applicable)
**Agent:** `design-ux-specialist`
- Define the UI states, variables, and typography.
- Inject the "Antigravity Aesthetic" (Glassmorphism, spatial constraints).
- Write absolute Design Specs for the implementation phase.

*-- HUMAN IN THE LOOP Checkpoint --*
*The Orchestrator requests human approval of the PRD, ADR, and Design Specs.*

### Phase 4: Implementation
**Agent:** `senior-coder`
- Follow the exact ADR and Design Specs.
- Implement the code sequentially, writing tests first if TDD is requested.
- Ensure DRY and SOLID principles.

### Phase 5: Verification & Security
**Agent:** `qa-security-auditor`
- Perform OWASP checks on the newly written code.
- Review for performance bottlenecks and N+1 queries.
- Validate test coverage.
- If issues are found, loop back to Phase 4.

### Phase 6: Finalization
**Agent:** `orchestrator-manager`
- Confirm all phases are complete.
- Merge the feature.
- Produce a `walkthrough.md` summarizing the completed SDLC sprint.
