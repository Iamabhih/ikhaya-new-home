# GitHub Actions Workflows

This directory contains the CI/CD workflows for automated testing and deployment.

## Active Workflows

### 🧪 Test Workflow (`test.yml`)

**Trigger**: Push to `main`, `develop`, `claude/**` branches, or PRs to `main`/`develop`

**What it does**:
- Runs tests on Node.js 18.x and 20.x
- Executes linter checks
- Generates test coverage reports
- Uploads coverage to Codecov (if configured)
- Archives coverage artifacts for 30 days

**Badge**: Add to README:
```markdown
![Tests](https://github.com/YOUR_ORG/YOUR_REPO/workflows/Tests/badge.svg)
```

---

### 🔍 PR Checks Workflow (`pr-checks.yml`)

**Trigger**: Pull requests to `main` or `develop`

**What it does**:
- TypeScript compilation check
- ESLint validation
- Test coverage with threshold enforcement (70%)
- Security vulnerability scanning with npm audit
- Trivy security scanner
- Code quality checks
- Automatic coverage comments on PRs

**Required for PR approval**

---

### 📊 Coverage Report (`coverage.yml`)

**Trigger**:
- Push to `main` or `develop`
- Daily at 2 AM UTC (scheduled)

**What it does**:
- Generates comprehensive coverage reports
- Creates coverage badges
- Uploads to Codecov
- Archives coverage data for 90 days
- Generates coverage summaries

---

## Workflow Status

Check the status of workflows:
- Go to the **Actions** tab in GitHub
- View recent runs and their results
- Download artifacts from completed runs

## Coverage Reports

Coverage artifacts are available:
- **PR Comments**: Automatic coverage reports on pull requests
- **Artifacts**: Download from workflow runs (Actions tab)
- **Codecov**: Dashboard at `https://codecov.io/gh/YOUR_ORG/YOUR_REPO`

## Configuration

### Secrets Required

For full functionality, configure these secrets in GitHub Settings:

- `CODECOV_TOKEN` - For uploading coverage to Codecov (optional)
- `GITHUB_TOKEN` - Automatically provided by GitHub

### Coverage Thresholds

Current thresholds (set in `vitest.config.ts`):
- Lines: 70%
- Functions: 70%
- Branches: 70%
- Statements: 70%

## Local Testing

Before pushing, run locally:

```bash
# Run all tests
npm run test:run

# Check linting
npm run lint

# Generate coverage
npm run test:coverage

# Build the project
npm run build
```

## Troubleshooting

### Workflow Fails

1. Check the workflow logs in the Actions tab
2. Run the same commands locally to reproduce
3. Ensure all dependencies are up to date
4. Verify Node.js version matches (18.x or 20.x)

### Coverage Below Threshold

1. Run `npm run test:coverage` locally
2. Open `coverage/index.html` to see which files need more tests
3. Focus on critical paths first (authentication, payments, cart)
4. Add tests incrementally

### Security Scan Issues

1. Run `npm audit` locally
2. Fix vulnerabilities: `npm audit fix`
3. For breaking changes: `npm audit fix --force` (use cautiously)

## Maintenance

### Updating Workflows

1. Edit workflow files in `.github/workflows/`
2. Test changes on a feature branch first
3. Monitor the Actions tab after pushing changes
4. Update this README if adding new workflows

### Adding New Workflows

1. Create a new `.yml` file in this directory
2. Follow the existing workflow structure
3. Document it in this README
4. Test thoroughly before merging to main

---

**Last Updated**: 2025-12-24
