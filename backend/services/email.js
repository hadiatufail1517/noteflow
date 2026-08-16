const nodemailer = require('nodemailer');

const getTransporter = async () => {
  // Always generate a test SMTP service account from ethereal.email
  const testAccount = await nodemailer.createTestAccount();
  return {
    transporter: nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    }),
    user: testAccount.user
  };
};

exports.sendShareEmail = async ({ to, ownerName, noteTitle, permission }) => {
  try {
    const { transporter, user } = await getTransporter();

    const info = await transporter.sendMail({
      from: `"NoteHub Sharing" <${user}>`,
      to,
      subject: `NoteHub: ${ownerName} shared a note with you!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #14b8a6; border-bottom: 2px solid #14b8a6; padding-bottom: 10px;">Note Shared on NoteHub</h2>
          <p>Hello,</p>
          <p><strong>${ownerName}</strong> has shared a document with you on NoteHub.</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; font-size: 16px;"><strong>Note Title:</strong> "${noteTitle}"</p>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;"><strong>Access Level:</strong> ${permission === 'edit' ? 'Can Edit' : 'View Only'}</p>
          </div>
          <p>You can view and collaborate on this note inside your NoteHub workspace under the <strong>"Shared Notes"</strong> section.</p>
          <p style="margin-top: 30px;"><a href="http://localhost:3000/shared-notes" style="background-color: #14b8a6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Open Shared Notes Workspace</a></p>
          <hr style="border: 0; border-top: 1px solid #e0e0e0; margin-top: 40px;" />
          <p style="font-size: 12px; color: #888; text-align: center;">This is an automated notification from NoteHub Assistant.</p>
        </div>
      `
    });

    console.log('\n==================================================');
    console.log('   ETHEREAL EMAIL SENT');
    console.log('==================================================');
    console.log(`To: ${to}`);
    console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    console.log('==================================================\n');

    return info;
  } catch (err) {
    console.error('Failed to send share email notification:', err);
    throw err;
  }
};

exports.sendInviteEmail = async ({ to, ownerName, noteTitle }) => {
  try {
    const { transporter, user } = await getTransporter();

    const info = await transporter.sendMail({
      from: `"NoteHub Sharing" <${user}>`,
      to,
      subject: `NoteHub: You are invited to collaborate!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #14b8a6; border-bottom: 2px solid #14b8a6; padding-bottom: 10px;">Collaboration Invitation</h2>
          <p>Hello,</p>
          <p><strong>${ownerName}</strong> has invited you to collaborate on NoteHub.</p>
          <p>They want to share the note <strong>"${noteTitle}"</strong> with you.</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #555;">Since you don't have a NoteHub account yet, click the link below to sign up. The note will be automatically added to your workspace as soon as you register!</p>
          </div>
          <p style="margin-top: 30px;"><a href="http://localhost:3000/register" style="background-color: #14b8a6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Register and Join NoteHub</a></p>
          <hr style="border: 0; border-top: 1px solid #e0e0e0; margin-top: 40px;" />
          <p style="font-size: 12px; color: #888; text-align: center;">This is an automated notification from NoteHub Assistant.</p>
        </div>
      `
    });

    console.log('\n==================================================');
    console.log('   ETHEREAL EMAIL SENT');
    console.log('==================================================');
    console.log(`To: ${to}`);
    console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    console.log('==================================================\n');

    return info;
  } catch (err) {
    console.error('Failed to send invite email notification:', err);
    throw err;
  }
};
