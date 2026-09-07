// ============================================================
// 방명록 — index.html(목록 미리보기)과 guestbook.html(전체보기) 공용 로직
// escapeHtml / nl2br / showToast / webAppConfigured 는 script.js에 정의되어 있어
// 두 페이지 모두 script.js를 먼저 불러온 뒤 이 파일을 불러와야 합니다.
// ============================================================

async function fetchGuestbook() {
  const url = CFG.RSVP_WEBAPP_URL + '?action=getGuestbook';
  const res = await fetch(url);
  if (!res.ok) throw new Error('방명록을 불러오지 못했습니다');
  return await res.json(); // [{id, date, name, message}]
}

async function submitGuestbookEntry(name, message, password) {
  const res = await fetch(CFG.RSVP_WEBAPP_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'submitGuestbook', name, message, password }),
  });
  return await res.json();
}

async function editGuestbookEntry(id, name, message, password) {
  const res = await fetch(CFG.RSVP_WEBAPP_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'editGuestbook', id, name, message, password }),
  });
  return await res.json();
}

// 담백한 카드형 리스트 한 줄 (포스트잇/편지지 느낌 없이 기본 스타일)
function guestbookRowHtml(entry) {
  const editBtn = entry.id
    ? `<button class="guestbook-edit-btn" data-id="${escapeHtml(entry.id)}" aria-label="수정">✎</button>`
    : '';
  return `
    <div class="guestbook-row" data-id="${escapeHtml(entry.id || '')}">
      <div class="guestbook-row-top">
        <span class="guestbook-row-name">${escapeHtml(entry.name)}</span>
        ${editBtn}
      </div>
      <div class="guestbook-row-message">${nl2br(escapeHtml(entry.message))}</div>
      <div class="guestbook-row-date">${escapeHtml(entry.date || '')}</div>
    </div>
  `;
}

/* ---------------- 수정 모달 (양쪽 페이지 공통) ---------------- */

let _editModalEl = null;

function ensureEditModal() {
  if (_editModalEl) return _editModalEl;
  const el = document.createElement('div');
  el.className = 'gb-modal-overlay hidden';
  el.id = 'gb-edit-modal';
  el.innerHTML = `
    <div class="gb-modal-box">
      <button class="gb-modal-close" id="gb-edit-close" aria-label="닫기">✕</button>
      <div class="gb-modal-title">방명록 수정</div>
      <input type="text" id="gb-edit-name" placeholder="성함">
      <textarea id="gb-edit-message" placeholder="메시지" rows="4"></textarea>
      <input type="password" id="gb-edit-password" inputmode="numeric" maxlength="10" placeholder="비밀번호">
      <button class="solid-btn-block" id="gb-edit-save">저장하기</button>
    </div>
  `;
  document.body.appendChild(el);

  const close = () => el.classList.add('hidden');
  el.addEventListener('click', e => { if (e.target === el) close(); });
  el.querySelector('#gb-edit-close').addEventListener('click', close);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !el.classList.contains('hidden')) close();
  });

  _editModalEl = el;
  return el;
}

function openEditModal(entry, onSaved) {
  const el = ensureEditModal();
  const nameEl = el.querySelector('#gb-edit-name');
  const messageEl = el.querySelector('#gb-edit-message');
  const passwordEl = el.querySelector('#gb-edit-password');
  const saveBtn = el.querySelector('#gb-edit-save');

  nameEl.value = entry.name;
  messageEl.value = entry.message;
  passwordEl.value = '';
  el.classList.remove('hidden');

  const newSaveBtn = saveBtn.cloneNode(true);
  saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

  newSaveBtn.addEventListener('click', async () => {
    const name = nameEl.value.trim();
    const message = messageEl.value.trim();
    const password = passwordEl.value.trim();
    if (!name) { showToast('성함을 입력해 주세요'); return; }
    if (!message) { showToast('메시지를 입력해 주세요'); return; }
    if (!password) { showToast('비밀번호를 입력해 주세요'); return; }

    newSaveBtn.disabled = true;
    newSaveBtn.textContent = '저장 중…';
    try {
      const res = await editGuestbookEntry(entry.id, name, message, password);
      if (res.result === 'ok') {
        el.classList.add('hidden');
        showToast('메시지가 수정되었습니다');
        if (onSaved) onSaved({ ...entry, name, message });
      } else {
        showToast(res.message || '수정에 실패했습니다');
      }
    } catch (e) {
      showToast('요청 중 오류가 발생했습니다');
    }
    newSaveBtn.disabled = false;
    newSaveBtn.textContent = '저장하기';
  });
}

