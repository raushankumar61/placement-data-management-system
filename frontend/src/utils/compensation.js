const parseNumber = (value) => {
  const text = String(value ?? '')
    .replace(/,/g, '')
    .replace(/₹/g, '')
    .trim();
  const match = text.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : NaN;
};

const parsePackageToAnnualInr = (value) => {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return null;

  const amount = parseNumber(text);
  if (Number.isNaN(amount)) return null;

  if (text.includes('crore') || text.includes('cr')) return Math.round(amount * 10000000);
  if (text.includes('lpa') || text.includes('lac') || text.includes('lakh')) return Math.round(amount * 100000);
  if (text.includes('k/month') || text.includes('k per month') || text.includes('thousand/month')) return Math.round(amount * 1000 * 12);
  if (text.includes('/month') || text.includes('per month')) return Math.round(amount * 12);
  if (text.includes('/year') || text.includes('per year') || text.includes('pa') || text.includes('annum')) return Math.round(amount);

  if (amount >= 100000) return Math.round(amount);
  if (amount < 100) return Math.round(amount * 100000);
  return Math.round(amount);
};

const formatInr = (amount) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(amount);

export const formatCompensationInInr = (value, fallback = 'Compensation to be announced') => {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;

  const annualInr = parsePackageToAnnualInr(raw);
  if (annualInr == null) return raw;

  return `${formatInr(annualInr)} / year`;
};
