{ tmpfsSize ? "8g", cpuCount ? "8" }:
{
  image = "attune/joern-effect-property:dev";
  inherit cpuCount tmpfsSize;
  workspaceTmpfs = "/work:rw,exec,nosuid,size=${tmpfsSize}";
}
