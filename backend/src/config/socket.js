const { Server } = require("socket.io");

let io;

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        console.log("A user connected:", socket.id);

        socket.on("join-tenant", (tenantId) => {
            socket.join(tenantId);
            console.log(`Socket ${socket.id} joined tenant room: ${tenantId}`);
        });

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
        io.to(tenantId).emit(event, data);
    }
};

module.exports = { initSocket, getIO, emitToTenant };
