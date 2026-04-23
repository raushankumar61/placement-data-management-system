import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle,
  ClipboardList,
  Filter,
  Plus,
  Search,
  ShieldAlert,
  Target,
  Users,
  X,
  Clock3,
  PlayCircle,
  PauseCircle,
  Undo2,
} from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import toast from 'react-hot-toast';
import { addDoc, collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';

const WARNING_THRESHOLD = 2;
const BLOCK_THRESHOLD = 3;

const INITIAL_FORM = {
  title: '',
  skill: '',
  branch: 'all',
  description: '',
  dueDate: '',
  minCGPA: '',
};

function normalizeSkillList(rawSkills) {
  if (Array.isArray(rawSkills)) return rawSkills.map((skill) => String(skill).trim()).filter(Boolean);
  return String(rawSkills || '')
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean);
}

function buildAttendanceMap(studentIds) {
  return studentIds.reduce((accumulator, studentId) => {
    accumulator[studentId] = 'pending';
    return accumulator;
  }, {});
}

function countAttendance(attendance = {}) {
  return Object.values(attendance).reduce((counts, status) => {
    if (status === 'present') counts.present += 1;
    else if (status === 'absent') counts.absent += 1;
    else counts.pending += 1;
    return counts;
  }, { present: 0, absent: 0, pending: 0 });
}

function deriveSkillOptions(students) {
  const skills = students.flatMap((student) => normalizeSkillList(student.skills));
  return [...new Set(skills)].sort((a, b) => a.localeCompare(b));
}

