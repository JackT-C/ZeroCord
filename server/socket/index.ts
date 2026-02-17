import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

const userSockets = new Map<string, string>(); // userId -> socketId

export const initializeSocketHandlers = (io: SocketIOServer) => {
  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket: AuthenticatedSocket) => {
    console.log('User connected:', socket.userId);

    if (!socket.userId) return;

    // Store socket connection
    userSockets.set(socket.userId, socket.id);

    // Update user status to online
    await prisma.user.update({
      where: { id: socket.userId },
      data: { status: 'ONLINE' },
    });

    // Notify friends about online status
    const friends = await prisma.friend.findMany({
      where: {
        OR: [
          { userId: socket.userId, status: 'ACCEPTED' },
          { friendId: socket.userId, status: 'ACCEPTED' },
        ],
      },
    });

    friends.forEach((friend) => {
      const friendId = friend.userId === socket.userId ? friend.friendId : friend.userId;
      const friendSocketId = userSockets.get(friendId);
      if (friendSocketId) {
        io.to(friendSocketId).emit('friend:status', {
          userId: socket.userId,
          status: 'ONLINE',
        });
      }
    });

    // Join server rooms
    const serverMembers = await prisma.serverMember.findMany({
      where: { userId: socket.userId },
    });
    serverMembers.forEach((member) => {
      socket.join(`server:${member.serverId}`);
    });

    // Handle new message in channel
    socket.on('message:send', async (data: { channelId: string; content: string }) => {
      try {
        const { channelId, content } = data;

        // Verify access
        const channel = await prisma.channel.findUnique({
          where: { id: channelId },
          include: {
            server: {
              include: {
                members: true,
              },
            },
          },
        });

        if (!channel) return;

        const isMember = channel.server.members.some((m) => m.userId === socket.userId);
        if (!isMember) return;

        const message = await prisma.message.create({
          data: {
            channelId,
            senderId: socket.userId!,
            content: content.trim(),
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                status: true,
              },
            },
          },
        });

        // Broadcast to server room
        io.to(`server:${channel.serverId}`).emit('message:new', message);
      } catch (error) {
        console.error('Message send error:', error);
      }
    });

    // Handle message deletion
    socket.on('message:delete', async (data: { messageId: string }) => {
      try {
        const message = await prisma.message.findUnique({
          where: { id: data.messageId },
          include: { channel: true },
        });

        if (!message || message.senderId !== socket.userId) return;

        await prisma.message.delete({
          where: { id: data.messageId },
        });

        io.to(`server:${message.channel.serverId}`).emit('message:deleted', {
          messageId: data.messageId,
          channelId: message.channelId,
        });
      } catch (error) {
        console.error('Message delete error:', error);
      }
    });

    // Handle DM
    socket.on('dm:send', async (data: { receiverId: string; content: string }) => {
      try {
        const { receiverId, content } = data;

        // Check friendship
        const friendship = await prisma.friend.findFirst({
          where: {
            OR: [
              { userId: socket.userId, friendId: receiverId, status: 'ACCEPTED' },
              { userId: receiverId, friendId: socket.userId, status: 'ACCEPTED' },
            ],
          },
        });

        if (!friendship) return;

        const message = await prisma.directMessage.create({
          data: {
            senderId: socket.userId!,
            receiverId,
            content: content.trim(),
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                status: true,
              },
            },
          },
        });

        // Send to receiver
        const receiverSocketId = userSockets.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('dm:new', message);
        }

        // Echo back to sender
        socket.emit('dm:new', message);
      } catch (error) {
        console.error('DM send error:', error);
      }
    });

    // Handle typing indicator
    socket.on('typing:start', (data: { channelId?: string; dmUserId?: string }) => {
      if (data.channelId) {
        socket.to(`server:${data.channelId}`).emit('typing:start', {
          userId: socket.userId,
          channelId: data.channelId,
        });
      } else if (data.dmUserId) {
        const recipientSocketId = userSockets.get(data.dmUserId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('typing:start', {
            userId: socket.userId,
          });
        }
      }
    });

    socket.on('typing:stop', (data: { channelId?: string; dmUserId?: string }) => {
      if (data.channelId) {
        socket.to(`server:${data.channelId}`).emit('typing:stop', {
          userId: socket.userId,
          channelId: data.channelId,
        });
      } else if (data.dmUserId) {
        const recipientSocketId = userSockets.get(data.dmUserId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('typing:stop', {
            userId: socket.userId,
          });
        }
      }
    });

    // Voice channel events
    socket.on('voice:join', (data: { channelId: string }) => {
      socket.join(`voice:${data.channelId}`);
      socket.to(`voice:${data.channelId}`).emit('voice:user-joined', {
        userId: socket.userId,
        channelId: data.channelId,
      });
    });

    socket.on('voice:leave', (data: { channelId: string }) => {
      socket.leave(`voice:${data.channelId}`);
      socket.to(`voice:${data.channelId}`).emit('voice:user-left', {
        userId: socket.userId,
        channelId: data.channelId,
      });
    });

    // WebRTC signaling for voice
    socket.on('voice:signal', (data: { to: string; signal: any; channelId: string }) => {
      const recipientSocketId = userSockets.get(data.to);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('voice:signal', {
          from: socket.userId,
          signal: data.signal,
          channelId: data.channelId,
        });
      }
    });

    // DM voice call signaling
    socket.on('call:signal', (data: { to: string; signal: any; type: 'offer' | 'answer' }) => {
      const recipientSocketId = userSockets.get(data.to);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('call:signal', {
          from: socket.userId,
          signal: data.signal,
          type: data.type,
        });
      }
    });

    socket.on('call:start', (data: { to: string }) => {
      const recipientSocketId = userSockets.get(data.to);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('call:incoming', {
          from: socket.userId,
        });
      }
    });

    socket.on('call:accept', (data: { to: string }) => {
      const recipientSocketId = userSockets.get(data.to);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('call:accepted', {
          from: socket.userId,
        });
      }
    });

    socket.on('call:decline', (data: { to: string }) => {
      const recipientSocketId = userSockets.get(data.to);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('call:declined', {
          from: socket.userId,
        });
      }
    });

    socket.on('call:end', (data: { to: string }) => {
      const recipientSocketId = userSockets.get(data.to);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('call:ended', {
          from: socket.userId,
        });
      }
    });

    // Disconnect
    socket.on('disconnect', async () => {
      console.log('User disconnected:', socket.userId);

      if (!socket.userId) return;

      userSockets.delete(socket.userId);

      // Update status to offline
      await prisma.user.update({
        where: { id: socket.userId },
        data: { status: 'OFFLINE' },
      });

      // Notify friends
      const friends = await prisma.friend.findMany({
        where: {
          OR: [
            { userId: socket.userId, status: 'ACCEPTED' },
            { friendId: socket.userId, status: 'ACCEPTED' },
          ],
        },
      });

      friends.forEach((friend) => {
        const friendId = friend.userId === socket.userId ? friend.friendId : friend.userId;
        const friendSocketId = userSockets.get(friendId);
        if (friendSocketId) {
          io.to(friendSocketId).emit('friend:status', {
            userId: socket.userId,
            status: 'OFFLINE',
          });
        }
      });
    });
  });
};
