/**
 * One-off CLI utility to promote an existing registered user to the admin role.
 * There is no UI for this by design — the first admin has to be granted out of band.
 *
 * Usage: node scripts/promoteAdmin.js user@example.com
 */
require('dotenv').config();
const User = require('../models/User');

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node scripts/promoteAdmin.js <email>');
    process.exit(1);
  }

  const user = await User.setRoleByEmail(email.toLowerCase(), 'admin');

  if (!user) {
    console.error(`No user found with email ${email}. Register the account first.`);
  } else {
    console.log(`${user.username} (${user.email}) is now an admin.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
