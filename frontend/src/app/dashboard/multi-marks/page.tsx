"use client";

import { useEffect, useMemo, useState } from "react";
import api from "../../utils/api";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Save,
  Sparkles,
  RefreshCw,
  Eraser,
  Circle,
  CircleDot,
} from "lucide-react";

type Exam = { _id: string; name: string; term: string; isApproved?: boolean; startDate?: string };
type Subject = { _id: string; id?: string; name: string; code?: string };
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

type HistoricalMark = {
  studentId?: string;
  subjectId?: string;
  marksObtained: number;
  maxMarks: number;
  student?: { id?: string; _id?: string };
  subject?: { id?: string; _id?: string };
  exam?: { id?: string; _id?: string; startDate?: string };
};

const getStudentId = (student: Student) => student._id || student.id || "";

const compareStudentsByName = (a: Student, b: Student) => {
  const nameComparison = `${a.firstName} ${a.lastName}`.localeCompare(
    `${b.firstName} ${b.lastName}`,
    undefined,
    { sensitivity: "base" }
  );

  // Keep students with the same name in a deterministic order as well.
  return nameComparison || getStudentId(a).localeCompare(getStudentId(b));
};

export default function MultiMarksPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<AClass[]>([]);
  const [selExam, setSelExam] = useState("");
  const [selClass, setSelClass] = useState("");
  const [maxMarks, setMaxMarks] = useState(20);
  const [appliedMaxMarks, setAppliedMaxMarks] = useState(20);
  const [students, setStudents] = useState<Student[]>([]);
  const [scores, setScores] = useState<ScoreGrid>({});
  const [historicalMarks, setHistoricalMarks] = useState<HistoricalMark[]>([]);
  const [autoFilledCells, setAutoFilledCells] = useState<Set<string>>(new Set());
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
      const subjectId = sub?._id || sub?.id;
      if (!subjectId || seen.has(subjectId)) continue;
      seen.add(subjectId);
      list.push({ ...sub, _id: subjectId });
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
      setHistoricalMarks([]);
      setAutoFilledCells(new Set());
      setDirty({});
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const [stuRes, mrkRes, historyRes] = await Promise.all([
          api.get(`/students?class=${selClass}`),
          api.get("/exams/marks", { params: { examId: selExam, classId: selClass } }),
          api.get("/exams/marks", { params: { classId: selClass } }),
        ]);
        const stus: Student[] = stuRes.data.data || [];
        const existing: any[] = mrkRes.data.data || [];
        const history: HistoricalMark[] = historyRes.data.data || [];

        // Prefer the Max Marks already used in this exam/class. If this is a new
        // exam, carry forward the most commonly used Max Marks from prior records.
        const maxMarkCandidates = (existing.length ? existing : history)
          .map((mark) => Number(mark.maxMarks))
          .filter((value) => Number.isFinite(value) && value > 0);
        const inferredMaxMarks = maxMarkCandidates.length
          ? Number(Object.entries(
              maxMarkCandidates.reduce<Record<string, number>>((counts, value) => {
                counts[String(value)] = (counts[String(value)] || 0) + 1;
                return counts;
              }, {})
            ).sort((a, b) => b[1] - a[1])[0][0])
          : maxMarks;
        setMaxMarks(inferredMaxMarks);
        setAppliedMaxMarks(inferredMaxMarks);

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
        setHistoricalMarks(history);
        setDirty({});
        setAutoFilledCells(new Set());
        // As soon as both filters are selected, bring forward previous performance
        // into every blank cell. Existing marks for the selected exam stay untouched.
        handleAutoFillMissing(false, {
          studentList: stus,
          baseScores: grid,
          history,
          targetMaxMarks: inferredMaxMarks,
        });
      } catch (e) {
        console.error(e);
        showToast("Failed to load students/marks", false);
      } finally {
        setLoading(false);
      }
    })();
  // This loader intentionally runs only when the two filters change; including the
  // auto-fill callback would re-fetch after it updates the score grid.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selExam, selClass]);

  const orderedStudents = useMemo(
    () => [...students].sort(compareStudentsByName),
    [students]
  );

  const fallbackRolls = useMemo(() => {
    const rolls = new Map<string, string>();
    orderedStudents.forEach((student, index) => {
      rolls.set(getStudentId(student), `S${String(index + 1).padStart(4, "0")}`);
    });
    return rolls;
  }, [orderedStudents]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orderedStudents.filter((s) => {
        if (!q) return true;
        const name = `${s.firstName} ${s.lastName}`.toLowerCase();
        const roll = (
          s.rollNo ||
          s.profile?.rollNo ||
          fallbackRolls.get(getStudentId(s)) ||
          ""
        ).toLowerCase();
        return name.includes(q) || roll.includes(q);
      });
  }, [orderedStudents, fallbackRolls, search]);

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
    // Once edited by hand, this cell is no longer managed by Auto-fill.
    setAutoFilledCells((prev) => {
      const next = new Set(prev);
      next.delete(`${studentId}:${subjectId}`);
      return next;
    });
  };

  const handleAutoFillMissing = (
    askForConfirmation = true,
    source?: {
      studentList: Student[];
      baseScores: ScoreGrid;
      history: HistoricalMark[];
      targetMaxMarks?: number;
    },
    updateExistingAutoFill = false
  ) => {
    const studentList = source?.studentList || students;
    const baseScores = source?.baseScores || scores;
    const history = source?.history || historicalMarks;
    const effectiveMaxMarks = source?.targetMaxMarks || maxMarks;
    if (!selExam || !selClass || !studentList.length || !classSubjects.length) return;

    const selectedExam = exams.find((exam) => exam._id === selExam);
    const selectedDate = selectedExam?.startDate
      ? new Date(selectedExam.startDate).getTime()
      : Number.POSITIVE_INFINITY;
    const usableHistory = history.filter((mark) => {
      const examId = mark.exam?.id || mark.exam?._id;
      if (!mark.maxMarks) return false;
      // Existing marks in the selected exam are useful evidence for estimating
      // that same student's other, still-empty subjects.
      if (examId === selExam) return true;
      const examDate = mark.exam?.startDate ? new Date(mark.exam.startDate).getTime() : 0;
      return examDate < selectedDate;
    });

    const byStudentSubject = new Map<string, number[]>();
    const byStudent = new Map<string, number[]>();
    const bySubject = new Map<string, number[]>();
    const classPercentages: number[] = [];
    for (const mark of usableHistory) {
      const studentId = mark.student?.id || mark.student?._id || mark.studentId;
      const subjectId = mark.subject?.id || mark.subject?._id || mark.subjectId;
      if (!studentId || !subjectId) continue;
      const percentage = (Number(mark.marksObtained) / Number(mark.maxMarks)) * 100;
      if (!Number.isFinite(percentage)) continue;
      const pairKey = `${studentId}:${subjectId}`;
      byStudentSubject.set(pairKey, [...(byStudentSubject.get(pairKey) || []), percentage]);
      byStudent.set(studentId, [...(byStudent.get(studentId) || []), percentage]);
      bySubject.set(subjectId, [...(bySubject.get(subjectId) || []), percentage]);
      classPercentages.push(percentage);
    }

    const average = (values?: number[]) => values?.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null;
    const nextScores: ScoreGrid = { ...baseScores };
    const nextDirty: Record<string, Set<string>> = source ? {} : { ...dirty };
    const nextAutoFilledCells = source ? new Set<string>() : new Set(autoFilledCells);
    const classAverage = average(classPercentages) ?? 50;
    let filled = 0;

    for (const student of studentList) {
      const studentId = student._id || student.id || "";
      nextScores[studentId] = { ...(baseScores[studentId] || {}) };
      const studentDirty = new Set(nextDirty[studentId] || []);
      for (const subject of classSubjects) {
        const current = nextScores[studentId][subject._id];
        const cellKey = `${studentId}:${subject._id}`;
        const isExistingAutoFill = nextAutoFilledCells.has(cellKey);
        if (
          current !== undefined &&
          current !== "" &&
          String(current).toUpperCase() !== "M" &&
          !(updateExistingAutoFill && isExistingAutoFill)
        ) continue;
        const predictedPercentage =
          average(byStudentSubject.get(`${studentId}:${subject._id}`)) ??
          average(byStudent.get(studentId)) ??
          average(bySubject.get(subject._id)) ??
          classAverage;
        const predictedMark = Math.min(effectiveMaxMarks, Math.max(0, (predictedPercentage / 100) * effectiveMaxMarks));
        // Marks entered into the grid must be whole numbers (for example 15.3 → 15).
        nextScores[studentId][subject._id] = String(Math.round(predictedMark));
        studentDirty.add(subject._id);
        nextAutoFilledCells.add(cellKey);
        filled += 1;
      }
      if (studentDirty.size) nextDirty[studentId] = studentDirty;
    }

    if (!filled) {
      showToast("There are no missing marks to fill", false);
      return;
    }
    if (askForConfirmation && !window.confirm(`Fill ${filled} missing mark(s) from previous exam performance? Existing marks will not be changed.`)) return;
    setScores(nextScores);
    setDirty(nextDirty);
    setAutoFilledCells(nextAutoFilledCells);
    showToast(`${updateExistingAutoFill ? "Updated" : askForConfirmation ? "Auto-filled" : "Loaded"} ${filled} marks from previous exam performance. Review them, then click Save All.`);
  };

  const handleUpdateMaxMarks = () => {
    const nextMax = Math.max(1, Math.round(Number(maxMarks)));
    const previousMax = Math.max(1, Number(appliedMaxMarks));
    if (nextMax === previousMax) {
      showToast("Change Max Marks first, then click Update Max Marks", false);
      return;
    }
    if (!window.confirm(
      `Convert all displayed marks from a maximum of ${previousMax} to ${nextMax}? Existing score percentages will be preserved.`
    )) return;

    const nextScores: ScoreGrid = {};
    const nextDirty: Record<string, Set<string>> = {};
    let updated = 0;
    for (const student of students) {
      const studentId = student._id || student.id || "";
      nextScores[studentId] = { ...(scores[studentId] || {}) };
      const changedSubjects = new Set<string>();
      for (const subject of classSubjects) {
        const raw = scores[studentId]?.[subject._id];
        if (raw === undefined || raw === "" || String(raw).toUpperCase() === "M") continue;
        const oldScore = Number(raw);
        if (!Number.isFinite(oldScore)) continue;
        nextScores[studentId][subject._id] = String(
          Math.min(nextMax, Math.max(0, Math.round((oldScore / previousMax) * nextMax)))
        );
        changedSubjects.add(subject._id);
        updated += 1;
      }
      if (changedSubjects.size) nextDirty[studentId] = changedSubjects;
    }

    setMaxMarks(nextMax);
    setAppliedMaxMarks(nextMax);
    setScores(nextScores);
    setDirty(nextDirty);
    showToast(`Updated ${updated} marks to Max Marks ${nextMax}. Click Save All to save.`);
  };

  const handleRemoveDecimals = () => {
    const nextScores: ScoreGrid = {};
    const nextDirty: Record<string, Set<string>> = { ...dirty };
    let updated = 0;

    for (const student of students) {
      const studentId = student._id || student.id || "";
      nextScores[studentId] = { ...(scores[studentId] || {}) };
      const changedSubjects = new Set(nextDirty[studentId] || []);
      for (const subject of classSubjects) {
        const raw = scores[studentId]?.[subject._id];
        if (raw === undefined || raw === "" || String(raw).toUpperCase() === "M") continue;
        const score = Number(raw);
        if (!Number.isFinite(score) || Number.isInteger(score)) continue;
        nextScores[studentId][subject._id] = String(Math.round(score));
        changedSubjects.add(subject._id);
        updated += 1;
      }
      if (changedSubjects.size) nextDirty[studentId] = changedSubjects;
    }

    if (!updated) {
      showToast("All displayed marks are already whole numbers", false);
      return;
    }
    if (!window.confirm(`Remove decimals from ${updated} mark(s) and convert them to whole numbers?`)) return;
    setScores(nextScores);
    setDirty(nextDirty);
    showToast(`Removed decimals from ${updated} marks. Click Save All to save.`);
  };

  const handleSaveAll = async () => {
    if (!selExam || !selClass) return;
    if (!dirtyCellCount) {
      showToast("No changes to save", false);
      return;
    }

    // Build per-subject batches from dirty cells (and include empty? only dirty non-empty or allow clear?)
    // Save dirty cells that have a numeric score; skip blank dirty cells.
    const normalizedMaxMarks = Math.max(1, Math.round(Number(maxMarks)));
    const bySubject = new Map<string, { studentId: string; score: number }[]>();

    for (const [studentId, subSet] of Object.entries(dirty)) {
      for (const subjectId of subSet) {
        const raw = scores[studentId]?.[subjectId];
        if (raw === undefined || raw === "" || String(raw).trim().toUpperCase() === "M") continue;
        const numericScore = Number(raw);
        const score = Math.round(numericScore);
        if (!Number.isFinite(numericScore) || score < 0 || score > normalizedMaxMarks) {
          const stu = students.find((s) => (s._id || s.id) === studentId);
          const sub = classSubjects.find((s) => s._id === subjectId);
          showToast(
            `Invalid score for ${stu ? `${stu.firstName} ${stu.lastName}` : "student"} / ${sub?.name || "subject"} (0–${normalizedMaxMarks})`,
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
          maxMarks: normalizedMaxMarks,
          marks: marks.map((mark) => ({
            studentId: mark.studentId,
            score: Math.min(normalizedMaxMarks, Math.max(0, Math.round(mark.score))),
            maxMarks: normalizedMaxMarks,
          })),
        });
        saved += marks.length;
      }
      setDirty({});
      showToast(`Saved ${saved} marks across ${bySubject.size} subject(s)`);
    } catch (err: any) {
      const response = err.response?.data;
      const firstError = response?.errors?.[0];
      const detail = firstError
        ? `${firstError.field}: ${firstError.message}`
        : undefined;
      console.error("Save marks failed:", response || err);
      showToast(detail || response?.message || "Failed to save marks", false);
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
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleRemoveDecimals}
              disabled={saving || loading || !students.length}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
              title="Convert decimal marks to whole numbers"
            >
              <Eraser className="w-4 h-4" />
              Remove Decimals
            </button>
            <button
              onClick={() => handleAutoFillMissing()}
              disabled={saving || loading || !students.length}
              className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              Auto-fill Missing
            </button>
            <button
              onClick={() => handleAutoFillMissing(false, undefined, true)}
              disabled={saving || loading || autoFilledCells.size === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
              title="Recalculate only marks created by Auto-fill"
            >
              <Sparkles className="w-4 h-4" />
              Update Auto-fill ({autoFilledCells.size})
            </button>
            <button
              onClick={handleSaveAll}
              disabled={saving || dirtyCellCount === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save All{dirtyCellCount ? ` (${dirtyCellCount})` : ""}
            </button>
          </div>
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
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              step={1}
              value={maxMarks}
              onChange={(e) => setMaxMarks(Number(e.target.value) || 1)}
              className="min-w-0 flex-1 px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleUpdateMaxMarks}
              disabled={!selExam || !selClass || loading || Number(maxMarks) === Number(appliedMaxMarks)}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition disabled:opacity-40 whitespace-nowrap"
              title="Convert displayed scores to the new Max Marks"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Update Max
            </button>
          </div>
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
                {filteredStudents.map((s) => {
                  const sid = getStudentId(s);
                  const roll =
                    s.rollNo || s.profile?.rollNo || fallbackRolls.get(sid);
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
