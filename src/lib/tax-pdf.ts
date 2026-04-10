/**
 * Shared PDF download utility for the Taxes section.
 * Uses jsPDF + jspdf-autotable (already installed).
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type Row = (string | number | null | undefined)[];

export interface TaxPdfSection {
  title: string;
  columns: string[];
  rows: Row[];
}

export interface TaxPdfOptions {
  /** Main document title */
  title: string;
  /** Short subtitle / description */
  subtitle?: string;
  /** Tax year */
  year?: string | number;
  /** Company name */
  company?: string;
  /** Page sections */
  sections: TaxPdfSection[];
  /** File name (without .pdf) */
  fileName?: string;
}

const BRAND_COLOR: [number, number, number] = [37, 99, 235]; // blue-600
const HEADER_BG: [number, number, number] = [239, 246, 255]; // blue-50

/**
 * Generate and download a styled PDF report.
 */
export function downloadTaxPDF(opts: TaxPdfOptions): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  // ── Header bar ───────────────────────────────────────────────────────────
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, pageW, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(opts.title, margin, 13);

  if (opts.subtitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(opts.subtitle, margin, 19);
  }

  // ── Meta row ─────────────────────────────────────────────────────────────
  doc.setFillColor(...HEADER_BG);
  doc.rect(0, 22, pageW, 10, 'F');

  doc.setTextColor(55, 65, 81);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  const metaParts: string[] = [];
  if (opts.company) metaParts.push(`Empresa: ${opts.company}`);
  if (opts.year) metaParts.push(`Año Fiscal: ${opts.year}`);
  metaParts.push(`Generado: ${new Date().toLocaleDateString('es-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
  doc.text(metaParts.join('   |   '), margin, 28.5);

  let curY = 38;

  // ── Sections ─────────────────────────────────────────────────────────────
  for (const section of opts.sections) {
    // Section title
    doc.setTextColor(...BRAND_COLOR);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(section.title, margin, curY);
    curY += 2;

    autoTable(doc, {
      startY: curY,
      head: [section.columns],
      body: section.rows.map(row =>
        row.map(cell => {
          if (cell === null || cell === undefined) return '';
          if (typeof cell === 'number') {
            // If it looks like a dollar amount (> 1 or exact int formatting), format it
            return cell % 1 === 0
              ? cell.toString()
              : `$${cell.toFixed(2).replaceAll(/\B(?=(\d{3})+(?!\d))/g, ',')}`
          }
          return String(cell);
        })
      ),
      headStyles: {
        fillColor: BRAND_COLOR,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: { fontSize: 8, textColor: [31, 41, 55] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: { cellPadding: 2.5, overflow: 'linebreak' },
      tableWidth: pageW - margin * 2,
      didDrawPage: (data) => {
        // Footer on every page
        const pageCount = (doc.internal as any).getNumberOfPages();
        doc.setFontSize(7);
        doc.setTextColor(156, 163, 175);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `ComputoPlus – ${opts.title} – Página ${data.pageNumber} de ${pageCount}`,
          margin,
          doc.internal.pageSize.getHeight() - 6
        );
      },
    });

    curY = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  const fileName = opts.fileName ?? opts.title.replaceAll(/\s+/g, '_').toLowerCase();
  doc.save(`${fileName}_${opts.year ?? new Date().getFullYear()}.pdf`);
}

// ──────────────────────────────────────────────────────────────────────────
// Per-page helpers
// ──────────────────────────────────────────────────────────────────────────

export function fmt$(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
