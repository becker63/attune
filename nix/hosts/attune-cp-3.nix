{ cluster, ... }:
{
  networking.hostName = "attune-cp-3";

  attune.k3sControlPlane = {
    enable = true;
    nodeName = "attune-cp-3";
    role = "join";
    tokenFile = cluster.controlPlane.tokenFile;
    nodeLabels = [ cluster.workerClassLabel ];
    serverUrl = cluster.controlPlane.serverUrl;
  };
}
