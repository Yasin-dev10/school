require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/db');
const { initSocket } = require('./config/socket');

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
    } catch (error) {
        console.error('Server startup failed because the database connection could not be established.');
        process.exit(1);
    }
};

startServer();
