# Workflow

## Branching & PRs

- `main` is production and auto-deploys on merge (see [deployment.md](deployment.md)).
- Do all work on feature branches named `feat/`, `fix/`, `chore/`, `docs/`, or `ci/`.
- Merge to `main` only through a pull request, squash only.
- The PR title follows Conventional Commits (`feat: …`, `fix(scope): …`) because
  it becomes the squash commit message. Commits on the branch use Conventional
  Commits too.

## CI gate

The `main` ruleset hard-blocks anything else: changes land only via pull request,
and the required status checks `checks` (`.github/workflows/ci.yml`) and
`gitleaks` (`.github/workflows/secrets-scan.yml`) must pass. Force pushes and
branch deletion are blocked. Merged branches are deleted automatically.

Run locally before opening a PR:

```bash
pnpm typecheck
pnpm lint
pnpm test
```

## Migrations and deploys

Migration ordering and the deploy pipeline are described in [deployment.md](deployment.md).
