const request = require('supertest');
const express = require('express');

const relationNames = [
    'assignment', 'examComplaint', 'attendance', 'mark', 'material',
    'timetable', 'subjectResource', 'subjectTeacher', 'classSubject'
];

const mockPrisma = {
    subject: { findFirst: jest.fn(), delete: jest.fn() },
    $transaction: jest.fn()
};

for (const name of relationNames) {
    mockPrisma[name] = { count: jest.fn(), deleteMany: jest.fn(), updateMany: jest.fn() };
}

const mockLogAction = jest.fn().mockResolvedValue(undefined);
jest.mock('../config/prismaClient', () => mockPrisma);
jest.mock('../utils/logger', () => ({ logAction: mockLogAction }));
jest.mock('../utils/teacherScope', () => ({ canTeacherAccessSubject: jest.fn() }));

const subjectController = require('../controllers/subject.controller');

const makeApp = () => {
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
        req.user = { id: 'admin-1', _id: 'admin-1', role: 'school-admin', tenantId: 'tenant-1' };
        next();
    });
    app.get('/subjects/:id/deletion-impact', subjectController.getSubjectDeletionImpact);
    app.delete('/subjects/:id', subjectController.deleteSubject);
    return app;
};

describe('subject deletion', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPrisma.subject.findFirst.mockResolvedValue({ id: 'subject-1', name: 'Mathematics', code: 'MATH' });
        relationNames.forEach((name, index) => mockPrisma[name].count.mockResolvedValue(index + 1));
        mockPrisma.$transaction.mockImplementation(callback => callback(mockPrisma));
    });

    test('previews every Prisma relation that references a fully used subject', async () => {
        const response = await request(makeApp()).get('/subjects/subject-1/deletion-impact');

        expect(response.status).toBe(200);
        expect(response.body.data.preserved).toEqual({ assignments: 1, attendances: 3 });
        expect(response.body.data.deleted).toEqual({
            examComplaints: 2, marks: 4, materials: 5, timetables: 6,
            resources: 7, teachers: 8, classSubjects: 9
        });
        expect(response.body.data.totalAffected).toBe(45);
    });

    test('atomically preserves nullable history and deletes required dependents', async () => {
        const response = await request(makeApp()).delete('/subjects/subject-1');
        const tenantWhere = { subjectId: 'subject-1', tenantId: 'tenant-1' };

        expect(response.status).toBe(200);
        expect(mockPrisma.assignment.updateMany).toHaveBeenCalledWith({ where: tenantWhere, data: { subjectId: null } });
        expect(mockPrisma.attendance.updateMany).toHaveBeenCalledWith({ where: tenantWhere, data: { subjectId: null } });
        expect(mockPrisma.examComplaint.deleteMany).toHaveBeenCalledWith({ where: tenantWhere });
        expect(mockPrisma.mark.deleteMany).toHaveBeenCalledWith({ where: tenantWhere });
        expect(mockPrisma.material.deleteMany).toHaveBeenCalledWith({ where: tenantWhere });
        expect(mockPrisma.timetable.deleteMany).toHaveBeenCalledWith({ where: tenantWhere });
        expect(mockPrisma.subject.delete).toHaveBeenCalledWith({ where: { id: 'subject-1' } });
        expect(response.body.data.impact.totalAffected).toBe(45);
    });
});
