# Packaging declaration for the pinned CodeRankEmbed inference runtime.
#
# Owner-approved POST-HOC EXPLORATORY EMBEDDING extension (2026-10-07). Nix's
# ONLY role here is to package/declare the runtime inputs: it fetches each
# digest-pinned wheel named by the one declared identity record
# (`runtime-lock.tsv`, also consumed by the Bazel acquisition repository rules in
# `platform/build/embedding_runtime.bzl`) and unpacks it into a portable
# `site-packages/` tree. It runs no inference, contacts no model host beyond the
# declared wheel URLs, and changes no host system closure, kernel or flake pin.
#
# The Bazel repository rule and this expression consume the SAME record, so the
# two packagers cannot drift. Build it with:
#
#   nix-build ./platform/embedding/runtime.nix
#
{ pkgs ? import <nixpkgs> { } }:

let
  lib = pkgs.lib;

  rows = map (lib.splitString "\t") (lib.splitString "\n" (builtins.readFile ./runtime-lock.tsv));

  wheels = builtins.filter
    (row: builtins.length row >= 5 && builtins.elemAt row 0 == "wheel")
    rows;

  unpack = row: ''
    ${pkgs.unzip}/bin/unzip -q -o ${pkgs.fetchurl {
      url = builtins.elemAt row 4;
      sha256 = builtins.elemAt row 3;
    }} -d $out/site-packages
  '';
in
pkgs.runCommand "attune-embedding-runtime"
  {
    meta.description = "The pinned CodeRankEmbed Python/PyTorch inference runtime (declared inputs only).";
  }
  ''
    mkdir -p $out/site-packages
    ${lib.concatMapStrings unpack wheels}
    touch $out/site-packages/attune-runtime.marker
  ''
