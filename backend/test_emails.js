const { sendShareEmail, sendInviteEmail } = require('./services/email');

async function test() {
  console.log('==================================================');
  console.log('   STARTING NODE-MAILER EMAIL DISPATCH TEST');
  console.log('==================================================\n');

  try {
    console.log('1. Dispatching Share Note Email notification...');
    const res1 = await sendShareEmail({
      to: 'recipient_test@example.com',
      ownerName: 'Test Owner',
      noteTitle: 'Project Alpha Specifications Draft',
      permission: 'edit'
    });

    console.log(`✓ Share Note email test successful! Message ID: ${res1.messageId}\n`);

    console.log('2. Dispatching Invite Email notification...');
    const res2 = await sendInviteEmail({
      to: 'unregistered_test@example.com',
      ownerName: 'Test Owner',
      noteTitle: 'Project Alpha Specifications Draft'
    });

    console.log(`✓ Invite email test successful! Message ID: ${res2.messageId}\n`);

    console.log('==================================================');
    console.log('   ALL NODE-MAILER DISPATCH TESTS PASSED!');
    console.log('==================================================');
  } catch (err) {
    console.error('Email test execution failed:', err);
  } finally {
    process.exit(0);
  }
}

test();
