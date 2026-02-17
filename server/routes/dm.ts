import { Router } from 'express';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { createMessageLimiter } from '../middleware/rateLimiter';

const router = Router();

// Get DM conversation with a friend
router.get('/:friendId', authMiddleware, async (req: AuthRequest, res) => {
  const { friendId } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;

  try {
    // Check if they are friends
    const friendship = await prisma.friend.findFirst({
      where: {
        OR: [
          { userId: req.userId, friendId, status: 'ACCEPTED' },
          { userId: friendId, friendId: req.userId, status: 'ACCEPTED' },
        ],
      },
    });

    if (!friendship) {
      return res.status(403).json({ error: 'Not friends with this user' });
    }

    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: req.userId, receiverId: friendId },
          { senderId: friendId, receiverId: req.userId },
        ],
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
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Send DM
router.post('/', authMiddleware, createMessageLimiter, async (req: AuthRequest, res) => {
  const { receiverId, content } = req.body;

  if (!receiverId || !content || content.trim().length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (content.length > 2000) {
    return res.status(400).json({ error: 'Message too long (max 2000 characters)' });
  }

  try {
    // Check if they are friends
    const friendship = await prisma.friend.findFirst({
      where: {
        OR: [
          { userId: req.userId, friendId: receiverId, status: 'ACCEPTED' },
          { userId: receiverId, friendId: req.userId, status: 'ACCEPTED' },
        ],
      },
    });

    if (!friendship) {
      return res.status(403).json({ error: 'Not friends with this user' });
    }

    const message = await prisma.directMessage.create({
      data: {
        senderId: req.userId!,
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

    res.status(201).json(message);
  } catch (error) {
    console.error('Send DM error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
