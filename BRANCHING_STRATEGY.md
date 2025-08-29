# Branching Strategy

## Overview

This project follows a GitFlow-inspired branching strategy with the following main branches:

## Main Branches

### `main` (Production)

- **Purpose**: Production-ready code
- **Deployment**: Auto-deploys to production environment
- **Protection**: Requires pull request reviews
- **Merge**: Only from `develop` or `hotfix/*` branches

### `develop` (Development)

- **Purpose**: Integration branch for features
- **Deployment**: Auto-deploys to development/staging environment
- **Protection**: Requires pull request reviews
- **Merge**: From `feature/*` branches

## Feature Branches

### `feature/*` (Feature Development)

- **Naming**: `feature/descriptive-name` (e.g., `feature/player-management`)
- **Purpose**: Develop new features
- **Branch from**: `develop`
- **Merge to**: `develop`
- **Lifecycle**: Delete after merge

### `release/*` (Release Preparation)

- **Naming**: `release/v1.2.0`
- **Purpose**: Prepare for production release
- **Branch from**: `develop`
- **Merge to**: `main` and `develop`
- **Lifecycle**: Delete after merge

### `hotfix/*` (Production Fixes)

- **Naming**: `hotfix/critical-bug-fix`
- **Purpose**: Fix critical production issues
- **Branch from**: `main`
- **Merge to**: `main` and `develop`
- **Lifecycle**: Delete after merge

## Workflow

### Feature Development

1. Create feature branch from `develop`

   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/new-feature
   ```

2. Develop and commit changes

   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. Push and create pull request

   ```bash
   git push -u origin feature/new-feature
   ```

4. Merge to `develop` via pull request

### Release Process

1. Create release branch from `develop`

   ```bash
   git checkout develop
   git checkout -b release/v1.2.0
   ```

2. Make release-specific changes (version bumps, etc.)
3. Merge to `main` and `develop`

### Hotfix Process

1. Create hotfix branch from `main`

   ```bash
   git checkout main
   git checkout -b hotfix/critical-fix
   ```

2. Fix the issue and commit
3. Merge to `main` and `develop`

## Environment Mapping

| Branch      | Environment | Database       | Purpose          |
| ----------- | ----------- | -------------- | ---------------- |
| `main`      | Production  | Production DB  | Live application |
| `develop`   | Staging     | Development DB | Testing & QA     |
| `feature/*` | Preview     | Development DB | Feature testing  |

## Best Practices

1. **Never commit directly to `main` or `develop`**
2. **Always create pull requests for merges**
3. **Use descriptive commit messages**
4. **Keep feature branches small and focused**
5. **Test thoroughly before merging to `develop`**
6. **Use conventional commit format**
7. **Delete merged branches**

## Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

Types:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

## Branch Protection Rules

### `main` branch

- Require pull request reviews
- Require status checks to pass
- Restrict pushes
- Require linear history

### `develop` branch

- Require pull request reviews
- Require status checks to pass
- Restrict pushes
