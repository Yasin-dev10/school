export type GradeConfig = {
  grade: string;
  minPercentage: number;
  maxPercentage: number;
  gpa: number;
  remarks?: string;
};

export const DEFAULT_GRADES: GradeConfig[] = [
  { grade: "A+", minPercentage: 95, maxPercentage: 100, gpa: 4.0 },
  { grade: "A-", minPercentage: 90, maxPercentage: 95, gpa: 3.8 },
  { grade: "A", minPercentage: 85, maxPercentage: 90, gpa: 3.6 },
  { grade: "B+", minPercentage: 80, maxPercentage: 85, gpa: 3.4 },
  { grade: "B-", minPercentage: 75, maxPercentage: 80, gpa: 3.2 },
  { grade: "B", minPercentage: 70, maxPercentage: 75, gpa: 3.0 },
  { grade: "C+", minPercentage: 65, maxPercentage: 70, gpa: 2.5 },
  { grade: "C-", minPercentage: 60, maxPercentage: 65, gpa: 2.0 },
  { grade: "C", minPercentage: 55, maxPercentage: 60, gpa: 1.5 },
  { grade: "D", minPercentage: 50, maxPercentage: 55, gpa: 1.0 },
  { grade: "F", minPercentage: 0, maxPercentage: 49, gpa: 0.0 },
];

export function normalizeGradeConfigs(grades: unknown): GradeConfig[] {
  if (!Array.isArray(grades)) return DEFAULT_GRADES;
  const valid = grades.filter((item): item is GradeConfig => {
    if (!item || typeof item !== "object") return false;
    const grade = item as Partial<GradeConfig>;
    return typeof grade.grade === "string" && grade.grade.trim().length > 0 &&
      Number.isFinite(Number(grade.minPercentage)) &&
      Number.isFinite(Number(grade.maxPercentage)) &&
      Number.isFinite(Number(grade.gpa));
  }).map((grade) => ({
    ...grade,
    minPercentage: Number(grade.minPercentage),
    maxPercentage: Number(grade.maxPercentage),
    gpa: Number(grade.gpa),
  }));
  return valid.length ? valid : DEFAULT_GRADES;
}

export function gradeForPercentage(percentage: number, grades: GradeConfig[]): GradeConfig | null {
  if (!Number.isFinite(percentage)) return null;
  return [...grades]
    .sort((a, b) => b.minPercentage - a.minPercentage)
    .find((grade) => percentage >= grade.minPercentage) || null;
}
