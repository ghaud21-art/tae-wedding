// ============================================================
// 방명록 — index.html(캐러셀)과 guestbook.html(전체보기) 공용 로직
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

function guestbookCardHtml(entry, cardClass) {
  const editBtn = entry.id
    ? `<button class="guestbook-edit-btn" data-id="${escapeHtml(entry.id)}" aria-label="수정">✎</button>`
    : '';
  return `
    <div class="${cardClass}" data-id="${escapeHtml(entry.id || '')}">
      ${editBtn}
      <div class="guestbook-card-inner">
        <div class="guestbook-card-message">${nl2br(escapeHtml(entry.message))}</div>
        <div class="guestbook-card-from">from. ${escapeHtml(entry.name)}</div>
        <div class="guestbook-card-date">${escapeHtml(entry.date || '')}</div>
      </div>
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

/* ---------------- index.html: 작성 폼 + 가로 캐러셀 ---------------- */

function initGuestbookSection() {
  const carouselEl = document.getElementById('guestbook-carousel');
  const hintEl = document.getElementById('guestbook-hint');
  const nameEl = document.getElementById('guestbook-name-input');
  const messageEl = document.getElementById('guestbook-message-input');
  const passwordEl = document.getElementById('guestbook-password-input');
  const submitBtn = document.getElementById('btn-guestbook-submit');

  function renderCarousel(entries) {
    if (!entries.length) {
      carouselEl.innerHTML = '';
      hintEl.classList.add('hidden');
      return;
    }
    carouselEl.innerHTML = entries.slice().reverse().map(g => guestbookCardHtml(g, 'guestbook-card')).join('');
    hintEl.classList.remove('hidden');
    carouselEl.querySelectorAll('.guestbook-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const entry = entries.find(e => e.id === btn.dataset.id);
        if (entry) openEditModal(entry, updated => {
          Object.assign(entry, updated);
          renderCarousel(entries);
        });
      });
    });
  }

  let entries = [];
  fetchGuestbook()
    .then(list => { entries = list; renderCarousel(entries); })
    .catch(() => { hintEl.classList.add('hidden'); });

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
      const res = await submitGuestbookEntry(name, message, password);
      if (res.result === 'ok') {
        entries.push({ id: res.id, date: '', name, message });
        renderCarousel(entries);
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

/* ---------------- guestbook.html: 세로 목록 + 확대 모달 ---------------- */

let _viewModalEl = null;

function ensureViewModal() {
  if (_viewModalEl) return _viewModalEl;
  const el = document.createElement('div');
  el.className = 'gb-modal-overlay hidden';
  el.id = 'gb-view-modal';
  el.innerHTML = `
    <div class="gb-view-box">
      <button class="gb-modal-close" id="gb-view-close" aria-label="닫기">✕</button>
      <div class="guestbook-view-card" id="gb-view-card"></div>
    </div>
  `;
  document.body.appendChild(el);

  const close = () => el.classList.add('hidden');
  el.addEventListener('click', e => { if (e.target === el) close(); });
  el.querySelector('#gb-view-close').addEventListener('click', close);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !el.classList.contains('hidden')) close();
  });

  _viewModalEl = el;
  return el;
}

function openViewModal(entry, onSaved) {
  const el = ensureViewModal();
  const cardEl = el.querySelector('#gb-view-card');
  cardEl.innerHTML = guestbookCardHtml(entry, 'guestbook-card guestbook-view-card-inner');
  el.classList.remove('hidden');
  const editBtn = cardEl.querySelector('.guestbook-edit-btn');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      openEditModal(entry, updated => {
        Object.assign(entry, updated);
        openViewModal(entry, onSaved);
        if (onSaved) onSaved(updated);
      });
    });
  }
}

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
    listEl.innerHTML = entries.slice().reverse().map(g => guestbookCardHtml(g, 'guestbook-card guestbook-list-card')).join('');
    listEl.querySelectorAll('.guestbook-list-card').forEach(cardEl => {
      cardEl.addEventListener('click', e => {
        if (e.target.closest('.guestbook-edit-btn')) return;
        const entry = entries.find(en => en.id === cardEl.dataset.id);
        if (entry) openViewModal(entry, () => renderList());
      });
    });
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
