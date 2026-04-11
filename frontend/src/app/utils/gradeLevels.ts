export interface GradeLevel {
    id: 'elementary' | 'middle' | 'high';
    name: string;
    grades: string[];
}

export const GRADE_LEVELS: GradeLevel[] = [
    {
        id: 'elementary',
        name: 'Elementary School',
        grades: ['Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade']
    },
    {
        id: 'middle',
        name: 'Middle School',
        grades: ['6th Grade', '7th Grade', '8th Grade']
    },
    {
        id: 'high',
        name: 'High School',
        grades: ['9th Grade', '10th Grade', '11th Grade', '12th Grade']
    }
];

export const getGradeLevelByGrade = (grade: string): GradeLevel | undefined => {
    return GRADE_LEVELS.find(level => level.grades.includes(grade));
};

export const getGradesForLevel = (levelId: string): string[] => {
    const level = GRADE_LEVELS.find(l => l.id === levelId);
    return level ? level.grades : [];
};

export const getAllGrades = (): string[] => {
    return GRADE_LEVELS.flatMap(level => level.grades);
};

export const getGradeLevelName = (levelId: string): string => {
    const level = GRADE_LEVELS.find(l => l.id === levelId);
    return level ? level.name : '';
};
