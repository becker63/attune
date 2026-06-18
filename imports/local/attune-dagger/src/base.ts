import { ReturnType, dag, type Container, type Directory } from "@dagger.io/dagger";
import { DEFAULT_TMP_DIR, DEFAULT_WORK_DIR, NIX_IMAGE, PNPM_VERSION } from "./defaults.js";
import { normalizeTmpMode, type RuntimeEnv, type TmpMode } from "./temp/modes.js";

const shell = (script: string): string[] => ["sh", "-lc", script];

const singleQuote = (value: string): string => `'${value.replaceAll("'", "'\\''")}'`;

export const repoContainer = (source: Directory, env: RuntimeEnv = {}, tmpMode: TmpMode = normalizeTmpMode(undefined)): Container => {
  let container = dag
    .container()
    .from(NIX_IMAGE)
    .withDirectory(DEFAULT_WORK_DIR, source)
    .withWorkdir(DEFAULT_WORK_DIR)
    .withExec(shell("mkdir -p /out/events /out/counterexamples /work/tmp"));

  if (tmpMode === "mounted-temp") {
    container = container.withMountedTemp(DEFAULT_TMP_DIR);
  }

  for (const [name, value] of Object.entries(env)) {
    container = container.withEnvVariable(name, value);
  }

  return container.withExec(
    shell(
      [
        "nix --extra-experimental-features 'nix-command flakes' develop -c pnpm --version >/dev/null",
        `nix --extra-experimental-features 'nix-command flakes' develop -c pnpm config set store-dir /work/.pnpm-store >/dev/null`,
        `nix --extra-experimental-features 'nix-command flakes' develop -c corepack prepare pnpm@${PNPM_VERSION} --activate >/dev/null || true`,
        "nix --extra-experimental-features 'nix-command flakes' develop -c pnpm install --frozen-lockfile",
      ].join(" && "),
    ),
  );
};

export const runInRepo = (container: Container, command: string): Container =>
  container.withExec(shell(`nix --extra-experimental-features 'nix-command flakes' develop -c bash -lc ${singleQuote(command)}`));

export const runInRepoAllowFailure = (container: Container, command: string): Container =>
  container.withExec(shell(`nix --extra-experimental-features 'nix-command flakes' develop -c bash -lc ${singleQuote(command)}`), {
    expect: ReturnType.Any,
  });

export const stdout = (container: Container): Promise<string> => container.stdout();
