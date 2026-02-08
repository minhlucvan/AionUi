# Fork Sync Strategy

**Fork**: minhlucvan/AionUi
**Upstream**: iOfficeAI/AionUi
**Strategy**: Selective merge - Keep our features, accept upstream for unrelated changes

---

## Quick Start

### Checking for Updates

```bash
# Fetch latest upstream
git fetch upstream

# Check commits behind
git log --oneline HEAD..upstream/main | wc -l

# Check what changed
git log --oneline HEAD..upstream/main --no-merges | head -20

# See file changes
git diff --stat HEAD...upstream/main
```

### Syncing Process (On-Demand)

```bash
# 1. Create merge branch
git checkout main
git checkout -b sync/upstream-v<VERSION>

# 2. Merge (no auto-commit)
git merge upstream/main --no-ff --no-commit

# 3. Review conflicts
git status

# 4. Resolve conflicts (see sections below)

# 5. Test thoroughly
npm install
npm start

# 6. Commit merge
git commit -m "sync: merge upstream v<VERSION>"

# 7. Merge to main
git checkout main
git merge sync/upstream-v<VERSION> --no-ff

# 8. Tag release
git tag v<VERSION>-mezon
git push origin main --tags
```

---

## File-by-File Conflict Resolution

### 🔴 Always Manual Merge

#### `src/process/database/migrations.ts`

**Rule**: Upstream migrations take their version number, our migrations append to the end.

**Process**:

1. Accept all upstream migrations with their version numbers
2. Renumber our custom migrations to follow upstream's latest version
3. Update `ALL_MIGRATIONS` array to include both
4. Test migration on backup database before committing

**Example**:

```typescript
// If upstream adds v11, renumber our conflicting v11 to v12:
const migration_v11_upstream = { version: 11, name: 'Upstream feature' };
const migration_v12_mezon = { version: 12, name: 'Mezon support' };

export const ALL_MIGRATIONS = [
  // ... v1-v10
  migration_v11_upstream, // Upstream's
  migration_v12_mezon, // Ours (renumbered)
];
```

**Commands**:

```bash
# After manual edit:
git add src/process/database/migrations.ts
```

---

#### `package.json`

**Rule**: Accept upstream version bump, keep our custom dependencies.

**Process**:

1. Accept upstream `version` field
2. Keep `mezon-sdk` in dependencies
3. Accept upstream dependency version bumps unless they break Mezon
4. Merge scripts if both added new ones

**Commands**:

```bash
# After manual edit:
git add package.json
git rm package-lock.json
npm install  # Regenerate lockfile
git add package-lock.json
```

---

#### `src/channels/plugins/index.ts`

**Rule**: Keep our Mezon plugin registration.

**Process**:

1. Accept upstream plugin additions
2. Ensure `MezonPlugin` import and registration remain

**Example**:

```typescript
// Merge both:
import { TelegramPlugin } from './telegram';
import { MezonPlugin } from './mezon'; // Keep ours
// ... other upstream plugins

export const CHANNEL_PLUGINS = [
  TelegramPlugin,
  MezonPlugin, // Keep ours
  // ... other upstream plugins
];
```

---

#### `src/process/initAgent.ts`

**Rule**: Keep both initialization code.

**Process**:

1. Accept upstream agent initializations
2. Ensure Mezon-related initialization remains
3. Merge in logical order (if applicable)

---

### 🟡 Review Then Auto-Merge (Usually Safe)

#### `src/renderer/i18n/locales/*.json`

