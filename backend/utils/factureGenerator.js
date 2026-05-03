const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const LOGO_CANDIDATES = [
  path.resolve(__dirname, '..', 'téléchargé.png'),
  path.resolve(__dirname, '..', '..', 'téléchargé.png'),
  path.resolve(__dirname, '..', 'assets', 'logo.png')
];
const LOGO_PATH = LOGO_CANDIDATES.find(p => fs.existsSync(p)) || '';
const INVOICE_DIR = path.resolve(__dirname, '..', 'uploads', 'invoices');

const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('fr-FR');
};

const buildFactureNumber = (cotisation) => {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const suffix = cotisation._id.toString().slice(-6).toUpperCase();
  return `FAC-${yyyy}${mm}-${suffix}`;
};

const safeFileName = (value) => value.replace(/[^A-Za-z0-9_-]/g, '');

const generateCotisationFacture = async (cotisation) => {
  await fs.promises.mkdir(INVOICE_DIR, { recursive: true });

  const factureNumber = cotisation.factureNumber || buildFactureNumber(cotisation);
  const fileName = `facture-${safeFileName(factureNumber)}.pdf`;
  const filePath = path.join(INVOICE_DIR, fileName);

  const doc = new PDFDocument({ size: 'A4', margin: 48 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  if (LOGO_PATH && fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, 48, 40, { width: 90 });
  }

  doc.fontSize(20).font('Helvetica-Bold').text('FACTURE DE COTISATION', 0, 42, { align: 'right' });
  doc.moveDown(1.5);

  doc.fontSize(10).font('Helvetica-Bold').text('Numero de facture:', 48, 140);
  doc.font('Helvetica').text(factureNumber, 170, 140);

  doc.font('Helvetica-Bold').text('Date de paiement:', 48, 160);
  doc.font('Helvetica').text(formatDate(cotisation.paidAt || cotisation.updatedAt), 170, 160);

  doc.font('Helvetica-Bold').text('Statut:', 48, 180);
  doc.font('Helvetica').text(cotisation.statut || 'Payé', 170, 180);

  doc.moveTo(48, 210).lineTo(548, 210).strokeColor('#2b3a4b').stroke();

  const nageurUser = cotisation.nageur?.utilisateur || {};
  doc.font('Helvetica-Bold').text('Nageur:', 48, 230);
  doc.font('Helvetica').text(`${nageurUser.prenom || ''} ${nageurUser.nom || ''}`.trim(), 170, 230);

  doc.font('Helvetica-Bold').text('Email:', 48, 250);
  doc.font('Helvetica').text(nageurUser.email || '—', 170, 250);

  doc.moveDown(2);
  doc.font('Helvetica-Bold').text('Details de la cotisation', 48, 290);
  doc.moveTo(48, 306).lineTo(548, 306).strokeColor('#2b3a4b').stroke();

  doc.font('Helvetica-Bold').text('Periode:', 48, 324);
  doc.font('Helvetica').text(`${formatDate(cotisation.dateDebut)} au ${formatDate(cotisation.dateFin)}`, 170, 324);

  doc.font('Helvetica-Bold').text('Montant:', 48, 344);
  doc.font('Helvetica').text(`${cotisation.montant} DT`, 170, 344);

  doc.font('Helvetica-Bold').text('Mode de paiement:', 48, 364);
  doc.font('Helvetica').text(cotisation.modePaiement || '—', 170, 364);

  doc.font('Helvetica-Bold').text('Notes:', 48, 384);
  doc.font('Helvetica').text(cotisation.notes || '—', 170, 384, { width: 360 });

  doc.moveTo(48, 470).lineTo(548, 470).strokeColor('#2b3a4b').stroke();
  doc.fontSize(10).font('Helvetica').fillColor('#6b7280').text('Ce document atteste le paiement de la cotisation.', 48, 486, { align: 'center' });

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return {
    facturePath: path.join('uploads', 'invoices', fileName).replace(/\\/g, '/'),
    factureNumber,
    paidAt: new Date()
  };
};

module.exports = { generateCotisationFacture };
