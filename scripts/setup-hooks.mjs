// npm "prepare": enables the git hooks of .githooks. Outside a git checkout (source tarball, Docker layer, CI cache) there is nothing to do: never fail the install.
import { execSync } from 'node:child_process';

try {
  execSync('git config core.hooksPath .githooks', { stdio: 'ignore' });
} catch {
  // not a git checkout, or git is missing
}
