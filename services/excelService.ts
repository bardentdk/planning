
import ExcelJS from 'exceljs';
import { ProcessingResult, GroupedSession } from '../types';

export const generateXLSX = async (data: ProcessingResult) => {
  const groups: Record<string, GroupedSession> = {};
  
  // Groupement des sessions selon les règles métier
  data.sessions.forEach(session => {
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
        heures: session.hours
      };
    }
  });
  
  const groupedData = Object.values(groups);
  const totalHours = groupedData.reduce((acc, row) => acc + row.heures, 0);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Planning Prévisionnel');

  // 1. Setup Columns
  worksheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Horaires', key: 'horaires', width: 25 },
    { header: 'Module', key: 'module', width: 65 },
    { header: 'Intervenant', key: 'intervenant', width: 25 },
    { header: 'Heures', key: 'heures', width: 12 },
  ];

  // 2. Header Logos & Header Info (Top Rows)
  // Logo placeholder area
  const logoRow = worksheet.addRow(['LOGO ORGANISME', '', '', '', 'LOGO PARTENAIRE']);
  worksheet.mergeCells('A1:B1');
  worksheet.mergeCells('E1:E1');
  logoRow.getCell(1).font = { bold: true, color: { argb: 'FF474E68' }, size: 10 };
  logoRow.getCell(5).font = { bold: true, color: { argb: 'FF474E68' }, size: 10 };
  logoRow.getCell(1).alignment = { horizontal: 'left' };
  logoRow.getCell(5).alignment = { horizontal: 'right' };

  worksheet.addRow([]); // Spacer

  // Title
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

  // 3. Main Table Header Styling
  const tableHeaderRow = worksheet.addRow(['DATE', 'HORAIRES', 'MODULE DE FORMATION', 'INTERVENANT', 'TOTAL H']);
  tableHeaderRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF312E81' }, // Indigo 900
    };
    cell.font = {
      bold: true,
      color: { argb: 'FFFFFFFF' },
      size: 11,
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // 4. Table Data with zebra stripes
  groupedData.forEach((row, index) => {
    const dataRow = worksheet.addRow([
      row.date,
      row.horaires,
      row.module,
      row.intervenant,
      row.heures
    ]);

    // Zebra styling (alternating light blue/indigo)
    const isEven = index % 2 === 0;
    const bgColor = isEven ? 'FFFFFFFF' : 'FFF8FAFC'; // White vs Slate 50

    dataRow.eachCell((cell, colNumber) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgColor },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      cell.alignment = { 
        vertical: 'middle', 
        wrapText: colNumber === 3, // Wrap text only for module
        horizontal: colNumber === 5 ? 'center' : 'left' 
      };
      
      if (colNumber === 1 || colNumber === 5) {
        cell.font = { bold: true };
      }
    });
  });

  // 5. Footer - Total Hours
  const totalRow = worksheet.addRow(['', '', '', 'TOTAL DES HEURES PRÉVISIONNELLES', totalHours]);
  worksheet.mergeCells(`A${totalRow.number}:C${totalRow.number}`);
  
  const labelTotal = totalRow.getCell(4);
  const valueTotal = totalRow.getCell(5);

  labelTotal.font = { bold: true, color: { argb: 'FF312E81' } };
  labelTotal.alignment = { horizontal: 'right' };

  valueTotal.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  valueTotal.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF059669' }, // Emerald 600
  };
  valueTotal.alignment = { horizontal: 'center' };
  valueTotal.border = {
    top: { style: 'medium', color: { argb: 'FF059669' } },
    left: { style: 'medium', color: { argb: 'FF059669' } },
    bottom: { style: 'medium', color: { argb: 'FF059669' } },
    right: { style: 'medium', color: { argb: 'FF059669' } },
  };

  // 6. Generate and Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `Planning_Premium_${data.studentName.replace(/\s/g, '_')}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
};
