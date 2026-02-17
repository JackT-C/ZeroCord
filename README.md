# ZeroCord

A minimalistic Discord alternative. Built in React NextJS.

## Features - for now can expand ltr (NEED TO TEST THESE)

- **Real-time Messaging**
- **Voice Channels**
- **Servers & Channels**
- **Friends System**
- **Direct Messages**
- **User Presence** 
- **Message Formatting**


### Installation instructions - for bro

1. Clone the repository
```bash
git clone https://github.com/JackT-C/ZeroCord.git
cd ZeroCord
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
```

Edit `.env` and configure:
```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/zerocord"
JWT_SECRET="your-secret-key-here"
```

4. Run database migrations
```bash
npm run prisma:migrate
```

5. (Optional) Seed test data
```bash
npm run seed
```

### Running the App

Start both frontend and backend servers:
```bash
npm run dev
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

### Test Accounts

If you ran the seed script, you can use these accounts or sign up:
- alice@example.com / password123
- bob@example.com / password123
- charlie@example.com / password123

Test server invite code: `TEST-INVITE-CODE`