export default function FacultyPlacementActivities() {
  const { userProfile } = useAuth();
  const [students, setStudents] = useState([]);
  const [activities, setActivities] = useState([]);
  const [selectedSkill, setSelectedSkill] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingAttendance, setUpdatingAttendance] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  useEffect(() => {
    const load = async () => {
      try {
        const [studentsSnap, activitiesSnap] = await Promise.all([
          getDocs(collection(db, 'students')),
          getDocs(collection(db, 'placementActivities')),
        ]);

        const loadedStudents = studentsSnap.docs.map((studentDoc) => ({ id: studentDoc.id, ...studentDoc.data() }));
        const loadedActivities = activitiesSnap.docs
          .map((activityDoc) => ({ id: activityDoc.id, ...activityDoc.data() }))
          .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

        setStudents(loadedStudents);
        setActivities(loadedActivities);
      } catch {
        setStudents([]);
        setActivities([]);
      }
    };

    load();
  }, []);

  const studentMap = useMemo(() => {
    return students.reduce((accumulator, student) => {
      accumulator[student.id] = student;
      return accumulator;
    }, {});
  }, [students]);

  const branches = useMemo(() => [...new Set(students.map((student) => student.branch).filter(Boolean))].sort(), [students]);
  const skillOptions = useMemo(() => deriveSkillOptions(students), [students]);

  const enrichedStudents = useMemo(() => {
    return students.map((student) => {
      const skills = normalizeSkillList(student.skills);
      const participationCount = Number(student.activityParticipationCount || 0);
      const missedCount = Number(student.activityMissedCount || 0);
      const warningsCount = Number(student.activityWarningsCount || 0);
      const blocked = Boolean(student.placementActivityBlocked);
      return {
        ...student,
        skills,
        participationCount,
        missedCount,
        warningsCount,
        blocked,
        isWeakInSkill: selectedSkill !== 'all' ? !skills.some((skill) => skill.toLowerCase() === selectedSkill.toLowerCase()) : false,
      };
    });
  }, [students, selectedSkill]);

  const filteredStudents = useMemo(() => {
    return enrichedStudents.filter((student) => {
      const matchesSearch = !search ||
        student.name?.toLowerCase().includes(search.toLowerCase()) ||
        student.rollNo?.toLowerCase().includes(search.toLowerCase()) ||
        student.email?.toLowerCase().includes(search.toLowerCase());
      const matchesBranch = branchFilter === 'all' || student.branch === branchFilter;
      const matchesSkill = selectedSkill === 'all' || !student.skills.some((skill) => skill.toLowerCase() === selectedSkill.toLowerCase());
      return matchesSearch && matchesBranch && matchesSkill;
    });
  }, [enrichedStudents, branchFilter, search, selectedSkill]);

  const weakStudents = useMemo(() => {
    return filteredStudents.filter((student) => !student.blocked);
  }, [filteredStudents]);

  const blockedStudents = useMemo(() => enrichedStudents.filter((student) => student.blocked), [enrichedStudents]);

  const activityStats = useMemo(() => {
    const active = activities.filter((activity) => (activity.status || 'active') === 'active').length;
    const completed = activities.filter((activity) => (activity.status || 'active') === 'completed').length;
    const warned = enrichedStudents.filter((student) => student.warningsCount > 0).length;
    return {
      total: activities.length,
      active,
      completed,
      warned,
      blocked: blockedStudents.length,
    };
  }, [activities, blockedStudents.length, enrichedStudents]);

  const selectedCount = selectedIds.length;

  useEffect(() => {
    setSelectedIds((current) => current.filter((studentId) => weakStudents.some((student) => student.id === studentId)));
  }, [branchFilter, search, selectedSkill, weakStudents]);

  const toggleSelection = (studentId) => {
    setSelectedIds((current) => (
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    ));
  };

  const selectAllFiltered = () => {
    setSelectedIds(weakStudents.map((student) => student.id));
  };

  const clearSelection = () => setSelectedIds([]);

  const openCreateModal = () => {
    setForm((current) => ({
      ...current,
      skill: selectedSkill === 'all' ? '' : selectedSkill,
      branch: branchFilter,
      minCGPA: current.minCGPA || '',
      description: current.description || '',
    }));
    setShowModal(true);
  };

  const createActivity = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Activity title is required');
    if (!form.skill.trim()) return toast.error('Skill focus is required');

    const autoAssigned = selectedCount ? selectedIds : weakStudents.map((student) => student.id);
    const assignableIds = autoAssigned.filter((studentId) => !studentMap[studentId]?.placementActivityBlocked);

    if (!assignableIds.length) {
      return toast.error('No eligible students selected for this activity');
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        skill: form.skill.trim(),
        branch: form.branch,
        description: form.description.trim(),
        dueDate: form.dueDate || '',
        minCGPA: Number(form.minCGPA || 0),
        warningAfter: WARNING_THRESHOLD,
        blockAfter: BLOCK_THRESHOLD,
        assignedStudentIds: assignableIds,
        attendance: buildAttendanceMap(assignableIds),
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        postedBy: userProfile?.name || 'Faculty',
      };

      const ref = await addDoc(collection(db, 'placementActivities'), payload);
      setActivities((current) => [{ id: ref.id, ...payload }, ...current]);
      setSelectedActivity({ id: ref.id, ...payload });
      setShowModal(false);
      clearSelection();
      toast.success('Placement activity created');
    } catch {
      toast.error('Unable to create activity');
    } finally {
      setSaving(false);
    }
  };

  const updateAttendance = async (activity, studentId, nextStatus) => {
    const currentStatus = activity.attendance?.[studentId] || 'pending';
    if (currentStatus === nextStatus) return;

    const student = studentMap[studentId];
    if (!student) return;

    setUpdatingAttendance(true);
    try {
      const attendance = { ...(activity.attendance || {}), [studentId]: nextStatus };
      const activityRef = doc(db, 'placementActivities', activity.id);
      await updateDoc(activityRef, {
        attendance,
        updatedAt: new Date().toISOString(),
      });

      let participationDelta = 0;
      let missedDelta = 0;
      if (currentStatus === 'pending' && nextStatus === 'present') participationDelta = 1;
      if (currentStatus === 'pending' && nextStatus === 'absent') missedDelta = 1;
      if (currentStatus === 'present' && nextStatus === 'absent') {
        participationDelta = -1;
        missedDelta = 1;
      }
      if (currentStatus === 'absent' && nextStatus === 'present') {
        participationDelta = 1;
        missedDelta = -1;
      }
      if (currentStatus === 'present' && nextStatus === 'pending') participationDelta = -1;
      if (currentStatus === 'absent' && nextStatus === 'pending') missedDelta = -1;

      const newParticipation = Math.max(0, Number(student.activityParticipationCount || 0) + participationDelta);
      const newMissed = Math.max(0, Number(student.activityMissedCount || 0) + missedDelta);
      const newWarnings = Math.floor(newMissed / WARNING_THRESHOLD);
      const blocked = newMissed >= BLOCK_THRESHOLD;

      await updateDoc(doc(db, 'students', studentId), {
        activityParticipationCount: newParticipation,
        activityMissedCount: newMissed,
        activityWarningsCount: newWarnings,
        placementActivityBlocked: blocked,
        lastActivityStatus: nextStatus,
        latestPlacementActivity: activity.title,
        activityUpdatedAt: new Date().toISOString(),
      });

      setStudents((current) => current.map((item) => (
        item.id === studentId
          ? {
              ...item,
              activityParticipationCount: newParticipation,
              activityMissedCount: newMissed,
              activityWarningsCount: newWarnings,
              placementActivityBlocked: blocked,
              lastActivityStatus: nextStatus,
              latestPlacementActivity: activity.title,
              activityUpdatedAt: new Date().toISOString(),
            }
          : item
      )));

      setActivities((current) => current.map((item) => (
        item.id === activity.id
          ? {
              ...item,
              attendance,
              updatedAt: new Date().toISOString(),
            }
          : item
      )));

      setSelectedActivity((current) => (
        current && current.id === activity.id
          ? {
              ...current,
              attendance,
              updatedAt: new Date().toISOString(),
            }
          : current
      ));

      toast.success(`${student.name} marked as ${nextStatus}`);
    } catch {
      toast.error('Unable to update attendance');
    } finally {
      setUpdatingAttendance(false);
    }
  };

  const selectedActivityDetails = useMemo(() => {
    if (!selectedActivity) return null;
    const attendance = selectedActivity.attendance || {};
    const assigned = selectedActivity.assignedStudentIds || [];
    const counts = countAttendance(attendance);
    return {
      ...selectedActivity,
      counts,
      assignedStudents: assigned.map((studentId) => ({
        ...studentMap[studentId],
        id: studentId,
        status: attendance[studentId] || 'pending',
      })).filter((student) => student.id),
    };
  }, [selectedActivity, studentMap]);

  return (
    <DashboardLayout title="Placement Activities">
      <div className="space-y-5">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5 border border-blue-electric/20"
          style={{ background: 'linear-gradient(135deg, rgba(0,163,255,0.08), rgba(168,85,247,0.06))' }}
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-white/50 text-xs uppercase tracking-wider font-body">Teacher-led engagement tracker</p>
              <h2 className="font-heading font-bold text-2xl text-white mt-1">Placement Activities</h2>
              <p className="text-white/40 text-sm font-body mt-1">
                Create practice activities for students weak in specific skills, track participation, and enforce warnings automatically.
              </p>
            </div>
            <button onClick={openCreateModal} className="btn-primary text-sm py-2.5 px-4 flex items-center gap-2">
              <Plus size={14} /> New Activity
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Total Activities', value: activityStats.total, color: 'text-white' },
            { label: 'Active', value: activityStats.active, color: 'text-blue-electric' },
            { label: 'Completed', value: activityStats.completed, color: 'text-green-400' },
            { label: 'Warned Students', value: activityStats.warned, color: 'text-gold' },
            { label: 'Blocked Students', value: activityStats.blocked, color: 'text-red-400' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              className="glass-card p-4"
            >
              <p className="text-white/40 text-xs font-body mb-1">{stat.label}</p>
              <p className={`font-heading font-bold text-2xl ${stat.color}`}>{stat.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-5 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-4">
                <Filter size={16} className="text-blue-electric" />
                <p className="section-title text-base">Student Filters</p>
              </div>
              <div className="space-y-3">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    placeholder="Search students"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input-field pl-9 py-2 text-sm"
                  />
                </div>
                <select
                  value={selectedSkill}
                  onChange={(e) => setSelectedSkill(e.target.value)}
                  className="input-field py-2 text-sm appearance-none"
                >
                  <option value="all">All Skills</option>
                  {skillOptions.map((skill) => (
                    <option key={skill} value={skill} className="bg-dark-700">{skill}</option>
                  ))}
                </select>
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="input-field py-2 text-sm appearance-none"
                >
                  <option value="all">All Branches</option>
                  {branches.map((branch) => (
                    <option key={branch} value={branch} className="bg-dark-700">{branch}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="section-title text-base">Weak Students</p>
                  <p className="text-white/40 text-xs font-body mt-1">
                    {selectedSkill === 'all' ? 'Showing all filtered students' : `Lacking ${selectedSkill}`}
                  </p>
                </div>
                <button onClick={selectAllFiltered} className="text-xs text-blue-electric font-body hover:underline">
                  Select all filtered
                </button>
              </div>

              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {weakStudents.map((student) => {
                  const checked = selectedIds.includes(student.id);
                  return (
                    <div
                      key={student.id}
                      className={`p-3 rounded-xl border transition-all ${
                        checked ? 'border-blue-electric/40 bg-blue-electric/10' : 'border-white/5 hover:border-white/15'
                      } ${student.blocked ? 'opacity-70' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-white text-sm font-semibold">{student.name}</p>
                            <span className="text-white/30 text-xs font-mono">{student.rollNo || 'N/A'}</span>
                          </div>
                          <p className="text-white/40 text-xs font-body mt-0.5">
                            {student.branch || 'N/A'} · CGPA {Number(student.cgpa || 0).toFixed(1)} · {student.skills.slice(0, 3).join(', ') || 'No skills listed'}
                          </p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className={`badge ${student.blocked ? 'badge-red' : student.warningsCount > 0 ? 'badge-gold' : 'badge-gray'}`}>
                              {student.blocked ? 'Blocked' : student.warningsCount > 0 ? `${student.warningsCount} warning(s)` : 'Eligible'}
                            </span>
                            <span className="badge-blue">{student.participationCount} participated</span>
                            <span className="badge-gray">{student.missedCount} missed</span>
                          </div>
                        </div>
                        <label className={`mt-1 inline-flex items-center justify-center w-5 h-5 rounded border ${
                          student.blocked ? 'border-white/10 bg-white/5 cursor-not-allowed' : 'border-white/20 bg-white/5 cursor-pointer'
                        }`}>
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={checked}
                            disabled={student.blocked}
                            onChange={() => toggleSelection(student.id)}
                          />
                          {checked && <CheckCircle size={14} className="text-blue-electric" />}
                          {!checked && <span className="w-2 h-2 rounded-full bg-white/30" />}
                        </label>
                      </div>
                    </div>
                  );
                })}
                {weakStudents.length === 0 && (
                  <div className="py-12 text-center text-white/40 text-sm font-body">
                    No students match the selected filters.
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <button onClick={clearSelection} className="btn-outline text-sm py-2 px-3 flex-1">Clear</button>
                <button onClick={openCreateModal} className="btn-primary text-sm py-2 px-3 flex-1">
                  Create Activity · {selectedCount || weakStudents.length}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="section-title">Posted Activities</p>
                <p className="text-white/40 text-xs font-body mt-1">Track participation, absences, warnings, and blocked students</p>
              </div>
            </div>

            <div className="space-y-3">
              {activities.map((activity, index) => {
                const counts = countAttendance(activity.attendance || {});
                const isSelected = selectedActivity?.id === activity.id;
                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.06 }}
                    onClick={() => setSelectedActivity(activity)}
                    className={`glass-card p-4 border cursor-pointer transition-all ${
                      isSelected ? 'border-blue-electric/40 bg-blue-electric/5' : 'border-white/5 hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-white font-semibold text-sm">{activity.title}</p>
                          <span className={activity.status === 'completed' ? 'badge-green' : 'badge-blue'}>{activity.status || 'active'}</span>
                        </div>
                        <p className="text-white/50 text-xs font-body">
                          Skill: {activity.skill || 'N/A'} · Branch: {activity.branch === 'all' ? 'All branches' : activity.branch}
                        </p>
                        <p className="text-white/40 text-xs font-body mt-1 line-clamp-2">
                          {activity.description || 'No description provided.'}
                        </p>
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          <span className="badge-blue">{activity.assignedStudentIds?.length || 0} assigned</span>
                          <span className="badge-green">{counts.present} participated</span>
                          <span className="badge-red">{counts.absent} not participated</span>
                          <span className="badge-gray">{counts.pending} pending</span>
                        </div>
                      </div>
                      <div className="text-right text-xs font-body text-white/35">
                        <div className="flex items-center gap-1 justify-end">
                          <Clock3 size={12} />
                          <span>{activity.dueDate || 'No due date'}</span>
                        </div>
                        <p className="mt-2">By {activity.postedBy || 'Faculty'}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {activities.length === 0 && (
                <div className="glass-card p-12 text-center border border-white/5">
                  <ClipboardList size={32} className="text-white/20 mx-auto mb-3" />
                  <p className="text-white/40 font-body">No placement activities posted yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {selectedActivityDetails && (
          <div className="glass-card p-5 border border-white/10">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="section-title">{selectedActivityDetails.title}</p>
                <p className="text-white/40 text-xs font-body mt-1">
                  Skill: {selectedActivityDetails.skill} · Assigned students: {selectedActivityDetails.assignedStudentIds.length}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="badge-green">{selectedActivityDetails.counts.present} participated</span>
                <span className="badge-red">{selectedActivityDetails.counts.absent} not participated</span>
                <span className="badge-gray">{selectedActivityDetails.counts.pending} pending</span>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-3 mt-4">
              <div className="glass-card p-3 border border-white/10">
                <p className="text-white/40 text-xs font-body mb-1">Warning threshold</p>
                <p className="text-gold font-heading font-bold text-lg">{WARNING_THRESHOLD}</p>
              </div>
              <div className="glass-card p-3 border border-white/10">
                <p className="text-white/40 text-xs font-body mb-1">Block threshold</p>
                <p className="text-red-400 font-heading font-bold text-lg">{BLOCK_THRESHOLD}</p>
              </div>
              <div className="glass-card p-3 border border-white/10">
                <p className="text-white/40 text-xs font-body mb-1">Assigned</p>
                <p className="text-white font-heading font-bold text-lg">{selectedActivityDetails.assignedStudentIds.length}</p>
              </div>
              <div className="glass-card p-3 border border-white/10">
                <p className="text-white/40 text-xs font-body mb-1">Pending</p>
                <p className="text-blue-electric font-heading font-bold text-lg">{selectedActivityDetails.counts.pending}</p>
              </div>
            </div>

            <div className="mt-4 space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {selectedActivityDetails.assignedStudents.map((student) => {
                const currentStatus = selectedActivityDetails.attendance?.[student.id] || 'pending';
                return (
                  <div key={student.id} className="p-3 rounded-xl border border-white/5 bg-white/3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white text-sm font-semibold">{student.name}</p>
                          <span className="text-white/30 text-xs font-mono">{student.rollNo || 'N/A'}</span>
                        </div>
                        <p className="text-white/40 text-xs font-body mt-0.5">
                          {student.branch || 'N/A'} · CGPA {Number(student.cgpa || 0).toFixed(1)} · {normalizeSkillList(student.skills).slice(0, 3).join(', ') || 'No skills'}
                        </p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={currentStatus === 'present' ? 'badge-green' : currentStatus === 'absent' ? 'badge-red' : 'badge-gray'}>
                            {currentStatus}
                          </span>
                          <span className={student.placementActivityBlocked ? 'badge-red' : student.activityWarningsCount > 0 ? 'badge-gold' : 'badge-blue'}>
                            {student.placementActivityBlocked ? 'Blocked' : `${student.activityWarningsCount || 0} warning(s)`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => updateAttendance(selectedActivityDetails, student.id, 'present')}
                          disabled={updatingAttendance}
                          className="btn-outline text-xs py-2 px-3 flex items-center gap-1"
                        >
                          <PlayCircle size={12} /> Present
                        </button>
                        <button
                          type="button"
                          onClick={() => updateAttendance(selectedActivityDetails, student.id, 'absent')}
                          disabled={updatingAttendance}
                          className="btn-outline text-xs py-2 px-3 flex items-center gap-1"
                        >
                          <PauseCircle size={12} /> Absent
                        </button>
                        <button
                          type="button"
                          onClick={() => updateAttendance(selectedActivityDetails, student.id, 'pending')}
                          disabled={updatingAttendance}
                          className="btn-outline text-xs py-2 px-3 flex items-center gap-1"
                        >
                          <Undo2 size={12} /> Reset
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {selectedActivityDetails.assignedStudents.length === 0 && (
                <div className="py-8 text-center text-white/40 text-sm font-body">No students assigned to this activity.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="glass-card w-full max-w-2xl p-6 border border-white/10 my-4"
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider font-body">Create placement activity</p>
                <h2 className="section-title mt-1">New Activity</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={createActivity} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Activity Title *</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="input-field text-sm"
                    placeholder="DSA Revision Sprint"
                    required
                  />
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Target Skill *</label>
                  <input
                    list="skill-suggestions"
                    value={form.skill}
                    onChange={(e) => setForm({ ...form, skill: e.target.value })}
                    className="input-field text-sm"
                    placeholder="React, Python, DSA..."
                    required
                  />
                  <datalist id="skill-suggestions">
                    {skillOptions.map((skill) => <option key={skill} value={skill} />)}
                  </datalist>
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Branch Group</label>
                  <select
                    value={form.branch}
                    onChange={(e) => setForm({ ...form, branch: e.target.value })}
                    className="input-field text-sm appearance-none"
                  >
                    <option value="all">All Branches</option>
                    {branches.map((branch) => <option key={branch} value={branch} className="bg-dark-700">{branch}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Due Date</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Min CGPA</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={form.minCGPA}
                    onChange={(e) => setForm({ ...form, minCGPA: e.target.value })}
                    className="input-field text-sm"
                    placeholder="6.5"
                  />
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Target Count</label>
                  <div className="input-field text-sm flex items-center justify-between">
                    <span className="text-white/60">{selectedCount || weakStudents.length} student(s)</span>
                    <Users size={14} className="text-white/30" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-field text-sm resize-none"
                  rows={4}
                  placeholder="Describe the activity, expectations, and preparation steps..."
                />
              </div>

              <div className="p-4 rounded-xl bg-white/3 border border-white/5">
                <p className="text-white font-semibold text-sm mb-2">Participation rules</p>
                <p className="text-white/50 text-xs font-body leading-relaxed">
                  Students will receive a warning after {WARNING_THRESHOLD} missed activities and will be blocked from placement activities after {BLOCK_THRESHOLD} misses.
                </p>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="badge-gold">Warnings after {WARNING_THRESHOLD} misses</span>
                  <span className="badge-red">Blocked after {BLOCK_THRESHOLD} misses</span>
                  <span className="badge-blue">{weakStudents.length} eligible students filtered</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1 text-sm py-2.5">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm py-2.5 flex items-center justify-center gap-2 disabled:opacity-60">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Plus size={14} /> Assign Activity</>}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
}
