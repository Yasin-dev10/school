import React from 'react';
import { usePermission } from '../hooks/usePermission';

interface PermissionGuardProps {
    resource: string;
    action: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({ resource, action, children, fallback = null }) => {
    const { hasPermission } = usePermission();

    // We can't easily wait for userRole to load in this simple hook version if it relies on useEffect
    // But since it's just localStorage, it should be fast. 
    // However, the first render might return false if userRole is null locally.
    // The hook uses useEffect, so there will be a re-render.

    if (hasPermission(resource, action)) {
        return <>{children}</>;
    }

    return <>{fallback}</>;
};
