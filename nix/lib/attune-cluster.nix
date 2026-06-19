{
  workerClassLabel = "attune.dev/worker-class=thinkcentre-cpu";

  controlPlane = {
    tokenFile = "/var/lib/attune/secrets/k3s-server-token";
    serverUrl = "https://attune-cp-1:6443";

    nodes = {
      attune-cp-1 = {
        role = "init";
      };

      attune-cp-2 = {
        role = "join";
      };

      attune-cp-3 = {
        role = "join";
      };
    };
  };
}
