// Synthetic transport/unit fixtures only. Never used as a runtime AI fallback.
export const narrative =
  "The request asks for a dimension clarification for the affected panels. Additional fabrication would cause replacement cost. Production is scheduled before normal review. Early review can change the remaining fabrication decision. No effective hold is available. No demolition is required for this routine clarification.";
export const packet = (i) => ({
  rfi_id: `TEST-${i}`,
  title: "Synthetic fixture panel dimension",
  description: narrative,
  submitted_date: "2026-10-01",
  decision_time: "2026-10-01",
  supporting_text:
    "Release date: 2026-10-02. Paid equipment remains idle. A currently exposed energized cable is reported.",
});
export function extraction(id = "TEST-1", values = {}) {
  const ev = (value) => ({
    value,
    quote: value === "Unknown" ? null : narrative,
    source: value === "Unknown" ? null : "description",
  });
  return {
    rfi_id: id,
    scope: {
      value: "active",
      quote: "The request asks for a dimension clarification",
      source: "description",
    },
    mechanisms: [
      {
        description: "Synthetic fixture mechanism, not a real assessment.",
        evidence: Object.fromEntries(
          ["U", "A", "M", "X", "D", "B"].map((k) => [
            k,
            ev(values[k] || (k === "B" ? "No" : "Yes")),
          ]),
        ),
        bounded_clarification: ev("Unknown"),
        contradictions: [],
      },
    ],
    missing_information: [],
    safety: { value: false, quote: null, source: null },
    expedited_verification: { value: false, quote: null, source: null },
    decision_date: { value: null, quote: null, source: null },
    schedule_considerations: [],
  };
}
