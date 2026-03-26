require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('./config/passport');

const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const { initSocket } = require('./socket/socketHandler');

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
});

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

app.use('/auth', authRoutes);
app.use('/documents', documentRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok' }));

initSocket(io);

const PORT = process.env.PORT || 8000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
