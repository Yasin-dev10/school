import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initSocket = (tenantId: string) => {
    if (socket) return socket;

    const defaultUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : 'https://school-ta8j.onrender.com';
    socket = io(process.env.NEXT_PUBLIC_API_URL || defaultUrl);

    socket.on('connect', () => {
        console.log('Connected to socket server');
        if (tenantId) {
            socket?.emit('join-tenant', tenantId);
        }
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from socket server');
    });

    return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
