const request = require('supertest');
const express = require('express');

const mockPrisma = {
    assignment: {
        findFirst: jest.fn(),
        delete: jest.fn()
    },
    submission: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
    }
};
const mockLogAction = jest.fn().mockResolvedValue(undefined);

jest.mock('../config/prismaClient', () => mockPrisma);
jest.mock('../utils/logger', () => ({ logAction: mockLogAction }));
jest.mock('../config/socket', () => ({ emitToTenant: jest.fn() }));
jest.mock('../utils/teacherScope', () => ({
    canTeacherAccessClassSubject: jest.fn().mockResolvedValue(true)
}));

const permissionMiddleware = require('../middlewares/permission.middleware');
const PermissionService = require('../services/permission.service');
const assignmentController = require('../controllers/assignment.controller');

const makeApp = (role, route, handler) => {
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
        req.user = { id: 'user-1', _id: 'user-1', role, tenantId: 'tenant-1' };
        next();
    });
    app[route.method](route.path, ...(route.middleware || []), handler);
    return app;
};

describe('API authorization', () => {
    test('returns 403 and audits an unauthorized request', async () => {
        const app = makeApp(
            'student',
            {
                method: 'post',
                path: '/teachers',
                middleware: [permissionMiddleware.checkPermission(PermissionService.RESOURCES.USERS, PermissionService.ACTIONS.CREATE)]
            },
            (req, res) => res.json({ success: true })
        );
        const response = await request(app).post('/teachers');
        expect(response.status).toBe(403);
        expect(response.body.message).toMatch(/Access denied/);
        expect(mockLogAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'UNAUTHORIZED_ACCESS' }));
    });

    test('rejects assignment submissions after the deadline', async () => {
        mockPrisma.assignment.findFirst.mockResolvedValue({
            id: 'assignment-1',
            dueDate: new Date(Date.now() - 1000),
            status: 'published'
        });
        const app = makeApp(
            'student',
            { method: 'post', path: '/assignments/:id/submit' },
            assignmentController.submitAssignment
        );
        const response = await request(app).post('/assignments/assignment-1/submit').send({ content: 'late' });
        expect(response.status).toBe(400);
        expect(response.body.message).toMatch(/deadline/i);
        expect(mockPrisma.submission.create).not.toHaveBeenCalled();
    });

    test('only draft assignments can be deleted', async () => {
        mockPrisma.assignment.findFirst.mockResolvedValue({
            id: 'assignment-1',
            teacherId: 'user-1',
            status: 'published'
        });
        const app = makeApp(
            'teacher',
            { method: 'delete', path: '/assignments/:id' },
            assignmentController.deleteAssignment
        );
        const response = await request(app).delete('/assignments/assignment-1');
        expect(response.status).toBe(400);
        expect(response.body.message).toMatch(/Only draft/);
        expect(mockPrisma.assignment.delete).not.toHaveBeenCalled();
    });
});
