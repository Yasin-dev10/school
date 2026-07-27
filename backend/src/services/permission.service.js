const prisma = require('../config/prismaClient');

/**
 * Permission Service - Handles role-based access control logic
 */
class PermissionService {
    constructor() {
        this.RESOURCES = {
            PROFILE: 'profile',
            GRADES: 'grades',
            ATTENDANCE: 'attendance',
            ASSIGNMENTS: 'assignments',
            SCHEDULES: 'schedules',
            MATERIALS: 'materials',
            USERS: 'users',
            CLASSES: 'classes',
            SUBJECTS: 'subjects',
            EXAMS: 'exams',
            FEES: 'fees',
            NOTIFICATIONS: 'notifications',
            SUBMISSIONS: 'submissions'
        };

        this.ACTIONS = {
            CREATE: 'create',
            READ: 'read',
            UPDATE: 'update',
            DELETE: 'delete'
        };

        this.ROLES = {
            SUPER_ADMIN: 'super-admin',
            SCHOOL_ADMIN: 'school-admin',
            TEACHER: 'teacher',
            STUDENT: 'student',
            PARENT: 'parent',
            ACCOUNTANT: 'accountant',
            LIBRARIAN: 'librarian',
            RECEPTIONIST: 'receptionist'
        };

        this.rolePermissions = this._initializeRolePermissions();
    }

