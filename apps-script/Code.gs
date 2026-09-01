/**
 * 참석 여부(RSVP) 제출을 시트에 저장하는 Apps Script.
 * 구글 시트에서 [확장 프로그램] > [Apps Script]로 열어서 이 코드를 붙여넣고
 * [배포] > [새 배포] > 유형: 웹 앱, 액세스 권한: 모든 사용자로 배포하세요.
 * 배포 후 나오는 URL을 config.js의 RSVP_WEBAPP_URL에 붙여넣으면 됩니다.
 */
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('참석여부');
  const data = JSON.parse(e.postData.contents);
  sheet.appendRow([new Date(), data.side || '', data.name || '', data.count || '']);
  return ContentService
    .createTextOutput(JSON.stringify({ result: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}
