# 민준 ♥ 서연 모바일 청첩장

구글 시트 + 구글 드라이브로 내용을 관리하는 모바일 청첩장입니다.
글, 사진, 계좌번호 등은 전부 **구글 시트**에서 고치면 되고, 코드는 건드릴 필요가 없습니다.

- 구글 시트 "태경님 청첩장 데이터": https://docs.google.com/spreadsheets/d/1ubgouI2ixLTqXMW4pfe8aktwO_ti9V9UJZBmx9SU-T4/edit
- 사진 폴더(구글 드라이브) "태경님 청첩장 사진": https://drive.google.com/drive/folders/1OPxzsGfkG-2rL7sUQ3xsIJNfyv1wc1xr
- 배포된 사이트: https://ghaud21-art.github.io/tae-wedding/

`config.js`에는 이미 시트 ID가 연결되어 있습니다. 아래 순서대로 진행하면 사이트가 켜집니다.

## 1. 시트 안에 탭 만들기 — Apps Script로 한 번만 실행

시트는 탭 여러 개(설정 / 인터뷰 / 갤러리 / 우리의시간 / 안내사항 / 계좌번호 / 참석여부)로 나뉘어 있고, **신랑신부가 실제로 고치는 값은 전부 "설정" 탭 안에** 모여 있습니다. 이 탭들은 구글 문서 도구 API로는 한 번에 만들 수 없어서, 시트에 내장된 Apps Script로 만듭니다.

1. 위 시트를 열고 상단 메뉴 **확장 프로그램 → Apps Script**를 클릭합니다.
2. 열린 편집기의 기본 코드를 모두 지우고, 이 저장소의 [`apps-script/Code.gs`](apps-script/Code.gs) 내용을 그대로 붙여넣습니다.
3. 저장(💾) → 상단 함수 선택 드롭다운에서 **setupSheet**를 고른 뒤 **[실행]**을 누릅니다.
4. 처음 실행하면 권한 승인 화면이 나옵니다 — 본인 구글 계정으로 승인해주세요.
5. 실행이 끝나면 시트 하단에 탭 7개가 생기고 초기 내용(현재 청첩장 문구)이 채워져 있습니다. 신랑신부가 고쳐야 하는 칸에는 **노란색**이 자동으로 칠해져 있어서 어디를 고치면 되는지 한눈에 보입니다. 맨 앞의 기존 "Sheet1" 탭(표 하나로 되어 있던 것)은 그대로 두거나, 새 탭 내용을 확인한 뒤 직접 삭제해도 됩니다.

**주의**: `setupSheet`는 처음 한 번만 실행하세요. 이미 탭 내용을 수정한 뒤에 다시 실행하면 그 탭이 초기값으로 덮어써집니다. 내용은 이미 채워둔 상태에서 노란색만 다시 칠하고 싶다면(예: 행을 추가/삭제한 뒤), 함수 드롭다운에서 대신 **colorEditableCells**를 실행하세요 — 이 함수는 색만 칠하고 셀 내용은 건드리지 않습니다.

## 2. 시트 공유 설정 켜기 (필수)

시트 우측 상단 **[공유]** → **일반 액세스**를 **"링크가 있는 모든 사용자"** + 권한 **"뷰어"**로 바꿔주세요.
(이게 안 되어 있으면 사이트가 "정보를 불러오지 못했습니다" 화면만 보여줍니다.)

사진 폴더도 마찬가지로 **[공유]** → **"링크가 있는 모든 사용자"** + **"뷰어"**로 설정해주세요.

## 3. "설정" 탭 편집 가이드 (신랑신부가 고치는 곳)

`키` 열은 그대로 두고 `값` 열만 고치세요.

