// ============================================================
// 모바일 청첩장 — 구글 시트/드라이브 연동 렌더러
// 데이터 구조를 바꾸고 싶으면 README.md의 "구글 시트 구조" 섹션을 먼저 확인하세요.
// ============================================================

const CFG = window.WEDDING_CONFIG;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/* ---------------- 구글 시트 읽기 ----------------
 * 시트는 탭 여러 개로 되어 있습니다: 설정 / 인터뷰 / 갤러리 / 우리의시간 / 안내사항 / 계좌번호 / 참석여부
 * 신랑신부가 실제로 고치는 값들은 전부 "설정" 탭 안에 있습니다. */

async function fetchSheetRows(sheetName) {
  // headers=1: 첫 행을 항상 헤더로 고정 (없으면 gviz가 헤더 행 수를 제멋대로 추측해 데이터가 잘림)
  const url = `https://docs.google.com/spreadsheets/d/${CFG.SHEET_ID}/gviz/tq?tqx=out:json&headers=1&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('시트를 불러오지 못했습니다: ' + sheetName);
  const text = await res.text();
  const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
  const json = JSON.parse(jsonStr);
  const rows = (json.table.rows || []).map(r =>
    (r.c || []).map(cell => {
      if (!cell) return '';
      const val = cell.f ?? cell.v;
      return val == null ? '' : String(val);
    })
  );
  return rows.filter(r => r.some(v => v !== '')); // 빈 행 제외 (헤더는 gviz가 이미 분리)
}

function rowsToMap(rows) {
  const map = {};
  rows.forEach(r => { if (r[0]) map[r[0].trim()] = r[1] ?? ''; });
  return map;
}

function webAppConfigured() {
  return CFG.RSVP_WEBAPP_URL && !CFG.RSVP_WEBAPP_URL.includes('REPLACE_WITH');
}

/* 드라이브 사진 폴더(메인/인터뷰/마무리/갤러리) 목록을 Apps Script 웹앱에서 받아옵니다.
 * 실패하면 null을 돌려주고, 시트에 적힌 파일 ID로 대체합니다. */
async function fetchDrivePhotos() {
  if (!webAppConfigured()) return null;
  try {
    const res = await fetch(CFG.RSVP_WEBAPP_URL);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('드라이브 사진 목록을 불러오지 못했습니다', e);
    return null;
  }
}

/* ---------------- 유틸 ---------------- */

function driveImageUrl(driveId, width) {
  if (!driveId) return '';
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId.trim())}&sz=w${width || 1200}`;
}

/* 드라이브가 아닌 로컬/URL 이미지를 슬롯에 넣을 때 사용 */
function setImgSlotSrc(slotEl, src, altText) {
  slotEl.innerHTML = '';
  const img = document.createElement('img');
  img.src = src;
  img.alt = altText || '';
  slotEl.appendChild(img);
}

function setImgSlot(slotEl, driveId, altText) {
  slotEl.innerHTML = '';
  if (!driveId || !driveId.trim()) {
    const p = document.createElement('div');
    p.className = 'placeholder';
    p.textContent = altText || '사진 준비 중입니다';
    slotEl.appendChild(p);
    return;
  }
  const img = document.createElement('img');
  img.src = driveImageUrl(driveId, 1200);
  img.alt = altText || '';
  img.loading = 'lazy';
  img.onerror = () => setImgSlot(slotEl, '', '사진을 불러오지 못했습니다\n(드라이브 공유 설정을 확인해주세요)');
  slotEl.appendChild(img);
}

function hexToChannels(hex) {
  const c = (hex || '#d9ab41').replace('#', '');
  const num = parseInt(c.length === 3 ? c.split('').map(x => x + x).join('') : c, 16);
  if (Number.isNaN(num)) return null;
  return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff];
}

function lighten(hex, amt) {
  const ch = hexToChannels(hex);
  if (!ch) return '#ecd9a0';
  return '#' + ch.map(x => Math.min(255, Math.round(x + (255 - x) * amt)).toString(16).padStart(2, '0')).join('');
}

