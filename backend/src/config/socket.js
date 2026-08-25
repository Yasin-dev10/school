const { Server } = require("socket.io");
const { verifyAccessToken, parseAllowedOrigins, isAllowedLocalhostOrigin, normalizeRole } = require('../utils/security');
const { isRevoked } = require('../utils/tokenStore');
const prisma = require('./prismaClient');
const parseCookies = (header = '') => Object.fromEntries(header.split(';').map(v => v.trim()).filter(Boolean).map(v => {
    const i = v.indexOf('=');
    return i < 0 ? [v, ''] : [v.slice(0, i), decodeURIComponent(v.slice(i + 1))];
}));

let io;

const initSocket = (server) => {
    const allowedOrigins = parseAllowedOrigins();
    const socketOrigin = process.env.SOCKET_CORS_ORIGIN
        ? process.env.SOCKET_CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
        : allowedOrigins;

    const isAllowedSocketOrigin = (origin, callback) => {
        if (!origin || process.env.CORS_ALLOW_ALL === 'true') return callback(null, true);
        if (isAllowedLocalhostOrigin(origin) || socketOrigin.includes(origin)) return callback(null, true);
        return callback(new Error('CORS policy: socket origin not allowed'));
    };

    io = new Server(server, {
        cors: {
            origin: isAllowedSocketOrigin,
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.use(async (socket, next) => {
        try {
            const cookies = parseCookies(socket.handshake.headers?.cookie || '');
            const token =
                socket.handshake.auth?.token ||
                (socket.handshake.headers?.authorization || '').replace(/^Bearer\s+/i, '') ||
                socket.handshake.query?.token || cookies.token;

            if (!token) {
                return next(new Error('Authentication required'));
            }
            if (isRevoked(token)) {
                return next(new Error('Token revoked'));
            }

            const decoded = verifyAccessToken(token);
            const activeUser = await prisma.user.findUnique({ where: { id: decoded.id }, select: { status: true, tokenVersion: true } });
            if (!activeUser || activeUser.status !== 'active' || activeUser.tokenVersion !== decoded.tokenVersion) {
                return next(new Error('Session revoked'));
            }
            socket.user = {
                id: decoded.id,
                role: normalizeRole(decoded.role),
                tenantId: decoded.tenantId,
                tokenVersion: decoded.tokenVersion
            };
            const remainingMs = Math.max(0, decoded.exp * 1000 - Date.now());
            setTimeout(() => socket.disconnect(true), remainingMs).unref?.();
            next();
        } catch (err) {
            next(new Error('Invalid token'));
        }
    });

    io.on("connection", (socket) => {
        console.log("A user connected:", socket.id);

        // Auto-join the authenticated user's tenant room only
        if (socket.user?.tenantId) {
            socket.join(String(socket.user.tenantId));
        }

        socket.on("join-tenant", (tenantId) => {
            if (!tenantId || String(tenantId) !== String(socket.user?.tenantId)) {
                socket.emit('error', { message: 'Forbidden tenant room' });
                return;
            }
            socket.join(String(tenantId));
        });

        socket.on('chat:join', async (conversationId) => {
            try {
                const allowed = await prisma.chatConversation.findFirst({
                    where: {
                        id: String(conversationId), tenantId: socket.user.tenantId,
                        ...(['school-admin', 'super-admin'].includes(socket.user.role) ? {} : { participants: { some: { userId: socket.user.id } } })
                    }, select: { id: true }
                });
                if (!allowed) return socket.emit('chat:error', { message: 'Conversation access denied' });
                socket.join(`chat:${allowed.id}`);
            } catch (_) {
                socket.emit('chat:error', { message: 'Could not join conversation' });
            }
        });

        socket.on('chat:leave', (conversationId) => socket.leave(`chat:${String(conversationId)}`));

        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.id);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

const emitToTenant = (tenantId, event, data) => {
    if (io) {
        io.to(String(tenantId)).emit(event, data);
    }
};

module.exports = { initSocket, getIO, emitToTenant };
