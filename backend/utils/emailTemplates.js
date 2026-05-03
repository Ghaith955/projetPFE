const path = require('path');
const fs = require('fs');

const LOGO_CID = 'idss-logo';
const LOGO_PATH = path.resolve(__dirname, '..', '..', 'téléchargé.png');

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function roleLabel(role = '') {
  switch (role) {
    case 'RESPONSABLE': return 'Responsable';
    case 'ENTRAINEUR': return 'Entraineur';
    case 'NAGEUR': return 'Nageur';
    default: return role;
  }
}

function getLogoAttachment() {
  if (!fs.existsSync(LOGO_PATH)) {
    return null;
  }

  return {
    filename: 'idss-logo.png',
    path: LOGO_PATH,
    cid: LOGO_CID
  };
}

function renderEmail({ title, intro, bodyHtml, cta, footer, logoCid }) {
  const logoHtml = logoCid
    ? `<img src="cid:${logoCid}" alt="IDSS Natation" width="140" style="display:block; border:0;" />`
    : '<strong style="font-size:18px; letter-spacing:0.06em;">IDSS NATATION</strong>';

  const ctaHtml = cta
    ? `<a href="${cta.url}" style="display:inline-block; padding:12px 20px; border-radius:12px; background:#32a6ff; color:#07121d; font-weight:700; text-decoration:none;">${cta.label}</a>`
    : '';

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0; padding:0; background:#061521; color:#e8f4ff; font-family:'Segoe UI', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#061521; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px; background:#0b1e2d; border:1px solid rgba(70,158,204,0.22); border-radius:18px; box-shadow:0 18px 48px rgba(4,18,30,0.48);">
          <tr>
            <td style="padding:28px 28px 18px; text-align:left;">
              ${logoHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 12px;">
              <h1 style="margin:0; font-size:22px; font-weight:700; color:#e8f4ff;">${escapeHtml(title)}</h1>
              <p style="margin:10px 0 0; font-size:14px; color:#b0c6de; line-height:1.6;">${escapeHtml(intro)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 20px; font-size:14px; color:#e8f4ff; line-height:1.6;">
              ${bodyHtml}
            </td>
          </tr>
          ${ctaHtml ? `<tr><td style="padding:0 28px 24px;">${ctaHtml}</td></tr>` : ''}
          <tr>
            <td style="padding:18px 28px 28px; border-top:1px solid rgba(70,158,204,0.18); font-size:12px; color:#86a6c4;">
              ${escapeHtml(footer)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildPendingUserEmail({ user, frontendUrl, logoCid }) {
  const safeName = escapeHtml(`${user.prenom || ''} ${user.nom || ''}`.trim());
  const role = escapeHtml(roleLabel(user.role));

  const bodyHtml = `
    <p>Bonjour ${safeName || 'cher membre'},</p>
    <p>Votre demande d'inscription a bien ete enregistree. Elle est actuellement <strong>en attente d'approbation</strong> par l'administrateur IDSS Natation.</p>
    <p><strong>Role demande :</strong> ${role}<br />
       <strong>Email :</strong> ${escapeHtml(user.email || '')}</p>
    <p>Vous recevrez un email des que votre compte sera active.</p>
  `;

  return renderEmail({
    title: 'Inscription en attente de validation',
    intro: 'Merci pour votre demande. Nous la traitons au plus vite.',
    bodyHtml,
    cta: frontendUrl ? { label: 'Acceder a la plateforme', url: frontendUrl } : null,
    footer: 'Si vous n etes pas a l origine de cette demande, vous pouvez ignorer ce message.',
    logoCid
  });
}

function buildAdminPendingEmail({ user, dashboardUrl, logoCid }) {
  const safeName = escapeHtml(`${user.prenom || ''} ${user.nom || ''}`.trim());
  const role = escapeHtml(roleLabel(user.role));

  const bodyHtml = `
    <p>Bonjour,</p>
    <p>Une nouvelle demande d'inscription est en attente d'approbation.</p>
    <p><strong>Nom :</strong> ${safeName || '-'}<br />
       <strong>Email :</strong> ${escapeHtml(user.email || '')}<br />
       <strong>Role :</strong> ${role}</p>
    <p>Veuillez ouvrir le tableau de bord pour approuver ou rejeter cette demande.</p>
  `;

  return renderEmail({
    title: "Nouvelle demande d'inscription",
    intro: 'Une validation administrateur est requise.',
    bodyHtml,
    cta: dashboardUrl ? { label: 'Ouvrir le tableau de bord', url: dashboardUrl } : null,
    footer: 'IDSS Natation - Gestion des inscriptions',
    logoCid
  });
}

function buildApprovalEmail({ user, loginUrl, logoCid }) {
  const safeName = escapeHtml(`${user.prenom || ''} ${user.nom || ''}`.trim());

  const bodyHtml = `
    <p>Bonjour ${safeName || 'cher membre'},</p>
    <p>Bonne nouvelle ! Votre compte IDSS Natation a ete <strong>approuve</strong> par l'administrateur.</p>
    <p>Vous pouvez des a present vous connecter et acceder a votre espace.</p>
  `;

  return renderEmail({
    title: 'Votre compte est approuve',
    intro: 'Bienvenue sur IDSS Natation.',
    bodyHtml,
    cta: loginUrl ? { label: 'Se connecter', url: loginUrl } : null,
    footer: 'Merci de votre confiance. L equipe IDSS Natation.',
    logoCid
  });
}

function buildPasswordResetEmail({ user, resetUrl, logoCid }) {
  const safeName = escapeHtml(`${user.prenom || ''} ${user.nom || ''}`.trim());

  const bodyHtml = `
    <p>Bonjour ${safeName || 'cher membre'},</p>
    <p>Vous avez demande a reinitialiser votre mot de passe.</p>
    <p>Cliquez sur le bouton ci-dessous pour continuer. Ce lien expire dans 1 heure.</p>
    <p>Si vous n etes pas a l origine de cette demande, vous pouvez ignorer ce message.</p>
  `;

  return renderEmail({
    title: 'Reinitialisation du mot de passe',
    intro: 'Une action est requise pour securiser votre compte.',
    bodyHtml,
    cta: resetUrl ? { label: 'Reinitialiser mon mot de passe', url: resetUrl } : null,
    footer: 'IDSS Natation - Assistance compte',
    logoCid
  });
}

module.exports = {
  buildPendingUserEmail,
  buildAdminPendingEmail,
  buildApprovalEmail,
  buildPasswordResetEmail,
  getLogoAttachment
};
