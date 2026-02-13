/**
 * Generate a professional PDF compliance report
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ComplianceControl {
  id: string;
  framework: string;
  controlId: string;
  title: string;
  status: 'violated' | 'at-risk' | 'compliant';
  severity: string;
  description: string;
  impact: string;
  remediation: string;
}

interface ReportSummary {
  violated: number;
  atRisk: number;
  compliant: number;
  total: number;
}

export function generateCompliancePdf(
  summary: ReportSummary,
  controls: ComplianceControl[],
  generatedAt: string
): void {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const pageWidth = 210; // A4 width in mm
  const margin = 20;
  let y = 20;

  // --- Header ---
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Compliance Assessment Report', margin, 22);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated ${new Date(generatedAt).toLocaleString()} | Nova Sentinel`, margin, 30);
  doc.setTextColor(0, 0, 0);
  y = 45;

  // --- Executive Summary ---
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', margin, y);
  y += 8;

  const compliantPct = summary.total > 0 ? Math.round((summary.compliant / summary.total) * 100) : 0;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Overall compliance score: ${compliantPct}%`, margin, y);
  y += 6;
  doc.text(`${summary.total} controls assessed across CIS, NIST 800-53, SOC 2, PCI-DSS, SOX, and HIPAA.`, margin, y);
  y += 6;
  doc.setTextColor(185, 28, 28); // red-700
  doc.text(`Violated: ${summary.violated}`, margin, y);
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text(`At Risk: ${summary.atRisk}`, margin + 45, y);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text(`Compliant: ${summary.compliant}`, margin + 95, y);
  doc.setTextColor(0, 0, 0);
  y += 15;

  // --- Controls Table ---
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Control Findings', margin, y);
  y += 8;

  const tableData = controls.map(c => [
    c.framework,
    c.controlId,
    c.title.substring(0, 50) + (c.title.length > 50 ? '...' : ''),
    c.status === 'at-risk' ? 'AT RISK' : c.status.toUpperCase(),
    c.severity.toUpperCase(),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Framework', 'Control ID', 'Control Title', 'Status', 'Severity']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [55, 48, 163], // indigo-800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 24 },
      2: { cellWidth: 64 },
      3: { cellWidth: 36 },
      4: { cellWidth: 24 },
    },
    didParseCell: (data) => {
      const col = data.column?.index ?? 0;
      if (col === 3 && data.section === 'body') {
        const status = (data.cell?.raw as string)?.toLowerCase() ?? '';
        if (status === 'violated') data.cell.styles.textColor = [185, 28, 28];
        else if (status === 'at risk' || status === 'at-risk') data.cell.styles.textColor = [180, 83, 9];
        else data.cell.styles.textColor = [5, 150, 105];
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 15;

  // --- Detailed Findings (first 6 controls to avoid huge PDF) ---
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Detailed Findings', margin, y);
  y += 10;

  const detailControls = controls.slice(0, 6);
  const boxPadding = 4;
  const contentWidth = pageWidth - 2 * margin;

  for (let i = 0; i < detailControls.length; i++) {
    const c = detailControls[i];
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    // Finding card - header bar
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(margin, y, contentWidth, 4, 'F');
    doc.setFillColor(99, 102, 241); // indigo-500
    doc.rect(margin, y, 4, 4, 'F');
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    const controlLabel = c.controlId.startsWith(c.framework) ? c.controlId : `${c.framework} ${c.controlId}`;
    doc.text(controlLabel, margin + 2, y);
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(c.title, margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Status: ${c.status}  •  Severity: ${c.severity}`, margin, y);
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(99, 102, 241);
    doc.text('FINDING', margin, y);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    y += 5;
    const descLines = doc.splitTextToSize(c.description, contentWidth - boxPadding * 2);
    doc.text(descLines, margin + boxPadding, y);
    y += descLines.length * 5 + 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(59, 130, 246);
    doc.text('REMEDIATION', margin, y);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    y += 5;
    const remLines = doc.splitTextToSize(c.remediation, contentWidth - boxPadding * 2);
    doc.text(remLines, margin + boxPadding, y);
    y += remLines.length * 5 + 14;

    // Bottom border
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, y - 4, margin + contentWidth, y - 4);
  }

  // --- Footer on last page ---
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Page ${p} of ${pageCount} | Compliance analysis by Nova 2 Lite | Confidential`,
      margin,
      287
    );
  }

  doc.save(`compliance-report-${generatedAt.slice(0, 10)}.pdf`);
}
