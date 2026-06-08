const { branchMatches } = require('./branchEligibility');

const parseNumber = (value, fallback = 0) => {
  const normalized = String(value ?? '').replace(/,/g, '').replace(/₹/g, '');
  const match = normalized.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : fallback;
};

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== '';

const parsePackageToLpa = (value) => {
  const text = String(value || '').toLowerCase();
  const amount = parseNumber(text, NaN);
  if (Number.isNaN(amount)) return null;
  if (text.includes('crore') || text.includes('cr')) return Number((amount * 100).toFixed(2));
  if (text.includes('lpa') || text.includes('lac')) return amount;
  if (text.includes('k/month') || text.includes('/month') || text.includes('per month')) return Number(((amount * 12) / 100).toFixed(2));
  if (text.includes('/year') || text.includes('per year') || text.includes('pa') || text.includes('per annum') || text.includes('annum')) return Number((amount / 100000).toFixed(2));
  if (amount >= 100000) return Number((amount / 100000).toFixed(2));
  return amount;
};

const canApplyToJob = (student = {}, job = {}) => {
  const cgpa = parseNumber(student.cgpa, NaN);
  const minCgpa = parseNumber(job.minCGPA, 0);
  const studentStatus = String(student.placementStatus || 'unplaced').toLowerCase();
  const studentPackage = parsePackageToLpa(student.currentPackage || student.highestPackage || '');
  const jobPackage = parsePackageToLpa(job.ctc || job.stipend || '');
  const deadline = job.deadline ? new Date(job.deadline) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (String(job.status || '').toLowerCase() === 'closed') {
    return { allowed: false, reason: 'Job is closed' };
  }

  if (deadline && !Number.isNaN(deadline.getTime()) && deadline < today) {
    return { allowed: false, reason: 'Application deadline has passed' };
  }

  if (minCgpa && hasValue(student.cgpa) && !Number.isNaN(cgpa) && cgpa < minCgpa) {
    return { allowed: false, reason: `CGPA requirement: ${job.minCGPA || minCgpa}` };
  }

  if (!branchMatches(job.branches, student.branch)) {
    const eligibleBranches = Array.isArray(job.branches) && job.branches.length
      ? job.branches.join(', ')
      : 'All branches';
    return { allowed: false, reason: `Branch mismatch. Eligible branches: ${eligibleBranches}` };
  }

  if (studentStatus === 'placed' && studentPackage != null && jobPackage != null && jobPackage <= studentPackage) {
    return { allowed: false, reason: `Requires package higher than current (${student.currentPackage || 'N/A'})` };
  }

  return { allowed: true };
};

module.exports = {
  canApplyToJob,
  parseNumber,
  parsePackageToLpa,
  hasValue
};
