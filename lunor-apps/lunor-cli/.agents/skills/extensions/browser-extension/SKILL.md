---
name: browser-extension
description: Design, implement, or review browser extensions, including manifest permissions, content scripts, background workers, messaging, storage, privacy, and store submission readiness.
---

# Browser Extension

## Instructions

1. Keep extension permissions minimal and explain each permission in product language.
2. Separate content scripts, background workers, popup UI, and options UI.
3. Treat page DOM, clipboard, tabs, cookies, and browsing data as sensitive.
4. Use typed message contracts between extension contexts.
5. Add review checks for store policy, privacy disclosure, and data retention.

## Review Checklist

- Manifest permissions match actual feature needs.
- Content scripts cannot leak customer/page data.
- Background worker has explicit error handling.
- Extension storage avoids secrets unless encrypted and justified.
