const { buildCombinedRankings } = require('../utils/combinedRankings');

const student = { firstName: 'Asha', lastName: 'Ali', rollNo: 'R1' };
const allocatedIds = Array.from({ length: 8 }, (_, index) => `subject-${index + 1}`);
const classes = [{
    id: 'class-1', name: 'Eight', grade: 'Grade 8', section: 'A',
    subjects: allocatedIds.map(subjectId => ({ subjectId }))
}];

describe('combined ranking totals', () => {
    test('matches Combined Results by totaling only the eight allocated subjects', () => {
        const marks = [
            ...allocatedIds.map((subjectId, index) => ({
                classId: 'class-1', studentId: 'student-1', subjectId, student,
                marksObtained: 70 + index, maxMarks: 100
            })),
            { classId: 'class-1', studentId: 'student-1', subjectId: 'old-subject', student, marksObtained: 100, maxMarks: 100 }
        ];

        const { overall } = buildCombinedRankings({ classes, marks });

        expect(overall).toHaveLength(1);
        expect(overall[0]).toMatchObject({
            subjectCount: 8,
            totalObtained: 588,
            totalMax: 800,
            percentage: 73.5
        });
    });

    test('uses the same accessible allocated-subject intersection for teacher views', () => {
        const marks = allocatedIds.map(subjectId => ({
            classId: 'class-1', studentId: 'student-1', subjectId, student,
            marksObtained: 80, maxMarks: 100
        }));

        const { overall } = buildCombinedRankings({
            classes, marks, accessibleSubjectIds: allocatedIds.slice(0, 2)
        });

        expect(overall[0]).toMatchObject({ subjectCount: 2, totalObtained: 160, totalMax: 200, percentage: 80 });
    });
});
