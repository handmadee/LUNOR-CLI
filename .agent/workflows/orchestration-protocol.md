---
description: The communication standard for how agents must interact, delegate, and reflect within the Antigravity Kit.
---
# Orchestration Protocol (Plan-Act-Reflect)

This document is the absolute law for Agent-to-Agent communication. It enforces the "Plan-Act-Reflect" model established in the 2025 AI multi-agent topography.

## 1. The Handoff Contract
When the `orchestrator-manager` delegates a task to a sub-agent, the context must be explicit.
The sub-agent MUST reply exactly in this format before acting:
```json
{
  "agent_role": "[My Role]",
  "understanding": "[One sentence summary of what I must do]",
  "dependencies": "[What I need from the prior agent's output]",
  "action_plan": [
    "Step 1: ...",
    "Step 2: ..."
  ]
}
```

## 2. The "Act" Phase Constraints
- Agents must NOT execute destructive console commands without Orchestrator approval.
- Agents must write atomic, small commits if applicable.
- Agents must not hallucinate context. If context is missing, they MUST return an error to the Orchestrator requesting missing details.

## 3. The "Reflect" Phase (Mandatory)
Before a sub-agent marks their turn as "done", they must trigger a self-reflection loop:
> "Did I fully solve the prompt? Did I introduce any regressions? Let me double-check my output."

If they find an error in their own work, they must fix it before passing the baton back to the Orchestrator. 

## 4. Conflict Resolution
If `qa-security-auditor` rejects the `senior-coder`'s work:
1. QA identifies the exact line and vulnerability.
2. Coder fixes the exact line without rewriting the whole file.
3. Coder resubmits.
Maximum loop iterations: 3. If it fails 3 times, escalate to Human.
