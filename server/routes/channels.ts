import { Router } from 'express';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Create channel
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  const { serverId, name, type } = req.body;

  if (!serverId || !name || !type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Check if user is server owner
    const server = await prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    if (server.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Only owner can create channels' });
    }

    const channel = await prisma.channel.create({
      data: {
        serverId,
        name: name.trim(),
        type,
      },
    });

    res.status(201).json(channel);
  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get channels for a server
router.get('/server/:serverId', authMiddleware, async (req: AuthRequest, res) => {
  const { serverId } = req.params;

  try {
    // Check if user is a member
    const member = await prisma.serverMember.findFirst({
      where: {
        serverId,
        userId: req.userId,
      },
    });

    if (!member) {
      return res.status(403).json({ error: 'Not a member of this server' });
    }

    const channels = await prisma.channel.findMany({
      where: { serverId },
      orderBy: { createdAt: 'asc' },
    });

    res.json(channels);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete channel (owner only)
router.delete('/:channelId', authMiddleware, async (req: AuthRequest, res) => {
  const { channelId } = req.params;

  try {
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: { server: true },
    });

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    if (channel.server.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Only owner can delete channels' });
    }

    await prisma.channel.delete({
      where: { id: channelId },
    });

    res.json({ message: 'Channel deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
