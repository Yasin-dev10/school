const MODULE_BY_BASE_URL = Object.freeze({
    '/api/students': 'students',
    '/api/teachers': 'teachers',
    '/api/classes': 'classes',
    '/api/subjects': 'subjects',
    '/api/attendance': 'attendance',
    '/api/timetable': 'timetable',
    '/api/exams': 'exams',
    '/api/grades': 'exams',
    '/api/assignments': 'learning',
    '/api/materials': 'learning',
    '/api/online-learning': 'learning',
    '/api/fees': 'finance',
    '/api/stripe': 'finance',
    '/api/salaries': 'payroll',
    '/api/inventory': 'inventory',
    '/api/certificates': 'certificates',
    '/api/analytics': 'reports',
    '/api/report-exports': 'reports',
    '/api/notifications': 'communication',
    '/api/chat': 'communication',
    '/api/calendar': 'calendar',
    '/api/alumni': 'alumni',
    '/api/customization': 'customization',
    '/api/logs': 'settings',
    '/api/support': 'support',
    '/api/ai-assistant': 'learning',
    '/api/tasks': 'learning',
    '/api/parent': 'students',
    '/api/contact-messages': 'support',
    '/uploads': 'learning',
});

const ALWAYS_ALLOWED_BASE_URLS = new Set(['/api/auth', '/api/tenants']);
const AVAILABLE_MODULES = new Set(Object.values(MODULE_BY_BASE_URL));

function effectiveAccess(tenant, now = new Date()) {
    let mode = tenant.accessMode || 'full';
    const validUntil = tenant.subscriptionValid ? new Date(tenant.subscriptionValid) : null;
    const warningDays = Math.max(0, Number(tenant.warningDays) || 0);
    const graceDays = Math.max(0, Number(tenant.graceDays) || 0);
    const graceUntil = validUntil ? new Date(validUntil.getTime() + graceDays * 86400000) : null;
    const daysRemaining = validUntil ? Math.ceil((validUntil.getTime() - now.getTime()) / 86400000) : null;
    const overdue = Boolean(validUntil && now > validUntil);
    const graceExpired = Boolean(graceUntil && now > graceUntil);

    if (tenant.status === 'suspended' || tenant.subscriptionActive === false || mode === 'suspended') {
        mode = 'suspended';
    } else if (tenant.autoSuspend !== false && graceExpired) {
        mode = 'suspended';
    }

    return {
        mode,
        overdue,
        graceExpired,
        graceUntil,
        daysRemaining,
        showWarning: daysRemaining !== null && daysRemaining <= warningDays,
    };
}

module.exports = { MODULE_BY_BASE_URL, ALWAYS_ALLOWED_BASE_URLS, AVAILABLE_MODULES, effectiveAccess };
