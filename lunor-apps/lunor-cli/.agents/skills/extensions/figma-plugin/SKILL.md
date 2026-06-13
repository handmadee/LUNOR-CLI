---
name: figma-plugin
description: Design, implement, or review Figma plugin architecture, manifest structure, UI iframe boundaries, document access, asset export, and user consent flows.
---

# Figma Plugin

## Instructions

Use this skill for Figma plugin and design-tool extension work.

1. Separate plugin controller logic from UI iframe logic.
2. Treat document reads, selection traversal, and exports as permissioned operations.
3. Keep generated assets traceable to source nodes.
4. Avoid copying proprietary design assets into logs, fixtures, or public examples.
5. Validate plugin manifest capabilities against the actual feature set.

## Review Checklist

- Manifest permissions are minimal.
- UI and controller communicate through typed messages.
- Long-running document traversal reports progress.
- Exported assets have clear ownership and licensing assumptions.
