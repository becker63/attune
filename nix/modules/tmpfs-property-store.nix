{
  pkgs,
  joern,
  tmpfsSize ? "8g",
  workerCount ? "2",
  cpusPerWorker ? "2",
  cpuCount ? "4",
}:
{
  runtimeInputs = [ pkgs.nodejs_22 pkgs.pnpm pkgs.jdk21 joern ];
  inherit cpuCount cpusPerWorker tmpfsSize workerCount;
  tmpfsWorkspace = true;
}