function hexToRgba(hex, alpha) {
  const ch = hexToChannels(hex);
  if (!ch) return `rgba(217,177,79,${alpha})`;
  return `rgba(${ch[0]},${ch[1]},${ch[2]},${alpha})`;
}

function nl2br(str) {
  return (str || '').replace(/\n/g, '<br>');
}

let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  clearTimeout(toastTimer);
  el.textContent = msg;
  el.classList.add('show');
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

function copyText(text, successMsg) {
  const done = () => showToast(successMsg);
  const fail = () => showToast('복사에 실패했습니다');
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, fail);
  else fail();
}

function parseWeddingDate(dateStr, timeStr) {
  // dateStr: "2026-11-14" 형태, timeStr: "13:00" 형태
  const [y, m, d] = (dateStr || '').split('-').map(Number);
  let hh = 0, mm = 0;
  if (timeStr) { const [h2, m2] = timeStr.split(':').map(Number); hh = h2 || 0; mm = m2 || 0; }
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, hh, mm);
}

function formatKoreanTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h % 12 || 12;
  return m ? `${ampm} ${h12}시 ${m}분` : `${ampm} ${h12}시`;
}

/* ---------------- 렌더링 ---------------- */

function renderCalendar(container, weddingDate) {
  container.innerHTML = '';
  if (!weddingDate) return;
  const y = weddingDate.getFullYear(), m = weddingDate.getMonth();
  const firstDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const frag = document.createDocumentFragment();
  WEEKDAYS.forEach((label, i) => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.textContent = label;
    cell.style.color = i === 0 ? '#d9a0a0' : '#b3a99e';
    frag.appendChild(cell);
  });
  for (let i = 0; i < firstDow; i++) frag.appendChild(document.createElement('div'));
  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.textContent = String(day);
    const dow = (firstDow + day - 1) % 7;
    if (day === weddingDate.getDate()) {
      cell.style.color = '#fff';
      cell.style.background = 'var(--accent)';
      cell.style.fontWeight = '700';
    } else {
      cell.style.color = dow === 0 ? '#d9a0a0' : '#8a8078';
      cell.style.fontWeight = '400';
    }
    frag.appendChild(cell);
  }
  container.appendChild(frag);
}

let _countdownTimer = null;
function initCountdown(weddingDate) {
  clearInterval(_countdownTimer);
  const days = document.getElementById('cd-days');
  const hours = document.getElementById('cd-hours');
  const mins = document.getElementById('cd-mins');
  const secs = document.getElementById('cd-secs');
  if (!weddingDate) return;
  const pad = n => String(Math.max(n, 0)).padStart(2, '0');
  const tick = () => {
    const diff = weddingDate.getTime() - Date.now();
    const remain = Math.max(diff, 0);
    days.textContent = pad(Math.floor(remain / 86400000));
    hours.textContent = pad(Math.floor(remain / 3600000) % 24);
    mins.textContent = pad(Math.floor(remain / 60000) % 60);
    secs.textContent = pad(Math.floor(remain / 1000) % 60);
    if (diff <= 0) clearInterval(_countdownTimer);
  };
  tick();
  _countdownTimer = setInterval(tick, 1000);
}

