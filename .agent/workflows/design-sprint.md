---
description: Specialized sequence for rapid prototyping, UI/UX Promax ideation, and responsive frontend implementation.
---
# Design Sprint Workflow

To be used when the user request is heavily skewed towards frontend development, UI/UX revitalization, or creating beautiful, modern pages.

## Workflow Sequence

### 1. Vision & Aesthetic Gathering
- **Trigger:** `product-brainstormer` searches for modern inspirations (Dribbble, Awwwards trends) and formulates a mood board description.
- **Goal:** Define the exact vibe (e.g., "Dark mode Cyberpunk," "Apple HIG clean," "Neo-Brutalism").

### 2. Antigravity Systems Design
- **Trigger:** `design-ux-specialist` translates the mood board into concrete Design Tokens.
- **Goal:** Output a set of Tailwind classes, font sizes, CSS custom properties, and animation constraints (using Framer Motion or pure CSS).

### 3. Component Scaffolding
- **Trigger:** `engine-architect` maps out the frontend component tree (e.g., separating atoms, molecules, and organisms).
- **Goal:** Establish a clean hierarchy and define the data props (TypeScript interfaces) that each component will accept.

### 4. Pixel-Perfect Code Generation
- **Trigger:** `senior-coder` executes the code file by file. 
- **Goal:** Build the React/Next.js/HTML components utilizing the exact tokens provided in Step 2.

### 5. Accessibility & Motion Polish
- **Trigger:** `qa-security-auditor` and `design-ux-specialist` (working in tandem).
- **Goal:** Ensure ARIA labels are active, contrast ratios pass WCAG AA, and animations do not cause layout thrashing. Perform performance optimizations before concluding the sprint.
