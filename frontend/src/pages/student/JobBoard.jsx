import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, DollarSign, Calendar, Building2, Briefcase } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { createApplication, getStudent } from '../../services/api';
import { useRealtimeJobs, useRealtimeApplications } from '../../hooks/useRealtime';
import { branchMatches } from '../../utils/branchEligibility';
import { formatCompensationInInr } from '../../utils/compensation';

const normalize = (value) => String(value || '').trim().toLowerCase();

const parseNumber = (value, fallback = 0) => {
  const text = String(value ?? '').replace(/,/g, '').replace(/₹/g, '').trim();
  if (!text) return fallback;
  const match = text.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : fallback;
};

const parsePackageToLpa = (value) => {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return null;

  const amount = parseNumber(text, NaN);
  if (Number.isNaN(amount)) return null;

  if (text.includes('lpa') || text.includes('lac')) return amount;
  if (text.includes('k/month') || text.includes('k per month') || text.includes('thousand/month')) {
    return Number(((amount * 12) / 100).toFixed(2));
  }
  if (text.includes('/month') || text.includes('per month')) {
    return Number(((amount * 12) / 100000).toFixed(2));
  }
  if (text.includes('pa') || text.includes('per annum')) {
    return Number((amount / 100000).toFixed(2));
  }

  return amount;
};

const displayValue = (value, fallback) => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

const formatBranchList = (branches) => {
  if (!branches) return 'All branches';
  if (Array.isArray(branches)) {
    const values = branches.map((branch) => String(branch).trim()).filter(Boolean);
    return values.length ? values.join(', ') : 'All branches';
  }
  return String(branches).trim() || 'All branches';
};

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== '';

const normalizeStudentForEligibility = (student = {}, userProfile = {}, user = null) => ({
  id: student.id || user?.uid || '',
  name: student.name || userProfile?.name || '',
  email: student.email || userProfile?.email || user?.email || '',
  branch: student.branch || userProfile?.branch || userProfile?.department || '',
  cgpa: student.cgpa ?? '',
  placementStatus: student.placementStatus || 'unplaced',
  currentPackage: student.currentPackage || '',
  highestPackage: student.highestPackage || '',
});

