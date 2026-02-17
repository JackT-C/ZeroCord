import { Router } from 'express';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Create server
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  const { name } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Server name is required' });
  }

  try {
    const server = await prisma.server.create({
      data: {
        name: name.trim(),
        ownerId: req.userId!,
        inviteCode: uuidv4(),
        members: {
          create: {
            userId: req.userId!,
          },
        },
        channels: {
          create: [
            { name: 'general', type: 'TEXT' },
            { name: 'General Voice', type: 'VOICE' },
          ],
        },
      },
      include: {
        channels: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                status: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json(server);
  } catch (error) {
    console.error('Create server error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Join server via invite code
router.post('/join', authMiddleware, async (req: AuthRequest, res) => {
  const { inviteCode } = req.body;

  if (!inviteCode) {
    return res.status(400).json({ error: 'Invite code is required' });
  }

  try {
    const server = await prisma.server.findUnique({
      where: { inviteCode },
      include: {
        members: true,
      },
    });

    if (!server) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    // Check 10 member limit
    if (server.members.length >= 10) {
      return res.status(400).json({ error: 'Server is full (max 10 members)' });
    }

    // Check if already a member
    const existingMember = server.members.find((m) => m.userId === req.userId);
    if (existingMember) {
      return res.status(400).json({ error: 'Already a member of this server' });
    }

    await prisma.serverMember.create({
      data: {
        serverId: server.id,
        userId: req.userId!,
      },
    });

    const updatedServer = await prisma.server.findUnique({
      where: { id: server.id },
      include: {
        channels: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                status: true,
              },
            },
          },
        },
      },
    });

    res.json(updatedServer);
  } catch (error) {
    console.error('Join server error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's servers
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const serverMembers = await prisma.serverMember.findMany({
      where: { userId: req.userId },
      include: {
        server: {
          include: {
            channels: true,
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const servers = serverMembers.map((sm) => sm.server);
    res.json(servers);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get server by ID
router.get('/:serverId', authMiddleware, async (req: AuthRequest, res) => {
  const { serverId } = req.params;

  try {
    const server = await prisma.server.findUnique({
      where: { id: serverId },
      include: {
        channels: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Check if user is a member
    const isMember = server.members.some((m) => m.userId === req.userId);
    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this server' });
    }

    res.json(server);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Leave server
router.post('/:serverId/leave', authMiddleware, async (req: AuthRequest, res) => {
  const { serverId } = req.params;

  try {
    const server = await prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    if (server.ownerId === req.userId) {
      return res.status(400).json({ error: 'Owner cannot leave server. Delete it instead.' });
    }

    await prisma.serverMember.deleteMany({
      where: {
        serverId,
        userId: req.userId,
      },
    });

    res.json({ message: 'Left server successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete server (owner only)
router.delete('/:serverId', authMiddleware, async (req: AuthRequest, res) => {
  const { serverId } = req.params;

  try {
    const server = await prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    if (server.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Only owner can delete server' });
    }

    await prisma.server.delete({
      where: { id: serverId },
    });

    res.json({ message: 'Server deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
