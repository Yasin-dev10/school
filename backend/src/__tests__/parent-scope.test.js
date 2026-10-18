const mockPrisma = {
    user: { findMany: jest.fn() },
    class: { findMany: jest.fn() },
    timetable: { findMany: jest.fn() },
    assignment: { findMany: jest.fn() },
    material: { findMany: jest.fn() },
    mark: { findMany: jest.fn() }
};

jest.mock('../config/prismaClient', () => mockPrisma);

const { getParentScope, getParentTeacherIds } = require('../utils/parentScope');
const assignmentController = require('../controllers/assignment.controller');
const materialController = require('../controllers/material.controller');
const examController = require('../controllers/exam.controller');
const timetableController = require('../controllers/timetable.controller');

const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
const parentRequest = (query = {}) => ({ user: { id: 'parent-1', tenantId: 'school-1', role: 'parent' }, query });

describe('parent record scope', () => {
    beforeEach(() => jest.clearAllMocks());

    test('resolves only classes matching a linked child class and section', async () => {
        mockPrisma.user.findMany.mockResolvedValue([
            { id: 'child-1', profileClass: 'Grade 4', profileSection: 'B' }
        ]);
        mockPrisma.class.findMany.mockResolvedValue([
            { id: 'class-4a', name: 'Grade 4', section: 'A' },
            { id: 'class-4b', name: 'Grade 4', section: 'B' },
            { id: 'class-5a', name: 'Grade 5', section: 'A' }
        ]);

        await expect(getParentScope('parent-1', 'school-1')).resolves.toEqual({
            studentIds: ['child-1'], classIds: ['class-4b']
        });
        expect(mockPrisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { tenantId: 'school-1', role: 'student', parentLinks: { some: { parentId: 'parent-1' } } }
        }));
    });

    test('returns no classes when the parent has no linked students', async () => {
        mockPrisma.user.findMany.mockResolvedValue([]);
        await expect(getParentScope('parent-1', 'school-1')).resolves.toEqual({ studentIds: [], classIds: [] });
        expect(mockPrisma.class.findMany).not.toHaveBeenCalled();
    });

    test('does not guess a section when the linked student has no section value', async () => {
        mockPrisma.user.findMany.mockResolvedValue([{ id: 'child-1', profileClass: 'Grade 4', profileSection: null }]);
        mockPrisma.class.findMany.mockResolvedValue([
            { id: 'class-4a', name: 'Grade 4', section: 'A' },
            { id: 'class-4b', name: 'Grade 4', section: 'B' }
        ]);

        await expect(getParentScope('parent-1', 'school-1')).resolves.toEqual({ studentIds: ['child-1'], classIds: [] });
    });

    test('limits parent contacts to staff assigned to linked child classes', async () => {
        mockPrisma.user.findMany.mockResolvedValue([
            { id: 'child-1', profileClass: 'Grade 4', profileSection: 'B' }
        ]);
        mockPrisma.class.findMany.mockResolvedValue([
            { id: 'class-4b', name: 'Grade 4', section: 'B', classTeacherId: 'teacher-1', subjects: [{ teachers: [{ teacherId: 'teacher-2' }] }] }
        ]);
        mockPrisma.timetable.findMany.mockResolvedValue([
            { teachers: [{ teacherId: 'teacher-3' }] }
        ]);

        await expect(getParentTeacherIds('parent-1', 'school-1')).resolves.toEqual(['teacher-1', 'teacher-2', 'teacher-3']);
    });

    test('rejects an assignment class outside the linked children scope', async () => {
        mockPrisma.user.findMany.mockResolvedValue([{ id: 'child-1', profileClass: 'Grade 4', profileSection: 'B' }]);
        mockPrisma.class.findMany.mockResolvedValue([{ id: 'class-4b', name: 'Grade 4', section: 'B' }]);
        const res = response();

        await assignmentController.getAssignments(parentRequest({ classId: 'class-5a' }), res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(mockPrisma.assignment.findMany).not.toHaveBeenCalled();
    });

    test('limits parent materials to visible materials in linked child classes', async () => {
        mockPrisma.user.findMany.mockResolvedValue([{ id: 'child-1', profileClass: 'Grade 4', profileSection: 'B' }]);
        mockPrisma.class.findMany.mockResolvedValue([{ id: 'class-4b', name: 'Grade 4', section: 'B' }]);
        mockPrisma.material.findMany.mockResolvedValue([]);
        const res = response();

        await materialController.getMaterials(parentRequest(), res);

        expect(mockPrisma.material.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { tenantId: 'school-1', visibleToStudents: true, classId: { in: ['class-4b'] } }
        }));
    });

    test('limits parent marks to linked student ids', async () => {
        mockPrisma.user.findMany.mockResolvedValue([{ id: 'child-1', profileClass: 'Grade 4', profileSection: 'B' }]);
        mockPrisma.class.findMany.mockResolvedValue([{ id: 'class-4b', name: 'Grade 4', section: 'B' }]);
        mockPrisma.mark.findMany.mockResolvedValue([]);
        const res = response();

        await examController.getMarks(parentRequest(), res);

        expect(mockPrisma.mark.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ tenantId: 'school-1', studentId: { in: ['child-1'] } })
        }));
    });

    test('rejects a timetable request for a class outside the linked children scope', async () => {
        mockPrisma.user.findMany.mockResolvedValue([{ id: 'child-1', profileClass: 'Grade 4', profileSection: 'B' }]);
        mockPrisma.class.findMany.mockResolvedValue([{ id: 'class-4b', name: 'Grade 4', section: 'B' }]);
        const res = response();

        await timetableController.getTimetable({
            ...parentRequest(), params: { classId: 'class-5a' }
        }, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(mockPrisma.timetable.findMany).not.toHaveBeenCalled();
    });
});
