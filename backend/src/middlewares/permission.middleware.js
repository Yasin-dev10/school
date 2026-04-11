const permissionService = require('../services/permission.service');
const auditLogger = require('../utils/logger');

/**
 * Middleware to check if user has permission for a resource and action
 * @param {string} resource - Resource name from PermissionService.RESOURCES
 * @param {string} action - Action name from PermissionService.ACTIONS
 */
exports.checkPermission = (resource, action) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'User not authenticated' });
            }

            const hasPermission = permissionService.hasPermissionByRole(
                req.user.role,
                resource,
                action
            );

            if (!hasPermission) {
                await auditLogger.logAction({
                    action: 'UNAUTHORIZED_ACCESS',
                    module: resource,
                    details: `User ${req.user.role} attempted to ${action} ${resource} but was denied.`,
                    userId: req.user._id,
                    tenantId: req.user.tenantId,
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                });

                return res.status(403).json({
                    message: `Access denied. You do not have permission to ${action} ${resource}.`
                });
            }

            next();
        } catch (error) {
            console.error('Permission check failed:', error);
            return res.status(500).json({ message: 'Internal server error checking permissions' });
        }
    };
};

/**
 * Middleware to check assignment specific permissions
 * Handles the special case where students have full CRUD on their own submissions
 * while restricted on other resources.
 * @param {string} action - Action to perform
 */
exports.checkAssignmentPermission = (action) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'User not authenticated' });
            }

            // Special handling for students
            if (req.user.role === permissionService.ROLES.STUDENT) {
                const assignmentId = req.params.id; // May be assignment ID or submission ID depending on route

                // For simplified check based on spec: 
                // "WHEN a student creates an assignment submission... SHALL process"
                // "Students can perform all actions on assignments" (PermissionService.validateAssignmentAccess)

                const hasAccess = await permissionService.validateAssignmentAccess(
                    req.user._id,
                    assignmentId,
                    action
                );

                if (!hasAccess) {
                    return res.status(403).json({
                        message: 'Access denied. You do not have permission for this assignment operation.'
                    });
                }
                return next();
            }

            // For non-students, fall back to standard role-based permission
            const hasPermission = permissionService.hasPermissionByRole(
                req.user.role,
                permissionService.RESOURCES.ASSIGNMENTS,
                action
            );

            if (!hasPermission) {
                return res.status(403).json({
                    message: `Access denied. You do not have permission to ${action} assignments.`
                });
            }

            next();
        } catch (error) {
            console.error('Assignment permission check failed:', error);
            return res.status(500).json({ message: 'Internal server error checking assignment permissions' });
        }
    };
};
