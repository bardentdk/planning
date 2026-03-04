import ExcelJS from 'exceljs';
import { ProcessingResult, GroupedSession } from '../types';

const fetchAsArrayBuffer = async (url: string): Promise<ArrayBuffer | null> => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
};

/**
 * Excel sizing helpers
 * - Excel row height is in "points" (pt)
 * - ExcelJS column width is roughly "characters"
 *
 * Empirical conversions (stable enough):
 * - px -> points: pt ≈ px * 0.75
 * - px -> columnWidthChars: width ≈ px / 7
 */
const pxToPoints = (px: number) => Math.max(1, Math.round(px * 0.75));
const pxToColWidth = (px: number) => Math.max(1, Math.round(px / 7));

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export const generateXLSX = async (data: ProcessingResult) => {
  const groups: Record<string, GroupedSession> = {};

  data.sessions.forEach((session) => {
    const key = `${session.date}_${session.module}_${session.trainer}`;
    const timeStr = `${session.startTime}-${session.endTime}`;

    if (groups[key]) {
      groups[key].horaires += ` | ${timeStr}`;
      groups[key].heures += session.hours;
    } else {
      groups[key] = {
        date: session.date,
        horaires: timeStr,
        module: session.module,
        intervenant: session.trainer,
        heures: session.hours,
      };
    }
  });

  const groupedData = Object.values(groups);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Planning Prévisionnel');

  // No headers here => avoids auto "Date | Horaires | ..." row
  worksheet.columns = [
    { key: 'date', width: 15 },        // A
    { key: 'horaires', width: 25 },    // B
    { key: 'module', width: 65 },      // C
    { key: 'intervenant', width: 25 }, // D (but table will still use this col later)
    { key: 'heures', width: 12 },      // E
  ];

  // Reserve row 1 (logos) and row 2 (blank)
  worksheet.addRow([]); // Row 1
  worksheet.addRow([]); // Row 2

  // --- LOGOS (bigger, ~300px width, keep aspect ratio) ---
  // Given source dimensions:
  // - Australe: 1920x1080
  // - Region/Pacte: 1668x383
  const targetWidthPx = 300;
  const targetWidthPx2 = 500;

  const australeOriginal = { w: 1920, h: 1080 };
  const regionOriginal = { w: 1668, h: 383 };

  const australeHeightPx = Math.round((targetWidthPx * australeOriginal.h) / australeOriginal.w);
  const regionHeightPx = Math.round((targetWidthPx2 * regionOriginal.h) / regionOriginal.w);

  // Small padding so it doesn't touch borders
  const paddingPx = 12;

  // Row 1 height adapts to tallest logo (+ padding)
  const row1 = worksheet.getRow(1);
  const row1HeightPx = Math.max(australeHeightPx, regionHeightPx) + paddingPx;
  row1.height = pxToPoints(row1HeightPx);

  // Column widths: adapt to image width (+ a bit of margin)
  // A for Australe, D for Region/Pacte
  worksheet.getColumn(1).width = pxToColWidth(targetWidthPx + paddingPx); // A
  worksheet.getColumn(4).width = pxToColWidth(targetWidthPx2 + paddingPx); // D

  // Make B and C comfortable so logos don't visually collide with table later
  worksheet.getColumn(2).width = Math.max(worksheet.getColumn(2).width ?? 10, 12);
  worksheet.getColumn(3).width = Math.max(worksheet.getColumn(3).width ?? 10, 20);

  const australeBuffer = await fetchAsArrayBuffer('/logos/australe.png');
  const regionBuffer = await fetchAsArrayBuffer('/logos/region-pacte.png');

  if (australeBuffer) {
    const australeImgId = workbook.addImage({
      buffer: new Uint8Array(australeBuffer),
      extension: 'png',
    });

    // A1 (col index 0) row index 0
    worksheet.addImage(australeImgId, {
      tl: { col: 0 + 0.05, row: 0 + 0.10 }, // slight margin
      ext: { width: targetWidthPx, height: australeHeightPx },
      editAs: 'oneCell',
    });
  }

  if (regionBuffer) {
    const regionImgId = workbook.addImage({
      buffer: new Uint8Array(regionBuffer),
      extension: 'png',
    });

    // D1 => col index 3
    worksheet.addImage(regionImgId, {
      tl: { col: 3 + 0.05, row: 0 + 0.10 },
      ext: { width: targetWidthPx2, height: regionHeightPx },
      editAs: 'oneCell',
    });
  }
  // --- END LOGOS ---

  // Title (row 3 because row 1 & 2 reserved)
  const titleRow = worksheet.addRow(['', '', 'PLANNING PRÉVISIONNEL DE FORMATION', '', '']);
  worksheet.mergeCells('C3:D3');
  const titleCell = titleRow.getCell(3);
  titleCell.font = { bold: true, size: 16, color: { argb: 'FF312E81' } };
  titleCell.alignment = { horizontal: 'center' };

  worksheet.addRow([]); // Spacer

  // Student Info
  const studentRow = worksheet.addRow(['Stagiaire :', data.studentName.toUpperCase()]);
  studentRow.getCell(1).font = { bold: true, color: { argb: 'FF64748B' } };
  studentRow.getCell(2).font = { bold: true, size: 12, color: { argb: 'FF1E293B' } };

  worksheet.addRow([]); // Spacer

  // Table header (styled)
  const tableHeaderRow = worksheet.addRow(['DATE', 'HORAIRES', 'MODULE DE FORMATION', 'INTERVENANT', 'TOTAL H']);
  tableHeaderRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF312E81' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // Data rows
  groupedData.forEach((row, index) => {
    const dataRow = worksheet.addRow([row.date, row.horaires, row.module, row.intervenant, row.heures]);

    const isEven = index % 2 === 0;
    const bgColor = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    dataRow.eachCell((cell, colNumber) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      cell.alignment = {
        vertical: 'middle',
        wrapText: colNumber === 3,
        horizontal: colNumber === 5 ? 'center' : 'left',
      };
      if (colNumber === 1 || colNumber === 5) cell.font = { bold: true };
    });
  });

  // Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `Planning_Premium_${data.studentName.replace(/\s/g, '_')}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
};