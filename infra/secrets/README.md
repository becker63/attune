No production secrets have been generated: the three node age recipients do not
exist yet. After authenticated enrollment, run `tools/provision-secrets.py` once.
It encrypts independent per-host files to the existing administrator and the
individual node recipient, generating shared RPC and paired service credentials
in memory. Never regenerate these files to repair a decryption problem.
Use `sops updatekeys` when recipients change; rotate actual service credentials
through a reviewed maintenance procedure.