| 키 | 설명 |
| --- | --- |
| groomName / brideName | 신랑 / 신부 이름 |
| groomFather / groomMother / brideFather / brideMother | 혼주 이름 |
| weddingDate | `2026-11-14` 형식 |
| weddingTime | `13:00` 형식 (24시간제) |
| venueName / venueAddress | 예식장 이름 / 주소 |
| groomPhone / bridePhone | 연락처 |
| subwayInfo / busInfo / parkingInfo | 오시는 길 안내 문구 |
| greetingText | 인사말. 셀 안에서 `Alt+Enter`로 줄바꿈하면 사이트에도 그대로 나옵니다 |
| accentColor | 포인트 색상 (`#e9a8bc` 같은 hex 코드) |
| heroImageId / interviewImageId / endingImageId | 사진 파일 ID (4번 참고) |
| snapShareUrl | 게스트스냅 공유 링크 (비워두면 그 섹션이 사이트에서 숨겨집니다) |

다른 탭(인터뷰/갤러리/우리의시간/안내사항/계좌번호)은 행을 복사해서 붙여넣은 뒤 내용만 바꾸면 항목이 늘어나고, 행을 지우면 줄어듭니다. **참석여부** 탭은 손대지 마세요 — 하객이 제출하면 자동으로 채워집니다.

## 4. 사진 올리기 (구글 드라이브)

1. 위 사진 폴더에 메인/인터뷰/갤러리/마무리 사진을 업로드합니다.
2. 각 파일을 더블클릭해 열면 주소창에 `https://drive.google.com/file/d/`**`파일ID`**`/view` 형태의 URL이 보입니다.
3. 이 파일 ID를 복사해서 "설정" 탭의 `heroImageId` 등, 또는 "갤러리" 탭의 해당 칸에 붙여넣으세요.

## 5. 참석 여부(RSVP) 저장 켜기 — Apps Script (선택)

하객이 "참석 의사 전달하기"를 누르면 "참석여부" 탭에 자동으로 기록되도록 하는 설정입니다. 건너뛰어도 사이트는 정상 동작하지만, 실제로는 저장되지 않습니다.

1. Apps Script 편집기(1번에서 연 곳)에서 우측 상단 **[배포] → [새 배포]**.
2. 유형 선택 톱니바퀴 → **웹 앱** 선택.
3. "액세스 권한을 가진 사용자"를 **"모든 사용자"**로 설정 → **[배포]**.
4. 배포 완료 후 나오는 **웹 앱 URL**(`https://script.google.com/macros/s/.../exec` 형태)을 복사합니다.
5. [`config.js`](config.js)의 `RSVP_WEBAPP_URL` 값을 방금 복사한 URL로 바꾸고 GitHub에 반영(아래 6번 참고)합니다.

## 6. 코드(레이아웃/디자인)를 고친 뒤 배포하기

시트 내용은 고쳐도 바로 반영되지만, `index.html` / `style.css` / `script.js` / `config.js` 같은 코드 파일을 고쳤을 때는 GitHub에 올려야 반영됩니다.

```bash
git add -A
git commit -m "수정 내용"
git push
```

몇 분 내로 https://ghaud21-art.github.io/tae-wedding/ 에 자동 반영됩니다.

## 7. 나중에 도메인 연결하기

원하는 도메인을 구매하면, 저장소 루트에 `CNAME`이라는 이름의 파일을 만들고 그 안에 도메인 주소 한 줄(예: `wedding.example.com`)만 적은 뒤, 구매처(가비아, 후이즈, Cloudflare 등)에서 해당 도메인의 DNS에 GitHub Pages용 레코드를 추가하면 됩니다. 이 단계가 필요할 때 다시 말씀해주시면 도와드리겠습니다.

## 폴더 구조

```
index.html          메인 페이지
style.css           디자인
script.js           구글 시트/드라이브 연동 + 인터랙션
config.js           시트 ID, RSVP 웹앱 URL (편집 대상)
assets/              고정 이미지 (문구 이미지 등)
apps-script/Code.gs  시트 탭 초기 세팅 + 참석 여부 저장용 Apps Script 코드
```
