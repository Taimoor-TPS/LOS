function round4(value) {
  return Math.round(Number(value) * 10000) / 10000;
}

function clamp(value, floor, cap) {
  return Math.min(cap, Math.max(floor, value));
}

export function priceFacility({ product, score, features, pricing = {}, campaign }) {
  const base = Number(product.baseRate);
  const grades = pricing.grades || [
    { minScore: 80, premium: 0, label: 'A' },
    { minScore: 72, premium: 0.005, label: 'B' },
    { minScore: 55, premium: 0.015, label: 'C' },
    { minScore: 0, premium: 0.03, label: 'D' },
  ];
  const grade = [...grades].sort((a, b) => b.minScore - a.minScore).find((item) => score >= item.minScore) || grades.at(-1);
  const relationshipDiscount = (features.relationshipYears || 0) >= (pricing.relationshipYears ?? 3)
    ? pricing.relationshipDiscount ?? 0.005
    : 0;
  const campaignDiscount = campaign?.discountRate ? Number(campaign.discountRate) : 0;
  const floor = pricing.floorRate ?? product.minRate ?? Math.max(0, base - 0.03);
  const cap = pricing.capRate ?? product.maxRate ?? base + 0.05;
  const raw = base + Number(grade.premium || 0) - relationshipDiscount - campaignDiscount;
  return {
    rate: round4(clamp(raw, floor, cap)),
    base,
    premium: Number(grade.premium || 0),
    relationshipDiscount,
    campaignDiscount,
    floor,
    cap,
    grade: grade.label || String(grade.minScore),
  };
}
