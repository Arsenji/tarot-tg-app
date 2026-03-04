#!/usr/bin/env node
/**
 * Генерация bcrypt-хеша для ADMIN_PASSWORD_HASH.
 * Запуск: node scripts/generateAdminHash.js [password]
 * Или:   npm run generate-admin-hash -- [password]
 *
 * Если пароль не передан — запрашивается интерактивно.
 */

const bcrypt = require('bcryptjs');

const password = process.argv[2] || (() => {
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question('Enter admin password: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
})();

async function main() {
  const pwd = typeof password === 'string' ? password : await password;
  if (!pwd || !pwd.trim()) {
    console.error('Error: password cannot be empty');
    process.exit(1);
  }
  const hash = await bcrypt.hash(pwd.trim(), 10);
  console.log('\nAdd to your .env:\n');
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
  console.log('\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
