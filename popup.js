document.addEventListener('DOMContentLoaded', async () => {
  const toggle = document.getElementById('activeToggle');
  const cardBody = document.getElementById('cardBody');
  const toggleStatusText = document.getElementById('toggleStatusText');

  if (!toggle || !cardBody || !toggleStatusText) return;

  // ------------------------------------------------------------
  // 저장된 ONEPACE 상태 불러오기
  // ------------------------------------------------------------
  const saved = await chrome.storage.local.get({ onepaceEnabled: true });
  toggle.checked = saved.onepaceEnabled !== false;

  function render(enabled) {
    toggle.checked = enabled;

    if (enabled) {
      toggleStatusText.textContent = 'ONE PACE 활성화됨';
      cardBody.innerHTML = `
        <div class="status-badge">
          <span class="dot"></span>
          <span>분석 중...</span>
        </div>
        <p class="description">
          AI가 실시간으로<br>오해를 탐지하고 있습니다.
        </p>
        <div class="btn-group">
          <button class="btn" id="summaryBtn">AI 회의록 요약 열기</button>
          <button class="btn" id="dashboardBtn">전체 분석 리포트 대시보드</button>
        </div>
      `;
      bindSidePanelButtons();
    } else {
      toggleStatusText.textContent = 'ONE PACE 비활성화됨';
      cardBody.innerHTML = `
        <div class="disabled-text">ONE PACE가 비활성화 상태입니다.</div>
        <a href="#" class="help-link"><span>❓</span> 도움말</a>
      `;
    }
  }

  // ------------------------------------------------------------
  // Side Panel
  // 중요: chrome.sidePanel.open()을 await보다 먼저 호출해야
  // 팝업 버튼의 user gesture가 유지됩니다.
  // ------------------------------------------------------------
  function openSidePanel(view) {
    // 어떤 화면을 열지 먼저 저장해 둠
    chrome.storage.local.set({ onepaceView: view }).catch(() => {});

    // popup 버튼 클릭의 user gesture 안에서 즉시 호출
    const openPromise = chrome.sidePanel.open({
      windowId: chrome.windows.WINDOW_ID_CURRENT
    });

    openPromise.catch((error) => {
      console.error('ONE PACE Side Panel 열기 실패:', error);
    });
  }

  function bindSidePanelButtons() {
    const summaryBtn = document.getElementById('summaryBtn');
    const dashboardBtn = document.getElementById('dashboardBtn');

    summaryBtn?.addEventListener('click', (event) => {
      event.preventDefault();
      openSidePanel('summary');
    });

    dashboardBtn?.addEventListener('click', (event) => {
      event.preventDefault();
      openSidePanel('dashboard');
    });
  }

  // ------------------------------------------------------------
  // ONEPACE ON / OFF
  // ------------------------------------------------------------
  toggle.addEventListener('change', async (event) => {
    const enabled = event.target.checked;

    // 상태를 먼저 저장하면 content.js가 즉시 감지합니다.
    await chrome.storage.local.set({
      onepaceEnabled: enabled
    });

    render(enabled);
  });

  render(toggle.checked);
});
