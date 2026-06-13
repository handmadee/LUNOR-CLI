# 📦 Package Versions Status

Last checked: 2026-01-12

## ✅ Up-to-date Packages

| Package | Current | Latest | Status |
|---------|---------|--------|--------|
| commander | ^12.0.0 | 12.x | ✅ Latest |
| chalk | ^5.3.0 | 5.3.0 | ✅ Latest (ESM-only) |
| ora | ^8.0.1 | 8.x | ✅ Latest |
| inquirer | ^9.2.14 | 9.x | ✅ Latest |
| cli-table3 | ^0.6.3 | 0.6.x | ✅ Latest |
| cli-progress | ^3.12.0 | 3.12.x | ✅ Latest |
| ink | ^4.4.1 | 4.x | ✅ Latest |
| react | ^18.2.0 | 18.x | ✅ Latest |
| axios | ^1.6.5 | 1.6.x | ✅ Latest |
| axios-retry | ^4.0.0 | 4.x | ✅ Latest |
| node-cache | ^5.1.2 | 5.x | ✅ Latest |
| fuse.js | ^7.0.0 | 7.x | ✅ Latest |
| js-yaml | ^4.1.0 | 4.x | ✅ Latest |
| date-fns | ^3.2.0 | 3.x | ✅ Latest |

## 🔄 Minor Updates Available

| Package | Current | Latest | Breaking? | Priority |
|---------|---------|--------|-----------|----------|
| zod | ^3.22.4 | ^3.24.2 | No | Medium |

**Zod 3.22.4 → 3.24.2**
- New features: Better coercion support
- No breaking changes
- Safe to upgrade

## ⚠️ Major Updates Available

| Package | Current | Latest | Breaking? | Priority |
|---------|---------|--------|-----------|----------|
| better-sqlite3 | ^9.3.0 | ^12.4.1 | Maybe | Low |

**Better-sqlite3 9.x → 12.x**
- ⚠️ Major version jump (3 major versions)
- SQLite version: 3.50.4
- **Test thoroughly before upgrading**
- Review breaking changes in migration docs
- May affect database compatibility

## 🎯 Recommended Actions

### Immediate (Safe)
```bash
npm install zod@^3.24.2
```

### Test First (Breaking Changes Possible)
```bash
# Create backup of databases first
npm install better-sqlite3@^12.4.1
# Run full test suite
# Test with existing databases
```

## 📚 Resources

- [Zod Changelog](https://github.com/colinhacks/zod/releases)
- [Better-sqlite3 Docs](https://github.com/wiselibs/better-sqlite3)
- [Commander.js Docs](https://github.com/tj/commander.js)
- [Chalk Docs](https://github.com/chalk/chalk)

## Notes

- **Node.js Requirement**: v20+ (for Commander.js)
- **Chalk**: Using ESM-only version 5
- **TypeScript**: v5.3.3 is latest stable
