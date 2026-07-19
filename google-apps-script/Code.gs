const SHEET_NAME = "Workout Log";

function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow([
      "date",
      "session",
      "exercise_id",
      "exercise",
      "set_number",
      "weight_kg",
      "reps",
      "note",
      "recorded_at",
    ]);
    sheet.setFrozenRows(1);
  }

  sheet.appendRow([
    payload.date,
    payload.session,
    payload.exerciseId,
    payload.exercise,
    payload.setNumber,
    payload.weightKg,
    payload.reps,
    payload.note || "",
    payload.recordedAt,
  ]);

  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
