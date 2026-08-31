const { effectiveAccess, MODULE_BY_BASE_URL, AVAILABLE_MODULES } = require('../utils/subscriptionAccess');

describe('subscription access', () => {
    const now = new Date('2026-08-31T12:00:00.000Z');

    test('keeps a paid school on full access', () => {
        const result = effectiveAccess({ accessMode: 'full', status: 'active', subscriptionActive: true, subscriptionValid: '2026-09-30T00:00:00.000Z', graceDays: 0 }, now);
        expect(result.mode).toBe('full');
        expect(result.overdue).toBe(false);
    });

    test('preserves limited access before expiry', () => {
        const result = effectiveAccess({ accessMode: 'limited', status: 'active', subscriptionActive: true, subscriptionValid: '2026-09-30T00:00:00.000Z' }, now);
        expect(result.mode).toBe('limited');
    });

    test('allows the configured grace period', () => {
        const result = effectiveAccess({ accessMode: 'full', status: 'active', subscriptionActive: true, subscriptionValid: '2026-08-30T12:00:00.000Z', graceDays: 3 }, now);
        expect(result.overdue).toBe(true);
        expect(result.graceExpired).toBe(false);
        expect(result.mode).toBe('full');
    });

    test('automatically suspends after grace expires', () => {
        const result = effectiveAccess({ accessMode: 'full', status: 'active', subscriptionActive: true, subscriptionValid: '2026-08-20T12:00:00.000Z', graceDays: 3, autoSuspend: true }, now);
        expect(result.graceExpired).toBe(true);
        expect(result.mode).toBe('suspended');
    });

    test('defines only selectable modules in the route map', () => {
        expect([...new Set(Object.values(MODULE_BY_BASE_URL))].every((name) => AVAILABLE_MODULES.has(name))).toBe(true);
    });
});
