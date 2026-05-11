const parseNumber = (value) => {
  const text = String(value ?? '')
    .replace(/,/g, '')
    .replace(/₹/g, '')
    .trim();
  const match = text.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : NaN;
};

const formatRupee = (amount) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 1,
}).format(amount).replace(/^₹\s*/, '₹');

const formatLpaValue = (amount) => {
  const rounded = Number(amount.toFixed(2));
  const display = Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/\.0+$/, '');
  return `₹${display} LPA`;
};

export const formatCompensationInInr = (value, fallback = 'Compensation to be announced') => {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;

  const text = raw.toLowerCase();
  const amount = parseNumber(raw);
  if (Number.isNaN(amount)) return raw;

  if (text.includes('lpa') || text.includes('lac') || text.includes('lakh')) {
    return formatLpaValue(amount);
  }

  if (text.includes('crore') || text.includes('cr')) {
    return `₹${amount} Cr`;
  }

  if (text.includes('k/month') || text.includes('k per month') || text.includes('thousand/month')) {
    return `₹${amount}k/month`;
  }

  if (text.includes('/month') || text.includes('per month')) {
    return `₹${amount}/month`;
  }

  if (text.includes('/year') || text.includes('per year') || text.includes('pa') || text.includes('annum')) {
    return `₹${amount}/year`;
  }

  if (amount < 100) return formatLpaValue(amount);
  if (amount >= 10000000) return `₹${String(Number((amount / 10000000).toFixed(2))).replace(/\.0+$/, '')} Cr`;
  if (amount >= 100000) return `₹${String(Number((amount / 100000).toFixed(2))).replace(/\.0+$/, '')} LPA`;

  return formatRupee(amount);
};
