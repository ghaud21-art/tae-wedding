// ============================================================
// 청첩장 설정 파일 — 이 파일만 고쳐도 대부분 설정이 끝납니다.
// ============================================================

window.WEDDING_CONFIG = {
  // 구글 시트 주소창의 /d/ 뒤, /edit 앞 긴 문자열
  // 예) https://docs.google.com/spreadsheets/d/1AbCдEfG.../edit  ->  "1AbCдEfG..."
  SHEET_ID: "1ubgouI2ixLTqXMW4pfe8aktwO_ti9V9UJZBmx9SU-T4",

  // Apps Script를 '웹 앱'으로 배포하면 나오는 URL
  // (드라이브 사진 자동 연동 + 참석 여부 저장 + 게스트스냅 수신에 사용)
  RSVP_WEBAPP_URL: "https://script.google.com/macros/s/AKfycbzP1sjEx-kL5uEm_8L5EUSupIDYQBZyfxgljO7Vdum2nA1B9QGGf1rMltYLglBCFq5l/exec",

  // 카카오 디벨로퍼스(developers.kakao.com) > 내 애플리케이션 > 앱 키 > JavaScript 키
  // ※ 반드시 [앱 설정 > 플랫폼]에 이 사이트 도메인(예: https://ghaud21-art.github.io)을
  //    Web 플랫폼으로 등록해야 정상 동작합니다. 등록 안 하면 "공유하기"가 조용히 실패합니다.
  KAKAO_JS_KEY: "1e5284d3b9dc527761375f88ddc23b43",
};
