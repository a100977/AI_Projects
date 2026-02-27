# Contributing to Document Merge

Thank you for your interest in contributing! We appreciate your help.

## Code of Conduct

Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) first.

## How to Contribute

### Reporting Bugs

1. **Check existing issues** - Make sure the bug hasn't been reported
2. **Create detailed issue** - Include:
   - Clear description of the bug
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Your environment (OS, Node version, etc.)
   - Document/data source example (if applicable)

### Requesting Features

1. **Check existing issues** - Make sure the feature hasn't been suggested
2. **Create feature request** - Include:
   - Clear description of the feature
   - Use case / problem it solves
   - Suggested implementation (if you have ideas)
   - Any related issues or discussions

### Submitting Code

1. **Fork the repository**
   ```bash
   git clone https://github.com/YOUR-USERNAME/AI_Projects.git
   cd AI_Projects/claude_plugin/document-merge-plugin
   ```

2. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix-name
   ```

3. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

4. **Make your changes**
   - Write clean, readable code
   - Follow existing code style
   - Add tests for new functionality
   - Update documentation as needed

5. **Test your changes**
   ```bash
   npm test              # Unit tests
   npm run test:integration  # Integration tests
   npm run lint          # Lint code
   npm run format        # Format code
   ```

6. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: description of your feature"
   # or
   git commit -m "fix: description of your fix"
   ```

   Use these prefixes:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation
   - `test:` - Tests
   - `refactor:` - Code refactoring
   - `perf:` - Performance improvement
   - `chore:` - Build/CI/tooling

7. **Push your branch**
   ```bash
   git push origin your-branch-name
   ```

8. **Create a Pull Request**
   - Reference any related issues
   - Describe what your PR does
   - Explain why the changes are needed
   - Include any relevant information

## Development Setup

### Prerequisites
- Node.js 18+
- npm or pnpm
- Git

### Backend Setup

```bash
cd backend
npm install
npm run dev  # Start development server on port 3000
```

### Running Tests

```bash
# Unit tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm run test:coverage

# Integration tests
npm run test:integration
```

### Linting & Formatting

```bash
# Lint
npm run lint

# Auto-fix
npm run lint -- --fix

# Format
npm run format
```

## Areas We Need Help With

- [ ] **Data Source Connectors** - Add support for more data sources (MySQL, MongoDB, etc.)
- [ ] **Document Formats** - Add support for more formats (HTML, XML, etc.)
- [ ] **Performance** - Optimize merge engine, batch processing
- [ ] **Documentation** - Improve guides, add examples, fix typos
- [ ] **Tests** - Increase coverage, add edge cases
- [ ] **Bug Fixes** - Help fix reported issues
- [ ] **Community** - Help others in discussions/issues

## Code Style

We use:
- **TypeScript** for type safety
- **ESLint** for linting
- **Prettier** for formatting

The project includes `.prettierrc` and `.eslintrc` files.

```bash
npm run format  # Auto-format code
npm run lint -- --fix  # Auto-fix lint errors
```

## Commit Message Guidelines

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that don't affect code meaning (formatting, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Code change that improves performance
- `test`: Adding missing tests
- `chore`: Changes to build process or dependencies

### Scope
The part of the codebase you're changing:
- `engine`: Variable detector, merge engine
- `connectors`: Data source connectors
- `formatters`: Document formatters
- `api`: API routes
- `cli`: CLI tool
- `docs`: Documentation

### Subject
- Use imperative mood ("add" not "added" or "adds")
- Don't capitalize first letter
- No period (.) at the end
- Limit to 50 characters

### Body (optional)
- Explain what and why, not how
- Wrap at 72 characters
- Separate from subject with blank line

### Footer (optional)
- Reference issues: "Fixes #123", "Closes #456"

### Example

```
feat(engine): improve variable detection with fuzzy matching

Add fuse.js for fuzzy string matching to better handle typos in
variable names. This allows suggestions like "PropertyAddres" → "PropertyAddress".

Fixes #42
```

## Pull Request Guidelines

- [ ] Tests pass locally (`npm test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Code is formatted (`npm run format`)
- [ ] Documentation is updated
- [ ] Commit messages follow guidelines
- [ ] PR description is clear and references issues

## Review Process

1. **Automated Checks** - Tests, lint, coverage must pass
2. **Code Review** - At least one maintainer reviews
3. **Feedback** - Address any comments or suggestions
4. **Merge** - Once approved, PR will be merged

## Release Process

Maintainers will:
1. Update version in `package.json` (semver)
2. Update `CHANGELOG.md`
3. Create git tag
4. Publish to npm, PyPI, Docker Hub

## Questions?

- **GitHub Issues** - For bugs and features
- **GitHub Discussions** - For questions and ideas
- **Email** - a1009us@gmail.com

---

Thank you for contributing! 🎉
