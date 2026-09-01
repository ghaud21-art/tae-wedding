/**
 * 청첩장 구글 시트용 Apps Script.
 *
 * 사용법:
 * 1. 구글 시트에서 [확장 프로그램] > [Apps Script]를 엽니다.
 * 2. 기본 코드를 모두 지우고 이 파일 내용을 그대로 붙여넣습니다.
 * 3. 저장(💾) 후, 상단 함수 선택 드롭다운에서 setupSheet를 고르고 [실행]을 한 번 눌러
 *    탭 7개(설정/인터뷰/갤러리/우리의시간/안내사항/계좌번호/참석여부)를 만들고 초기 내용을 채웁니다.
 *    (처음 실행 시 권한 승인 화면이 뜨면 본인 계정으로 승인하세요.)
 * 4. 이후 참석 여부 저장을 쓰려면 [배포] > [새 배포] > 유형: 웹 앱 > 액세스: 모든 사용자로 배포하고,
 *    나오는 URL을 config.js의 RSVP_WEBAPP_URL에 넣으세요.
 *
 * setupSheet는 처음 한 번만 실행하면 됩니다. 다시 실행하면 각 탭 내용이
 * 아래 초기값으로 덮어써지니, 이미 내용을 수정했다면 다시 실행하지 마세요.
 */

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('참석여부');
  const data = JSON.parse(e.postData.contents);
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  sheet.appendRow([timestamp, data.side || '', data.name || '', data.count || '']);
  return ContentService
    .createTextOutput(JSON.stringify({ result: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

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
    ['신부측', '이서연', '카카오뱅크', '3333-01-2345678'],
    ['신부측', '최미경 (모)', '우리은행', '1002-345-678901'],
  ]);

  fillSheet('참석여부', ['시간', '구분', '성함', '인원'], []);

  // 탭 순서를 편집하기 좋게 정리: 설정을 맨 앞으로
  ss.setActiveSheet(settings);
  ss.moveActiveSheet(1);

  const legacy = ss.getSheetByName('Sheet1');
  if (legacy) {
    Logger.log('기존 Sheet1(단일 표) 탭은 그대로 남아 있습니다. 새 탭 내용을 확인한 뒤 직접 삭제해도 됩니다.');
  }
}
