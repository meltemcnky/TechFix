import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

/**
 * Generates and downloads a high-quality A4 PDF poster for the single universal QR code.
 *
 * @param targetUrl The exact target URL encoded in the QR code
 * @param isProduction Whether the target URL is a configured production URL
 */
export const generateQrPdf = async (targetUrl: string, isProduction: boolean) => {
  if (!targetUrl) return;

  // 1. Generate ultra-high-resolution 2048x2048 PNG Data URL with 4-unit quiet zone (margin)
  const qrDataUrl = await QRCode.toDataURL(targetUrl, {
    width: 2048,
    margin: 4,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#0B0F17',
      light: '#FFFFFF'
    }
  });

  // 2. Create A4 Document (210mm x 297mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm

  // Dark Header Banner
  doc.setFillColor(11, 15, 23); // #0B0F17
  doc.rect(0, 0, pageWidth, 45, 'F');

  // Main Header Title: "TechFix - Arıza / Talep Bildirim Sistemi"
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('TechFix Teknik Ariza Bildirim Sistemi', pageWidth / 2, 22, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Medeniyet Teknopark Tesis Yönetimi Platformu', pageWidth / 2, 33, { align: 'center' });

  // Embedded High-Res QR Image (Centered, 100mm x 100mm for maximum readability)
  const qrSize = 100;
  const qrX = (pageWidth - qrSize) / 2;
  const qrY = 65;

  // High contrast quiet zone border
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(1.5);
  doc.roundedRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12, 4, 4, 'S');

  // Add QR code image
  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

  // Subtitle directly under QR: "Bildirim oluşturmak için QR kodu telefonunuzla okutunuz."
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Bildirim olusturmak icin QR kodu telefonunuzla okutunuz.', pageWidth / 2, 185, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Telefonunuzun kamerasini okutarak aninda ariza kaydi acabilirsiniz.', pageWidth / 2, 195, { align: 'center' });

  // 3-Step Process Guide
  const stepY = 212;
  const boxWidth = 52;
  const boxHeight = 35;
  const gap = 10;
  const startX = (pageWidth - (3 * boxWidth + 2 * gap)) / 2;

  const steps = [
    { num: '01', title: 'QR Kodu Tara', desc: 'Kamera ile okutun' },
    { num: '02', title: 'Ofisini Sec', desc: 'Konum & arizayi girin' },
    { num: '03', title: 'Aninda Takip Et', desc: 'Takip kodu ile izleyin' }
  ];

  steps.forEach((step, idx) => {
    const x = startX + idx * (boxWidth + gap);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, stepY, boxWidth, boxHeight, 3, 3, 'FD');

    doc.setTextColor(14, 165, 233);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(step.num, x + boxWidth / 2, stepY + 11, { align: 'center' });

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(step.title, x + boxWidth / 2, stepY + 20, { align: 'center' });

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(step.desc, x + boxWidth / 2, stepY + 27, { align: 'center' });
  });

  // Small Target URL text at the bottom (Requirement #12)
  doc.setDrawColor(226, 232, 240);
  doc.line(20, 265, pageWidth - 20, 265);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`QR Hedef Adresi: ${targetUrl}`, pageWidth / 2, 275, { align: 'center' });

  // Save PDF file
  const filename = `TechFix_Tek_Ortak_QR_A4_${isProduction ? 'Production' : 'Development'}.pdf`;
  doc.save(filename);
};
