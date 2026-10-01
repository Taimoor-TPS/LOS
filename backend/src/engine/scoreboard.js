export function bandPoints(bands, raw) {
  const ordered = [...(bands || [])].sort((a, b) => Number(b.min) - Number(a.min));
  const found = ordered.find((band) => {
    const min = Number(band.min);
    const max = band.max === undefined || band.max === null ? Infinity : Number(band.max);
    return Number(raw) >= min && Number(raw) <= max;
  });
  return found ? Number(found.points) : 0;
}

export function probabilityOfDefault(score, pdConfig = {}) {
  const midpoint = pdConfig.midpoint ?? 50;
  const slope = pdConfig.slope ?? 8;
  const pd = 1 / (1 + Math.exp((Number(score) - midpoint) / slope));
  return Math.round(pd * 10000) / 10000;
}

export function scoreApplication(scorecard, features) {
  const factors = [];
  let total = 0;
  let weightSum = 0;
  for (const factor of scorecard?.factors || []) {
    const raw = Number(features[factor.key] ?? 0);
    const points = bandPoints(factor.bands, raw);
    const weight = Number(factor.weight || 0);
    const contribution = (weight / 100) * points;
    weightSum += weight;
    total += contribution;
    factors.push({
      key: factor.key,
      label: factor.label || factor.key,
      raw,
      points,
      weight,
      contribution: Math.round(contribution * 10) / 10,
    });
  }
  const score = Math.round(total * 10) / 10;
  const approveCutoff = scorecard?.approveCutoff ?? 72;
  const referCutoff = scorecard?.referCutoff ?? 55;
  let band = 'decline';
  if (score >= approveCutoff) band = 'approve';
  else if (score >= referCutoff) band = 'refer';
  return {
    score,
    band,
    factors,
    weightSum,
    approveCutoff,
    referCutoff,
    pd: probabilityOfDefault(score, scorecard?.pd),
    scorecardCode: scorecard?.code,
    scorecardVersion: scorecard?.version,
  };
}
