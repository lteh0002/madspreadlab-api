// Usage: npm run user:create -- <email> [name]   — creates a portal login
// Prompts for the password (not shown as you type), so it never lands in shell history.
// Uses MONGO_URI from .env unless it is already set in the shell.
import readline from 'node:readline';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { createUser } from '../services/auth.service.js';

const USAGE = 'Usage: npm run user:create -- <email> [name]';

function askHidden(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  let muted = false;
  rl._writeToOutput = (s) => {
    if (!muted || s.includes('\n')) rl.output.write(muted ? '\n' : s);
  };
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
    muted = true;
  });
}

const [email, ...nameParts] = process.argv.slice(2);

try {
  if (!email) throw new Error(USAGE);
  const password = await askHidden('Password: ');
  if (password !== (await askHidden('Confirm password: '))) throw new Error('Passwords do not match');

  await connectDB();
  const user = await createUser({ email, password, name: nameParts.join(' ') || undefined });
  console.log(`Database: ${mongoose.connection.host}/${mongoose.connection.name}`);
  console.log(`Created: ${user.email}${user.name ? ` (${user.name})` : ''}`);
  await disconnectDB();
} catch (err) {
  console.error(`Failed: ${err.name}: ${err.message}`);
  process.exit(1);
}
