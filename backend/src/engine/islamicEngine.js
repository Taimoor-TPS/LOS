export const SEQUENCES = {
  conventional: [
    { code: 'kyc', title: 'Identity verified', required: true },
    { code: 'kfs', title: 'Key facts accepted', required: true },
    { code: 'esign', title: 'Contract signed', required: true },
    { code: 'account', title: 'Disbursement account confirmed', required: true },
  ],
  murabaha: [
    { code: 'kyc', title: 'Identity verified', required: true },
    { code: 'asset_quote', title: 'Asset quotation received', required: true },
    { code: 'purchase', title: 'Bank purchases the asset', required: true },
    { code: 'ownership', title: 'Ownership evidenced', required: true },
    { code: 'possession', title: 'Possession evidenced', required: true },
    { code: 'sale', title: 'Murabaha sale contract', required: true },
    { code: 'kfs', title: 'Key facts accepted', required: true },
    { code: 'esign', title: 'Contract signed', required: true },
  ],
  ijarah: [
    { code: 'kyc', title: 'Identity verified', required: true },
    { code: 'asset_identified', title: 'Asset identified', required: true },
    { code: 'valuation', title: 'Valuation', required: true },
    { code: 'purchase', title: 'Bank purchases the asset', required: true },
    { code: 'ownership', title: 'Ownership evidenced', required: true },
    { code: 'possession', title: 'Possession evidenced', required: true },
    { code: 'lease', title: 'Ijarah contract', required: true },
    { code: 'takaful', title: 'Takaful arranged', required: true },
    { code: 'kfs', title: 'Key facts accepted', required: true },
    { code: 'esign', title: 'Contract signed', required: true },
  ],
  diminishing_musharakah: [
    { code: 'kyc', title: 'Identity verified', required: true },
    { code: 'valuation', title: 'Property valuation', required: true },
    { code: 'partnership', title: 'Partnership agreement', required: true },
    { code: 'ownership', title: 'Co-ownership evidenced', required: true },
    { code: 'lease', title: 'Lease of the bank share', required: true },
    { code: 'units', title: 'Unit purchase schedule', required: true },
    { code: 'kfs', title: 'Key facts accepted', required: true },
    { code: 'esign', title: 'Contract signed', required: true },
  ],
  running_musharakah: [
    { code: 'kyc', title: 'Identity verified', required: true },
    { code: 'partnership', title: 'Partnership agreement', required: true },
    { code: 'contribution', title: 'Business contribution recorded', required: true },
    { code: 'drawing', title: 'Drawing power confirmed', required: true },
    { code: 'profit', title: 'Profit method agreed', required: true },
    { code: 'kfs', title: 'Key facts accepted', required: true },
    { code: 'esign', title: 'Contract signed', required: true },
  ],
  running_finance: [
    { code: 'kyc', title: 'Identity verified', required: true },
    { code: 'stock', title: 'Stock and receivables confirmed', required: true },
    { code: 'security', title: 'Security package in place', required: true },
    { code: 'kfs', title: 'Key facts accepted', required: true },
    { code: 'esign', title: 'Contract signed', required: true },
    { code: 'account', title: 'Limit account confirmed', required: true },
  ],
  tawarruq: [
    { code: 'kyc', title: 'Identity verified', required: true },
    { code: 'commodity_purchase', title: 'Commodity purchased by the bank', required: true },
    { code: 'ownership', title: 'Ownership evidenced', required: true },
    { code: 'sale_customer', title: 'Sale to the customer', required: true },
    { code: 'customer_sale', title: 'Customer sale of commodity evidenced', required: true },
    { code: 'kfs', title: 'Key facts accepted', required: true },
    { code: 'esign', title: 'Contract signed', required: true },
  ],
};

export function sequenceFor(contractType, configured) {
  const template = configured?.[contractType] || SEQUENCES[contractType] || SEQUENCES.conventional;
  return template.map((step) => ({
    code: step.code,
    title: step.title,
    required: step.required !== false,
    status: 'pending',
    evidence: '',
  }));
}

export function sequenceComplete(steps) {
  return (steps || []).filter((step) => step.required).every((step) => step.status === 'complete');
}

export function completeSteps(steps, codes, evidence, actor) {
  const now = new Date();
  return (steps || []).map((step) => {
    if (!codes.includes(step.code) || step.status === 'complete') return step;
    return { ...step, status: 'complete', evidence, completedBy: actor, completedAt: now };
  });
}
