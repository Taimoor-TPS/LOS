function round4(value) {
  return Math.round(Number(value) * 10000) / 10000;
}

export function capacityFeature(affordability) {
  if (affordability.mode === 'cashflow') {
    const ratio = affordability.minCover ? affordability.cover / affordability.minCover : 0;
    return Math.max(0, Math.min(100, Math.round(ratio * 50)));
  }
  const points = (affordability.headroom ?? -1) * 100;
  if (points >= 10) return 100;
  if (points >= 5) return 80;
  if (points >= 2) return 65;
  if (points >= 0) return 50;
  return 10;
}

export function assessAffordability({ income, obligations, instalment, regulatory = {}, mode = 'dbr' }) {
  const inc = Number(income || 0);
  const obl = Number(obligations || 0);
  const payment = Number(instalment || 0);

  if (mode === 'cashflow') {
    const cover = payment > 0 ? inc / payment : 0;
    const minCover = regulatory.minCashflowCover ?? 1.5;
    const buffer = regulatory.referBufferCover ?? 0.2;
    const pass = inc > 0 && cover + 1e-9 >= minCover;
    const near = !pass && minCover - cover <= buffer;
    return {
      mode,
      pass,
      near,
      cover: round4(cover),
      minCover,
      headroom: round4(cover - minCover),
      income: inc,
      obligations: obl,
      instalment: payment,
    };
  }

  const maxDbr = regulatory.maxDbr ?? 0.4;
  const dbr = inc > 0 ? (obl + payment) / inc : 1;
  const pass = inc > 0 && dbr <= maxDbr + 1e-9;
  const near = !pass && dbr <= maxDbr + (regulatory.referBuffer ?? 0.05);
  return {
    mode: 'dbr',
    pass,
    near,
    dbr: round4(dbr),
    maxDbr,
    headroom: round4(maxDbr - dbr),
    income: inc,
    obligations: obl,
    instalment: payment,
  };
}
