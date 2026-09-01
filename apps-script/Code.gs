/**
 * 청첩장 구글 시트용 Apps Script.
 *
 * 기능:
 *  - doGet  : 드라이브 사진 폴더(메인/인터뷰/마무리/갤러리)의 사진 목록을 사이트에 전달
 *             → 폴더에 사진을 올리기만 하면 사이트에 자동으로 반영됩니다.
 *  - doPost : 참석 여부(RSVP)를 "참석여부" 탭에 저장 + 하객이 보낸 사진(게스트스냅)을
 *             드라이브 "게스트스냅" 폴더에 저장
 *  - setupAll : 계좌번호 6명(신랑/신랑 부모/신부/신부 부모) 채우기 + 편집 칸 노란색 칠하기
 *               (다른 탭 내용은 건드리지 않아 언제 실행해도 안전)
 *  - setupSheet : 탭 7개를 처음부터 다시 만들기 (⚠ 기존 내용이 초기값으로 덮어써짐)
 *
 * 사용법:
 *  1. 함수 드롭다운에서 setupAll 선택 → [실행]
 *  2. [배포] > [새 배포] > 유형: 웹 앱 > 나: 나로 실행 / 액세스: 모든 사용자 → [배포]
 *  3. 나온 웹 앱 URL을 config.js의 RSVP_WEBAPP_URL에 붙여넣기
 *  ※ 코드를 고친 뒤에는 [배포] > [배포 관리] > 연필 아이콘 > 버전: 새 버전 → [배포]로 갱신해야 반영됩니다.
 */

const PHOTOS_FOLDER_ID = '1OPxzsGfkG-2rL7sUQ3xsIJNfyv1wc1xr'; // "태경님 청첩장 사진" 폴더
const SECTION_FOLDERS = { hero: '메인', interview: '인터뷰', ending: '마무리', gallery: '갤러리' };
const SNAP_FOLDER_NAME = '게스트스냅';

/* ---------- 사진 목록 내려주기 (사이트가 GET으로 호출) ---------- */

function doGet(e) {
  const root = DriveApp.getFolderById(PHOTOS_FOLDER_ID);
  const result = {};
  Object.keys(SECTION_FOLDERS).forEach(function (key) {
    result[key] = listImageIds(root, SECTION_FOLDERS[key]);
  });
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function listImageIds(root, folderName) {
  const it = root.getFoldersByName(folderName);
  if (!it.hasNext()) return [];
  const files = it.next().getFiles();
  const items = [];
  while (files.hasNext()) {
    const f = files.next();
    if (String(f.getMimeType()).indexOf('image/') === 0) {
      items.push({ id: f.getId(), name: f.getName() });
    }
  }
  items.sort(function (a, b) { return a.name.localeCompare(b.name); }); // 파일명 순 = 갤러리 순서
  return items.map(function (x) { return x.id; });
}

/* ---------- RSVP 저장 + 게스트스냅 사진 수신 (사이트가 POST로 호출) ---------- */

function doPost(e) {
  const data = JSON.parse(e.postData.contents);

  if (data.type === 'photo') {
    const root = DriveApp.getFolderById(PHOTOS_FOLDER_ID);
    let folder;
    const it = root.getFoldersByName(SNAP_FOLDER_NAME);
    folder = it.hasNext() ? it.next() : root.createFolder(SNAP_FOLDER_NAME);
    const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
    const name = stamp + '_' + (data.name || 'guest.jpg');
    const blob = Utilities.newBlob(Utilities.base64Decode(data.base64), data.mimeType || 'image/jpeg', name);
    folder.createFile(blob);
  } else {
    // 기본: 참석 여부 저장
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('참석여부');
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
    sheet.appendRow([timestamp, data.side || '', data.name || '', data.count || '']);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ result: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---------- 안전한 정리 함수: 계좌 6명 + 노란색 칠 (다른 내용은 안 건드림) ---------- */

function setupAll() {
  fixAccountsTab();
  colorEditableCells();
}

function fixAccountsTab() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('계좌번호');
  if (!sh) return;
  const rows = [
    ['신랑측', '김민준', '국민은행', '123-45-6789-012'],
    ['신랑측', '김영호 (부)', '신한은행', '110-234-567890'],
    ['신랑측', '박정숙 (모)', '우리은행', '1234-56-789012'],
    ['신부측', '이서연', '카카오뱅크', '3333-01-2345678'],
    ['신부측', '이상원 (부)', '국민은행', '456-78-901234'],
    ['신부측', '최미경 (모)', '우리은행', '1002-345-678901'],
  ];
  const last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, 4).clearContent();
  sh.getRange(2, 1, rows.length, 4).setValues(rows);
}

/**
 * 신랑신부가 실제로 고쳐야 하는 칸에 노란색 배경을 칠합니다.
 * 셀 값은 전혀 바꾸지 않으므로 언제 실행해도 안전합니다.
 */
function colorEditableCells() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const EDITABLE_COLOR = '#fff2cc';

  function colorCols(sheetName, cols) {
    const sh = ss.getSheetByName(sheetName);
    if (!sh) return;
    const lastRow = sh.getLastRow();
    if (lastRow < 2) return;
    cols.forEach(function (col) {
      sh.getRange(2, col, lastRow - 1, 1).setBackground(EDITABLE_COLOR);
    });
  }

  colorCols('설정', [2]);            // 값
  colorCols('인터뷰', [2, 3]);        // 질문, 답변
  colorCols('갤러리', [2]);           // (예비용) 드라이브파일ID
  colorCols('우리의시간', [2, 3, 4]);  // 날짜, 제목, 설명
  colorCols('안내사항', [2, 3, 4]);    // 영문, 제목, 설명
  colorCols('계좌번호', [1, 2, 3, 4]); // 전체
  // 참석여부 탭은 자동 기록용이라 칠하지 않습니다.
}

