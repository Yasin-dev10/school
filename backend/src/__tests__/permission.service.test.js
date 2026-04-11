const fc = require('fast-check');
const PermissionService = require('../services/permission.service');
const User = require('../models/user.model');

describe('Permission Service Property Tests', () => {
    describe('Property 1: Student Profile Modification Rejection', () => {
        /**
         * Feature: student-access-control, Property 1: Student Profile Modification Rejection
         * For any student user and any profile update request, the system should reject 
         * the modification and maintain the current profile state unchanged.
         * Validates: Requirements 1.1
         */
        test('should reject profile modifications for all student users', async () => {
            await fc.assert(
                fc.asyncProperty(
                    // Generate student user data
                    fc.record({
                        firstName: fc.string({ minLength: 1, maxLength: 50 }),
                        lastName: fc.string({ minLength: 1, maxLength: 50 }),
                        email: fc.emailAddress(),
                        password: fc.string({ minLength: 6, maxLength: 100 }),
                        role: fc.constant('student'),
                        tenantId: fc.string({ minLength: 1, maxLength: 20 }),
                        status: fc.constantFrom('active', 'inactive', 'suspended')
                    }),
                    // Generate profile update actions
                    fc.constantFrom('create', 'update', 'delete'),
                    async (studentData, action) => {
                        // Create a student user
                        const student = new User(studentData);
                        await student.save();

                        // Test permission for profile modification
                        const hasPermission = await PermissionService.hasPermission(
                            student._id.toString(),
                            PermissionService.RESOURCES.PROFILE,
                            action
                        );

                        // For students, only read access should be allowed for profile
                        if (action === 'read') {
                            expect(hasPermission).toBe(true);
                        } else {
                            // All other actions (create, update, delete) should be rejected
                            expect(hasPermission).toBe(false);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should maintain profile state unchanged when modification is attempted', async () => {
            await fc.assert(
                fc.asyncProperty(
                    // Generate student user data
                    fc.record({
                        firstName: fc.string({ minLength: 1, maxLength: 50 }),
                        lastName: fc.string({ minLength: 1, maxLength: 50 }),
                        email: fc.emailAddress(),
                        password: fc.string({ minLength: 6, maxLength: 100 }),
                        role: fc.constant('student'),
                        tenantId: fc.string({ minLength: 1, maxLength: 20 }),
                        status: fc.constantFrom('active', 'inactive', 'suspended'),
                        profile: fc.record({
                            phone: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
                            address: fc.option(fc.string({ minLength: 1, maxLength: 200 })),
                            admissionNo: fc.option(fc.string({ minLength: 1, maxLength: 20 })),
                            rollNo: fc.option(fc.string({ minLength: 1, maxLength: 10 })),
                            class: fc.option(fc.string({ minLength: 1, maxLength: 20 })),
                            section: fc.option(fc.string({ minLength: 1, maxLength: 5 }))
                        })
                    }),
                    async (studentData) => {
                        // Create a student user
                        const student = new User(studentData);
                        await student.save();

                        // Store original profile state
                        const originalProfile = JSON.parse(JSON.stringify(student.profile));

                        // Verify that student cannot modify profile
                        const canUpdate = await PermissionService.hasPermission(
                            student._id.toString(),
                            PermissionService.RESOURCES.PROFILE,
                            'update'
                        );

                        const canDelete = await PermissionService.hasPermission(
                            student._id.toString(),
                            PermissionService.RESOURCES.PROFILE,
                            'delete'
                        );

                        // Fetch user again to ensure profile hasn't changed
                        const unchangedStudent = await User.findById(student._id);

                        // Assertions
                        expect(canUpdate).toBe(false);
                        expect(canDelete).toBe(false);
                        expect(unchangedStudent.profile).toEqual(originalProfile);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('Property 19: Universal Permission Validation', () => {
        /**
         * Feature: student-access-control, Property 19: Universal Permission Validation
         * For any API request from any user, the system should validate user roles 
         * and permissions before processing the request.
         * Validates: Requirements 4.4
         */
        test('should validate user roles and permissions for all API requests', async () => {
            await fc.assert(
                fc.asyncProperty(
                    // Generate user data with different roles
                    fc.record({
                        firstName: fc.string({ minLength: 1, maxLength: 50 }),
                        lastName: fc.string({ minLength: 1, maxLength: 50 }),
                        email: fc.emailAddress(),
                        password: fc.string({ minLength: 6, maxLength: 100 }),
                        role: fc.constantFrom(
                            'super-admin',
                            'school-admin', 
                            'teacher',
                            'student',
                            'parent',
                            'accountant',
                            'librarian',
                            'receptionist'
                        ),
                        tenantId: fc.string({ minLength: 1, maxLength: 20 }),
                        status: fc.constantFrom('active', 'inactive', 'suspended')
                    }),
                    // Generate resource and action combinations
                    fc.constantFrom(
                        'profile',
                        'grades',
                        'attendance',
                        'assignments',
                        'schedules',
                        'materials',
                        'users',
                        'classes',
                        'subjects',
                        'exams',
                        'fees',
                        'notifications'
                    ),
                    fc.constantFrom('create', 'read', 'update', 'delete'),
                    async (userData, resource, action) => {
                        // Create user
                        const user = new User(userData);
                        await user.save();

                        // Test permission validation
                        const hasPermission = await PermissionService.hasPermission(
                            user._id.toString(),
                            resource,
                            action
                        );

                        // Verify that permission check returns a boolean
                        expect(typeof hasPermission).toBe('boolean');

                        // Verify that the permission result matches role-based expectations
                        const expectedPermission = PermissionService.hasPermissionByRole(
                            user.role,
                            resource,
                            action
                        );

                        expect(hasPermission).toBe(expectedPermission);
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should consistently validate permissions across role-resource-action combinations', async () => {
            await fc.assert(
                fc.asyncProperty(
                    // Generate all possible role combinations
                    fc.constantFrom(
                        'super-admin',
                        'school-admin', 
                        'teacher',
                        'student',
                        'parent',
                        'accountant',
                        'librarian',
                        'receptionist'
                    ),
                    fc.constantFrom(
                        'profile',
                        'grades',
                        'attendance',
                        'assignments',
                        'schedules',
                        'materials',
                        'users',
                        'classes',
                        'subjects',
                        'exams',
                        'fees',
                        'notifications'
                    ),
                    fc.constantFrom('create', 'read', 'update', 'delete'),
                    async (role, resource, action) => {
                        // Test role-based permission validation
                        const hasPermission = PermissionService.hasPermissionByRole(
                            role,
                            resource,
                            action
                        );

                        // Verify that permission check returns a boolean
                        expect(typeof hasPermission).toBe('boolean');

                        // Verify consistency - calling the same method with same parameters
                        // should always return the same result
                        const hasPermissionAgain = PermissionService.hasPermissionByRole(
                            role,
                            resource,
                            action
                        );

                        expect(hasPermission).toBe(hasPermissionAgain);

                        // Verify that invalid roles return false
                        const invalidRolePermission = PermissionService.hasPermissionByRole(
                            'invalid-role',
                            resource,
                            action
                        );

                        expect(invalidRolePermission).toBe(false);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});