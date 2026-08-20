document.addEventListener('DOMContentLoaded', async () => {
  const toggle = document.getElementById('activeToggle');
  const cardBody = document.getElementById('cardBody');
  const toggleStatusText = document.getElementById('toggleStatusText');
  const logoIcon = document.querySelector('.logo-icon');

  if (!toggle || !cardBody || !toggleStatusText || !logoIcon) return;

  // ------------------------------------------------------------
  // 저장된 ONEPACE 상태 불러오기
  // ------------------------------------------------------------

  const saved = await chrome.storage.local.get({
    onepaceEnabled: true
  });

  toggle.checked = saved.onepaceEnabled !== false;


  // ------------------------------------------------------------
  // LOGO
  // 활성화 / 비활성화에 따라 이미지 변경
  // ------------------------------------------------------------

  function updateLogo(enabled) {

    if (enabled) {
      logoIcon.src = 'assets/onepace-logo.png';
    } else {
      logoIcon.src = 'assets/onepace-logo-gray.png';
    }

  }


  // ------------------------------------------------------------
  // UI RENDER
  // ------------------------------------------------------------

  function render(enabled) {

    toggle.checked = enabled;

    // 로고 변경
    updateLogo(enabled);


    // ----------------------------------------------------------
    // 활성화
    // ----------------------------------------------------------

    if (enabled) {

      toggleStatusText.textContent =
        'ONE PACE 활성화됨';

      cardBody.innerHTML = `
        <div class="status-badge">
          <span class="dot"></span>
          <span>분석 중...</span>
        </div>

        <p class="description">
          AI가 실시간으로<br>
          오해를 탐지하고 있습니다.
        </p>

        <div class="btn-group">
          <button
            class="btn"
            id="summaryBtn"
          >
            AI 회의록 요약 열기
          </button>

          <button
            class="btn"
            id="dashboardBtn"
          >
            전체 분석 리포트 대시보드
          </button>
        </div>
      `;

      bindSidePanelButtons();

    }


    // ----------------------------------------------------------
    // 비활성화
    // ----------------------------------------------------------

    else {

      toggleStatusText.textContent =
        'ONE PACE 비활성화됨';

      cardBody.innerHTML = `
        <div class="disabled-text">
          ONE PACE가 비활성화 상태입니다.
        </div>

        <a
          href="#"
          class="help-link"
        >
          <span>❓</span>
          도움말
        </a>
      `;

    }

  }


  // ------------------------------------------------------------
  // Side Panel
  // ------------------------------------------------------------

function openSidePanel(view) {
  // 어떤 화면을 열지 먼저 저장
  chrome.storage.local.set({
    onepaceView: view
  }).catch(() => {});

  // 팝업의 user gesture 안에서 즉시 사이드 패널 열기
  const openPromise = chrome.sidePanel.open({
    windowId: chrome.windows.WINDOW_ID_CURRENT
  });

  openPromise
    .then(() => {
      // 사이드 패널이 정상적으로 열리면 팝업 닫기
      window.close();
    })
    .catch((error) => {
      console.error(
        'ONE PACE Side Panel 열기 실패:',
        error
      );
    });
}

  // ------------------------------------------------------------
  // Side Panel BUTTONS
  // ------------------------------------------------------------

  function bindSidePanelButtons() {

    const summaryBtn =
      document.getElementById('summaryBtn');

    const dashboardBtn =
      document.getElementById('dashboardBtn');


    summaryBtn?.addEventListener(
      'click',
      (event) => {

        event.preventDefault();

        openSidePanel('summary');

      }
    );


    dashboardBtn?.addEventListener(
      'click',
      (event) => {

        event.preventDefault();

        openSidePanel('dashboard');

      }
    );

  }


  // ------------------------------------------------------------
  // ONEPACE ON / OFF
  // ------------------------------------------------------------

  toggle.addEventListener(
    'change',
    async (event) => {

      const enabled =
        event.target.checked;


      // 상태 저장
      await chrome.storage.local.set({
        onepaceEnabled: enabled
      });


      // UI + 로고 변경
      render(enabled);

    }
  );


  // ------------------------------------------------------------
  // INITIAL RENDER
  // ------------------------------------------------------------

  render(toggle.checked);

});