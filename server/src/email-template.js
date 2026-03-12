export function buildInvitationEmail(playerNumber, name, registrationUrl) {
  const hasRegistrationLink = !!registrationUrl;

  const registrationBlock = hasRegistrationLink ? `
    <div class="message">
      You are the <strong>Team Leader</strong>. Register your team using the link below.<br>
      Fill in your team name and all member details. You have one chance.
    </div>
    <a href="${registrationUrl}" class="btn">Register Your Team</a>
    <div class="footer">Do not share this link. It is unique to you.</div>
  ` : `
    <div class="message">
      Your team leader will register your team on your behalf.<br>
      Report to the venue on event day with your player number.<br>
      The game begins soon.
    </div>
    <div class="footer">Await further instructions.</div>
  `;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 0; background: #0f0f1a; color: #e0e0e0; font-family: Arial, sans-serif; }
    .container { max-width: 500px; margin: 0 auto; padding: 40px 20px; text-align: center; }
    .header { font-size: 14px; letter-spacing: 8px; text-transform: uppercase; color: #E91E7B; margin-bottom: 10px; }
    .player-number { font-size: 72px; font-weight: bold; color: #0B6E4F; letter-spacing: 4px; margin: 20px 0; }
    .shapes { font-size: 24px; letter-spacing: 12px; color: #E91E7B; margin: 20px 0; }
    .name { font-size: 18px; color: #ffffff; margin-bottom: 30px; }
    .message { font-size: 14px; line-height: 1.8; color: #999; margin-bottom: 30px; }
    .btn { display: inline-block; background: #E91E7B; color: #ffffff; text-decoration: none; padding: 16px 40px; font-size: 16px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; }
    .footer { margin-top: 40px; font-size: 11px; color: #555; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">You Have Been Chosen</div>
    <div class="shapes">&#9675; &#9651; &#9632;</div>
    <div class="player-number">${playerNumber}</div>
    <div class="name">${name}</div>
    ${registrationBlock}
  </div>
</body>
</html>`;
}
