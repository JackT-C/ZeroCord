import { Router } from 'express';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { createMessageLimiter } from '../middleware/rateLimiter';

const router = Router();

// Get messages for a channel
router.get('/:channelId', authMiddleware, async (req: AuthRequest, res) => {
  const { channelId } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;

  try {
    // Check if user has access to this channel
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

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const isMember = channel.server.members.some((m) => m.userId === req.userId);
    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this server' });
    }

    const messages = await prisma.message.findMany({
      where: { channelId },
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

// Send message to channel
router.post('/', authMiddleware, createMessageLimiter, async (req: AuthRequest, res) => {
  const { channelId, content } = req.body;

  if (!channelId || !content || content.trim().length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (content.length > 2000) {
    return res.status(400).json({ error: 'Message too long (max 2000 characters)' });
  }

  try {
    // Check if user has access
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

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const isMember = channel.server.members.some((m) => m.userId === req.userId);
    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this server' });
    }

    const message = await prisma.message.create({
      data: {
        channelId,
        senderId: req.userId!,
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
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete message
router.delete('/:messageId', authMiddleware, async (req: AuthRequest, res) => {
  const { messageId } = req.params;

  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.senderId !== req.userId) {
      return res.status(403).json({ error: 'Can only delete own messages' });
    }

    await prisma.message.delete({
      where: { id: messageId },
    });

    res.json({ message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
