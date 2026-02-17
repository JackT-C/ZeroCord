import { Router } from 'express';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Send friend request
router.post('/request', authMiddleware, async (req: AuthRequest, res) => {
  const { friendId } = req.body;

  if (!friendId) {
    return res.status(400).json({ error: 'Friend ID is required' });
  }

  try {
    // Check if already friends
    const existing = await prisma.friend.findFirst({
      where: {
        OR: [
          { userId: req.userId, friendId },
          { userId: friendId, friendId: req.userId },
        ],
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Friend request already exists' });
    }

    const friendRequest = await prisma.friend.create({
      data: {
        userId: req.userId!,
        friendId,
        status: 'PENDING',
      },
      include: {
        friend: {
          select: {
            id: true,
            username: true,
            status: true,
          },
        },
      },
    });

    res.status(201).json(friendRequest);
  } catch (error) {
    console.error('Friend request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get friend requests (received)
router.get('/requests', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const requests = await prisma.friend.findMany({
      where: {
        friendId: req.userId,
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            status: true,
          },
        },
      },
    });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Accept friend request
router.post('/accept/:requestId', authMiddleware, async (req: AuthRequest, res) => {
  const { requestId } = req.params;

  try {
    const request = await prisma.friend.findUnique({
      where: { id: requestId },
    });

    if (!request || request.friendId !== req.userId) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const updated = await prisma.friend.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            status: true,
          },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Decline/remove friend
router.delete('/:requestId', authMiddleware, async (req: AuthRequest, res) => {
  const { requestId } = req.params;

  try {
    const request = await prisma.friend.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Only allow deletion if user is involved
    if (request.userId !== req.userId && request.friendId !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await prisma.friend.delete({
      where: { id: requestId },
    });

    res.json({ message: 'Friend removed' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get friends list
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const friends = await prisma.friend.findMany({
      where: {
        OR: [
          { userId: req.userId, status: 'ACCEPTED' },
          { friendId: req.userId, status: 'ACCEPTED' },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            status: true,
          },
        },
        friend: {
          select: {
            id: true,
            username: true,
            status: true,
          },
        },
      },
    });

    // Map to return only the friend data (not the current user)
    const friendsList = friends.map((f) => ({
      id: f.id,
      friend: f.userId === req.userId ? f.friend : f.user,
    }));

    res.json(friendsList);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
