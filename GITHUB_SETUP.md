# GitHub Setup Guide

> Follow these steps to push the Document Merge plugin to GitHub

## Prerequisites

- Git installed
- GitHub account
- Access to https://github.com/a100977/AI_Projects repository

## Option 1: Add to Existing Repository (Recommended)

If you want to add this as a subdirectory in your existing `AI_Projects` repo:

### Step 1: Add Remote

```bash
cd ~/claude_plugin/document-merge-plugin
git init
```

### Step 2: Commit All Files

```bash
git add .
git commit -m "chore(plugin): initial project scaffolding for document-merge

- Create plugin structure for Claude Code integration
- Add 4 SKILL definitions (detect, review, merge, batch)
- Set up backend server scaffolding
- Add package dependencies and configs
- Create documentation and guides
- Configure TypeScript and development environment"
```

### Step 3: Add GitHub Remote

```bash
# If this is a new directory in existing repo:
git remote add origin https://github.com/a100977/AI_Projects.git
git branch -M main
```

### Step 4: Create Feature Branch (Recommended)

```bash
# Create a new branch for the plugin
git checkout -b feature/claude-plugin-document-merge

# Push the feature branch
git push -u origin feature/claude-plugin-document-merge
```

### Step 5: Create Pull Request (Optional)

Go to GitHub and create a PR for the feature branch to review before merging to main.

## Option 2: Copy to Existing Repository

If you want to manually copy files into your existing repo:

### Step 1: Verify Structure

Your repository should look like:
```
AI_Projects/
├── claude_plugin/
│   └── document-merge-plugin/      ← All files from here
│       ├── .claude-plugin/
│       ├── skills/
│       ├── backend/
│       └── ... (all other files)
```

### Step 2: Copy Files

```bash
# Navigate to your existing repo
cd /path/to/AI_Projects

# Copy the plugin directory (if not already there)
cp -r ~/claude_plugin/document-merge-plugin ./claude_plugin/

# Navigate to the new directory
cd claude_plugin/document-merge-plugin
```

### Step 3: Add to Git

```bash
git add claude_plugin/document-merge-plugin/

git commit -m "chore(plugin): add document-merge-plugin scaffolding

Adds complete plugin structure for Document Merge including:
- Plugin manifest and marketplace config
- 4 SKILL definitions (detect, review, merge, batch)
- Backend server with TypeScript scaffolding
- Dependencies and configuration files
- Contributing and community guidelines"

git push origin main
```

## Verify Setup

After pushing, verify the files are in GitHub:

```bash
# List files (if in local repo)
find claude_plugin/document-merge-plugin -type f | head -20

# View on GitHub
# https://github.com/a100977/AI_Projects/tree/main/claude_plugin/document-merge-plugin
```

## Next Steps

After pushing to GitHub:

1. **Update .claude-plugin/icon.png**
   - Add a 256x256 PNG icon for the plugin

2. **Create GitHub Actions Workflows**
   - Copy templates from `.github/workflows/`
   - Set up test automation
   - Configure auto-publishing

3. **Update Documentation**
   - Add more guides in `docs/`
   - Add real-world examples
   - Create API documentation

4. **Start Phase 1 Implementation**
   - Implement core engine
   - Create data connectors
   - Build document formatters
   - Set up backend server

## Git Workflow for Development

Once in GitHub, use this workflow for development:

```bash
# Get latest changes
git pull origin main

# Create feature branch
git checkout -b feature/variable-detector

# Make changes and commit
git add src/engine/variable-detector.ts
git commit -m "feat(engine): implement variable detector

- Support {{$Var}}, «Var», \${Var} formats
- Detect variables and locations
- Calculate confidence scores
- Add fuzzy matching for suggestions"

# Push to GitHub
git push origin feature/variable-detector

# Create Pull Request on GitHub
# Review and merge when ready

# Back to main branch
git checkout main
git pull origin main
```

## Managing .env Files

**IMPORTANT:** Never commit `.env` files!

```bash
# Use .env.example as template
cp backend/.env.example backend/.env

# Add to .gitignore (already done)
# Verify it's ignored:
git status  # Should NOT show .env

# On server/production, copy and configure
cp .env.example .env
# Edit .env with real credentials
```

## GitHub Issues & PRs

### Creating Issues

Use GitHub issue templates for:
- Bug reports
- Feature requests
- Questions
- Discussions

### Creating PRs

1. Create feature branch from `main`
2. Make changes
3. Push to GitHub
4. Create PR with description
5. Wait for review
6. Address feedback
7. Merge when approved

## Troubleshooting

### Q: Files not showing in GitHub

**A:** Make sure to push:
```bash
git push origin branch-name
```

### Q: Want to start fresh?

**A:** Remove git and reinitialize:
```bash
rm -rf .git
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/a100977/AI_Projects.git
git push -u origin main
```

### Q: Accidentally added large files?

**A:** Remove from git history:
```bash
git rm --cached large-file
git commit -m "Remove large file"
git push origin main
```

## References

- [GitHub Documentation](https://docs.github.com)
- [Git Workflow Guide](https://git-scm.com/docs)
- [GitHub Collaboration](https://docs.github.com/en/pull-requests)

## Need Help?

- Check [CONTRIBUTING.md](CONTRIBUTING.md)
- Review [README.md](README.md)
- Check GitHub Issues

---

**Status:** Ready to Push
**Last Updated:** 2025-02-26

Happy coding! 🚀
