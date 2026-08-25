"use client";

import { useEffect, useMemo, useState } from "react";
import api from "../../utils/api";
import { DEFAULT_GRADES, gradeForPercentage, normalizeGradeConfigs, type GradeConfig } from "../../utils/grading";
import * as XLSX from "xlsx";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Download,
  Save,
  Loader2,
  Layers,
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
type MarkRow = {
  studentId: string;
  examId: string;
  subjectId: string;
  obtained: number;
  max: number;
};

function gradeColor(grade?: string) {
  if (grade === "F") return "text-red-500";
  if (grade?.startsWith("A")) return "text-emerald-600 dark:text-emerald-400";
  if (grade?.startsWith("B")) return "text-blue-600 dark:text-blue-400";
  return "text-slate-700 dark:text-slate-300";
}

export default function CombinedResultsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<AClass[]>([]);
  const [selClass, setSelClass] = useState("");
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<MarkRow[]>([]);
  const [gradeConfigs, setGradeConfigs] = useState<GradeConfig[]>(DEFAULT_GRADES);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    (async () => {
      try {
        const [eRes, cRes, gradeRes] = await Promise.all([
          api.get("/exams"),
          api.get("/classes"),
          api.get("/grades/active").catch(() => null),
        ]);
        setExams(eRes.data.data || []);
        setClasses(cRes.data.data || []);
        setGradeConfigs(normalizeGradeConfigs(gradeRes?.data?.data?.grades));
      } catch (e) {
        console.error(e);
        showToast("Failed to load data", false);
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

  const selectedExams = useMemo(
    () => exams.filter((e) => selectedExamIds.includes(e._id)),
    [exams, selectedExamIds]
  );

  useEffect(() => {
    if (!selClass || selectedExamIds.length === 0) {
      setStudents([]);
      setMarks([]);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const [stuRes, ...markResponses] = await Promise.all([
          api.get(`/students?class=${selClass}`),
          ...selectedExamIds.map((examId) =>
            api.get("/exams/marks", { params: { examId, classId: selClass } })
          ),
        ]);
        setStudents(stuRes.data.data || []);
        const flat: MarkRow[] = [];
        markResponses.forEach((res, idx) => {
          const examId = selectedExamIds[idx];
          (res.data.data || []).forEach((m: any) => {
            const studentId = m.student?._id || m.student?.id || m.studentId;
            const subjectId = m.subject?._id || m.subject?.id || m.subjectId;
            if (!studentId || !subjectId) return;
            flat.push({
              studentId,
              examId,
              subjectId,
              obtained: Number(m.marksObtained) || 0,
              max: Number(m.maxMarks) || 0,
            });
          });
        });
        setMarks(flat);
      } catch (e) {
        console.error(e);
        showToast("Failed to load combined marks", false);
      } finally {
        setLoading(false);
      }
    })();
  }, [selClass, selectedExamIds]);

  const toggleExam = (examId: string) => {
    setSelectedExamIds((prev) =>
      prev.includes(examId) ? prev.filter((id) => id !== examId) : [...prev, examId]
    );
  };

  const selectAllExams = () => setSelectedExamIds(exams.map((e) => e._id));
  const clearExams = () => setSelectedExamIds([]);

  /** Combined rows ranked by total % */
  const rankedRows = useMemo(() => {
    const rows = students.map((stu) => {
      const sid = stu._id || stu.id || "";
      const bySubject: Record<
        string,
        {
          obtained: number;
          max: number;
          perExam: Record<string, { obtained: number; max: number }>;
        }
      > = {};

      classSubjects.forEach((sub) => {
        bySubject[sub._id] = { obtained: 0, max: 0, perExam: {} };
      });

      marks
        .filter((m) => m.studentId === sid)
        .forEach((m) => {
          // Do not include old/unallocated subject marks in hidden totals. They
          // have no visible subject column and previously caused totals/maxima
          // such as 830 or 840 for a class with eight 100-mark subjects.
          if (!bySubject[m.subjectId]) return;
          bySubject[m.subjectId].obtained += m.obtained;
          bySubject[m.subjectId].max += m.max;
          bySubject[m.subjectId].perExam[m.examId] = {
            obtained: m.obtained,
            max: m.max,
          };
        });

      let totalObtained = 0;
      let totalMax = 0;
      Object.values(bySubject).forEach((s) => {
        totalObtained += s.obtained;
        totalMax += s.max;
      });
      const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
      const gc = gradeForPercentage(percentage, gradeConfigs);

      return {
        studentId: sid,
        firstName: stu.firstName,
        lastName: stu.lastName,
        rollNo: stu.rollNo || stu.profile?.rollNo || "",
        bySubject,
        totalObtained,
        totalMax,
        percentage,
        grade: gc?.grade,
        gpa: gc?.gpa,
      };
    });

    rows.sort((a, b) => b.percentage - a.percentage || b.totalObtained - a.totalObtained);
    return rows.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [students, marks, classSubjects, gradeConfigs]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rankedRows;
    const q = search.trim().toLowerCase();
    return rankedRows.filter(
      (r) =>
        `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
        r.rollNo.toLowerCase().includes(q)
    );
  }, [rankedRows, search]);

  const classLabel = useMemo(() => {
    const c = classes.find((x) => x._id === selClass);
    if (!c) return "";
    return `${c.grade || c.name}${c.section ? ` ${c.section}` : ""}`;
  }, [classes, selClass]);

  const exportExcel = () => {
    if (!filteredRows.length) {
      showToast("Nothing to export", false);
      return;
    }
    const header: Record<string, string | number> = {
      Rank: "",
      "Roll No": "",
      Student: "",
    };
    if (showBreakdown) {
      selectedExams.forEach((ex) => {
        classSubjects.forEach((sub) => {
          header[`${sub.name} (${ex.name})`] = "";
        });
      });
    }
    classSubjects.forEach((sub) => {
      header[`${sub.name} Total`] = "";
    });
    header["Grand Total"] = "";
    header.Max = "";
    header["%"] = "";
    header.Grade = "";

    const sheetRows = filteredRows.map((r) => {
      const row: Record<string, string | number> = {
        Rank: r.rank,
        "Roll No": r.rollNo,
        Student: `${r.firstName} ${r.lastName}`,
      };
      if (showBreakdown) {
        selectedExams.forEach((ex) => {
          classSubjects.forEach((sub) => {
            const cell = r.bySubject[sub._id]?.perExam[ex._id];
            row[`${sub.name} (${ex.name})`] = cell ? cell.obtained : "";
          });
        });
      }
      classSubjects.forEach((sub) => {
        const s = r.bySubject[sub._id];
        row[`${sub.name} Total`] = s?.max ? s.obtained : "";
      });
      row["Grand Total"] = r.totalObtained;
      row.Max = r.totalMax;
      row["%"] = Number(r.percentage.toFixed(1));
      row.Grade = r.grade || "";
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(sheetRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Combined Results");
    const examNames = selectedExams.map((e) => e.name).join("+").slice(0, 40);
    XLSX.writeFile(
      wb,
      `Natiijada_Guud_${classLabel}_${examNames || "exams"}.xlsx`.replace(
        /[/\\?%*:|"<>]/g,
        "-"
      )
    );
    showToast("Excel downloaded");
  };

  const saveCombinedResult = async () => {
    if (!selClass || !selectedExamIds.length || !rankedRows.length) return;
    setSaving(true);
    try {
      await api.post('/exams/combined-results', { classId: selClass, examIds: selectedExamIds });
      showToast('Combined result saved and published to students');
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to save combined result', false);
    } finally {
      setSaving(false);
    }
  };

  const ready = selClass && selectedExamIds.length > 0;

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
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-500" />
            Combined Results (Natiijada Guud)
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Isku dar imtixaanno badan — maado kasta dhibcaheeda waa la isku kaynsadaa, sida school-ku u shaqeeyo.
          </p>
        </div>
        {ready && filteredRows.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={saveCombinedResult}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-lg text-sm font-semibold transition"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save &amp; publish
            </button>
            <button
              onClick={exportExcel}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition"
            >
              <Download className="w-4 h-4" /> Export Excel
            </button>
          </div>
        )}
      </div>

      {/* Class */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
          Class
        </label>
        <div className="relative max-w-md">
          <select
            value={selClass}
            onChange={(e) => setSelClass(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 appearance-none pr-8"
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

      {/* Exam multi-select */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">
              Select exams to combine
            </h2>
            <p className="text-xs text-slate-500">
              Tusaale: Monthly 1 + Monthly 2 + Mid-term → natiijo guud
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAllExams}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={clearExams}
              className="text-xs font-semibold text-slate-500 hover:underline"
            >
              Clear
            </button>
          </div>
        </div>
        {exams.length === 0 ? (
          <p className="text-sm text-slate-400">No exams found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {exams.map((ex) => {
              const on = selectedExamIds.includes(ex._id);
              return (
                <label
                  key={ex._id}
                  className={`flex items-start gap-3 px-3 py-3 rounded-lg border cursor-pointer transition ${
                    on
                      ? "border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-900/20"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleExam(ex._id)}
                    className="mt-1 rounded border-slate-300"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-800 dark:text-white truncate">
                      {ex.name}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      {(ex.term || "").replace(/_/g, " ")}
                      {ex.isApproved ? " · Published" : " · Draft"}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        )}
        {selectedExamIds.length > 0 && (
          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
            Combining {selectedExamIds.length} exam(s):{" "}
            {selectedExams.map((e) => e.name).join(" + ")}
          </p>
        )}
      </div>

      {/* Results */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {ready && (
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student..."
              className="px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white max-w-xs w-full"
            />
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showBreakdown}
                onChange={(e) => setShowBreakdown(e.target.checked)}
                className="rounded"
              />
              Show each exam column
            </label>
            <span className="text-xs text-slate-500 ml-auto">
              {classLabel} · {filteredRows.length} students · {classSubjects.length}{" "}
              subjects
            </span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading combined marks...
          </div>
        ) : !ready ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 text-sm gap-2">
            <AlertCircle className="w-10 h-10 opacity-30" />
            Dooro fasalka iyo ugu yaraan 2 imtixaan (ama 1+) si loo sameeyo natiijada guud.
          </div>
        ) : classSubjects.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            Fasalkan maadooyin lama qoondein.
          </div>
        ) : students.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm">No students in this class.</div>
        ) : (
          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 dark:bg-slate-700/90 border-b border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wide text-left">
                  <th className="px-2 py-3 sticky left-0 z-20 bg-slate-50 dark:bg-slate-700 min-w-[44px]">
                    #
                  </th>
                  <th className="px-2 py-3 sticky left-[44px] z-20 bg-slate-50 dark:bg-slate-700 min-w-[140px]">
                    Student
                  </th>
                  {showBreakdown &&
                    selectedExams.map((ex) =>
                      classSubjects.map((sub) => (
                        <th
                          key={`${ex._id}-${sub._id}`}
                          className="px-1.5 py-3 text-center min-w-[70px] whitespace-nowrap font-normal normal-case"
                          title={`${sub.name} — ${ex.name}`}
                        >
                          <div className="leading-tight">
                            <div className="truncate max-w-[72px]">{sub.name}</div>
                            <div className="text-[9px] text-slate-400 truncate max-w-[72px]">
                              {ex.name}
                            </div>
                          </div>
                        </th>
                      ))
                    )}
                  {classSubjects.map((sub) => (
                    <th
                      key={sub._id}
                      className="px-2 py-3 text-center min-w-[72px] whitespace-nowrap bg-indigo-50/80 dark:bg-indigo-900/30"
                    >
                      {sub.name}
                    </th>
                  ))}
                  <th className="px-2 py-3 text-center min-w-[64px] bg-slate-100 dark:bg-slate-600">
                    Total
                  </th>
                  <th className="px-2 py-3 text-center min-w-[52px]">Max</th>
                  <th className="px-2 py-3 text-center min-w-[52px]">%</th>
                  <th className="px-2 py-3 text-center min-w-[52px]">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredRows.map((r) => (
                  <tr
                    key={r.studentId}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30"
                  >
                    <td className="px-2 py-2 font-mono text-xs text-slate-500 sticky left-0 bg-white dark:bg-slate-800">
                      {r.rank}
                    </td>
                    <td className="px-2 py-2 font-medium text-slate-800 dark:text-white sticky left-[44px] bg-white dark:bg-slate-800 whitespace-nowrap">
                      <div>{r.firstName} {r.lastName}</div>
                      {r.rollNo && (
                        <div className="text-[10px] text-slate-400 font-mono">{r.rollNo}</div>
                      )}
                    </td>
                    {showBreakdown &&
                      selectedExams.map((ex) =>
                        classSubjects.map((sub) => {
                          const cell = r.bySubject[sub._id]?.perExam[ex._id];
                          return (
                            <td
                              key={`${ex._id}-${sub._id}`}
                              className="px-1 py-1.5 text-center text-slate-600 dark:text-slate-300 tabular-nums"
                            >
                              {cell ? cell.obtained : "—"}
                            </td>
                          );
                        })
                      )}
                    {classSubjects.map((sub) => {
                      const s = r.bySubject[sub._id];
                      return (
                        <td
                          key={sub._id}
                          className="px-2 py-2 text-center font-semibold tabular-nums bg-indigo-50/40 dark:bg-indigo-900/10 text-slate-800 dark:text-white"
                        >
                          {s?.max ? s.obtained : "—"}
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 text-center font-bold tabular-nums bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white">
                      {r.totalObtained}
                    </td>
                    <td className="px-2 py-2 text-center text-slate-500 tabular-nums">
                      {r.totalMax}
                    </td>
                    <td className="px-2 py-2 text-center font-semibold tabular-nums">
                      {r.totalMax ? `${r.percentage.toFixed(0)}%` : "—"}
                    </td>
                    <td
                      className={`px-2 py-2 text-center font-bold ${gradeColor(r.grade)}`}
                    >
                      {r.grade || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {ready && filteredRows.length > 0 && (
        <p className="text-xs text-slate-500 px-1">
          Maado kasta = wadarta dhibcaha imtixaannada la doortay. Grand Total = dhammaan
          maadooyinka. Ranking wuxuu ku salaysan yahay boqolleyda (%).
        </p>
      )}
    </div>
  );
}