/* ---------------- index.html: 작성 폼 + 목록 미리보기 ---------------- */

function initGuestbookSection() {
  const listEl = document.getElementById('guestbook-list');
  const nameEl = document.getElementById('guestbook-name-input');
  const messageEl = document.getElementById('guestbook-message-input');
  const passwordEl = document.getElementById('guestbook-password-input');
  const submitBtn = document.getElementById('btn-guestbook-submit');

  function renderList(entries) {
    if (!entries.length) {
      listEl.innerHTML = '<div class="guestbook-empty">첫 번째 축하 메시지를 남겨주세요 ♥</div>';
      return;
    }
    listEl.innerHTML = entries.slice().reverse().map(guestbookRowHtml).join('');
    listEl.querySelectorAll('.guestbook-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const entry = entries.find(e => e.id === btn.dataset.id);
        if (entry) openEditModal(entry, updated => {
          Object.assign(entry, updated);
          renderList(entries);
        });
      });
    });
  }

  let entries = [];
  // 초기 목록을 다 불러오기 전에 방문자가 먼저 글을 남기면(느린 네트워크 등),
  // 나중에 도착한 초기 목록이 방금 올린 글을 덮어써버리는 경쟁 상태를 막기 위해
  // 제출 시 이 프라미스를 먼저 기다립니다.
  const ready = fetchGuestbook()
    .then(list => { entries = list; renderList(entries); return entries; })
    .catch(() => { listEl.innerHTML = '<div class="guestbook-empty">방명록을 불러오지 못했습니다</div>'; return entries; });

  submitBtn.addEventListener('click', async () => {
    const name = nameEl.value.trim();
    const message = messageEl.value.trim();
    const password = passwordEl.value.trim();
    if (!name) { showToast('성함을 입력해 주세요'); return; }
    if (!message) { showToast('메시지를 입력해 주세요'); return; }
    if (!password) { showToast('수정용 비밀번호를 입력해 주세요'); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = '보내는 중…';
    try {
      await ready;
      const res = await submitGuestbookEntry(name, message, password);
      if (res.result === 'ok') {
        entries.push({ id: res.id, date: '', name, message });
        renderList(entries);
        nameEl.value = '';
        messageEl.value = '';
        passwordEl.value = '';
        showToast('소중한 메시지 감사합니다 ♥');
      } else {
        showToast(res.message || '메시지 등록에 실패했습니다');
      }
    } catch (e) {
      showToast('요청 중 오류가 발생했습니다');
    }
    submitBtn.disabled = false;
    submitBtn.textContent = '방명록 남기기';
  });
}

/* ---------------- guestbook.html: 전체 목록 ---------------- */

function initGuestbookPage() {
  const listEl = document.getElementById('guestbook-page-list');
  const countEl = document.getElementById('guestbook-page-count');
  const backBtn = document.getElementById('guestbook-back-btn');

  backBtn.addEventListener('click', () => {
    if (document.referrer) history.back();
    else location.href = 'index.html';
  });

  let entries = [];
  function renderList() {
    countEl.textContent = `총 ${entries.length}개`;
    if (!entries.length) {
      listEl.innerHTML = '<div class="guestbook-empty">첫 번째 축하 메시지를 남겨주세요 ♥</div>';
      return;
    }
    listEl.innerHTML = entries.slice().reverse().map(guestbookRowHtml).join('');
    listEl.querySelectorAll('.guestbook-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const entry = entries.find(en => en.id === btn.dataset.id);
        if (entry) openEditModal(entry, updated => { Object.assign(entry, updated); renderList(); });
      });
    });
  }

  fetchGuestbook()
    .then(list => { entries = list; renderList(); })
    .catch(() => { listEl.innerHTML = '<div class="guestbook-empty">방명록을 불러오지 못했습니다</div>'; });
}
