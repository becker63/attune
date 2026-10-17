"""Retired generated campaign batches: scale.

The elected base (d268c9b2) intentionally excluded the generated scale/quality/
novelty batch declaration products of the historical campaign graphs; this file
existed only as an untracked original in the read-only pre-election checkout and
was never committed here. Its generator is not part of this checkout, and the
mission forbids regenerating the gigantic campaign graphs or importing them from
another checkout.

This recorded no-op keeps the historical BUILD.bazel `load` and call site working
so the package's real law tests keep loading; no test is dropped and no target is
silently redefined. The declared science inputs themselves must be materialized
and declared exactly (the selected445) by the M3 input-artifact feature, never
copied from an ambient campaign. See SOURCE_POLICY.md ("Recorded batch
retirements").
"""

def scale_targets():
    """Retired with the excluded generated scale batches (recorded, not regenerated)."""
    pass
