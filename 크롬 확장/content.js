(() => {
  'use strict';

  // ============================================================
  // ONEPACE CONTENT SCRIPT
  // ============================================================

  if (window.top !== window.self) return;

  if (
    document.documentElement.dataset.onepaceLoaded === 'true'
  ) {
    return;
  }

  document.documentElement.dataset.onepaceLoaded = 'true';


  // ============================================================
  // 국가 데이터
  // ============================================================

  const COUNTRIES = [
    {
      name: '한국',
      nationality: '한국인',
      flag: '🇰🇷',
      timezone: 'Asia/Seoul',
      code: 'KR'
    },
    {
      name: '미국',
      nationality: '미국인',
      flag: '🇺🇸',
      timezone: 'America/New_York',
      code: 'US'
    },
    {
      name: '영국',
      nationality: '영국인',
      flag: '🇬🇧',
      timezone: 'Europe/London',
      code: 'GB'
    },
    {
      name: '프랑스',
      nationality: '프랑스인',
      flag: '🇫🇷',
      timezone: 'Europe/Paris',
      code: 'FR'
    },
    {
      name: '독일',
      nationality: '독일인',
      flag: '🇩🇪',
      timezone: 'Europe/Berlin',
      code: 'DE'
    },
    {
      name: '스페인',
      nationality: '스페인인',
      flag: '🇪🇸',
      timezone: 'Europe/Madrid',
      code: 'ES'
    },
    {
      name: '이탈리아',
      nationality: '이탈리아인',
      flag: '🇮🇹',
      timezone: 'Europe/Rome',
      code: 'IT'
    },
    {
      name: '캐나다',
      nationality: '캐나다인',
      flag: '🇨🇦',
      timezone: 'America/Toronto',
      code: 'CA'
    },
    {
      name: '호주',
      nationality: '호주인',
      flag: '🇦🇺',
      timezone: 'Australia/Sydney',
      code: 'AU'
    },
    {
      name: '일본',
      nationality: '일본인',
      flag: '🇯🇵',
      timezone: 'Asia/Tokyo',
      code: 'JP'
    },
    {
      name: '중국',
      nationality: '중국인',
      flag: '🇨🇳',
      timezone: 'Asia/Shanghai',
      code: 'CN'
    },
    {
      name: '싱가포르',
      nationality: '싱가포르인',
      flag: '🇸🇬',
      timezone: 'Asia/Singapore',
      code: 'SG'
    },
    {
      name: '인도',
      nationality: '인도인',
      flag: '🇮🇳',
      timezone: 'Asia/Kolkata',
      code: 'IN'
    },
    {
      name: '브라질',
      nationality: '브라질인',
      flag: '🇧🇷',
      timezone: 'America/Sao_Paulo',
      code: 'BR'
    },
    {
      name: '멕시코',
      nationality: '멕시코인',
      flag: '🇲🇽',
      timezone: 'America/Mexico_City',
      code: 'MX'
    },
    {
      name: '네덜란드',
      nationality: '네덜란드인',
      flag: '🇳🇱',
      timezone: 'Europe/Amsterdam',
      code: 'NL'
    },
    {
      name: '스웨덴',
      nationality: '스웨덴인',
      flag: '🇸🇪',
      timezone: 'Europe/Stockholm',
      code: 'SE'
    },
    {
      name: '스위스',
      nationality: '스위스인',
      flag: '🇨🇭',
      timezone: 'Europe/Zurich',
      code: 'CH'
    },
    {
      name: '러시아',
      nationality: '러시아인',
      flag: '🇷🇺',
      timezone: 'Europe/Moscow',
      code: 'RU'
    },
    {
      name: '아랍에미리트',
      nationality: '아랍에미리트인',
      flag: '🇦🇪',
      timezone: 'Asia/Dubai',
      code: 'AE'
    }
  ];


  // ============================================================
  // 상태
  // ============================================================

  const ROOT_ID = 'onepace-global-root';
  const WARNING_ID = 'onepace-realtime-warning';

  const ANALYZE_ENDPOINT =
    'https://api.onepace.site/api/culture-translation/analyze';

  let enabled = true;
  let selectedCountry = null;
  let activeComposer = null;

  let analysisTimer = null;
  let lastAnalysisKey = '';
  let latestRequestKey = '';

  let observerTimer = null;
  let repositionTimer = null;


  // ============================================================
  // 텍스트 읽기
  // ============================================================

  function getText(element) {
    if (!element) return '';

    if (element.isContentEditable) {
      return (
        element.innerText ||
        element.textContent ||
        ''
      );
    }

    return element.value || '';
  }


  // ============================================================
  // HTML Escape
  // ============================================================

  function escapeHtml(value) {
    return String(value).replace(
      /[&<>'"]/g,
      (character) => {
        const map = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;'
        };

        return map[character];
      }
    );
  }


  // ============================================================
  // AI 분석 API
  //
  // POST
  // {
  //   text: "...",
  //   counterpartCountry: "US"
  // }
  //
  // RESPONSE
  // {
  //   id: 0,
  //   riskDetected: true,
  //   detectedExpression: "...",
  //   realtimeDetection: "...",
  //   nuanceExplanation: "...",
  //   suggestedText: "..."
  // }
  // ============================================================

  async function analyzeMessage(message, country) {

    console.log('[ONEPACE] API 요청 시작');
    console.log('[ONEPACE] text:', message);
    console.log('[ONEPACE] country:', country);

    if (!message || !country) {

      console.log(
        '[ONEPACE] message 또는 country 없음'
      );

      return {
        risky: false,
        country
      };
    }

    try {

      console.log(
        '[ONEPACE] API 호출:',
        ANALYZE_ENDPOINT
      );

      const response = await fetch(
        ANALYZE_ENDPOINT,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json'
          },

          body: JSON.stringify({
            text: message,
            counterpartCountry: country.code
          })
        }
      );

      console.log(
        '[ONEPACE] API status:',
        response.status
      );

      if (!response.ok) {

        const errorText =
          await response.text().catch(() => '');

        console.warn(
          '[ONEPACE] 분석 API 응답 오류:',
          response.status,
          errorText
        );

        return {
          risky: false,
          country
        };
      }

      const data =
        await response.json();

      console.log(
        '[ONEPACE] API response:',
        data
      );


      // ----------------------------------------------------------
      // 위험 없음
      // ----------------------------------------------------------

      if (!data.riskDetected) {

        console.log(
          '[ONEPACE] 오해 가능성 없음'
        );

        return {
          risky: false,
          country
        };
      }


      // ----------------------------------------------------------
      // 위험 있음
      // ----------------------------------------------------------

      console.log(
        '[ONEPACE] 오해 가능성 감지:',
        data.detectedExpression
      );

      return {
        risky: true,
        country,

        detectedExpression:
          data.detectedExpression || '',

        realtimeDetection:
          data.realtimeDetection || '',

        nuanceExplanation:
          data.nuanceExplanation || '',

        suggestedText:
          data.suggestedText || ''
      };

    } catch (error) {

      console.error(
        '[ONEPACE] 분석 API 호출 실패:',
        error
      );

      return {
        risky: false,
        country
      };
    }
  }


  // ============================================================
  // 메시지 입력창 찾기
  // ============================================================

  function findComposer() {

    const selectors = [
      '#messageInput',
      '#input',
      '[data-onepace-composer]',
      '[data-qa="message_input"]',
      '[contenteditable="true"][role="textbox"]',
      'textarea[placeholder*="메시지"]',
      'textarea[placeholder*="Message"]',
      'textarea'
    ];

    for (const selector of selectors) {

      const elements =
        document.querySelectorAll(selector);

      for (const element of elements) {

        const rect =
          element.getBoundingClientRect();

        const style =
          getComputedStyle(element);

        if (
          rect.width > 80 &&
          rect.height > 15 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden'
        ) {
          return element;
        }
      }
    }

    return null;
  }


  // ============================================================
  // 입력창 컨테이너
  // ============================================================

  function findComposerContainer(input) {

    if (!input) return null;

    return (
      input.closest(
        '[data-onepace-composer-container]'
      ) ||
      input.closest('.composer') ||
      input.closest('.composer-wrap') ||
      input.closest(
        '[data-qa="message_input_container"]'
      ) ||
      input.parentElement
    );
  }


  // ============================================================
  // ONEPACE 국가 UI 생성
  // ============================================================

  function findOrCreateRoot(input) {

    const container =
      findComposerContainer(input);

    if (!container) return null;

    const computed =
      getComputedStyle(container);

    if (computed.position === 'static') {
      container.style.position = 'relative';
    }

    if (computed.overflow === 'hidden') {
      container.style.overflow = 'visible';
    }

    let root =
      container.querySelector(
        `#${ROOT_ID}`
      );

    if (root) {
      return root;
    }

    root =
      document.createElement('div');

    root.id = ROOT_ID;

    root.innerHTML = `
      <div class="op-row">

        <button
          type="button"
          class="onepace-globe-button"
          aria-label="대화 상대 국적 선택"
          title="대화 상대 국적 선택"
        >🌐</button>

        <span class="op-status">

          <strong class="op-status-name"></strong>

          <span>
            과 대화하는 중이에요.
          </span>

          <span class="op-status-time"></span>

        </span>

        <div class="op-picker">

          <div class="op-search-wrap">

            <input
              class="op-search"
              type="text"
              placeholder="국가 또는 국적 검색"
              autocomplete="off"
            />

          </div>

          <div class="op-list"></div>

          <div class="op-footer">

            <button
              type="button"
              class="op-close"
            >
              닫기
            </button>

          </div>

        </div>

      </div>
    `;

    container.insertBefore(
      root,
      input
    );

    bindCountryUI(root);

    return root;
  }


  // ============================================================
  // 국가 선택 UI
  // ============================================================

  function bindCountryUI(root) {

    if (
      root.dataset.bound === 'true'
    ) {
      return;
    }

    root.dataset.bound = 'true';

    const button =
      root.querySelector(
        '.onepace-globe-button'
      );

    const picker =
      root.querySelector(
        '.op-picker'
      );

    const search =
      root.querySelector(
        '.op-search'
      );

    const list =
      root.querySelector(
        '.op-list'
      );

    const close =
      root.querySelector(
        '.op-close'
      );

    const status =
      root.querySelector(
        '.op-status'
      );

    const statusName =
      root.querySelector(
        '.op-status-name'
      );

    const statusTime =
      root.querySelector(
        '.op-status-time'
      );


    // ----------------------------------------------------------
    // 국가 목록 렌더링
    // ----------------------------------------------------------

    function render(query = '') {

      const q =
        query.trim().toLowerCase();

      const filtered =
        COUNTRIES.filter(
          (country) => {

            return (
              country.name
                .toLowerCase()
                .includes(q) ||

              country.nationality
                .toLowerCase()
                .includes(q)
            );
          }
        );


      if (!filtered.length) {

        list.innerHTML = `
          <div class="op-empty">
            검색 결과가 없습니다.
          </div>
        `;

        return;
      }


      list.innerHTML =
        filtered
          .map(
            (country) => {

              const selected =
                selectedCountry?.code ===
                country.code
                  ? 'selected'
                  : '';

              return `
                <button
                  type="button"
                  class="op-item ${selected}"
                  data-country="${country.code}"
                >

                  <span class="op-flag">
                    ${country.flag}
                  </span>

                  <span>
                    ${escapeHtml(
                      country.nationality
                    )}
                  </span>

                </button>
              `;
            }
          )
          .join('');


      list
        .querySelectorAll('.op-item')
        .forEach(
          (item) => {

            item.addEventListener(
              'click',
              (event) => {

                event.preventDefault();
                event.stopPropagation();

                selectedCountry =
                  COUNTRIES.find(
                    (country) =>
                      country.code ===
                      item.dataset.country
                  ) || null;

                render(search.value);
              }
            );
          }
        );
    }


    // ----------------------------------------------------------
    // 지구본 버튼
    // ----------------------------------------------------------

    button.addEventListener(
      'click',
      (event) => {

        event.preventDefault();
        event.stopPropagation();

        const isOpen =
          picker.classList.contains(
            'open'
          );

        if (isOpen) {

          picker.classList.remove(
            'open'
          );

          button.classList.remove(
            'open'
          );

          return;
        }

        render();

        search.value = '';

        picker.classList.add(
          'open'
        );

        button.classList.add(
          'open'
        );

        setTimeout(
          () => {
            search.focus();
          },
          0
        );
      }
    );


    // ----------------------------------------------------------
    // 국가 검색
    // ----------------------------------------------------------

    search.addEventListener(
      'input',
      () => {
        render(search.value);
      }
    );


    // ----------------------------------------------------------
    // 닫기
    // ----------------------------------------------------------

    close.addEventListener(
      'click',
      (event) => {

        event.preventDefault();
        event.stopPropagation();

        picker.classList.remove(
          'open'
        );

        button.classList.remove(
          'open'
        );


        if (!selectedCountry) {

          status.classList.remove(
            'show'
          );

          return;
        }


        statusName.textContent =
          selectedCountry.nationality;

        statusTime.textContent =
          `(현지 시각 ${getLocalTime(
            selectedCountry.timezone
          )})`;

        status.classList.add(
          'show'
        );


        lastAnalysisKey = '';

        analyzeCurrentInput();
      }
    );


    // ----------------------------------------------------------
    // 외부 클릭
    // ----------------------------------------------------------

    document.addEventListener(
      'click',
      (event) => {

        if (
          root.contains(
            event.target
          )
        ) {
          return;
        }

        picker.classList.remove(
          'open'
        );

        button.classList.remove(
          'open'
        );
      },
      true
    );


    render();
  }


  // ============================================================
  // 현지 시간
  // ============================================================

  function getLocalTime(timezone) {

    try {

      return new Intl.DateTimeFormat(
        'ko-KR',
        {
          timeZone: timezone,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }
      ).format(
        new Date()
      );

    } catch {

      return '--:--';
    }
  }


  // ============================================================
  // 실시간 말풍선 표시
  // ============================================================

  function showLiveWarning(
    input,
    analysis
  ) {

    let popup =
      document.getElementById(
        WARNING_ID
      );


    // 위험 없음
    if (
      !analysis?.risky
    ) {

      if (popup) {
        popup.remove();
      }

      return;
    }


    // 팝업 최초 생성
    if (!popup) {

      popup =
        document.createElement(
          'div'
        );

      popup.id =
        WARNING_ID;

      document.body.appendChild(
        popup
      );
    }


    popup.innerHTML = `

      <div class="op-realtime-content">

        <div class="op-realtime-title">

          <span class="op-realtime-icon">
            !
          </span>

          <span>
            오해 가능성이 있어요
          </span>

        </div>


        <div class="op-realtime-message">

          ${escapeHtml(
            analysis.realtimeDetection ||
            ''
          )}

          <br />

          ${escapeHtml(
            analysis.nuanceExplanation ||
            ''
          )}

        </div>


        <div class="op-realtime-suggestion">

          <span class="op-suggest-label">
            추천 표현
          </span>

          <span class="op-suggest-text">
            ${escapeHtml(
              analysis.suggestedText ||
              ''
            )}
          </span>

        </div>


        <div class="op-realtime-arrow"></div>

      </div>

    `;


    positionWarning(
      input,
      popup
    );
  }


  // ============================================================
  // 팝업 위치
  // ============================================================

  function positionWarning(
    input,
    popup
  ) {

    if (
      !input ||
      !popup
    ) {
      return;
    }

    const rect =
      input.getBoundingClientRect();


    popup.style.position =
      'fixed';

    popup.style.zIndex =
      '2147483647';

    popup.style.pointerEvents =
      'auto';

    popup.style.boxSizing =
      'border-box';

    popup.style.visibility =
      'visible';


    // ----------------------------------------------------------
    // 입력창 가운데
    // ----------------------------------------------------------

    const popupWidth =
      Math.min(
        Math.max(
          rect.width,
          330
        ),
        460
      );

    const centerX =
      rect.left +
      (
        rect.width / 2
      );

    let left =
      centerX -
      (
        popupWidth / 2
      );


    const viewportPadding =
      16;


    left =
      Math.max(
        viewportPadding,
        Math.min(
          left,
          window.innerWidth -
          popupWidth -
          viewportPadding
        )
      );


    popup.style.left =
      `${Math.round(left)}px`;

    popup.style.width =
      `${popupWidth}px`;


    // ----------------------------------------------------------
    // 높이 측정
    // ----------------------------------------------------------

    popup.style.top =
      'auto';

    popup.style.bottom =
      'auto';

    const popupHeight =
      popup.offsetHeight;


    // ----------------------------------------------------------
    // 입력창 위에 배치
    // ----------------------------------------------------------

    let top =
      rect.top -
      popupHeight -
      8;


    // 화면 위쪽을 넘어가면
    // 입력창 내부로 들어가지 않도록
    // 최소한 화면 상단에 고정
    if (top < 8) {

      top = 8;
    }


    popup.style.top =
      `${Math.round(top)}px`;

    popup.style.bottom =
      'auto';


    const content =
      popup.querySelector(
        '.op-realtime-content'
      );

    if (content) {

      content.style.display =
        'block';

      content.style.visibility =
        'visible';

      content.style.opacity =
        '1';

      content.style.boxSizing =
        'border-box';
    }
  }


  // ============================================================
  // 현재 입력값 분석
  // ============================================================

  async function analyzeCurrentInput() {

    const input =
      activeComposer ||
      findComposer();

    if (!input) {

      console.warn(
        '[ONEPACE] 입력창을 찾지 못했습니다.'
      );

      return;
    }


    // 국가 선택 안 됨
    if (!selectedCountry) {

      removeWarning();

      return;
    }


    const message =
      getText(input).trim();


    // 입력값 없음
    if (!message) {

      removeWarning();

      lastAnalysisKey = '';
      latestRequestKey = '';

      return;
    }


    const analysisKey =
      `${selectedCountry.code}:${message}`;


    // 같은 요청 방지
    if (
      analysisKey ===
      lastAnalysisKey
    ) {
      return;
    }


    lastAnalysisKey =
      analysisKey;

    latestRequestKey =
      analysisKey;


    console.log(
      '[ONEPACE] 현재 메시지 분석:',
      message
    );


    const analysis =
      await analyzeMessage(
        message,
        selectedCountry
      );


    // 최신 요청이 아니면 버림
    if (
      analysisKey !==
      latestRequestKey
    ) {

      console.log(
        '[ONEPACE] 이전 API 응답 무시'
      );

      return;
    }


    // 위험 없음
    if (
      !analysis.risky
    ) {

      removeWarning();

      return;
    }


    // 위험 있음
    showLiveWarning(
      input,
      analysis
    );
  }


  // ============================================================
  // 분석 debounce
  // ============================================================

  function scheduleAnalysis() {

    clearTimeout(
      analysisTimer
    );


    analysisTimer =
      setTimeout(
        () => {

          analyzeCurrentInput();

        },
        180
      );
  }


  // ============================================================
  // 말풍선 제거
  // ============================================================

  function removeWarning() {

    const popup =
      document.getElementById(
        WARNING_ID
      );

    if (popup) {
      popup.remove();
    }
  }


  // ============================================================
  // ONEPACE UI 전체 제거
  // ============================================================

  function removeAll() {

    clearTimeout(
      analysisTimer
    );

    analysisTimer = null;

    lastAnalysisKey = '';
    latestRequestKey = '';

    removeWarning();


    document
      .querySelectorAll(
        `#${ROOT_ID}`
      )
      .forEach(
        (element) => {
          element.remove();
        }
      );
  }


  // ============================================================
  // 입력 이벤트 감시
  // ============================================================

  function bindInputMonitoring(
    input
  ) {

    if (!input) return;


    if (
      input.dataset
        .onepaceInputBound ===
      'true'
    ) {

      activeComposer =
        input;

      return;
    }


    input.dataset
      .onepaceInputBound =
      'true';


    activeComposer =
      input;


    // ----------------------------------------------------------
    // 입력
    // ----------------------------------------------------------

    input.addEventListener(
      'input',
      () => {

        activeComposer =
          input;

        scheduleAnalysis();

      },
      false
    );


    // ----------------------------------------------------------
    // 포커스
    // ----------------------------------------------------------

    input.addEventListener(
      'focus',
      () => {

        activeComposer =
          input;

      },
      false
    );
  }


  // ============================================================
  // 전송 버튼
  // ============================================================

  function bindSendButton(
    input
  ) {

    if (!input) return;

    // 기존 전송 동작 그대로 유지
  }


  // ============================================================
  // 전체 스캔
  // ============================================================

  function scan() {

    if (!enabled) {
      return;
    }


    let input =
      activeComposer;


    if (
      !input ||
      !document.contains(input)
    ) {

      input =
        findComposer();
    }


    if (!input) {

      return;
    }


    activeComposer =
      input;


    findOrCreateRoot(
      input
    );


    bindInputMonitoring(
      input
    );


    bindSendButton(
      input
    );
  }


  // ============================================================
  // 활성화 / 비활성화 메시지
  // ============================================================

  chrome.runtime.onMessage.addListener(
    (
      message,
      sender,
      sendResponse
    ) => {

      if (
        message?.action ===
        'enable_onepace'
      ) {

        enabled = true;

        scan();

        sendResponse?.({
          success: true
        });

        return true;
      }


      if (
        message?.action ===
        'disable_onepace'
      ) {

        enabled = false;

        removeAll();

        sendResponse?.({
          success: true
        });

        return true;
      }

      return false;
    }
  );


  // ============================================================
  // 저장된 활성화 상태
  // ============================================================

  chrome.storage.local.get(
    {
      onepaceEnabled: true
    },
    (result) => {

      enabled =
        result.onepaceEnabled;

      if (enabled) {
        scan();
      }
    }
  );


  // ============================================================
  // 활성화 상태 변경
  // ============================================================

  chrome.storage.onChanged.addListener(
    (changes) => {

      if (
        !changes.onepaceEnabled
      ) {
        return;
      }


      enabled =
        changes.onepaceEnabled.newValue;


      if (enabled) {

        scan();

      } else {

        removeAll();
      }
    }
  );


  // ============================================================
  // 현지 시간 업데이트
  // ============================================================

  setInterval(
    () => {

      if (!selectedCountry) {
        return;
      }


      document
        .querySelectorAll(
          `#${ROOT_ID}`
        )
        .forEach(
          (root) => {

            const time =
              root.querySelector(
                '.op-status-time'
              );

            if (!time) return;


            time.textContent =
              `(현지 시각 ${getLocalTime(
                selectedCountry.timezone
              )})`;
          }
        );

    },
    30000
  );


  // ============================================================
  // DOM 변경 감지
  // ============================================================

  const observer =
    new MutationObserver(
      () => {

        if (!enabled) {
          return;
        }


        if (observerTimer) {
          return;
        }


        observerTimer =
          setTimeout(
            () => {

              observerTimer =
                null;

              scan();

            },
            500
          );
      }
    );


  observer.observe(
    document.documentElement,
    {
      childList: true,
      subtree: true
    }
  );


  // ============================================================
  // 팝업 위치 재계산
  // ============================================================

  function schedulePopupPosition() {

    if (repositionTimer) {
      return;
    }


    repositionTimer =
      requestAnimationFrame(
        () => {

          repositionTimer =
            null;


          const popup =
            document.getElementById(
              WARNING_ID
            );

          if (!popup) {
            return;
          }


          const input =
            activeComposer;

          if (!input) {
            return;
          }


          positionWarning(
            input,
            popup
          );
        }
      );
  }


  window.addEventListener(
    'resize',
    schedulePopupPosition,
    {
      passive: true
    }
  );


  window.addEventListener(
    'scroll',
    schedulePopupPosition,
    {
      passive: true,
      capture: true
    }
  );


  // ============================================================
  // 초기 실행
  // ============================================================

  scan();


  console.log(
    '[ONEPACE] Realtime AI analysis content script loaded'
  );

})();