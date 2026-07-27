/** In-memory JWT denylist (single-instance). Entries expire with the token TTL. */
const revoked = new Map();

const prune = () => {
    const now = Date.now();
    for (const [token, exp] of revoked.entries()) {
        if (exp <= now) revoked.delete(token);
    }
};

const revokeToken = (token, expiresAtMs) => {
    if (!token) return;
    revoked.set(token, expiresAtMs || Date.now() + 24 * 60 * 60 * 1000);
    if (revoked.size > 5000) prune();
};

const isRevoked = (token) => {
    const exp = revoked.get(token);
    if (!exp) return false;
    if (exp <= Date.now()) {
        revoked.delete(token);
        return false;
    }
    return true;
};

module.exports = { revokeToken, isRevoked };
