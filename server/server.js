import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Storage
const users = {};
const rooms = {};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join-room', (roomId, name) => {
        socket.join(roomId);
        // We create the user object dynamically
        users[socket.id] = { 
            id: socket.id, 
            roomId, 
            name, 
            isSnatched: false, 
            snatchedWith: null 
        };
        
        if (!rooms[roomId]) rooms[roomId] = [];
        rooms[roomId].push(socket.id);

        // Notify others
        socket.to(roomId).emit('user-connected', { userId: socket.id, name });

        // Send existing users to the new joiner
        const usersInRoom = rooms[roomId]
            .filter(id => id !== socket.id)
            .map(id => users[id]);
        socket.emit('existing-users', usersInRoom);
    });

    // --- SNATCH LOGIC (NEW) ---

    // 1. Handle Request
    socket.on('request-snatch', ({ targetUserId }) => {
        const requester = users[socket.id];
        // Forward the request to the target
        io.to(targetUserId).emit('snatch-request', { 
            fromId: socket.id, 
            fromName: requester ? requester.name : 'Unknown' 
        });
    });

    // 2. Handle Acceptance
    socket.on('accept-snatch', ({ requesterId }) => {
        const accepterId = socket.id;
        
        // Update server state
        if (users[requesterId]) {
            users[requesterId].isSnatched = true;
            users[requesterId].snatchedWith = accepterId;
        }
        if (users[accepterId]) {
            users[accepterId].isSnatched = true;
            users[accepterId].snatchedWith = requesterId;
        }

        // Notify the pair that snatch started
        io.to(requesterId).emit('snatch-started', { withId: accepterId });
        io.to(accepterId).emit('snatch-started', { withId: requesterId });

        // Notify the room (Sid) to blur these users
        if (users[accepterId]) {
            const roomId = users[accepterId].roomId;
            io.to(roomId).emit('users-snatched-update', { 
                snatchedUsers: [requesterId, accepterId] 
            });
        }
    });

    // --- WebRTC Signaling ---
    
    socket.on('offer', (payload) => {
        io.to(payload.target).emit('offer', payload);
    });

    socket.on('answer', (payload) => {
        io.to(payload.target).emit('answer', payload);
    });

    socket.on('ice-candidate', (payload) => {
        io.to(payload.target).emit('ice-candidate', payload);
    });

    // --- Disconnect ---

    socket.on('disconnect', () => {
        const user = users[socket.id];
        if (user) {
            rooms[user.roomId] = rooms[user.roomId].filter(id => id !== socket.id);
            socket.to(user.roomId).emit('user-disconnected', user.id);
            delete users[socket.id];
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Snatch Server running on port ${PORT}`));