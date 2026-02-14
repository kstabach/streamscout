# StreamScout Project Context

## Modal/Overlay Debugging Protocol

When modals or overlays don't appear but exist in DOM:

1. **STOP** - Do not propose CSS fixes yet
2. **Open DevTools Computed tab** - Check actual computed styles, not just Elements HTML
3. **Check parent chain** for:
   - `overflow: hidden` (clips content)
   - `transform` properties (creates new stacking context)
   - `position: fixed` contexts (affects positioning)
4. **Verify z-index stacking context** - Element might be behind other layers
5. **Check for conflicting global CSS** - Inspect element directly
6. **Test in incognito mode** - Rule out browser extension conflicts
7. **Only AFTER investigation** → Propose targeted fix

**Rule**: If 2+ fixes attempted without success, the approach is wrong. Return to Phase 1 investigation.

## Git Workflow

### Pre-Commit Hook Issue

- Pre-commit hook at `.git/hooks/pre-commit` has path issues
- **Fix once**: Inspect the hook file, fix the path, or remove if obsolete
- **Do NOT** normalize `--no-verify` usage as a permanent workaround
- Broken hooks indicate environment/setup issues worth fixing permanently

## Known Issues

- **Streaming Availability API**: Returns 404 on free tier (expected behavior, has fallback)
- **Placeholder Poster**: SVG type requires `dangerouslyAllowSVG` or PNG replacement
