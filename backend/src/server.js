require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/db');
const { initSocket } = require('./config/socket');
const { retryFailedPushDeliveries, processEventReminders } = require('./services/notification.service');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

const startServer = async () => {
    try {
        await connectDB();
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT}`);
        });
        const retryTimer = setInterval(() => {
            retryFailedPushDeliveries().catch(error => console.error('Push retry worker failed:', error.message));
        }, Number(process.env.PUSH_RETRY_INTERVAL_MS || 60000));
        retryTimer.unref();
        const calendarTimer = setInterval(() => {
            processEventReminders().catch(error => console.error('Calendar reminder worker failed:', error.message));
        }, Number(process.env.CALENDAR_REMINDER_INTERVAL_MS || 60000));
        calendarTimer.unref();
    } catch (error) {
        console.error('Server startup failed because the database connection could not be established.');
        process.exit(1);
    }
};

startServer();
