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
and the required status check `checks` (`.github/workflows/ci.yml`, which
includes a gitleaks scan of the PR's commits) must pass. Force pushes and
branch deletion are blocked. Merged branches are deleted automatically.

Run locally before opening a PR:

```bash
pnpm typecheck
pnpm lint
pnpm test   # integration tests; needs a migrated DB (pnpm db:up && pnpm db:deploy)
```

## Migrations and deploys

Migration ordering and the deploy pipeline are described in [deployment.md](deployment.md).

## Environments and promotion

- `develop` is the integration branch. Every push deploys
  https://dev.parfammdq.com (image tag `:develop`, `development` GitHub
  environment).
- `main` is production (`production` GitHub environment).
- Feature branches merge into `develop` with a **squash** merge.
- `develop` is promoted to `main` through a pull request with a **merge
  commit**. Never squash the promotion: it creates a commit on `main` that
  `develop` does not have, so the branches diverge.

Open the promotion PR with the template, then paste the changelog under
`## Changelog`:

```bash
gh pr create --base main --head develop --template .github/PULL_REQUEST_TEMPLATE/promotion.md
git log --first-parent --format='- %s' origin/main..origin/develop
```

`gh pr create --template` takes a file path, not a template name. In the web UI
use `?template=promotion.md` in the compare URL instead.
