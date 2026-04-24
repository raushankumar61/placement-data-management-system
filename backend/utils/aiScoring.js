// backend/utils/aiScoring.js
/**
 * AI-style scoring engine for candidate ranking.
 * Runs entirely server-side — no external ML API required.
 *
 * Score breakdown (max 100):
 *  - CGPA                  35 pts
 *  - Skill match with job  40 pts
 *  - Activity score        15 pts  (placement readiness)
 *  - Profile completeness  10 pts
 */

const CGPA_WEIGHT = 35;
const SKILL_WEIGHT = 40;
const ACTIVITY_WEIGHT = 15;
const PROFILE_WEIGHT = 10;

/**
 * Score a single student against a job.
 * @param {object} student  - student Firestore document
 * @param {object} job      - job Firestore document (optional — for skill match)
 * @returns {number} score 0-100
 */
const scoreStudent = (student, job = null) => {
  let score = 0;

  // ── CGPA (35 pts, linear 5.0–10.0) ──────────────────────────────────────
  const cgpa = parseFloat(student.cgpa) || 0;
  const cgpaScore = Math.min(35, Math.max(0, ((cgpa - 5.0) / 5.0) * 35));
  score += cgpaScore;

  // ── Skill Match (40 pts) ─────────────────────────────────────────────────
  const studentSkills = (Array.isArray(student.skills)
    ? student.skills
    : String(student.skills || '').split(',').map((s) => s.trim())
  ).map((s) => s.toLowerCase()).filter(Boolean);

  if (job && job.skills) {
    const jobSkills = (Array.isArray(job.skills)
      ? job.skills
      : String(job.skills || '').split(',').map((s) => s.trim())
    ).map((s) => s.toLowerCase()).filter(Boolean);

    if (jobSkills.length > 0) {
      const matched = studentSkills.filter((s) =>
        jobSkills.some((js) => js.includes(s) || s.includes(js))
      ).length;
      score += Math.min(40, (matched / jobSkills.length) * 40);
    } else {
      // No required skills — award half the skill points for any skills listed
      score += studentSkills.length > 0 ? 20 : 0;
    }
  } else {
    // No job context — score based on skill count (diminishing returns after 8)
    score += Math.min(40, (Math.min(studentSkills.length, 8) / 8) * 40);
  }

  // ── Activity Score (15 pts) ──────────────────────────────────────────────
  const readiness = parseFloat(student.placementReadinessScore) || 0;
  score += Math.min(15, (Math.min(readiness, 100) / 100) * 15);

  // ── Profile Completeness (10 pts) ────────────────────────────────────────
  const fields = ['name', 'email', 'phone', 'branch', 'rollNo', 'cgpa', 'resumeURL', 'linkedin', 'github', 'bio'];
  const filled = fields.filter((f) => student[f] && String(student[f]).trim()).length;
  score += (filled / fields.length) * 10;

  return Math.round(score);
};

/**
 * Score and rank a list of students against an optional job.
 * @param {object[]} students
 * @param {object|null} job
 * @returns {Array<{student, score, rank}>}
 */
const rankStudents = (students, job = null) => {
  const scored = students.map((student) => ({
    student,
    score: scoreStudent(student, job),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
};

/**
 * Get recommended jobs for a student sorted by match score.
 * @param {object} student
 * @param {object[]} jobs
 * @returns {Array<{job, score}>}
 */
const recommendJobsForStudent = (student, jobs) => {
  const studentSkills = (Array.isArray(student.skills)
    ? student.skills
    : String(student.skills || '').split(',').map((s) => s.trim())
  ).map((s) => s.toLowerCase()).filter(Boolean);

  const cgpa = parseFloat(student.cgpa) || 0;
  const branch = String(student.branch || '').toLowerCase();

  const scored = jobs
    .filter((job) => {
      // Basic eligibility
      const minCgpa = parseFloat(job.minCGPA) || 0;
      if (minCgpa && cgpa < minCgpa) return false;
      const status = String(job.status || '').toLowerCase();
      if (status === 'closed') return false;
      return true;
    })
    .map((job) => {
      const jobSkills = (Array.isArray(job.skills)
        ? job.skills
        : String(job.skills || '').split(',').map((s) => s.trim())
      ).map((s) => s.toLowerCase()).filter(Boolean);

      let score = 0;

      // Skill match (60%)
      if (jobSkills.length > 0 && studentSkills.length > 0) {
        const matched = studentSkills.filter((s) =>
          jobSkills.some((js) => js.includes(s) || s.includes(js))
        ).length;
        score += (matched / jobSkills.length) * 60;
      }

      // Branch match bonus (20%)
      const jobBranches = Array.isArray(job.branches) ? job.branches.map((b) => b.toLowerCase()) : [];
      if (!jobBranches.length || jobBranches.includes('all') || jobBranches.some((b) => b.includes(branch) || branch.includes(b))) {
        score += 20;
      }

      // CTC desirability (20% — higher CTC = more desirable)
      const ctcNum = parseFloat(String(job.ctc || '').match(/\d+/)?.[0] || 0);
      score += Math.min(20, ctcNum / 2);

      return { job, score: Math.round(score) };
    });

  scored.sort((a, b) => b.score - a.score);
  return scored;
};

module.exports = { scoreStudent, rankStudents, recommendJobsForStudent };
