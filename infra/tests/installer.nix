{
  pkgs,
  inputs,
  self,
  system,
}:
let
  python = pkgs.python3.withPackages (p: [ p.cryptography ]);
  firmware = inputs.nixpkgs.legacyPackages.x86_64-linux.OVMF.fd;
in
pkgs.runCommand "attune-uefi-installer-acceptance"
  {
    nativeBuildInputs = [
      python
      pkgs.qemu
      pkgs.openssh
    ];
    requiredSystemFeatures = [ "nixos-test" ];
  }
  ''
    mkdir -p $out
    python ${../tools/installer-test.py} \
      --iso ${self.packages.${system}.installer-test}/iso/attune-a-installer.iso \
      --firmware ${firmware}/FV/OVMF_CODE.fd \
      --firmware-vars ${firmware}/FV/OVMF_VARS.fd \
      --output "$TMPDIR/acceptance"
    cp "$TMPDIR/acceptance/"*.log "$TMPDIR/acceptance/result.json" $out/
  ''
