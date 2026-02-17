/**
 * Optional: Database Seeding Script
 * 
 * This script can be used to populate the database with sample data for testing.
 * Run with: npx ts-node prisma/seed.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test users
  const password = await bcrypt.hash('password123', 10);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      username: 'alice',
      email: 'alice@example.com',
      passwordHash: password,
      status: 'OFFLINE',
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      username: 'bob',
      email: 'bob@example.com',
      passwordHash: password,
      status: 'OFFLINE',
    },
  });

  const charlie = await prisma.user.upsert({
    where: { email: 'charlie@example.com' },
    update: {},
    create: {
      username: 'charlie',
      email: 'charlie@example.com',
      passwordHash: password,
      status: 'OFFLINE',
    },
  });

  console.log('✅ Created test users: alice, bob, charlie (password: password123)');

  // Create friendships
  await prisma.friend.upsert({
    where: {
      userId_friendId: {
        userId: alice.id,
        friendId: bob.id,
      },
    },
    update: {},
    create: {
      userId: alice.id,
      friendId: bob.id,
      status: 'ACCEPTED',
    },
  });

  await prisma.friend.upsert({
    where: {
      userId_friendId: {
        userId: alice.id,
        friendId: charlie.id,
      },
    },
    update: {},
    create: {
      userId: alice.id,
      friendId: charlie.id,
      status: 'ACCEPTED',
    },
  });

  console.log('✅ Created friendships');

  // Create a test server
  const server = await prisma.server.create({
    data: {
      name: 'Test Server',
      ownerId: alice.id,
      inviteCode: 'TEST-INVITE-CODE',
      members: {
        create: [
          { userId: alice.id },
          { userId: bob.id },
          { userId: charlie.id },
        ],
      },
      channels: {
        create: [
          { name: 'general', type: 'TEXT' },
          { name: 'random', type: 'TEXT' },
          { name: 'General Voice', type: 'VOICE' },
        ],
      },
    },
    include: {
      channels: true,
    },
  });

  console.log('✅ Created test server with 3 members and 3 channels');
  console.log(`   Invite code: TEST-INVITE-CODE`);

  // Create some test messages
  const generalChannel = server.channels.find((c) => c.name === 'general');
  if (generalChannel) {
    await prisma.message.createMany({
      data: [
        {
          channelId: generalChannel.id,
          senderId: alice.id,
          content: 'Welcome to the test server!',
        },
        {
          channelId: generalChannel.id,
          senderId: bob.id,
          content: 'Thanks for the invite!',
        },
        {
          channelId: generalChannel.id,
          senderId: charlie.id,
          content: 'Hello everyone! 👋',
        },
        {
          channelId: generalChannel.id,
          senderId: alice.id,
          content: 'Testing **bold** and *italic* formatting',
        },
        {
          channelId: generalChannel.id,
          senderId: bob.id,
          content: 'Check out this link: https://example.com',
        },
      ],
    });

    console.log('✅ Created test messages in #general');
  }

  // Create some direct messages
  await prisma.directMessage.createMany({
    data: [
      {
        senderId: alice.id,
        receiverId: bob.id,
        content: 'Hey Bob, how are you?',
      },
      {
        senderId: bob.id,
        receiverId: alice.id,
        content: "I'm good! How about you?",
      },
      {
        senderId: alice.id,
        receiverId: bob.id,
        content: 'Doing great, thanks!',
      },
    ],
  });

  console.log('✅ Created test direct messages');

  console.log('\n🎉 Seeding completed successfully!\n');
  console.log('Test Accounts:');
  console.log('  - alice@example.com / password123');
  console.log('  - bob@example.com / password123');
  console.log('  - charlie@example.com / password123\n');
  console.log('Test Server Invite: TEST-INVITE-CODE\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