export default function StudentJobBoard() {
  const { user, userProfile } = useAuth();
  const [search, setSearch] = useState('');
  const [student, setStudent] = useState(null);
  const [selectedCompanyName, setSelectedCompanyName] = useState(null);
  const [applying, setApplying] = useState(false);

  const { jobs } = useRealtimeJobs();
  const { applications } = useRealtimeApplications({ studentId: user?.uid });

  useEffect(() => {
    if (!user?.uid) return undefined;
    let active = true;
    const load = async () => {
      try {
        const studentRes = await getStudent(user.uid);
        if (!active) return;
        const studentData = studentRes.data?.student || studentRes.data || {};
        setStudent(normalizeStudentForEligibility(studentData, userProfile, user));
      } catch {
        if (!active) return;
        setStudent(normalizeStudentForEligibility({}, userProfile, user));
      }
    };
    load();
    return () => { active = false; };
  }, [user, userProfile]);

  const displayedJobs = useMemo(() => {
    const studentBranch = student?.branch || userProfile?.department || '';
    const studentCgpa = parseNumber(student?.cgpa, NaN);
    const studentPlacementStatus = normalize(student?.placementStatus);
    const isPlacedStudent = studentPlacementStatus === 'placed';
    const studentCurrentPackageLpa = parsePackageToLpa(student?.currentPackage || student?.highestPackage || '');
    const appliedJobIds = new Set(applications.map((application) => application.jobId));

    return jobs.map((job) => {
      const minCgpa = parseNumber(job.minCGPA, 0);
      const jobPackageLpa = parsePackageToLpa(job.ctc || job.stipend || '');
      const isExpired = job.deadline && new Date(job.deadline) < new Date(new Date().setHours(0,0,0,0));
      const isOpen = normalize(job.status) !== 'closed' && !isExpired;
      const meetsCgpa = !minCgpa || !hasValue(student?.cgpa) || (!Number.isNaN(studentCgpa) && studentCgpa >= minCgpa);
      const meetsBranch = branchMatches(job.branches, studentBranch);
      const meetsPackageRule = !isPlacedStudent
        || studentCurrentPackageLpa == null
        || jobPackageLpa == null
        || jobPackageLpa > studentCurrentPackageLpa;
      const eligible = isOpen && meetsCgpa && meetsBranch && meetsPackageRule;
      const reason = !isOpen
        ? (isExpired ? 'Application deadline has passed' : 'Job is closed')
        : !meetsCgpa
          ? `CGPA requirement: ${job.minCGPA || minCgpa} (Your CGPA: ${hasValue(student?.cgpa) ? studentCgpa : 'Not set'})`
          : !meetsBranch
            ? `Branch mismatch. Your branch: ${studentBranch || 'Not set'}. Eligible branches: ${formatBranchList(job.branches)}`
            : !meetsPackageRule
              ? `Requires package higher than current (${student?.currentPackage || studentCurrentPackageLpa + ' LPA'})`
            : '';

      return {
        ...job,
        title: displayValue(job.title, 'Campus Opportunity'),
        company: displayValue(job.company, 'Hiring Partner'),
        location: displayValue(job.location, 'Location to be announced'),
        ctc: formatCompensationInInr(job.ctc || job.stipend, 'Compensation to be announced'),
        type: displayValue(job.type, 'Full-time'),
        workMode: displayValue(job.workMode, 'Onsite'),
        experienceLevel: displayValue(job.experienceLevel, 'Fresher'),
        openings: displayValue(job.openings, 'TBD'),
        recruiterName: displayValue(job.recruiterName, displayValue(job.company, 'Hiring Partner')),
        description: displayValue(job.description, 'Detailed job description will be shared by the recruiter soon.'),
        perks: Array.isArray(job.perks) ? job.perks.filter(Boolean) : [],
        minCgpa,
        jobPackageLpa,
        meetsCgpa,
        meetsBranch,
        meetsPackageRule,
        isOpen,
        reason,
        eligible,
        applied: appliedJobIds.has(job.id),
      };
    }).filter(j => j.isOpen); // Only show active drives
  }, [applications, jobs, student, userProfile?.department]);

  const companiesData = useMemo(() => {
    const map = new Map();
    displayedJobs.forEach((job) => {
      const c = job.company;
      if (!map.has(c)) {
        map.set(c, {
          name: c,
          jobs: [],
          locations: new Set(),
          eligibleCount: 0
        });
      }
      const data = map.get(c);
      data.jobs.push(job);
      if (job.location) data.locations.add(job.location);
      if (job.eligible) data.eligibleCount++;
    });
    
    return Array.from(map.values()).map(c => ({
      ...c,
      locations: Array.from(c.locations).join(', ') || 'Multiple Locations',
    }));
  }, [displayedJobs]);

  const filteredCompanies = companiesData.filter((c) => {
    return !search || c.name.toLowerCase().includes(search.toLowerCase());
  });

  useEffect(() => {
    if (!selectedCompanyName && filteredCompanies.length) {
      setSelectedCompanyName(filteredCompanies[0].name);
    }
  }, [filteredCompanies, selectedCompanyName]);

  const selectedCompany = useMemo(() => filteredCompanies.find((c) => c.name === selectedCompanyName) || null, [filteredCompanies, selectedCompanyName]);

  const applyToJob = async (job) => {
    if (job.applied) {
      toast.error('You already applied to this job');
      return;
    }
    if (!user?.uid) {
      toast.error('Please sign in to apply');
      return;
    }
    if (!job.eligible) {
      toast.error(job.reason || 'You are not eligible for this job');
      return;
    }

    setApplying(true);
    try {
      const payload = {
        jobId: job.id,
        branch: student?.branch || userProfile?.department || '',
      };
      await createApplication(payload);
      toast.success('Application submitted successfully!');
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Unable to submit application');
    } finally {
      setApplying(false);
    }
  };

  const deadlineBadge = (deadline) => {
    if (!deadline) return { label: 'TBD', urgent: false };
    const due = new Date(deadline);
    if (Number.isNaN(due.getTime())) return { label: 'TBD', urgent: false };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: 'Expired', urgent: true };
    if (diffDays === 0) return { label: 'Today', urgent: true };
    return { label: `${diffDays}d left`, urgent: diffDays <= 3 };
  };

  return (
    <DashboardLayout title="Company Listings">
      <div className="flex gap-5 h-full">
        <div className="flex-1 space-y-4 min-w-0">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input type="text" placeholder="Search companies..." value={search}
              onChange={(e) => setSearch(e.target.value)} className="input-field pl-9 py-2 text-sm w-full" />
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-white/40 text-xs font-body">{filteredCompanies.length} companies hiring</p>
          </div>

          <div className="space-y-3">
            {!filteredCompanies.length && search && (
              <div className="glass-card p-6 border border-white/5 text-center">
                <p className="text-white/60 font-medium">"{search}" is not listed in your campus</p>
                <p className="text-white/40 text-sm mt-1 font-body">Try searching for a different company or check back later.</p>
              </div>
            )}
            {!filteredCompanies.length && !search && (
              <div className="glass-card p-6 border border-white/5 text-center text-white/40 text-sm font-body">
                No active drives right now.
              </div>
            )}
            
            {filteredCompanies.map((comp, i) => (
              <motion.div key={comp.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => setSelectedCompanyName(comp.name)}
                className={`glass-card p-4 cursor-pointer border transition-all ${
                  selectedCompany?.name === comp.name ? 'border-blue-electric/50 bg-white/5' :
                  comp.eligibleCount === 0 ? 'border-white/5 opacity-60 hover:opacity-100 hover:border-white/15' : 'border-white/5 hover:border-white/15'
                }`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-electric/20 to-gold/10 flex items-center justify-center border border-white/10 flex-shrink-0">
                    <span className="font-heading font-bold text-white text-lg">{(comp.name || '?')[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-white font-semibold text-base truncate">{comp.name}</h3>
                      {comp.eligibleCount > 0 ? (
                        <span className="badge-green text-xs whitespace-nowrap">{comp.eligibleCount} Eligible Roles</span>
                      ) : (
                        <span className="badge-gray text-xs whitespace-nowrap">No Eligible Roles</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1.5">
                      <div className="flex items-center gap-1 text-white/40">
                        <MapPin size={12} /><span className="text-xs font-body">{comp.locations}</span>
                      </div>
                      <div className="flex items-center gap-1 text-white/40">
                        <Briefcase size={12} /><span className="text-xs font-body">{comp.jobs.length} Openings</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {selectedCompany && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="w-96 flex-shrink-0 glass-card border border-white/10 h-[calc(100vh-120px)] flex flex-col sticky top-4 overflow-hidden">
            
            {/* Header */}
            <div className="p-5 border-b border-white/5 bg-white/5">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-electric/20 to-gold/10 flex items-center justify-center border border-white/10 flex-shrink-0 shadow-lg">
                  <span className="font-heading font-bold text-white text-2xl">{(selectedCompany.name || '?')[0]}</span>
                </div>
                <div>
                  <h2 className="font-heading font-bold text-white text-xl leading-tight">{selectedCompany.name}</h2>
                  <p className="text-blue-electric font-body text-sm font-semibold mt-0.5">{selectedCompany.locations}</p>
                </div>
              </div>
              <p className="text-white/60 text-sm font-body leading-relaxed line-clamp-3">
                {selectedCompany.jobs[0]?.description}
              </p>
            </div>

            {/* Jobs List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <h3 className="text-white/80 font-semibold text-sm uppercase tracking-wider mb-2">Roles Offered</h3>
              {selectedCompany.jobs.map((job) => (
                <div key={job.id} className="bg-black/30 border border-white/5 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-white font-medium text-sm pr-2">{job.title}</h4>
                    {job.applied ? (
                      <span className="badge-green text-xs flex-shrink-0">Applied</span>
                    ) : job.eligible ? (
                      <span className="badge-blue text-xs flex-shrink-0">Eligible</span>
                    ) : null}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="flex items-center gap-1.5 text-white/50">
                      <DollarSign size={12} className="text-white/30" />
                      <span className="text-xs font-body truncate">{job.ctc}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-white/50">
                      <Building2 size={12} className="text-white/30" />
                      <span className="text-xs font-body truncate">{job.type}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-white/50">
                      <Calendar size={12} className="text-white/30" />
                      <span className={`text-xs font-body ${deadlineBadge(job.deadline).urgent ? 'text-red-400' : ''}`}>
                        {deadlineBadge(job.deadline).label}
                      </span>
                    </div>
                  </div>

                  {!job.eligible && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg font-body mb-3">
                      Not eligible: {job.reason || `CGPA requirement: ${job.minCGPA}`}
                    </div>
                  )}

                  {job.eligible && !job.applied && (
                    <button
                      onClick={() => applyToJob(job)}
                      disabled={applying}
                      className="w-full py-2 rounded-lg btn-primary text-sm font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      {applying ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Apply Now'}
                    </button>
                  )}
                  {job.applied && (
                    <button disabled className="w-full py-2 rounded-lg bg-white/5 border border-white/10 text-white/40 text-sm font-semibold cursor-not-allowed">
                      Application Submitted
                    </button>
                  )}
                </div>
              ))}
            </div>

          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