/* ---------- 전체 초기화 (⚠ 모든 탭이 초기값으로 덮어써짐 — 필요할 때만) ---------- */

function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  function fillSheet(name, headers, rows) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    sh.clear();
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    if (rows.length) sh.getRange(2, 1, rows.length, headers.length).setValues(rows);
    sh.setColumnWidths(1, headers.length, 220);
    sh.getRange(1, 1, Math.max(rows.length + 1, 1), headers.length).setWrap(true);
    return sh;
  }

  const settings = fillSheet('설정', ['키', '값'], [
    ['groomName', '민준'],
    ['brideName', '서연'],
    ['groomFather', '김영호'],
    ['groomMother', '박정숙'],
    ['brideFather', '이상원'],
    ['brideMother', '최미경'],
    ['weddingDate', '2026-11-14'],
    ['weddingTime', '13:00'],
    ['venueName', '그랜드호텔 3층 라벤더홀'],
    ['venueAddress', '서울특별시 강남구 테헤란로 123'],
    ['groomPhone', '010-1234-5678'],
    ['bridePhone', '010-8765-4321'],
    ['subwayInfo', '2호선 강남역 3번 출구 도보 5분'],
    ['busInfo', '146 · 341 · 360 강남역 하차'],
    ['parkingInfo', '호텔 지하 주차장 2시간 무료 (하객 등록)'],
    ['greetingText',
      '서로가 마주 보며 다져온 사랑을\n이제 함께 한 곳을 바라보며\n걸어갈 수 있는 큰 사랑으로 키우려 합니다.\n\n' +
      '저희 두 사람이 사랑의 이름으로\n지켜나갈 수 있도록\n앞날을 축복해 주시면 감사하겠습니다.'],
    ['accentColor', '#e9a8bc'],
    ['heroImageId', ''],
    ['interviewImageId', ''],
    ['endingImageId', ''],
    ['snapShareUrl', ''],
  ]);

  fillSheet('인터뷰', ['순서', '질문', '답변'], [
    ['1', '서로의 첫인상은 어땠나요?',
      '민준: 웃는 모습이 참 밝은 사람이라고 생각했어요. 그 미소를 매일 보고 싶어 여기까지 왔습니다.\n' +
      '서연: 조용하지만 다정한 사람. 시간이 지날수록 그 진심이 느껴졌어요.'],
    ['2', '결혼을 결심하게 된 순간은?',
      '특별한 순간보다는, 함께한 평범한 하루하루가 쌓여 자연스럽게 서로의 미래에 서로가 있었습니다.'],
    ['3', '하객분들께 전하고 싶은 말',
      '먼 걸음 해주시는 모든 분들께 진심으로 감사드립니다. 오셔서 저희의 시작을 함께 웃으며 축복해 주세요.'],
  ]);

  fillSheet('갤러리', ['순서', '드라이브파일ID'], [
    ['1', ''], ['2', ''], ['3', ''], ['4', ''], ['5', ''], ['6', ''],
  ]);

  fillSheet('우리의시간', ['순서', '날짜', '제목', '설명'], [
    ['1', '2019. 03', '처음 만난 날', '친구의 소개로 어색하게 마주 앉았던 봄날'],
    ['2', '2020. 05', '연인이 되다', '벚꽃이 지던 날, 서로의 마음을 확인했습니다'],
    ['3', '2025. 12', '프러포즈', '겨울 바다 앞에서 평생을 약속했습니다'],
    ['4', '2026. 11', '결혼합니다', '이제 부부라는 이름으로 함께 걷습니다'],
  ]);

  fillSheet('안내사항', ['순서', '영문', '제목', '설명'], [
    ['1', 'Photobooth', '포토부스 안내', '예식장 입구에 포토부스가 준비되어 있습니다. 축하 메시지와 함께 사진을 남겨주세요.'],
    ['2', 'Dining', '식사 안내', '예식 후 3층 연회장에서 뷔페 식사가 준비됩니다. 식권은 접수처에서 받아주세요.'],
    ['3', 'Flower', '화환 안내', '축하 화환은 정중히 사양합니다. 마음만 감사히 받겠습니다.'],
    ['4', 'Parking', '주차 안내', '지하 주차장 이용 시 접수처에서 주차 등록을 해주시면 2시간 무료입니다.'],
  ]);

  fillSheet('계좌번호', ['구분', '예금주', '은행', '계좌번호'], [
    ['신랑측', '김민준', '국민은행', '123-45-6789-012'],
    ['신랑측', '김영호 (부)', '신한은행', '110-234-567890'],
    ['신랑측', '박정숙 (모)', '우리은행', '1234-56-789012'],
    ['신부측', '이서연', '카카오뱅크', '3333-01-2345678'],
    ['신부측', '이상원 (부)', '국민은행', '456-78-901234'],
    ['신부측', '최미경 (모)', '우리은행', '1002-345-678901'],
  ]);

  fillSheet('참석여부', ['시간', '구분', '성함', '인원'], []);

  ss.setActiveSheet(settings);
  ss.moveActiveSheet(1);

  colorEditableCells();
}
