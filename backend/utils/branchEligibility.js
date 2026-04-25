const BRANCH_ALIASES = {
  cse: 'computer science',
  'c s e': 'computer science',
  cs: 'computer science',
  'c s': 'computer science',
  'computer science': 'computer science',
  'computer science and engineering': 'computer science',
  'computer science engineering': 'computer science',
  'computer engineering': 'computer science',
  it: 'information technology',
  'i t': 'information technology',
  'information technology': 'information technology',
  ise: 'information technology',
  'information science': 'information technology',
  'information science engineering': 'information technology',
  ece: 'electronics & communication',
  'e c e': 'electronics & communication',
  'electronics and communication': 'electronics & communication',
  'electronics communication engineering': 'electronics & communication',
  'electronics and communication engineering': 'electronics & communication',
  eee: 'electrical',
  aiml: 'artificial intelligence & machine learning',
  'ai ml': 'artificial intelligence & machine learning',
  'artificial intelligence': 'artificial intelligence & machine learning',
  ai: 'artificial intelligence & machine learning',
  ml: 'artificial intelligence & machine learning',
  ds: 'data science',
};

const CANONICAL_DISPLAY = {
  'computer science': 'Computer Science',
  'information technology': 'Information Technology',
  'electronics & communication': 'Electronics & Communication',
  'artificial intelligence & machine learning': 'Artificial Intelligence & Machine Learning',
  'data science': 'Data Science',
  electrical: 'Electrical',
  mechanical: 'Mechanical',
  civil: 'Civil',
  biotechnology: 'Biotechnology',
  'robotics and automation': 'Robotics and Automation',
  aerospace: 'Aerospace',
};

const canonicalBranch = (value) => {
  const normalized = String(value || '')
    .toLowerCase()
    .replace(/engineering/g, '')
    .replace(/department/g, '')
    .replace(/[^a-z0-9& ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return '';
  return BRANCH_ALIASES[normalized] || normalized;
};

const isAllBranches = (value) => {
  const canonical = canonicalBranch(value);
  return canonical === 'all' || canonical === 'all branches' || canonical === 'all branch' || canonical === 'all departments';
};

const splitBranchTokens = (value) => String(value || '').split(/[|,;/]+/g).map((token) => token.trim()).filter(Boolean);

const normalizeBranchList = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return splitBranchTokens(value);
};

const toDisplayBranch = (value) => {
  const canonical = canonicalBranch(value);
  if (!canonical) return '';
  if (CANONICAL_DISPLAY[canonical]) return CANONICAL_DISPLAY[canonical];

  return canonical
    .split(' ')
    .map((part) => (part === '&' ? '&' : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(' ');
};

const normalizeJobBranches = (value) => {
  const raw = normalizeBranchList(value);
  if (!raw.length) return [];

  const expanded = raw.flatMap(splitBranchTokens);
  if (!expanded.length) return [];
  if (expanded.some((branch) => isAllBranches(branch))) return ['All'];

  const normalized = expanded
    .map((branch) => toDisplayBranch(branch))
    .filter(Boolean);

  return [...new Set(normalized)];
};

const branchMatches = (jobBranches, studentBranch) => {
  const student = canonicalBranch(studentBranch);
  if (!student) return true;

  const rawBranches = normalizeBranchList(jobBranches);
  if (!rawBranches.length || rawBranches.some((branch) => isAllBranches(branch))) return true;

  const expandedBranches = rawBranches.flatMap(splitBranchTokens);
  return expandedBranches.some((branch) => {
    const current = canonicalBranch(branch);
    if (!current) return false;
    return current === student || current.includes(student) || student.includes(current);
  });
};

module.exports = {
  branchMatches,
  canonicalBranch,
  normalizeBranchList,
  normalizeJobBranches,
  toDisplayBranch,
};