    _initializeRolePermissions() {
        return {
            [this.ROLES.STUDENT]: {
                [this.RESOURCES.PROFILE]: [this.ACTIONS.READ],
                [this.RESOURCES.GRADES]: [this.ACTIONS.READ],
                [this.RESOURCES.ATTENDANCE]: [this.ACTIONS.READ],
                [this.RESOURCES.ASSIGNMENTS]: [this.ACTIONS.READ],
                [this.RESOURCES.SUBMISSIONS]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE, this.ACTIONS.DELETE],
                [this.RESOURCES.SCHEDULES]: [this.ACTIONS.READ],
                [this.RESOURCES.MATERIALS]: [this.ACTIONS.READ],
                [this.RESOURCES.FEES]: [this.ACTIONS.READ],
                [this.RESOURCES.NOTIFICATIONS]: [this.ACTIONS.READ]
            },
            [this.ROLES.TEACHER]: {
                [this.RESOURCES.PROFILE]: [this.ACTIONS.READ, this.ACTIONS.UPDATE],
                [this.RESOURCES.GRADES]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE],
                [this.RESOURCES.ATTENDANCE]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE],
                [this.RESOURCES.ASSIGNMENTS]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE, this.ACTIONS.DELETE],
                [this.RESOURCES.SUBMISSIONS]: [this.ACTIONS.READ, this.ACTIONS.UPDATE],
                [this.RESOURCES.SCHEDULES]: [this.ACTIONS.READ],
                [this.RESOURCES.MATERIALS]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE, this.ACTIONS.DELETE],
                [this.RESOURCES.USERS]: [this.ACTIONS.READ],
                [this.RESOURCES.CLASSES]: [this.ACTIONS.READ],
                [this.RESOURCES.SUBJECTS]: [this.ACTIONS.READ],
                [this.RESOURCES.EXAMS]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE],
                [this.RESOURCES.NOTIFICATIONS]: [this.ACTIONS.CREATE, this.ACTIONS.READ]
            },
            [this.ROLES.SCHOOL_ADMIN]: {
                [this.RESOURCES.PROFILE]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE, this.ACTIONS.DELETE],
                [this.RESOURCES.GRADES]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE, this.ACTIONS.DELETE],
                [this.RESOURCES.ATTENDANCE]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE, this.ACTIONS.DELETE],
                [this.RESOURCES.ASSIGNMENTS]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE, this.ACTIONS.DELETE],
                [this.RESOURCES.SUBMISSIONS]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE, this.ACTIONS.DELETE],
                [this.RESOURCES.SCHEDULES]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE, this.ACTIONS.DELETE],
                [this.RESOURCES.MATERIALS]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE, this.ACTIONS.DELETE],
                [this.RESOURCES.USERS]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE, this.ACTIONS.DELETE],
                [this.RESOURCES.CLASSES]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE, this.ACTIONS.DELETE],
                [this.RESOURCES.SUBJECTS]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE, this.ACTIONS.DELETE],
                [this.RESOURCES.EXAMS]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE, this.ACTIONS.DELETE],
                [this.RESOURCES.FEES]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE, this.ACTIONS.DELETE],
                [this.RESOURCES.NOTIFICATIONS]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE, this.ACTIONS.DELETE]
            },
            [this.ROLES.SUPER_ADMIN]: {
                [this.RESOURCES.PROFILE]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE, this.ACTIONS.DELETE],
                [this.RESOURCES.GRADES]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE, this.ACTIONS.DELETE],
                [this.RESOURCES.ATTENDANCE]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE, this.ACTIONS.DELETE],
                [this.RESOURCES.ASSIGNMENTS]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE, this.ACTIONS.DELETE],
                [this.RESOURCES.SUBMISSIONS]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE, this.ACTIONS.DELETE],
                [this.RESOURCES.SCHEDULES]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE, this.ACTIONS.DELETE],
                [this.RESOURCES.MATERIALS]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE, this.ACTIONS.DELETE],
                [this.RESOURCES.USERS]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE, this.ACTIONS.DELETE],
                [this.RESOURCES.CLASSES]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE, this.ACTIONS.DELETE],
                [this.RESOURCES.SUBJECTS]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE, this.ACTIONS.DELETE],
                [this.RESOURCES.EXAMS]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE, this.ACTIONS.DELETE],
                [this.RESOURCES.FEES]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE, this.ACTIONS.DELETE],
                [this.RESOURCES.NOTIFICATIONS]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE, this.ACTIONS.DELETE]
            },
            [this.ROLES.PARENT]: {
                [this.RESOURCES.PROFILE]: [this.ACTIONS.READ, this.ACTIONS.UPDATE],
                [this.RESOURCES.GRADES]: [this.ACTIONS.READ],
                [this.RESOURCES.ATTENDANCE]: [this.ACTIONS.READ],
                [this.RESOURCES.ASSIGNMENTS]: [this.ACTIONS.READ],
                [this.RESOURCES.SUBMISSIONS]: [this.ACTIONS.READ],
                [this.RESOURCES.SCHEDULES]: [this.ACTIONS.READ],
                [this.RESOURCES.MATERIALS]: [this.ACTIONS.READ],
                [this.RESOURCES.FEES]: [this.ACTIONS.READ],
                [this.RESOURCES.NOTIFICATIONS]: [this.ACTIONS.READ]
            },
            [this.ROLES.ACCOUNTANT]: {
                [this.RESOURCES.PROFILE]: [this.ACTIONS.READ, this.ACTIONS.UPDATE],
                [this.RESOURCES.FEES]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE, this.ACTIONS.DELETE],
                [this.RESOURCES.USERS]: [this.ACTIONS.READ],
                [this.RESOURCES.NOTIFICATIONS]: [this.ACTIONS.CREATE, this.ACTIONS.READ]
            },
            [this.ROLES.LIBRARIAN]: {
                [this.RESOURCES.PROFILE]: [this.ACTIONS.READ, this.ACTIONS.UPDATE],
                [this.RESOURCES.MATERIALS]: [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE, this.ACTIONS.DELETE],
                [this.RESOURCES.USERS]: [this.ACTIONS.READ],
                [this.RESOURCES.NOTIFICATIONS]: [this.ACTIONS.CREATE, this.ACTIONS.READ]
            },
            [this.ROLES.RECEPTIONIST]: {
                [this.RESOURCES.PROFILE]: [this.ACTIONS.READ, this.ACTIONS.UPDATE],
                [this.RESOURCES.USERS]: [this.ACTIONS.READ],
                [this.RESOURCES.NOTIFICATIONS]: [this.ACTIONS.CREATE, this.ACTIONS.READ]
            }
        };
    }

    async hasPermission(userId, resource, action) {
        try {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) return false;
            return this.hasPermissionByRole(user.role, resource, action);
        } catch (error) {
            console.error('Error checking permission:', error);
            return false;
        }
    }

    hasPermissionByRole(role, resource, action) {
        const key = role ? String(role).replace(/_/g, '-') : role;
        const rolePermissions = this.rolePermissions[key];
        if (!rolePermissions) return false;
        const resourcePermissions = rolePermissions[resource];
        if (!resourcePermissions) return false;
        return resourcePermissions.includes(action);
    }

    async getUserRole(userId) {
        try {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            return user ? user.role : null;
        } catch (error) {
            console.error('Error getting user role:', error);
            return null;
        }
    }

    getResourcePermissions(role, resource) {
        return this.rolePermissions[role]?.[resource] || [];
    }

    async isStudent(userId) {
        const role = await this.getUserRole(userId);
        return role === this.ROLES.STUDENT;
    }

    isAssignmentResource(resource) {
        return resource === this.RESOURCES.ASSIGNMENTS || resource === this.RESOURCES.SUBMISSIONS;
    }

    async validateAssignmentAccess(userId, assignmentId, action) {
        try {
            if (!(await this.isStudent(userId))) return false;
            if (action === 'submissions') return true;
            return [this.ACTIONS.CREATE, this.ACTIONS.READ, this.ACTIONS.UPDATE, this.ACTIONS.DELETE].includes(action);
        } catch (error) {
            console.error('Error validating assignment access:', error);
            return false;
        }
    }
}

module.exports = new PermissionService();