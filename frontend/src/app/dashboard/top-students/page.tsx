"use client";

import { useEffect, useMemo, useState } from "react";
import { Award, CheckCircle2, Crown, Loader2, Trophy, Users } from "lucide-react";
import api from "../../utils/api";
import { DEFAULT_GRADES, gradeForPercentage, normalizeGradeConfigs, type GradeConfig } from "../../utils/grading";

type Exam = { _id: string; name: string; term?: string; isApproved?: boolean };
type RankingRow = {
  studentId: string;
  firstName: string;
  lastName: string;
  rollNo: string;
  classId: string;
  className: string;
  totalObtained: number;
  totalMax: number;
  subjectCount: number;
  percentage: number;
  rank: number;
  classRank?: number;
};

const formatScore = (value: number) => Number.isInteger(value) ? value : Number(value.toFixed(1));

export default function TopStudentsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
  const [classLeaders, setClassLeaders] = useState<RankingRow[]>([]);
  const [overall, setOverall] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [gradeConfigs, setGradeConfigs] = useState<GradeConfig[]>(DEFAULT_GRADES);
  const gradeFor = (percentage: number) => gradeForPercentage(percentage, gradeConfigs)?.grade || "—";

  useEffect(() => {
    Promise.all([
      api.get("/exams"),
      api.get("/grades/active").catch(() => null),
    ])
      .then(([examRes, gradeRes]) => {
        setExams(examRes.data.data || []);
        setGradeConfigs(normalizeGradeConfigs(gradeRes?.data?.data?.grades));
      })
      .catch(() => setError("Imtixaannada lama soo qaadi karin."));
  }, []);

  useEffect(() => {
    if (!selectedExamIds.length) {
      setClassLeaders([]);
      setOverall([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    api.get("/exams/combined-rankings", { params: { examIds: selectedExamIds.join(",") } })
      .then((res) => {
        if (cancelled) return;
        setClassLeaders(res.data.data?.classLeaders || []);
        setOverall(res.data.data?.overall || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || "Ranking-ka lama soo qaadi karin.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedExamIds]);

  const filteredOverall = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return overall;
    return overall.filter((row) =>
      `${row.firstName} ${row.lastName} ${row.className} ${row.rollNo}`.toLowerCase().includes(q)
    );
  }, [overall, search]);

  const leadersByClass = useMemo(() => {
    const groups = new Map<string, { className: string; students: RankingRow[] }>();
    classLeaders.forEach((row) => {
      if (!groups.has(row.classId)) groups.set(row.classId, { className: row.className, students: [] });
      groups.get(row.classId)!.students.push(row);
    });
    return [...groups.values()];
  }, [classLeaders]);

  const toggleExam = (id: string) => setSelectedExamIds((current) =>
    current.includes(id) ? current.filter((examId) => examId !== id) : [...current, id]
  );
  const champion = overall[0];

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
          <Trophy className="h-7 w-7 text-amber-500" /> Top Students
        </h1>
        <p className="mt-1 text-sm text-slate-500">Ardayga ugu sarreeya fasal kasta iyo ranking-ga guud ee dugsiga.</p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-bold text-slate-800 dark:text-white">Dooro imtixaannada la isku darayo</h2>
            <p className="text-xs text-slate-500">Percentage-ku wuxuu ku salaysan yahay wadarta imtixaannada la doortay.</p>
          </div>
          <div className="flex gap-3 text-xs font-bold">
            <button onClick={() => setSelectedExamIds(exams.map((exam) => exam._id))} className="text-indigo-600">Select all</button>
            <button onClick={() => setSelectedExamIds([])} className="text-slate-500">Clear</button>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => {
            const selected = selectedExamIds.includes(exam._id);
            return (
              <label key={exam._id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${selected ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30" : "border-slate-200 dark:border-slate-700"}`}>
                <input type="checkbox" checked={selected} onChange={() => toggleExam(exam._id)} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-800 dark:text-white">{exam.name}</span>
                  <span className="text-[11px] text-slate-500">{(exam.term || "").replaceAll("_", " ")}{exam.isApproved ? " · Published" : " · Draft"}</span>
                </span>
              </label>
            );
          })}
        </div>
      </section>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600 dark:bg-red-950/30">{error}</div>}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-500"><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Ranking-ka waa la xisaabinayaa...</div>
      ) : !selectedExamIds.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 py-20 text-center text-sm text-slate-500 dark:border-slate-700">Dooro ugu yaraan hal imtixaan.</div>
      ) : !overall.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 py-20 text-center text-sm text-slate-500 dark:border-slate-700">Dhibco lagama helin imtixaannada la doortay.</div>
      ) : (
        <>
          {champion && (
            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 p-6 text-white shadow-lg">
              <Crown className="absolute -right-4 -top-5 h-32 w-32 rotate-12 opacity-20" />
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-950/70">Ardayga #1 Dugsiga</p>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black">{champion.firstName} {champion.lastName}</h2>
                  <p className="mt-1 font-semibold text-amber-950/80">{champion.className}{champion.rollNo ? ` · ${champion.rollNo}` : ""}</p>
                </div>
                <div className="text-right"><div className="text-4xl font-black">{champion.percentage.toFixed(1)}%</div><div className="font-bold">{formatScore(champion.totalObtained)} / {formatScore(champion.totalMax)} · {gradeFor(champion.percentage)}</div></div>
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white"><Award className="h-5 w-5 text-indigo-500" /> 3-da arday ee ugu sarreysa fasal kasta</h2>
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {leadersByClass.map((group) => (
                <div key={group.students[0].classId} className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex items-center gap-2 bg-indigo-50 px-4 py-3 dark:bg-indigo-950/30">
                    <Trophy className="h-5 w-5 text-indigo-500" />
                    <h3 className="font-black text-indigo-700 dark:text-indigo-300">{group.className}</h3>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {group.students.map((row) => (
                      <div key={row.studentId} className="flex items-center gap-3 p-4">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-black ${row.classRank === 1 ? "bg-amber-100 text-amber-600" : row.classRank === 2 ? "bg-slate-200 text-slate-600" : "bg-orange-100 text-orange-700"}`}>
                          {row.classRank}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-slate-900 dark:text-white">{row.firstName} {row.lastName}</p>
                          <p className="text-[11px] text-slate-500">{row.rollNo || `${formatScore(row.totalObtained)} / ${formatScore(row.totalMax)}`} · {row.subjectCount} subjects</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black tabular-nums text-slate-900 dark:text-white">{row.percentage.toFixed(1)}%</p>
                          <p className="text-xs font-bold text-emerald-500">{gradeFor(row.percentage)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-700">
              <div><h2 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white"><Users className="h-5 w-5 text-indigo-500" /> Ranking-ga guud</h2><p className="text-xs text-slate-500">Allocated subjects only; current eight-subject classes use the same total as Combined Results.</p></div>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Raadi arday ama fasal..." className="ml-auto w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none sm:w-64 dark:border-slate-600 dark:bg-slate-700" />
            </div>
            <div className="max-h-[65vh] overflow-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-[11px] uppercase text-slate-500 dark:bg-slate-700"><tr><th className="p-3">#</th><th className="p-3">Student</th><th className="p-3">Class</th><th className="p-3 text-center">Total</th><th className="p-3 text-center">%</th><th className="p-3 text-center">Grade</th></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredOverall.map((row) => <tr key={`${row.classId}-${row.studentId}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/40"><td className="p-3 font-black text-slate-500">{row.rank}</td><td className="p-3"><p className="font-bold text-slate-900 dark:text-white">{row.firstName} {row.lastName}</p><p className="text-[11px] text-slate-500">{row.rollNo}</p></td><td className="p-3 font-semibold text-indigo-500">{row.className}</td><td className="p-3 text-center font-semibold tabular-nums">{formatScore(row.totalObtained)} / {formatScore(row.totalMax)}</td><td className="p-3 text-center font-black tabular-nums">{row.percentage.toFixed(1)}%</td><td className="p-3 text-center font-black text-emerald-500">{gradeFor(row.percentage)}</td></tr>)}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      {overall.length > 0 && <p className="flex items-center gap-1 text-xs text-slate-500"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Ranking-ku wuxuu ku salaysan yahay percentage-ka si fasallo maadooyin kala duwan leh si caddaalad ah loo barbar dhigo.</p>}
    </div>
  );
}
