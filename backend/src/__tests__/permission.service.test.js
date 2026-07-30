const mockPrisma = {
    user: { findUnique: jest.fn() }
};

jest.mock('../config/prismaClient', () => mockPrisma);

const PermissionService = require('../services/permission.service');

describe('PermissionService', () => {
    test.each([
        ['student', 'profile', 'read', true],
        ['student', 'profile', 'update', false],
        ['teacher', 'attendance', 'create', true],
        ['parent', 'grades', 'read', true],
        ['accountant', 'fees', 'delete', true],
        ['invalid-role', 'profile', 'read', false]
    ])('%s %s:%s returns %s', (role, resource, action, expected) => {
        expect(PermissionService.hasPermissionByRole(role, resource, action)).toBe(expected);
    });

    test('normalizes Prisma underscore roles', () => {
        expect(PermissionService.hasPermissionByRole('school_admin', 'users', 'create')).toBe(true);
    });

    test('looks up users through Prisma before checking permission', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', role: 'student' });
        await expect(PermissionService.hasPermission('user-1', 'grades', 'read')).resolves.toBe(true);
        expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    });

    test('returns false for missing users and database errors', async () => {
        mockPrisma.user.findUnique.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('db unavailable'));
        await expect(PermissionService.hasPermission('missing', 'profile', 'read')).resolves.toBe(false);
        await expect(PermissionService.hasPermission('broken', 'profile', 'read')).resolves.toBe(false);
    });
});
