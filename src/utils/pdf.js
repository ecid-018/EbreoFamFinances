import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { formatPHPForPdf as formatPHP } from './currency.js';

export function generateAnalyticsPdf({ period, periodLabel, summary }) {
  const doc = new jsPDF();
  const isFullSummary = period === 'monthly';
  let y = 18;

  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('Ebreo Family Finances', 14, y);
  y += 8;

  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text(`Analytics Summary — ${periodLabel}`, 14, y);
  y += 6;

  doc.setFontSize(9);
  doc.setTextColor(140);
  doc.text(`Generated ${new Date().toLocaleString('en-PH')}`, 14, y);
  doc.setTextColor(0);
  y += 10;

  doc.setFontSize(11);
  doc.text(`Income: ${formatPHP(summary.totalIncome)}`, 14, y);
  y += 6;
  doc.text(`Expenses: ${formatPHP(summary.totalExpenses)}`, 14, y);
  y += 6;
  doc.text(`Net: ${formatPHP(summary.net)}`, 14, y);
  y += 6;

  if (isFullSummary) {
    doc.text(`Safe to Spend: ${formatPHP(summary.safeToSpend)}`, 14, y);
    y += 6;
    doc.text(`Unassigned: ${formatPHP(summary.unassigned)}`, 14, y);
    y += 6;
  }
  y += 4;

  if (summary.envelopeBreakdown) {
    autoTable(doc, {
      startY: y,
      head: [['Envelope', 'Group', 'Spent', 'Budget']],
      body: summary.envelopeBreakdown.map((env) => [
        env.name,
        env.group,
        formatPHP(env.spent),
        formatPHP(env.budget),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [226, 71, 43] },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  if (summary.goals.length > 0) {
    doc.setFontSize(11);
    doc.text('Savings Goals (as of generation time)', 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [['Goal', 'Saved', 'Target']],
      body: summary.goals.map((g) => [g.name, formatPHP(g.saved), formatPHP(g.target)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [226, 71, 43] },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  if (summary.accounts.length > 0) {
    doc.setFontSize(11);
    doc.text('Accounts (as of generation time)', 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [['Account', 'Type', 'Balance']],
      body: summary.accounts.map((a) => [a.name, a.type, formatPHP(a.balance)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [226, 71, 43] },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  doc.setFontSize(8);
  doc.setTextColor(140);
  const footerLines = ['Reflects actual transaction dates.'];
  if (period === 'annual') {
    footerLines.push('Envelope budgets are annualized from the current monthly budget (12×) — no historical per-month snapshots exist.');
  }
  if (period === 'daily' || period === 'weekly') {
    footerLines.push('Budget-derived figures (Safe to Spend, Unassigned, envelope tables) are monthly concepts and are omitted for this period.');
  }
  doc.text(footerLines, 14, y);

  return doc;
}

export function downloadAnalyticsPdf(filename, doc) {
  doc.save(filename);
}
