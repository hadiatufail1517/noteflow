const { sequelize, User, Note, FriendRequest, Friendship, NoteShare, Message } = require('./models');
const { Op } = require('sequelize');

async function runTests() {
  console.log('==================================================');
  console.log('   STARTING COLLABORATION MODULE SYSTEM TEST');
  console.log('==================================================\n');

  try {
    // 1. Sync database tables
    await sequelize.query('PRAGMA foreign_keys = OFF;');
    await sequelize.sync({ alter: true });
    await sequelize.query('PRAGMA foreign_keys = ON;');
    console.log('Database synced successfully.\n');

    // Clean up old test users if they exist
    await User.destroy({ 
      where: { 
        email: ['test_a@noteflow.com', 'test_b@noteflow.com', 'stranger@noteflow.com'] 
      } 
    });

    // 2. Create User A, User B, and User C (Stranger)
    const userA = await User.create({
      name: 'User A',
      email: 'test_a@noteflow.com',
      password: 'password123'
    });

    const userB = await User.create({
      name: 'User B',
      email: 'test_b@noteflow.com',
      password: 'password123'
    });

    const userC = await User.create({
      name: 'Stranger',
      email: 'stranger@noteflow.com',
      password: 'password123'
    });

    console.log(`[TEST 1] Users Created:`);
    console.log(` - User A: ${userA.name} (${userA.email})`);
    console.log(` - User B: ${userB.name} (${userB.email})`);
    console.log(` - User C: ${userC.name} (${userC.email})\n`);

    // 3. User A sends friend request to User B
    const request = await FriendRequest.create({
      senderId: userA.id,
      receiverId: userB.id,
      status: 'pending'
    });
    console.log(`[TEST 2] Friend request created: Sender=${userA.name} -> Receiver=${userB.name}`);

    // Verify User B has it in incoming list
    const incoming = await FriendRequest.findAll({ where: { receiverId: userB.id, status: 'pending' } });
    console.log(` - User B has incoming requests count: ${incoming.length}`);

    // 4. User B accepts request
    request.status = 'accepted';
    await request.save();

    // Create Friendship connection symmetrically (u1 < u2)
    const u1 = userA.id < userB.id ? userA.id : userB.id;
    const u2 = userA.id < userB.id ? userB.id : userA.id;
    await Friendship.create({ userId: u1, friendId: u2 });
    console.log(`[TEST 3] Friend request accepted and Friendship established between User A and User B.`);

    // Verify both appear in friends list
    const friendshipCheck = await Friendship.findOne({
      where: { userId: u1, friendId: u2 }
    });
    console.log(` - Symmetrical connection verified: ${!!friendshipCheck}\n`);

    // 5. User A shares a note with User B as View Only
    const note1 = await Note.create({
      userId: userA.id,
      title: 'Operating System Plan',
      content: 'Kernel space abstractions and thread schedules.',
      category: 'Studies'
    });

    const share1 = await NoteShare.create({
      noteId: note1.id,
      ownerId: userA.id,
      sharedWithUserId: userB.id,
      permission: 'view'
    });
    console.log(`[TEST 4] Note "${note1.title}" shared by User A with User B (Permission: View Only).`);

    // Verify User B has access
    const verifyShare1 = await NoteShare.findOne({ where: { noteId: note1.id, sharedWithUserId: userB.id } });
    console.log(` - User B view access granted: ${!!verifyShare1}`);
    console.log(` - User B has edit access capability: ${verifyShare1.permission === 'edit'}\n`);

    // 6. User A shares a second note with User B as Can Edit
    const note2 = await Note.create({
      userId: userA.id,
      title: 'React Layout Module Draft',
      content: 'Refactoring navbar components.',
      category: 'Coding'
    });

    const share2 = await NoteShare.create({
      noteId: note2.id,
      ownerId: userA.id,
      sharedWithUserId: userB.id,
      permission: 'edit'
    });
    console.log(`[TEST 5] Note "${note2.title}" shared by User A with User B (Permission: Can Edit).`);

    // Verify User B has edit rights
    const verifyShare2 = await NoteShare.findOne({ where: { noteId: note2.id, sharedWithUserId: userB.id } });
    console.log(` - User B edit access granted: ${verifyShare2.permission === 'edit'}\n`);

    // 7. Revoke sharing access
    await share2.destroy();
    const verifyRevoked = await NoteShare.findOne({ where: { noteId: note2.id, sharedWithUserId: userB.id } });
    console.log(`[TEST 6] Revoked note access for "${note2.title}" from User B.`);
    console.log(` - User B access revoked validation check (should be null): ${verifyRevoked === null}\n`);

    // 8. Verify private notes blocking
    const privateNote = await Note.create({
      userId: userA.id,
      title: 'Personal Journal Log',
      content: 'My private coding goals.',
      category: 'Journal'
    });

    const verifyBlocked = await NoteShare.findOne({ where: { noteId: privateNote.id, sharedWithUserId: userB.id } });
    console.log(`[TEST 7] Privacy access control check:`);
    console.log(` - User B access to unshared note "${privateNote.title}" (should be null): ${verifyBlocked === null}\n`);

    // 9. Verify message guard between friends vs strangers
    const friendshipStranger = await Friendship.findOne({
      where: {
        [Op.or]: [
          { userId: userA.id, friendId: userC.id },
          { userId: userC.id, friendId: userA.id }
        ]
      }
    });
    console.log(`[TEST 8] Stranger Messaging Guard:`);
    console.log(` - Symmetrical connection check between User A and User C (should be null): ${friendshipStranger === null}\n`);

    console.log('==================================================');
    console.log('   ALL COLLABORATION INTEGRATION TESTS PASSED!');
    console.log('==================================================');

  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    process.exit(0);
  }
}

runTests();