function renderPage(data) {
  const { info, interviews, galleryIds, story, notices, accountGroups } = data;

  // 색상
  const accent = info.accentColor && /^#[0-9a-fA-F]{3,6}$/.test(info.accentColor) ? info.accentColor : '#c1a05e';
  document.documentElement.style.setProperty('--accent', accent);
  document.documentElement.style.setProperty('--accent-soft', lighten(accent, 0.45));
  document.documentElement.style.setProperty('--accent-shadow', hexToRgba(accent, 0.35));

  // 드라이브 폴더에 사진이 있으면 그것을 우선 사용, 없으면 시트에 적힌 파일 ID 사용
  const photos = data.photos || {};
  const heroId = (photos.hero && photos.hero[0]) || info.heroImageId;
  const interviewId = (photos.interview && photos.interview[0]) || info.interviewImageId;
  const infoPhotoId = heroId;
  const endingId = (photos.ending && photos.ending[0]) || info.endingImageId;
  const finalGalleryIds = (photos.gallery && photos.gallery.length) ? photos.gallery : galleryIds;

  // 1. 히어로 — 사진 (드라이브 > 시트 ID > 저장소 기본 사진 순)
  const heroSlot = document.getElementById('slot-hero');
  if (heroId) setImgSlot(heroSlot, heroId, '메인 웨딩 사진');
  else setImgSlotSrc(heroSlot, 'assets/hero.jpg', '메인 웨딩 사진');

  // 히어로 텍스트 오버레이 (영문): 상단 이름/날짜, 하단 일시/장소
  const weddingDate = parseWeddingDate(info.weddingDate, info.weddingTime);
  const upper = s => (s || '').toUpperCase();
  document.getElementById('hero-name-left').textContent = upper(info.heroGroomEn) || info.groomName || '';
  document.getElementById('hero-name-right').textContent = upper(info.heroBrideEn) || info.brideName || '';
  if (weddingDate) {
    const y = weddingDate.getFullYear();
    const mm = String(weddingDate.getMonth() + 1).padStart(2, '0');
    const dd = String(weddingDate.getDate()).padStart(2, '0');
    document.getElementById('hero-date-num').textContent = `${y}.${mm}.${dd}`;
    const WEEKDAYS_EN = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const MONTHS_EN = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    const h = weddingDate.getHours(), min = weddingDate.getMinutes();
    const h12 = h % 12 || 12;
    const ampm = h < 12 ? 'AM' : 'PM';
    const timeStr = min ? `${h12}:${String(min).padStart(2, '0')}` : `${h12}:00`;
    document.getElementById('hero-time-line').textContent =
      `${WEEKDAYS_EN[weddingDate.getDay()]}, ${MONTHS_EN[weddingDate.getMonth()]} ${weddingDate.getDate()}, ${y} AT ${timeStr} ${ampm}`;
  }
  document.getElementById('hero-venue-line').textContent = upper(info.heroVenueEn) || info.venueName || '';

  // 2. 인사말
  document.getElementById('greeting-text').innerHTML = nl2br(info.greetingText);

  // 3. 혼주 소개
  document.getElementById('groom-parents').textContent = [info.groomFather, info.groomMother].filter(Boolean).join(' · ');
  document.getElementById('bride-parents').textContent = [info.brideFather, info.brideMother].filter(Boolean).join(' · ');
  document.getElementById('groom-name-2').textContent = info.groomName || '';
  document.getElementById('bride-name-2').textContent = info.brideName || '';
  document.getElementById('cg-groom-name').textContent = info.groomName || '';
  document.getElementById('cg-bride-name').textContent = info.brideName || '';
  const groomTel = document.getElementById('cg-groom-tel');
  groomTel.textContent = info.groomPhone || '';
  groomTel.href = info.groomPhone ? 'tel:' + info.groomPhone.replace(/-/g, '') : '#';
  const brideTel = document.getElementById('cg-bride-tel');
  brideTel.textContent = info.bridePhone || '';
  brideTel.href = info.bridePhone ? 'tel:' + info.bridePhone.replace(/-/g, '') : '#';
  document.getElementById('btn-contact').addEventListener('click', () => {
    document.getElementById('contact-grid').classList.toggle('hidden');
  });

  // 4. 인터뷰
  setImgSlot(document.getElementById('slot-interview'), interviewId, '인터뷰 사진');
  const interviewList = document.getElementById('interview-list');
  interviewList.innerHTML = interviews.map(qa => `
    <div>
      <div class="q-label">Q.</div>
      <div class="q-text">${escapeHtml(qa.q)}</div>
      <div class="a-text">${escapeHtml(qa.a)}</div>
    </div>
  `).join('');
  const interviewBtn = document.getElementById('btn-interview');
  interviewBtn.addEventListener('click', () => {
    const open = interviewList.classList.toggle('hidden') === false;
    interviewBtn.textContent = open ? '인터뷰 접기' : '인터뷰 읽어보기';
  });

  // 5. 갤러리
  const galleryScroll = document.getElementById('gallery-scroll');
  galleryScroll.innerHTML = '';
  finalGalleryIds.forEach((gid, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'gallery-item';
    const slot = document.createElement('div');
    slot.className = 'img-slot shape-rounded';
    slot.style.borderRadius = '6px';
    setImgSlot(slot, gid, `갤러리 사진 ${i + 1}`);
    wrap.appendChild(slot);
    galleryScroll.appendChild(wrap);
  });

  // 6. 우리의 시간
  const storyList = document.getElementById('story-list');
  storyList.innerHTML = story.map(s => `
    <div class="story-row">
      <div class="story-dot-col"><div class="story-dot"></div><div class="story-line"></div></div>
      <div class="story-body">
        <div class="story-date">${escapeHtml(s.date)}</div>
        <div class="story-title">${escapeHtml(s.title)}</div>
        <div class="story-desc">${escapeHtml(s.desc)}</div>
      </div>
    </div>
  `).join('');

  // 7. 예식 안내 (사진 - 달력 - 타이머)
  const infoSlot = document.getElementById('slot-info');
  if (infoPhotoId) setImgSlot(infoSlot, infoPhotoId, '예식 사진');
  else setImgSlotSrc(infoSlot, 'assets/hero.jpg', '예식 사진');
  document.getElementById('info-date').textContent = weddingDate
    ? `${weddingDate.getFullYear()}년 ${weddingDate.getMonth() + 1}월 ${weddingDate.getDate()}일 ${WEEKDAYS[weddingDate.getDay()]}요일` : '';
  document.getElementById('info-time').textContent = [formatKoreanTime(info.weddingTime), info.venueName].filter(Boolean).join(' · ');
  renderCalendar(document.getElementById('calendar-grid'), weddingDate);
  document.getElementById('countdown-title').innerHTML =
    `태경 <span style="color:var(--accent)">♥</span> 지영 <b>결혼식까지</b>`;
  initCountdown(weddingDate);
  const noticeScroll = document.getElementById('notice-scroll');
  noticeScroll.innerHTML = notices.map(n => `
    <div class="notice-card">
      <div class="notice-en">${escapeHtml(n.en)}</div>
      <div class="notice-title">${escapeHtml(n.title)}</div>
      <div class="notice-desc">${nl2br(escapeHtml(n.desc))}</div>
    </div>
  `).join('');

  // 8. 오시는 길
  document.getElementById('venue-name-2').textContent = info.venueName || '';
  document.getElementById('venue-address').textContent = info.venueAddress || '';
  document.getElementById('btn-copy-addr').addEventListener('click', () => copyText(info.venueAddress || '', '주소가 복사되었습니다'));
  if (info.venueAddress) {
    const q = encodeURIComponent(`${info.venueName || ''} ${info.venueAddress}`.trim());
    document.getElementById('link-kakao').href = `https://map.kakao.com/link/search/${q}`;
    document.getElementById('link-naver').href = `https://map.naver.com/v5/search/${q}`;
  }
  document.getElementById('transit-subway').innerHTML = nl2br(info.subwayInfo);
  document.getElementById('transit-bus').innerHTML = nl2br(info.busInfo);
  document.getElementById('transit-parking').innerHTML = nl2br(info.parkingInfo);

  // 9. 참석 여부
  initRsvp(info);

  // 10. 계좌번호
  const accountGroupsEl = document.getElementById('account-groups');
  accountGroupsEl.innerHTML = '';
  accountGroups.forEach(g => {
    const groupEl = document.createElement('div');
    groupEl.className = 'account-group';
    groupEl.innerHTML = `
      <button class="account-toggle"><span>${escapeHtml(g.label)}</span><span class="arrow">▼</span></button>
      <div class="account-items hidden"></div>
    `;
    const itemsEl = groupEl.querySelector('.account-items');
    g.items.forEach(acc => {
      const row = document.createElement('div');
      row.className = 'account-row';
      row.innerHTML = `
        <div class="holder">${escapeHtml(acc.holder)}<br><span class="bank">${escapeHtml(acc.bank)} ${escapeHtml(acc.number)}</span></div>
        <button class="copy-btn">복사</button>
      `;
      row.querySelector('.copy-btn').addEventListener('click', () => copyText(`${acc.bank} ${acc.number}`, '계좌번호가 복사되었습니다'));
      itemsEl.appendChild(row);
    });
    const toggleBtn = groupEl.querySelector('.account-toggle');
    toggleBtn.addEventListener('click', () => {
      const nowHidden = itemsEl.classList.toggle('hidden');
      toggleBtn.querySelector('.arrow').textContent = nowHidden ? '▼' : '▲';
    });
    accountGroupsEl.appendChild(groupEl);
  });

  // 11. 방명록 (guestbook.js)
  initGuestbookSection();

  // 12. 마무리
  setImgSlot(document.getElementById('slot-ending'), endingId, '마무리 사진');
  document.getElementById('ending-sign').textContent = weddingDate
    ? `${info.groomName} & ${info.brideName} · ${weddingDate.getFullYear()}. ${weddingDate.getMonth() + 1}. ${weddingDate.getDate()}`
    : `${info.groomName} & ${info.brideName}`;
  document.getElementById('btn-share').addEventListener('click', () => {
    const shareData = {
      title: `${info.groomName} ♥ ${info.brideName} 결혼합니다`,
      text: `${document.getElementById('info-date').textContent} ${document.getElementById('info-time').textContent}`,
      url: location.href
    };
    if (navigator.share) navigator.share(shareData).catch(() => {});
    else copyText(location.href, '링크가 복사되었습니다');
  });
  document.getElementById('btn-copy-link').addEventListener('click', () => copyText(location.href, '링크가 복사되었습니다'));

  // 스크롤 리빌 애니메이션
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.rv').forEach(el => io.observe(el));
}

