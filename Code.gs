// MovieDatabase — Google Apps Script
//
// Deploy this as a Web App:
//   Extensions → Apps Script → paste this code → Deploy → New deployment
//   Type: Web app
//   Execute as: Me
//   Who has access: Anyone
//
// Copy the deployed web app URL and paste it into Vercel as an environment
// variable named APPS_SCRIPT_URL.

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Get the gid from the query string (?gid=0), default to first sheet
    const gid = e && e.parameter && e.parameter.gid ? parseInt(e.parameter.gid) : null;

    let sheet;
    if (gid !== null && !isNaN(gid)) {
      sheet = ss.getSheets().find(s => s.getSheetId() === gid) || null;
    }
    if (!sheet) {
      sheet = ss.getSheets()[0];
    }

    const data = sheet.getDataRange().getValues();
    const csv = rowsToCSV(data);

    return ContentService
      .createTextOutput(csv)
      .setMimeType(ContentService.MimeType.CSV);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function rowsToCSV(rows) {
  return rows.map(row =>
    row.map(cell => {
      let s = cell instanceof Date ? Utilities.formatDate(cell, Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(cell);
      if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        s = '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }).join(',')
  ).join('\n');
}
