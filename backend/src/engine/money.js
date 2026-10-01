export function roundMoney(value) {
  return Math.round(Number(value) || 0);
}

export function instalment(principal, annualRate, tenorMonths) {
  const principalAmount = Number(principal);
  const months = Number(tenorMonths);
  const annual = Number(annualRate);
  if (!principalAmount || !months || months <= 0) return 0;
  const monthly = annual / 12;
  if (monthly === 0) return roundMoney(principalAmount / months);
  const factor = (1 + monthly) ** months;
  return roundMoney((principalAmount * monthly * factor) / (factor - 1));
}

export function maxPrincipal(monthlyInstalment, annualRate, tenorMonths) {
  const payment = Number(monthlyInstalment);
  const months = Number(tenorMonths);
  const monthly = Number(annualRate) / 12;
  if (!payment || !months) return 0;
  if (monthly === 0) return roundMoney(payment * months);
  const factor = (1 + monthly) ** -months;
  return roundMoney((payment * (1 - factor)) / monthly);
}

export function buildSchedule(principal, annualRate, tenorMonths, payment, start = new Date()) {
  let balance = roundMoney(principal);
  const monthly = Number(annualRate) / 12;
  const rows = [];
  for (let n = 1; n <= tenorMonths; n += 1) {
    const profit = roundMoney(balance * monthly);
    let principalPart = payment - profit;
    if (n === tenorMonths || principalPart > balance) principalPart = balance;
    balance = Math.max(0, balance - principalPart);
    const due = new Date(start);
    due.setMonth(due.getMonth() + n);
    rows.push({
      n,
      due,
      instalment: principalPart + profit,
      profit,
      principal: principalPart,
      balance,
      status: 'due',
    });
  }
  return rows;
}

export function processingFee(amount, product = {}) {
  let fee = Math.round(Number(amount) * Number(product.feeRate || 0));
  if (product.feeMin != null) fee = Math.max(fee, Number(product.feeMin));
  if (product.feeMax != null) fee = Math.min(fee, Number(product.feeMax));
  return fee;
}

export function rateCaption(product = {}) {
  const type = product.contractType;
  if (type === 'murabaha' || type === 'running_musharakah') return 'Profit rate';
  if (type === 'ijarah' || type === 'diminishing_musharakah') return 'Rental rate';
  if (type === 'running_finance') return 'Rate on the limit';
  return 'Rate';
}

function ijarahRental(principal, annualRate, tenorMonths, residualRate) {
  const months = Number(tenorMonths);
  const monthly = Number(annualRate) / 12;
  const residual = Number(principal) * Number(residualRate || 0);
  if (!months) return 0;
  if (monthly === 0) return roundMoney((principal - residual) / months);
  const pvResidual = residual / (1 + monthly) ** months;
  const net = Number(principal) - pvResidual;
  const factor = (1 + monthly) ** -months;
  return roundMoney((net * monthly) / (1 - factor));
}

export function quotePayment(product, principal, annualRate, tenorMonths) {
  const type = product?.contractType || 'conventional';
  const amount = Number(principal);
  const rate = Number(annualRate);
  const months = Number(tenorMonths);
  if (type === 'murabaha') {
    if (!months) return 0;
    const profit = amount * rate * (months / 12);
    return roundMoney((amount + profit) / months);
  }
  if (type === 'running_finance' || type === 'running_musharakah') {
    return roundMoney((amount * rate) / 12);
  }
  if (type === 'ijarah') return ijarahRental(amount, rate, months, product?.residualRate || 0);
  return instalment(amount, rate, months);
}

export function buildContractSchedule({ contractType, principal, annualRate, tenorMonths, payment, start = new Date() }) {
  if (contractType === 'murabaha') {
    const profitTotal = roundMoney(Number(principal) * Number(annualRate) * (Number(tenorMonths) / 12));
    let profitLeft = profitTotal;
    let balance = roundMoney(principal);
    const rows = [];
    for (let n = 1; n <= tenorMonths; n += 1) {
      const profit = n === tenorMonths ? profitLeft : roundMoney(profitTotal / tenorMonths);
      profitLeft -= profit;
      const principalPart = Math.min(balance, payment - profit);
      balance = Math.max(0, balance - principalPart);
      const due = new Date(start);
      due.setMonth(due.getMonth() + n);
      rows.push({ n, due, instalment: principalPart + profit, profit, principal: principalPart, balance, status: 'due' });
    }
    return rows;
  }
  if (contractType === 'running_finance' || contractType === 'running_musharakah') {
    const rows = [];
    const balance = roundMoney(principal);
    for (let n = 1; n <= tenorMonths; n += 1) {
      const due = new Date(start);
      due.setMonth(due.getMonth() + n);
      rows.push({ n, due, instalment: payment, profit: payment, principal: 0, balance, status: 'due' });
    }
    return rows;
  }
  return buildSchedule(principal, annualRate, tenorMonths, payment, start);
}

export function ageFromDob(date, now = new Date()) {
  const born = new Date(date);
  let years = now.getFullYear() - born.getFullYear();
  const month = now.getMonth() - born.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < born.getDate())) years -= 1;
  return years;
}
