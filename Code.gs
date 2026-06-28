// MovieDatabase — Google Apps Script
//
// Deploy as a Web App:
//   Extensions → Apps Script → paste this → Deploy → New deployment
//   Type: Web app | Execute as: Me | Who has access: Anyone
//
// Copy the deployed URL → add as APPS_SCRIPT_URL in Vercel environment variables.

function doGet(e) {
  try {
    const ss  = SpreadsheetApp.getActiveSpreadsheet();
    const gid = e && e.parameter && e.parameter.gid ? parseInt(e.parameter.gid) : null;

    let sheet = null;
    if (gid !== null && !isNaN(gid)) {
      sheet = ss.getSheets().find(s => s.getSheetId() === gid) || null;
    }
    if (!sheet) sheet = ss.getSheets()[0];

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow < 1 || lastCol < 1) {
      return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.CSV);
    }

    // Read all values
    const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();

    // Find header row and Title column (headers on sheet row 2 → index 1)
    let headerRowIdx = 0;
    let titleColIdx  = -1;
    for (let i = 0; i < Math.min(5, data.length); i++) {
      const ti = data[i].findIndex(h => String(h).trim() === 'Title');
      if (ti >= 0) { headerRowIdx = i; titleColIdx = ti; break; }
    }

    // Extract hyperlinks from the Title column for all data rows
    // getRichTextValues uses 1-indexed sheet rows/cols
    const dataStartRow = headerRowIdx + 1; // 0-indexed array row of first data row
    const numDataRows  = lastRow - (dataStartRow + 1); // number of data rows in sheet

    const urlByRow = {}; // dataRowIdx (0-based within data rows) → url string

    if (titleColIdx >= 0 && numDataRows > 0) {
      const richTexts = sheet
        .getRange(dataStartRow + 2, titleColIdx + 1, numDataRows, 1) // +2: 1-indexed + skip header
        .getRichTextValues();
      richTexts.forEach((row, i) => {
        const rt  = row[0];
        const url = rt ? rt.getLinkUrl() : null;
        if (url) urlByRow[i] = url;
      });
    }

    // Append 'Title URL' header and corresponding values to each row
    if (titleColIdx >= 0) {
      data[headerRowIdx].push('Title URL');
      for (let i = 0; i < data.length; i++) {
        if (i === headerRowIdx) continue; // already pushed header
        const dataIdx = i - (dataStartRow + 1); // 0-based index into data rows
        data[i].push(dataIdx >= 0 && urlByRow[dataIdx] ? urlByRow[dataIdx] : '');
      }
    }

    return ContentService
      .createTextOutput(rowsToCSV(data))
      .setMimeType(ContentService.MimeType.CSV);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message, stack: err.stack }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function rowsToCSV(rows) {
  const tz = Session.getScriptTimeZone();
  return rows.map(row =>
    row.map(cell => {
      let s = cell instanceof Date
        ? Utilities.formatDate(cell, tz, 'yyyy-MM-dd')
        : String(cell === null || cell === undefined ? '' : cell);
      if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        s = '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }).join(',')
  ).join('\n');
}
