/**
 * Permission mapping for different administrative roles.
 * 'user' role is intentionally excluded as it should NOT have access at all.
 */
export const ROLE_PERMISSIONS = {
    admin: {
        allowedPaths: ['*', '/', '/users', '/config', '/collection-centers', '/physical-deposits', '/payment-methods', '/cashier', '/treasury'], // Admin can access everything
        restrictedActions: []
    },
    oficinista: {
        allowedPaths: ['/', '/collection-centers', '/config', '/treasury'], // Oficinista: centers, payments, treasury
        restrictedActions: ['delete_user', 'change_any_password', 'manage_staff']
    },
    cajero: {
        allowedPaths: ['/', '/physical-deposits', '/cashier'], // Cajero: physical deposits, cashier queue
        restrictedActions: ['manage_users', 'view_reports_sensitive']
    }
};

/**
 * Checks if a role has permission to access a specific path.
 * @param {string} role - The user role
 * @param {string} path - The path to check
 * @returns {boolean}
 */
export const hasPermission = (role, path) => {
    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions) return false;

    if (permissions.allowedPaths.includes('*')) return true;
    return permissions.allowedPaths.includes(path);
};

/**
 * Checks if a role is allowed to perform a specific action.
 * @param {string} role - The user role
 * @param {string} action - The action identifier
 * @returns {boolean}
 */
export const canPerform = (role, action) => {
    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions) return false;

    return !permissions.restrictedActions.includes(action);
};
