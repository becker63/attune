{ cluster, ... }:
{
  networking.hostName = "attune-cp-1";

  attune.k3sControlPlane = {
    enable = true;
    nodeName = "attune-cp-1";
    role = "init";
    tokenFile = cluster.controlPlane.tokenFile;
    nodeLabels = [ cluster.workerClassLabel ];
    serverUrl = null;
  };
}
