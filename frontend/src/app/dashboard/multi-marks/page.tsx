"use client";

import { useEffect, useMemo, useState } from "react";
import api from "../../utils/api";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Save,
  Circle,
  CircleDot,
} from "lucide-react";

type Exam = { _id: string; name: string; term: string; isApproved?: boolean };
type Subject = { _id: string; name: string; code?: string };
type AClass = {
  _id: string;
  name: string;
  section?: string;
  grade?: string;
  subjects?: { subject: Subject }[];
};
type Student = {
  _id: string;
  id?: string;
  firstName: string;
  lastName: string;
  rollNo?: string;
  profile?: { rollNo?: string };
};

/** scores[studentId][subjectId] = string score or "" */
type ScoreGrid = Record<string, Record<string, string>>;

export default function MultiMarksPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<AClass[]>([]);
  const [selExam, setSelExam] = useState("");
  const [selClass, setSelClass] = useState("");
  const [maxMarks, setMaxMarks] = useState(20);
  const [students, setStudents] = useState<Student[]>([]);
  const [scores, setScores] = useState<ScoreGrid>({});
  const [dirty, setDirty] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    (async () => {
      try {
        const [eRes, cRes] = await Promise.all([
          api.get("/exams"),
          api.get("/classes"),
        ]);
        setExams(eRes.data.data || []);
        setClasses(cRes.data.data || []);
      } catch (e) {
        console.error(e);
        showToast("Failed to load exams/classes", false);
      }
    })();
  }, []);

  const classSubjects = useMemo(() => {
    const cls = classes.find((c) => c._id === selClass);
    if (!cls?.subjects?.length) return [] as Subject[];
    const seen = new Set<string>();
    const list: Subject[] = [];
    for (const item of cls.subjects) {
      const sub = item?.subject;
      if (!sub?._id || seen.has(sub._id)) continue;
      seen.add(sub._id);
      list.push(sub);
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [classes, selClass]);

  const studentCount = students.length;

  /** Per-subject: how many students have a saved/entered score */
  const subjectProgress = useMemo(() => {
    return classSubjects.map((sub) => {
      let entered = 0;
      for (const stu of students) {
        const sid = stu._id || stu.id || "";
        const val = scores[sid]?.[sub._id];
        if (val !== undefined && val !== "" && String(val).toUpperCase() !== "M") {
          entered += 1;
        }
      }
      const complete = studentCount > 0 && entered >= studentCount;
      const partial = entered > 0 && !complete;
      return { subject: sub, entered, total: studentCount, complete, partial };
    });
  }, [classSubjects, students, scores, studentCount]);

  const doneCount = subjectProgress.filter((p) => p.complete).length;
  const partialCount = subjectProgress.filter((p) => p.partial).length;
  const remainingCount = subjectProgress.filter((p) => !p.complete && !p.partial).length;
  const progressPct =
    classSubjects.length > 0
      ? Math.round((doneCount / classSubjects.length) * 100)
      : 0;

  useEffect(() => {
    if (!selExam || !selClass) {
      setStudents([]);
      setScores({});
      setDirty({});
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const [stuRes, mrkRes] = await Promise.all([
          api.get(`/students?class=${selClass}`),
          api.get("/exams/marks", { params: { examId: selExam, classId: selClass } }),
        ]);
        const stus: Student[] = stuRes.data.data || [];
        const existing: any[] = mrkRes.data.data || [];

        const grid: ScoreGrid = {};
        stus.forEach((s) => {
          const sid = s._id || s.id || "";
          grid[sid] = {};
        });
        existing.forEach((m) => {
          const sid = m.student?._id || m.student?.id || m.studentId;
          const subId = m.subject?._id || m.subject?.id || m.subjectId;
          if (sid && subId && grid[sid]) {
            grid[sid][subId] = String(m.marksObtained);
          }
        });
        setStudents(stus);
        setScores(grid);
        setDirty({});
      } catch (e) {
        console.error(e);
        showToast("Failed to load students/marks", false);
      } finally {
        setLoading(false);
      }
    })();
  }, [selExam, selClass]);

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      const name = `${s.firstName} ${s.lastName}`.toLowerCase();
      const roll = (s.rollNo || s.profile?.rollNo || "").toLowerCase();
      return name.includes(q) || roll.includes(q);
    });
  }, [students, search]);

  const dirtySubjectCount = useMemo(() => {
    const set = new Set<string>();
    Object.values(dirty).forEach((subs) => subs.forEach((id) => set.add(id)));
    return set.size;
  }, [dirty]);

  const dirtyCellCount = useMemo(() => {
    let n = 0;
    Object.values(dirty).forEach((subs) => {
      n += subs.size;
    });
    return n;
  }, [dirty]);

  const handleChange = (studentId: string, subjectId: string, value: string) => {
    setScores((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [subjectId]: value },
    }));
    setDirty((prev) => {
      const next = { ...prev };
      const set = new Set(next[studentId] || []);
      set.add(subjectId);
      next[studentId] = set;
      return next;
    });
  };

  const handleSaveAll = async () => {
    if (!selExam || !selClass) return;
    if (!dirtyCellCount) {
      showToast("No changes to save", false);
      return;
    }

    // Build per-subject batches from dirty cells (and include empty? only dirty non-empty or allow clear?)
    // Save dirty cells that have a numeric score; skip blank dirty cells.
    const bySubject = new Map<string, { studentId: string; score: number }[]>();

    for (const [studentId, subSet] of Object.entries(dirty)) {
      for (const subjectId of subSet) {
        const raw = scores[studentId]?.[subjectId];
        if (raw === undefined || raw === "" || String(raw).trim().toUpperCase() === "M") continue;
        const score = Number(raw);
        if (!Number.isFinite(score) || score < 0 || score > maxMarks) {
          const stu = students.find((s) => (s._id || s.id) === studentId);
          const sub = classSubjects.find((s) => s._id === subjectId);
          showToast(
            `Invalid score for ${stu ? `${stu.firstName} ${stu.lastName}` : "student"} / ${sub?.name || "subject"} (0–${maxMarks})`,
            false
          );
          return;
        }
        if (!bySubject.has(subjectId)) bySubject.set(subjectId, []);
        bySubject.get(subjectId)!.push({ studentId, score });
      }
    }

    if (!bySubject.size) {
      showToast("Enter at least one valid mark to save", false);
      return;
    }

    setSaving(true);
    try {
      let saved = 0;
      for (const [subjectId, marks] of bySubject) {
        await api.post("/exams/marks/bulk", {
          examId: selExam,
          classId: selClass,
          subjectId,
          maxMarks,
          marks,
        });
        saved += marks.length;
      }
      setDirty({});
      showToast(`Saved ${saved} marks across ${bySubject.size} subject(s)`);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to save marks", false);
    } finally {
      setSaving(false);
    }
  };

  const currentExam = exams.find((e) => e._id === selExam);
  const classLabel = (() => {
    const c = classes.find((x) => x._id === selClass);
    if (!c) return "";
    return `${c.grade || c.name}${c.section ? ` ${c.section}` : ""}`;
  })();

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5">
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${
            toast.ok ? "bg-emerald-600" : "bg-red-500"
          }`}
        >
          {toast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            Multi-Subject Marks
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            See which subjects are done, and enter marks for many subjects at once.
          </p>
        </div>
        {canShowSave(selExam, selClass, classSubjects.length) && (
          <button
            onClick={handleSaveAll}
            disabled={saving || dirtyCellCount === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save All{dirtyCellCount ? ` (${dirtyCellCount})` : ""}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Exam
          </label>
          <div className="relative">
            <select
              value={selExam}
              onChange={(e) => setSelExam(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8"
            >
              <option value="">— Select Exam —</option>
              {exams.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.name} — {e.term}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Class
          </label>
          <div className="relative">
            <select
              value={selClass}
              onChange={(e) => setSelClass(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8"
            >
              <option value="">— Select Class —</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.grade || c.name}
                  {c.section ? ` ${c.section}` : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Max Marks (all subjects)
          </label>
          <input
            type="number"
            min={1}
            value={maxMarks}
            onChange={(e) => setMaxMarks(Number(e.target.value) || 1)}
            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Subject progress */}
      {selExam && selClass && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                Subject progress
                {classLabel ? ` — ${classLabel}` : ""}
                {currentExam ? ` · ${currentExam.name}` : ""}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Done = every student has a mark for that subject.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs font-semibold">
              <span className="text-emerald-600 dark:text-emerald-400">
                Done: {doneCount}
              </span>
              <span className="text-amber-600 dark:text-amber-400">
                Partial: {partialCount}
              </span>
              <span className="text-slate-500">Remaining: {remainingCount}</span>
              <span className="text-slate-700 dark:text-slate-200">
                {doneCount}/{classSubjects.length} subjects ({progressPct}%)
              </span>
            </div>
          </div>

          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {classSubjects.length === 0 ? (
            <p className="text-sm text-slate-400">
              No subjects assigned to this class. Allocate subjects first.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {subjectProgress.map(({ subject, entered, total, complete, partial }) => (
                <div
                  key={subject._id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                    complete
                      ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20"
                      : partial
                        ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
                        : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-700/40"
                  }`}
                >
                  {complete ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : partial ? (
                    <CircleDot className="w-4 h-4 text-amber-600 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-800 dark:text-white truncate">
                      {subject.name}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {entered}/{total} students
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Matrix */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {students.length > 0 && classSubjects.length > 0 && (
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
              />
            </div>
            <span className="text-xs text-slate-500">
              {filteredStudents.length} students · {classSubjects.length} subjects
              {dirtySubjectCount > 0
                ? ` · ${dirtySubjectCount} subject(s) with unsaved edits`
                : ""}
            </span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
          </div>
        ) : !selExam || !selClass ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 text-sm gap-2">
            <AlertCircle className="w-10 h-10 opacity-30" />
            Select an Exam and Class to enter multi-subject marks.
          </div>
        ) : classSubjects.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            This class has no subjects assigned.
          </div>
        ) : students.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            No students in this class.
          </div>
        ) : (
          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 dark:bg-slate-700/90 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wide text-left">
                  <th className="px-3 py-3 sticky left-0 z-20 bg-slate-50 dark:bg-slate-700 min-w-[72px]">
                    Roll
                  </th>
                  <th className="px-3 py-3 sticky left-[72px] z-20 bg-slate-50 dark:bg-slate-700 min-w-[160px]">
                    Student
                  </th>
                  {classSubjects.map((sub) => (
                    <th key={sub._id} className="px-2 py-3 text-center min-w-[88px] whitespace-nowrap">
                      {sub.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredStudents.map((s, idx) => {
                  const sid = s._id || s.id || "";
                  const roll =
                    s.rollNo || s.profile?.rollNo || `S${String(idx + 1).padStart(4, "0")}`;
                  return (
                    <tr
                      key={sid}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30"
                    >
                      <td className="px-3 py-2 font-mono text-xs text-slate-500 sticky left-0 bg-white dark:bg-slate-800">
                        {roll}
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-800 dark:text-white sticky left-[72px] bg-white dark:bg-slate-800 whitespace-nowrap">
                        {s.firstName} {s.lastName}
                      </td>
                      {classSubjects.map((sub) => {
                        const val = scores[sid]?.[sub._id] ?? "";
                        const isDirty = dirty[sid]?.has(sub._id);
                        return (
                          <td key={sub._id} className="px-1.5 py-1.5 text-center">
                            <input
                              type="number"
                              min={0}
                              max={maxMarks}
                              value={val}
                              onChange={(e) =>
                                handleChange(sid, sub._id, e.target.value)
                              }
                              placeholder="—"
                              className={`w-[72px] px-1.5 py-1.5 border rounded-md text-sm text-center outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white ${
                                isDirty
                                  ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                                  : "border-slate-200 dark:border-slate-600"
                              }`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {students.length > 0 && classSubjects.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-400">
          <span>
            Unsaved edits: <strong className="text-slate-800 dark:text-white">{dirtyCellCount}</strong>
          </span>
          <button
            onClick={handleSaveAll}
            disabled={saving || dirtyCellCount === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save All Subjects
          </button>
        </div>
      )}
    </div>
  );
}

function canShowSave(exam: string, cls: string, subjectCount: number) {
  return Boolean(exam && cls && subjectCount > 0);
}
