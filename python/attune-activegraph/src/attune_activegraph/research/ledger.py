"""Consumer-owned interpretation recording and derived packet impact."""

from __future__ import annotations

from collections.abc import Iterable

from activegraph import Tool, ToolContext  # pyright: ignore[reportMissingTypeStubs]

from attune_activegraph.typed_tool import typed_tool

from .model import InterpretationLedger, LedgerReference, Packet


def ledger_reference(ledger: InterpretationLedger) -> str:
    """Return the opaque caller reference for one immutable ledger."""

    return f"ledger:{ledger.ledger_digest}"


def make_interpretation_tool(case_id: str) -> Tool:
    """Create the common deterministic ledger tool bound to one research case."""

    @typed_tool(
        name="record_interpretation",
        description=(
            "Record retained facts, omissions, assumptions, and the expected "
            "discriminator before choosing the next experiment."
        ),
        input_model=InterpretationLedger,
        output_model=LedgerReference,
        deterministic=True,
    )
    def record_interpretation(
        ledger: InterpretationLedger,
        _ctx: ToolContext,
    ) -> LedgerReference:
        if ledger.case_id != case_id:
            raise ValueError("interpretation ledger must address the configured case")
        return LedgerReference(ref=ledger_reference(ledger))

    return record_interpretation


def ledger_packet_index(packets: Iterable[Packet]) -> dict[str, tuple[str, ...]]:
    """Derive the immutable packets that retained each ledger reference."""

    packet_digests: dict[str, set[str]] = {}
    for packet in packets:
        for ledger in packet.ledgers:
            packet_digests.setdefault(ledger_reference(ledger), set()).add(packet.packet_digest)
    return {
        reference: tuple(sorted(digests)) for reference, digests in sorted(packet_digests.items())
    }
