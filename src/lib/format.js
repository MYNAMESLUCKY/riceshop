const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrencyINR(value) {
  const amount = Number(value || 0);
  return inrFormatter.format(Number.isFinite(amount) ? amount : 0);
}

export function formatNumberIN(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-IN').format(Number.isFinite(amount) ? amount : 0);
}
