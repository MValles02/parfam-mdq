# Workflow

## Branching & PRs

- `main` is production and auto-deploys on merge (see [deployment.md](deployment.md)).
- Do all work on feature branches named `feat/`, `fix/`, `chore/`, `docs/`, or `ci/`.
- Feature branches merge into `develop` through a pull request, squash only.
  `main` receives only the promotion PR from `develop`, merged with a merge
  commit (see "Environments and promotion").
- The PR title follows Conventional Commits (`feat: …`, `fix(scope): …`) because
  it becomes the squash commit message. Commits on the branch use Conventional
  Commits too.

## CI gate

The `develop` and `main` rulesets hard-block anything else: changes land only
via pull request, and these status checks are required:

| Check          | Workflow                                | Required on       |
| -------------- | --------------------------------------- | ----------------- |
| `checks`       | `.github/workflows/ci.yml`              | `develop`, `main` |
| `e2e`          | `.github/workflows/ci.yml`              | `develop`, `main` |
| `develop-only` | `.github/workflows/promotion-guard.yml` | `main`            |

`checks` runs typecheck, lint and the integration tests, after a gitleaks scan
of the PR's commits; `e2e` runs the Playwright specs. Rulesets cannot restrict
a PR's source branch, so `develop-only` runs on every PR to `main` and fails
unless the head is `develop` of this repository. Force pushes and branch
deletion are blocked. Merged branches are deleted automatically.

Required checks are configured in the rulesets (repository Settings → Rules →
Rulesets), not in the workflow files; a check only becomes selectable there
after it has run at least once.

Every push to any branch is also scanned by gitleaks
(`.github/workflows/secrets-scan.yml`, commits added by that push only). It is
not a required check: it reports on the pushed commit, and the PR scan in
`checks` is the merge gate.

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