function escapeHtml(str) {
  return (str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------------- RSVP ---------------- */

function initRsvp(info) {
  const RSVP_KEY = 'wedding_rsvp_v1';
  const idleEl = document.getElementById('rsvp-idle');
  const formEl = document.getElementById('rsvp-form');
  const doneEl = document.getElementById('rsvp-done');
  const nameEl = document.getElementById('rsvp-name');
  const messageEl = document.getElementById('rsvp-message');
  const countEl = document.getElementById('rsvp-count');
  const summaryEl = document.getElementById('rsvp-summary');
  const groomBtn = document.getElementById('btn-side-groom');
  const brideBtn = document.getElementById('btn-side-bride');
  const attendYesBtn = document.getElementById('btn-attend-yes');
  const attendNoBtn = document.getElementById('btn-attend-no');
  const mealBtns = {
    O: document.getElementById('btn-meal-o'),
    X: document.getElementById('btn-meal-x'),
    미정: document.getElementById('btn-meal-unsure'),
  };

  let side = null, attend = null, meal = null, count = 1;

  function showState(state) {
    idleEl.classList.toggle('hidden', state !== 'idle');
    formEl.classList.toggle('hidden', state !== 'form');
    doneEl.classList.toggle('hidden', state !== 'done');
  }

  const saved = localStorage.getItem(RSVP_KEY);
  if (saved) {
    try {
      const s = JSON.parse(saved);
      summaryEl.textContent = s.summary;
      showState('done');
    } catch (e) { showState('idle'); }
  } else {
    showState('idle');
  }

  document.getElementById('btn-rsvp-open').addEventListener('click', () => showState('form'));

  function pickSide(chosen) {
    side = chosen;
    groomBtn.classList.toggle('active', side === 'groom');
    brideBtn.classList.toggle('active', side === 'bride');
  }
  groomBtn.addEventListener('click', () => pickSide('groom'));
  brideBtn.addEventListener('click', () => pickSide('bride'));

  function pickAttend(chosen) {
    attend = chosen;
    attendYesBtn.classList.toggle('active', attend === 'yes');
    attendNoBtn.classList.toggle('active', attend === 'no');
  }
  attendYesBtn.addEventListener('click', () => pickAttend('yes'));
  attendNoBtn.addEventListener('click', () => pickAttend('no'));

  function pickMeal(chosen) {
    meal = chosen;
    Object.keys(mealBtns).forEach(k => mealBtns[k].classList.toggle('active', k === chosen));
  }
  Object.keys(mealBtns).forEach(k => mealBtns[k].addEventListener('click', () => pickMeal(k)));

  document.getElementById('rsvp-dec').addEventListener('click', () => { count = Math.max(1, count - 1); countEl.textContent = count; });
  document.getElementById('rsvp-inc').addEventListener('click', () => { count = Math.min(10, count + 1); countEl.textContent = count; });

  document.getElementById('rsvp-submit').addEventListener('click', async () => {
    const name = nameEl.value.trim();
    const message = messageEl.value.trim();
    if (!side) { showToast('신랑측/신부측을 선택해 주세요'); return; }
    if (!attend) { showToast('참석 여부를 선택해 주세요'); return; }
    if (!meal) { showToast('식사 여부를 선택해 주세요'); return; }
    if (!name) { showToast('성함을 입력해 주세요'); return; }
    const sideLabel = side === 'groom' ? '신랑측' : '신부측';
    const attendLabel = attend === 'yes' ? '참석' : '불참석';
    const summary = attend === 'yes' ? `${sideLabel} · ${name} 님 · ${count}명 참석` : `${sideLabel} · ${name} 님 · 불참석`;

    if (webAppConfigured()) {
      try {
        await fetch(CFG.RSVP_WEBAPP_URL, {
          method: 'POST',
          mode: 'no-cors',
          body: JSON.stringify({ type: 'rsvp', side: sideLabel, attend: attendLabel, meal, name, count, message })
        });
      } catch (e) { /* no-cors 응답은 읽을 수 없어 항상 여기로 오지 않음 — 실패해도 로컬엔 저장 */ }
    }

    localStorage.setItem(RSVP_KEY, JSON.stringify({ summary }));
    summaryEl.textContent = summary;
    showState('done');
  });
}

/* ---------------- 초기화 ---------------- */

function groupAccountRows(rows) {
  const groupsMap = {};
  rows.forEach(r => {
    const label = (r[0] || '기타') + ' 계좌번호';
    if (!groupsMap[label]) groupsMap[label] = [];
    groupsMap[label].push({ holder: r[1] || '', bank: r[2] || '', number: r[3] || '' });
  });
  return Object.keys(groupsMap).map(label => ({ label, items: groupsMap[label] }));
}

async function loadData() {
  const [settingsRows, interviewRows, galleryRows, storyRows, noticeRows, accountRows, photos] = await Promise.all([
    fetchSheetRows('설정'),
    fetchSheetRows('인터뷰'),
    fetchSheetRows('갤러리'),
    fetchSheetRows('우리의시간'),
    fetchSheetRows('안내사항'),
    fetchSheetRows('계좌번호'),
    fetchDrivePhotos(),
  ]);

  const info = rowsToMap(settingsRows);
  const interviews = interviewRows.map(r => ({ q: r[1] || '', a: r[2] || '' }));
  const galleryIds = galleryRows.map(r => r[1] || '').filter(Boolean);
  const story = storyRows.map(r => ({ date: r[1] || '', title: r[2] || '', desc: r[3] || '' }));
  const notices = noticeRows.map(r => ({ en: r[1] || '', title: r[2] || '', desc: r[3] || '' }));
  const accountGroups = groupAccountRows(accountRows);

  return { info, interviews, galleryIds, story, notices, accountGroups, photos };
}

(async function init() {
  // 초대장 본문(index.html)에만 있는 요소로 페이지를 판별합니다.
  // guestbook.html 등 다른 페이지에서는 script.js의 유틸 함수만 쓰고 이 렌더링은 건너뜁니다.
  if (!document.getElementById('slot-hero')) return;
  try {
    if (!CFG.SHEET_ID || CFG.SHEET_ID.includes('REPLACE_WITH')) {
      throw new Error('config.js에 구글 시트 ID가 설정되지 않았습니다.');
    }
    const data = await loadData();
    renderPage(data);
    document.getElementById('load-state').classList.add('hidden');
    document.getElementById('page').classList.remove('hidden');
  } catch (err) {
    console.error(err);
    document.getElementById('load-state').innerHTML =
      '<div class="err">청첩장 정보를 불러오지 못했습니다.<br>구글 시트 공유 설정(링크가 있는 모든 사용자: 뷰어)과<br>config.js의 SHEET_ID를 확인해주세요.</div>';
  }
})();
