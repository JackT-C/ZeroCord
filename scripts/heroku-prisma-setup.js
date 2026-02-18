/**
 * Fixes the DATABASE_URL for Heroku Postgres before prisma commands.
 * Heroku provides postgres:// but Prisma needs postgresql:// with SSL.
 * Run with: node scripts/heroku-prisma-setup.js
 */
const { execSync } = require('child_process');

let url = process.env.DATABASE_URL || '';

if (url.startsWith('postgres://')) {
  url = url.replace('postgres://', 'postgresql://');
  if (!url.includes('sslmode')) {
    url += '?sslmode=no-verify';
  }
  process.env.DATABASE_URL = url;
}

console.log('Running prisma db push --force-reset...');
try {
  execSync('npx prisma db push --force-reset', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  });
  console.log('prisma db push completed successfully.');
} catch (err) {
  console.error('prisma db push failed:', err.message);
  process.exit(1);
}
