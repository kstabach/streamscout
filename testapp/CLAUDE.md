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

## General Debugging Protocol

**Multi-fix failure rule**: If attempting a 3rd fix for the same issue without success, STOP immediately:
1. Return to Phase 1 investigation
2. Question whether the fundamental approach is wrong
3. Consider alternative root causes
4. Do NOT continue trying variations of the same fix

This rule prevents wasting time on the wrong solution path.

## Git Discipline

**Before ANY git operation**, verify current state first:
- Before committing: Run `git status` and `git log --oneline -3` to check if changes are already committed
- Before creating PRs: Run `git branch -a` and `gh pr list` to verify branch is not already merged
- Before pushing: Verify you're on the correct branch and pushing to the right remote

**Git hook failures**:
- When a git hook fails, read the hook file and fix the broken path/command
- **NEVER** use `--no-verify` as a permanent workaround
- Broken hooks indicate environment/setup issues worth fixing permanently

**Keep it simple**:
- Commit workflows should be 5 steps or fewer
- Do not over-engineer the commit process

## Agent Delegation Rules

When working with multi-agent workflows or spawning sub-agents:

**Orchestrator role discipline**:
- When your role is ORCHESTRATOR, delegate work—do NOT execute it yourself
- If a sub-agent fails, report the failure with error details
- Do NOT silently take over failed agent work—ask for instructions first

**Task tool usage**:
- When spawning Task agents for research/implementation, let them complete their work
- Your job is coordination, not execution
- Respect agent boundaries and handoff protocols

## Scope Constraints

When the user specifies an explicit scope (e.g., "Phase 1 only", "these 6 fields only", "surgical patch"):

**Treat scope as a HARD boundary**:
- Do NOT add extra fields beyond what's explicitly requested
- Do NOT modify extra files outside the stated scope
- Do NOT expand scope silently

**If scope should be expanded**:
- ASK first before adding anything out of scope
- Never make scope decisions unilaterally

This prevents costly revert-and-redo cycles.

## Git Workflow

### Pre-Commit Hook Issue

- Pre-commit hook at `.git/hooks/pre-commit` has path issues
- **Fix once**: Inspect the hook file, fix the path, or remove if obsolete
- **Do NOT** normalize `--no-verify` usage as a permanent workaround
- Broken hooks indicate environment/setup issues worth fixing permanently

## Technical Stack

- **Next.js**: 16.1.6 with Turbopack (experimental)
- **Tailwind CSS**: v3 (stable) - **DO NOT upgrade to v4 (beta)**
  - Tailwind v4 is incompatible with Next.js 16 Turbopack
  - Causes ALL background utility classes to fail (renders as transparent)
  - Symptoms: `bg-*` classes don't generate CSS rules
  - If all backgrounds are transparent, check Tailwind version
- **React**: 19.2.3

## Known Issues

- **Streaming Availability API**: Returns 404 on free tier (expected behavior, has fallback)
- **Placeholder Poster**: SVG type requires `dangerouslyAllowSVG` or PNG replacement
- **Turbopack + Tailwind v4**: Incompatible - stay on Tailwind v3 until both are stable
