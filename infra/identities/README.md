Only verified public enrollment records belong here. `tools/enroll.py` records
machine ID, SSH host public key and age recipient over pinned SSH. A later
`--garage` pass records the Garage node public ID. These records become desired
identity constraints only after a signed Git review; LAN discovery never writes
them automatically. Private identities stay on the node under `/persist`.
