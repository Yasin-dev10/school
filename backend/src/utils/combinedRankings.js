const buildCombinedRankings = ({ classes, marks, accessibleSubjectIds = null }) => {
    const accessible = accessibleSubjectIds ? new Set(accessibleSubjectIds) : null;
    const classMap = new Map(classes.map(academicClass => [academicClass.id, academicClass]));
    const allocatedSubjects = new Map(classes.map(academicClass => [
        academicClass.id,
        new Set(academicClass.subjects
            .map(subject => subject.subjectId)
            .filter(subjectId => !accessible || accessible.has(subjectId)))
    ]));
    const totals = new Map();

    for (const mark of marks) {
        if (!allocatedSubjects.get(mark.classId)?.has(mark.subjectId)) continue;
        const key = `${mark.classId}:${mark.studentId}`;
        if (!totals.has(key)) {
            const academicClass = classMap.get(mark.classId);
            if (!academicClass) continue;
            totals.set(key, {
                studentId: mark.studentId,
                firstName: mark.student.firstName,
                lastName: mark.student.lastName,
                rollNo: mark.student.rollNo || mark.student.studentId || '',
                classId: mark.classId,
                className: `${academicClass.grade || academicClass.name}${academicClass.section ? ` ${academicClass.section}` : ''}`,
                subjectCount: allocatedSubjects.get(mark.classId).size,
                totalObtained: 0,
                totalMax: 0
            });
        }
        const row = totals.get(key);
        row.totalObtained += Number(mark.marksObtained) || 0;
        row.totalMax += Number(mark.maxMarks) || 0;
    }

    const overall = [...totals.values()]
        .filter(row => row.totalMax > 0)
        .map(row => ({ ...row, percentage: (row.totalObtained / row.totalMax) * 100 }))
        .sort((a, b) => b.percentage - a.percentage || b.totalObtained - a.totalObtained)
        .map((row, index) => ({ ...row, rank: index + 1 }));

    const classLeaders = classes.flatMap(academicClass => overall
        .filter(row => row.classId === academicClass.id)
        .slice(0, 3)
        .map((row, index) => ({ ...row, classRank: index + 1 })));

    return { classLeaders, overall };
};

module.exports = { buildCombinedRankings };