**Rule**: Combine both sets of keys (they're usually in different namespaces).

**Process**:

1. If no conflict markers: `git add` directly
2. If conflict markers appear:
   - Our keys: `bots.*`, `skills.*` (keep these)
   - Upstream keys: `agent.*`, `guid.*`, etc. (accept these)
   - Merge both sections into single JSON

**Commands**:

```bash
# Check for conflicts in all locale files:
git status | grep locales

# Review each:
git diff src/renderer/i18n/locales/en-US.json

# If safe:
git add src/renderer/i18n/locales/*.json
```

---

### 🟢 Always Accept Upstream

**Rule**: These files contain core functionality we don't modify. Always accept upstream version.

**Files**:

- `.github/workflows/build-and-release.yml`
- `config/webpack/webpack.config.ts`
- `electron-builder.yml`
- `src/agent/acp/AcpConnection.ts`
- `src/agent/acp/AcpDetector.ts`
- `src/agent/gemini/*`
- `src/agent/codex/*`
- `src/common/adapters/*`
- `src/common/utils/*`
- `CLAUDE.md`
- `README.md`

**Commands**:

```bash
# Accept theirs for these files:
git checkout --theirs .github/workflows/build-and-release.yml
git checkout --theirs config/webpack/webpack.config.ts
# ... etc

# Or in bulk:
git checkout --theirs $(git diff --name-only --diff-filter=U | grep -E "(agent/acp|agent/gemini|common/adapters)")
```

---

### 🛡️ Never Accept Upstream (Always Keep Ours)

**Rule**: These are our custom features. If upstream modified them (unlikely), keep our version.

**Files & Directories**:

- `src/channels/plugins/mezon/*` (entire directory)
- `src/renderer/pages/bots/*` (entire directory)
- `src/renderer/components/SettingsModal/contents/BotsConfigForm.tsx`
- `src/renderer/components/SettingsModal/contents/BotsModalContent.tsx`
- `src/renderer/context/BotContext.tsx`
- Any file with "mezon" or "bots" in the path

**Commands**:

```bash
# Keep ours for these files:
git checkout --ours src/channels/plugins/mezon/
git checkout --ours src/renderer/pages/bots/
git checkout --ours src/renderer/components/SettingsModal/contents/BotsConfigForm.tsx
# ... etc
```

**Note**: Upstream shouldn't modify these since they don't exist there. If conflict appears, verify upstream didn't add similar feature.

---

## Testing Checklist

After resolving conflicts, before committing:

### 1. Build Test

```bash
npm install
npm run build
```

**Expected**: No TypeScript errors, build succeeds.

### 2. Development Test

```bash
npm start
```

**Expected**: App launches, no console errors.

### 3. Mezon Bot Test

- [ ] Navigate to `/bots` page
- [ ] Bots list loads
- [ ] Can view bot detail page
- [ ] Bot configuration in settings works
- [ ] Bot start/stop toggles work

### 4. Database Migration Test

**Test with existing database**:

```bash
# Backup first!
cp ~/.aionui/aionui.db ~/.aionui/aionui.db.backup

# Launch app
npm start

# Check logs for:
# - Migrations run successfully
# - No migration errors
# - Version number correct
```

**Test with fresh database**:

```bash
# Remove database
rm ~/.aionui/aionui.db

# Launch app
npm start

# Check logs for:
# - All migrations run in order
# - Database created successfully
```

**Verify Mezon data**:

```bash
# If you have existing Mezon bots, ensure they still work after migration
```

### 5. Skills Test (if skills changes merged)

- [ ] Navigate to Settings → Skills
- [ ] Skills list loads
- [ ] Can install new skill from URL
- [ ] GitHub skill browsing works

### 6. Regression Test (Upstream Features)

Test that upstream features work (if you adopted them):

- [ ] Agent health checking (if merged)
- [ ] OpenClaw support (if merged)
- [ ] Any new settings pages

---

## Conflict Resolution Commands

### View Conflicts

```bash
# List all conflicted files
git diff --name-only --diff-filter=U

# See conflict in file
git diff src/process/database/migrations.ts
```

### Resolution Strategies

```bash
# Accept all of theirs
git checkout --theirs <file>
git add <file>

# Accept all of ours
git checkout --ours <file>
git add <file>

# Manual merge (edit in editor)
code <file>
# Remove conflict markers: <<<<<<<, =======, >>>>>>>
# Keep what you need
git add <file>

# Abort merge if too complex
git merge --abort
```

### Merge Tools

```bash
# Use visual merge tool (if configured)
git mergetool

# Use VS Code merge editor
code --wait --diff <file>
```

---

## Migration Version Management

### Rule

**Upstream migrations always keep their version number. Our migrations append to the end.**

### Process

When both branches have same migration version:

1. **Identify conflict**:

   ```bash
   git diff src/process/database/migrations.ts | grep "migration_v"
   ```

2. **Determine latest upstream version**:
   - Check upstream's `ALL_MIGRATIONS` array
   - Find highest version number

3. **Renumber our migration**:
   - If upstream has v11, our conflicting v11 becomes v12
   - Update migration object: `version: 12`
   - Update migration name comment

4. **Update exports**:

   ```typescript
   export const ALL_MIGRATIONS = [
     // ... v1-v10
     migration_v11, // Upstream
     migration_v12, // Ours (renumbered from v11)
   ];
   ```

5. **Test migration**:
   ```bash
   # Test on backup database
   cp ~/.aionui/aionui.db /tmp/test.db
   # Run app, check migration logs
   ```

### Migration Compatibility

**User database states**:

- **State A**: Fresh install → Runs all migrations v1-v12 sequentially ✅
- **State B**: Has old v11 (Mezon) → Detects as v11, runs upstream v11 (no-op since different table), then runs v12 (no-op, already applied) ⚠️
- **State C**: Clean upstream user → Runs v11 (OpenClaw), then v12 (Mezon) ✅

**For State B**, add migration safety check:

```typescript
// In migration runner
const currentVersion = getCurrentVersion(db);
if (currentVersion === 11) {
  // Check if this is old fork v11 (Mezon) or new upstream v11 (OpenClaw)
  const tables = db
    .prepare(
      `
    SELECT sql FROM sqlite_master WHERE type='table' AND name='assistant_plugins'
  `
    )
    .get();

  const hasMezon = tables.sql.includes('mezon');
  if (hasMezon) {
    console.log('[Migration] Detected old v11 (Mezon), remapping to v12');
    // Update version to 12 in metadata
    db.prepare('UPDATE metadata SET value = ? WHERE key = ?').run('12', 'version');
  }
}
```

---

## Dependency Management

### Adding New Dependencies (Ours)

When adding new dependencies for our features:

```bash
# Add with exact version to avoid future conflicts
npm install mezon-sdk@2.8.41 --save-exact

# Document in this file:
echo "# Custom Dependencies" >> .github/FORK_SYNC.md
echo "- mezon-sdk@2.8.41 - Mezon platform integration" >> .github/FORK_SYNC.md
```

### Handling Upstream Dependency Updates

**Rule**: Accept upstream version bumps unless they break Mezon.

**Process**:

1. Review upstream `package.json` changes
2. Accept version bumps for shared dependencies
3. Test Mezon features with new versions
4. If breakage, either:
   - Fix our code to work with new version, OR
   - Pin our version (document reason)

### Custom Dependencies

**Current**:

- `mezon-sdk@^2.8.41` - Mezon platform SDK (required for bot integration)

**Future additions**:

- Document here when added
- Include purpose and version

---

## Sync History

Keep track of syncs for reference:

| Date       | Upstream Version | Your Version | Commits Merged | Notes                                                                                                                                                                 |
| ---------- | ---------------- | ------------ | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-02-07 | v1.8.3           | v1.8.3       | 104 commits    | ✅ Initial sync completed. Added OpenClaw agent, built-in assistants, agent health checking. Renumbered Mezon migration v11→v12. Fixed botId types. Build successful. |

**Template for future entries**:

```
| YYYY-MM-DD | vX.X.X | vX.X.X-mezon | N commits | Brief summary of major changes |
```

---

## Upstream Monitoring

### Useful Upstream Resources

- **GitHub**: https://github.com/iOfficeAI/AionUi
- **Releases**: https://github.com/iOfficeAI/AionUi/releases
- **Issues**: https://github.com/iOfficeAI/AionUi/issues
- **Pull Requests**: https://github.com/iOfficeAI/AionUi/pulls

### When to Sync

**Mandatory Sync** (do immediately):

- Security vulnerabilities in dependencies
- Critical bug affecting our features
- Database corruption fixes

**Recommended Sync** (within 1-2 weeks):

- New major version released (v1.9.0, v2.0.0)
- Feature you want to adopt
- Accumulated 50+ commits behind

**Optional Sync** (quarterly maintenance):

- Minor version bumps (v1.8.3 → v1.8.4)
- Documentation updates
- CI/CD improvements

### Monitoring Commands

```bash
# Weekly check (run every Monday)
git fetch upstream
git log --oneline --no-merges HEAD..upstream/main | head -20

# Check release tags
git tag -l --sort=-version:refname | head -10

# See if security-related commits exist
git log --oneline --grep="security\|cve\|vulnerability" HEAD..upstream/main
```

---

## Troubleshooting

### Merge Conflicts Too Complex

**Solution**: Abort and use cherry-pick strategy.

```bash
# Abort merge
git merge --abort

# Cherry-pick specific commits
git log upstream/main --oneline | grep "fix\|security"
git cherry-pick <commit-hash>

# Or use interactive rebase
git rebase -i upstream/main
# Mark commits to pick in editor
```

### Database Migration Fails

**Solution**: Rollback and investigate.

```bash
# Restore backup
cp ~/.aionui/aionui.db.backup ~/.aionui/aionui.db

# Check migration logs
npm start 2>&1 | grep Migration

# Manually inspect database
sqlite3 ~/.aionui/aionui.db
# Run SQL queries to check state
```

### Build Fails After Merge

**Solution**: Check dependency issues.

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Check for version conflicts
npm ls | grep "UNMET"

# Rebuild native modules
npm run rebuild
```

### Runtime Errors After Merge

**Solution**: Check for breaking API changes.

```bash
# Search for error message in upstream commits
git log upstream/main --all --grep="<error message>"

# Compare our usage vs upstream changes
git diff HEAD...upstream/main -- src/agent/

# Revert specific file if needed
git checkout HEAD -- <file>
```

---

## Emergency Rollback

If sync causes critical issues in production:

```bash
# Find commit before merge
git log --oneline | grep "merge upstream"
git show <merge-commit>^  # Parent before merge

# Create rollback branch
git checkout -b emergency/rollback-sync

# Revert merge commit
git revert -m 1 <merge-commit>

# Test
npm install
npm start

# If stable, merge to main
git checkout main
git merge emergency/rollback-sync --no-ff

# Document issue
echo "## Rollback YYYY-MM-DD" >> .github/FORK_SYNC.md
echo "Reason: <describe issue>" >> .github/FORK_SYNC.md
```

---

## Best Practices

### Before Syncing

- [ ] Backup database: `cp ~/.aionui/aionui.db ~/.aionui/aionui.db.backup`
- [ ] Commit all local changes
- [ ] Create merge branch
- [ ] Review upstream changelog

### During Sync

- [ ] Merge with `--no-commit` first
- [ ] Resolve conflicts file-by-file (don't rush)
- [ ] Follow file-specific rules in this document
- [ ] Keep detailed notes of manual changes

### After Sync

- [ ] Run full test checklist
- [ ] Test on backup database first
- [ ] Document sync in history table
- [ ] Tag release with `-mezon` suffix
- [ ] Update CHANGELOG.md (if you maintain one)

### Communication

If working in a team:

- [ ] Announce sync in team chat before starting
- [ ] Share test results after sync
- [ ] Document any breaking changes
- [ ] Update team wiki/docs with new version

---

## Version Naming Convention

**Your releases**:

```
v<upstream-version>-mezon

Examples:
- v1.8.3-mezon (synced with upstream v1.8.3)
- v1.8.3-mezon.1 (hotfix on top of 1.8.3-mezon)
- v1.9.0-mezon (synced with upstream v1.9.0)
```

**Why `-mezon` suffix?**

- Clearly distinguishes from upstream
- Indicates your custom features included
- Allows upstream version tracking

---

## Contributing Back (Optional)

If you want to contribute improvements back to upstream:

**Good candidates**:

- Bug fixes in core code
- Performance improvements
- UI/UX enhancements (not Mezon-specific)
- Documentation improvements

**Process**:

1. Create feature branch from upstream/main
2. Implement change (without Mezon dependencies)
3. Test with upstream code only
4. Submit PR to iOfficeAI/AionUi

**Not suitable for PR**:

- Mezon plugin code (fork-specific)
- Bot management features (fork-specific)
- Any code depending on `mezon-sdk`

---

## Maintenance

**Review this document**:

- After each sync (update what worked/didn't work)
- Quarterly (check if rules still valid)
- When onboarding new team members

**Update history**:

- Record every sync in "Sync History" table
- Document issues encountered
- Note any deviations from strategy

---

**Document Version**: 1.0
**Last Updated**: 2026-02-07
**Maintainer**: minhlucvan
