{ pkgs }:
pkgs.runCommand "attune-git-signature-policy"
  {
    nativeBuildInputs = [
      pkgs.git
      pkgs.openssh
    ];
  }
  ''
    test_home=$TMPDIR/home
    mkdir -p "$test_home" repo
    ssh-keygen -q -t ed25519 -N "" -f "$test_home/signing"
    printf 'test namespaces="git" %s\n' "$(cat "$test_home/signing.pub")" > allowed
    allowed=$PWD/allowed
    cd repo
    git init -b main
    git config user.email test@example.invalid
    git config user.name Fixture
    git config gpg.format ssh
    git config user.signingkey "$test_home/signing"
    git config gpg.ssh.allowedSignersFile "$allowed"
    git commit --allow-empty -S -m trusted
    git verify-commit HEAD
    git commit --allow-empty --no-gpg-sign -m unsigned
    if git verify-commit HEAD; then exit 1; fi
    ssh-keygen -q -t ed25519 -N "" -f "$test_home/untrusted"
    git -c user.signingkey="$test_home/untrusted" commit --allow-empty -S -m untrusted
    if git verify-commit HEAD; then exit 1; fi
    touch $out
  ''
