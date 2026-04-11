import { useState, useEffect } from 'react';

export const ROLES = {
    SUPER_ADMIN: 'super-admin',
    SCHOOL_ADMIN: 'school-admin',
    TEACHER: 'teacher',
    STUDENT: 'student',
    PARENT: 'parent',
    ACCOUNTANT: 'accountant',
    LIBRARIAN: 'librarian',
    RECEPTIONIST: 'receptionist'
};

export const RESOURCES = {
    PROFILE: 'profile',
    GRADES: 'grades',
    ATTENDANCE: 'attendance',
    ASSIGNMENTS: 'assignments',
    SUBMISSIONS: 'submissions',
    SCHEDULES: 'schedules',
    MATERIALS: 'materials',
    USERS: 'users',
    CLASSES: 'classes',
    SUBJECTS: 'subjects',
    EXAMS: 'exams',
    FEES: 'fees',
    NOTIFICATIONS: 'notifications'
};

export const ACTIONS = {
    CREATE: 'create',
    READ: 'read',
    UPDATE: 'update',
    DELETE: 'delete'
};

const ROLE_PERMISSIONS = {
    [ROLES.STUDENT]: {
        [RESOURCES.PROFILE]: [ACTIONS.READ],
        [RESOURCES.GRADES]: [ACTIONS.READ],
        [RESOURCES.ATTENDANCE]: [ACTIONS.READ],
        [RESOURCES.ASSIGNMENTS]: [ACTIONS.READ],
        [RESOURCES.SUBMISSIONS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
        [RESOURCES.SCHEDULES]: [ACTIONS.READ],
        [RESOURCES.MATERIALS]: [ACTIONS.READ],
        [RESOURCES.FEES]: [ACTIONS.READ],
        [RESOURCES.NOTIFICATIONS]: [ACTIONS.READ]
    },
    [ROLES.TEACHER]: {
        [RESOURCES.PROFILE]: [ACTIONS.READ, ACTIONS.UPDATE],
        [RESOURCES.GRADES]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
        [RESOURCES.ATTENDANCE]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
        [RESOURCES.ASSIGNMENTS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
        [RESOURCES.SUBMISSIONS]: [ACTIONS.READ, ACTIONS.UPDATE],
        [RESOURCES.SCHEDULES]: [ACTIONS.READ],
        [RESOURCES.MATERIALS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
        [RESOURCES.USERS]: [ACTIONS.READ],
        [RESOURCES.CLASSES]: [ACTIONS.READ],
        [RESOURCES.SUBJECTS]: [ACTIONS.READ],
        [RESOURCES.EXAMS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE],
        [RESOURCES.NOTIFICATIONS]: [ACTIONS.CREATE, ACTIONS.READ]
    },
    [ROLES.SCHOOL_ADMIN]: {
        // Full access shortcut handled in check
        [RESOURCES.PROFILE]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
        [RESOURCES.GRADES]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
        [RESOURCES.ATTENDANCE]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
        [RESOURCES.ASSIGNMENTS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
        [RESOURCES.SUBMISSIONS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
        [RESOURCES.SCHEDULES]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
        [RESOURCES.MATERIALS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
        [RESOURCES.USERS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
        [RESOURCES.CLASSES]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
        [RESOURCES.SUBJECTS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
        [RESOURCES.EXAMS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
        [RESOURCES.FEES]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE],
        [RESOURCES.NOTIFICATIONS]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE]
    },
    [ROLES.SUPER_ADMIN]: {
        // Full access
    }
};

export const usePermission = () => {
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                setUserRole(user.role);
            } catch (e) {
                console.error("Failed to parse user from local storage", e);
            }
        }
    }, []);

    const hasPermission = (resource: string, action: string): boolean => {
        if (!userRole) return false;

        // Super Admin has full access
        if (userRole === ROLES.SUPER_ADMIN) return true;
        // School Admin has full access (effectively)
        if (userRole === ROLES.SCHOOL_ADMIN) return true;

        const rolePerms = ROLE_PERMISSIONS[userRole];
        if (!rolePerms) return false;

        const resourcePerms = rolePerms[resource];
        if (!resourcePerms) return false;

        return resourcePerms.includes(action);
    };

    return { hasPermission, userRole, ROLES, RESOURCES, ACTIONS };
};
