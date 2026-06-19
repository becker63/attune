{ cluster, ... }:
{
  networking.hostName = "attune-cp-2";

  attune.k3sControlPlane = {
    enable = true;
    nodeName = "attune-cp-2";
    role = "join";
    tokenFile = cluster.controlPlane.tokenFile;
    nodeLabels = [ cluster.workerClassLabel ];
    serverUrl = cluster.controlPlane.serverUrl;
  };
}
