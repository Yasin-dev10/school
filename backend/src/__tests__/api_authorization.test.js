const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const fc = require('fast-check');
const permissionMiddleware = require('../middlewares/permission.middleware');
const PermissionService = require('../services/permission.service');
const Assignment = require('../models/assignment.model');
const Submission = require('../models/submission.model');
const User = require('../models/user.model');
const assignmentController = require('../controllers/assignment.controller');

// Mock Auth Middleware
const mockAuth = (user) => (req, res, next) => {
    req.user = user;
    next();
};

describe('API Authorization Property Tests', () => {
    let app;

    beforeAll(async () => {
        // Mongoose connection is handled by setup.js
        app = express();
        app.use(express.json());
    });

    describe('Property 16: API Forbidden Response', () => {
        test('should return 403 Forbidden for unauthorized requests', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        role: fc.constantFrom('student', 'parent'),
                        resource: fc.constantFrom(
                            PermissionService.RESOURCES.EXAMS,
                            PermissionService.RESOURCES.TEACHERS,
                            PermissionService.RESOURCES.CLASSES
                        ),
                        action: fc.constant(PermissionService.ACTIONS.CREATE)
                    }),
                    async ({ role, resource, action }) => {
                        const user = { _id: new mongoose.Types.ObjectId(), role };

                        const testPath = `/${resource}/${action}`;

                        // We need to define the route for this iteration. 
                        // Note: defining routes inside asyncProperty loop on the same app instance keeps adding routes.
                        // While express handles multiple routes, duplicate paths might be an issue if we reuse the same path.
                        // Here path changes based on resource/action.
                        // Ideally we define one generic route that uses params, but checkPermission takes arguments.
                        // To avoid pollution, we can create a fresh app for each property run or just use unique paths.
                        // Using a fresh app inside assert is safer.

                        const localApp = express();
                        localApp.use(express.json());
                        localApp.get(testPath,
                            mockAuth(user),
                            permissionMiddleware.checkPermission(resource, action),
                            (req, res) => res.status(200).json({ success: true })
                        );

                        const response = await request(localApp).get(testPath);

                        const expectedPermission = PermissionService.hasPermissionByRole(role, resource, action);

                        if (!expectedPermission) {
                            expect(response.status).toBe(403);
                            expect(response.body.message).toMatch(/Access denied/);
                        } else {
                            expect(response.status).toBe(200);
                        }
                    }
                )
            );
        });
    });

    describe('Property 6: Assignment Submission Processing', () => {
        test('students should have full CRUD access to their own submissions', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.constantFrom('create', 'read', 'update', 'delete'),
                    async (action) => {
                        const hasPermission = PermissionService.hasPermissionByRole(
                            'student',
                            PermissionService.RESOURCES.SUBMISSIONS,
                            action
                        );
                        expect(hasPermission).toBe(true);
                    }
                )
            );
        });
    });

    describe('Property 7: Assignment Update Before Deadline', () => {
        beforeAll(() => {
            // Setup submission route using the actual controller
            app.post('/api/assignments/:id/submit',
                (req, res, next) => {
                    req.user = { _id: new mongoose.Types.ObjectId(), role: 'student', tenantId: 'tenant1' };
                    next();
                },
                assignmentController.submitAssignment
            );
        });

        test('should reject submissions after the deadline', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.date({ max: new Date(Date.now() - 10000) }), // Past dates
                    async (dueDate) => {
                        const assignment = await Assignment.create({
                            tenantId: 'tenant1',
                            title: 'Past Assignment',
                            description: 'Desc',
                            class: new mongoose.Types.ObjectId(),
                            teacher: new mongoose.Types.ObjectId(),
                            dueDate: dueDate,
                            status: 'published'
                        });

                        const response = await request(app)
                            .post(`/api/assignments/${assignment._id}/submit`)
                            .send({ content: 'Late submission' });

                        expect(response.status).toBe(400);
                        expect(response.body.message).toMatch(/deadline/i);
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('Property 8: Draft Assignment Deletion', () => {
        beforeAll(() => {
            // Setup delete route
            app.delete('/api/assignments/:id',
                (req, res, next) => {
                    req.user = { _id: new mongoose.Types.ObjectId(), role: 'teacher', tenantId: 'tenant1' };
                    next();
                },
                assignmentController.deleteAssignment
            );
        });

        test('should only allow deletion of draft assignments', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.constantFrom('draft', 'published', 'closed'),
                    async (status) => {
                        const assignment = await Assignment.create({
                            tenantId: 'tenant1',
                            title: 'To Delete',
                            description: 'Desc',
                            class: new mongoose.Types.ObjectId(),
                            teacher: new mongoose.Types.ObjectId(),
                            dueDate: new Date(),
                            status: status
                        });

                        const response = await request(app).delete(`/api/assignments/${assignment._id}`);

                        if (status === 'draft') {
                            expect(response.status).toBe(200);
                        } else {
                            expect(response.status).toBe(400);
                            expect(response.body.message).toMatch(/Only draft assignments can be deleted/i);
                        }
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('Property 17: Security Violation Logging', () => {
        test('should log unauthorized access attempts', async () => {
            const AuditLog = require('../models/auditLog.model');
            const permissionMiddleware = require('../middlewares/permission.middleware');

            await fc.assert(
                fc.asyncProperty(
                    fc.constantFrom('student'),
                    fc.constant(PermissionService.RESOURCES.TEACHERS),
                    fc.constant(PermissionService.ACTIONS.CREATE),
                    async (role, resource, action) => {
                        const user = { _id: new mongoose.Types.ObjectId(), role, tenantId: 'tenant1' };

                        const testPath = `/api/log-test/${Math.random()}`; // Unique path per run

                        const localApp = express();
                        localApp.use(express.json());
                        localApp.get(testPath,
                            (req, res, next) => { req.user = user; next(); },
                            permissionMiddleware.checkPermission(resource, action),
                            (req, res) => res.status(200).json({ success: true })
                        );

                        // Clear logs first
                        await AuditLog.deleteMany({});

                        const response = await request(localApp).get(testPath);

                        expect(response.status).toBe(403);

                        // Check log
                        const logs = await AuditLog.find({});
                        expect(logs.length).toBeGreaterThan(0);
                        expect(logs[0].action).toBe('UNAUTHORIZED_ACCESS');
                        expect(logs[0].performedBy.toString()).toBe(user._id.toString());
                    }
                ),
                { numRuns: 3 } // limited runs as it involves DB operations per run
            );
        });
    });
});
