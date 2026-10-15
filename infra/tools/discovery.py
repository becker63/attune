"""LAN discovery hints, never installation authority or enrollment trust.

Only public identities are returned. Verify SSH fingerprints at the console
before enrollment. Broadcast discovery works without DNS or assigned LAN IPs.
"""
import argparse
import json
from pathlib import Path
import socket
import time

PORT = 37077
MAGIC = b'ATTUNE_DISCOVER_V1'


def identity():
    def read(p):
        try:
            return Path(p).read_text().strip()
        except FileNotFoundError:
            return None
    return dict(version=1, hostname=socket.gethostname(), machine_id=read('/etc/machine-id'), ssh_key=read('/persist/ssh/ssh_host_ed25519_key.pub'), age_recipient=read('/persist/sops/recipient.txt'))


def serve():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.bind(('0.0.0.0', PORT))
    last = {}
    while True:
        data, peer = s.recvfrom(256)
        now = time.monotonic()
        # Bound reflection and memory; public reply stays below one MTU.
        if data == MAGIC and now - last.get(peer[0], 0) > 2:
            if len(last) > 256:
                last.clear()
            last[peer[0]] = now
            s.sendto(json.dumps(identity()).encode(), peer)


def discover(address):
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
    s.settimeout(1)
    s.sendto(MAGIC, (address, PORT))
    deadline = time.monotonic() + 4
    seen = set()
    while time.monotonic() < deadline:
        try:
            data, peer = s.recvfrom(2048)
            reply = json.loads(data)
            if reply.get('version') == 1 and peer[0] not in seen:
                seen.add(peer[0])
                print(json.dumps(dict(address=peer[0], trust='UNVERIFIED', **reply)))
        except (socket.timeout, ValueError):
            pass


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--serve', action='store_true')
    p.add_argument('--broadcast', default='255.255.255.255')
    args = p.parse_args()
    serve() if args.serve else discover(args.broadcast)
