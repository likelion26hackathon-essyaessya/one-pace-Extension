(() => {
  'use strict';

  // ============================================================
  // 기본 중복 실행 방지
  // ============================================================

  if (window.top !== window.self) return;

  if (
    document.documentElement.dataset.onepaceLoaded === 'true'
  ) {
    return;
  }

  document.documentElement.dataset.onepaceLoaded = 'true';

  // ============================================================
  // 기본 설정
  // ============================================================

  const ROOT_ID = 'onepace-global-root';
  const WARNING_ID = 'onepace-realtime-warning';
  const COMPOSER_TEMPLATE_ID = 'onepace-composer-template';
  const WARNING_TEMPLATE_ID = 'onepace-warning-template';
  const UI_FILE = 'content-ui.html';

  const ANALYZE_ENDPOINT =
    'https://api.onepace.site/api/culture-translation/analyze';

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

  let enabled = true;
  let selectedCountry = null;
  let activeComposer = null;
  let composerRoot = null;

  let analysisTimer = null;
  let latestRequestKey = '';
  let lastAnalysisKey = '';

  let templateLoaded = false;
  let templateLoadingPromise = null;

  let suppressedText = '';
  let currentAnalysis = null;

  let currentOverlay = null;

  let currentDetectedExpression = '';
  let activeDetectedExpression = '';

  // ============================================================
  // 유틸
  // ============================================================

  function escapeHtml(value) {
    return String(value ?? '').replace(
      /[&<>'"]/g,
      character =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;'
        })[character]
    );
  }

  function getText(element) {
    if (!element) return '';

    if (element.isContentEditable) {
      return element.innerText || element.textContent || '';
    }

    return element.value || '';
  }

  function setText(element, text) {
    if (!element) return;

    const value = String(text ?? '');

    if (element.isContentEditable) {
      element.textContent = value;

      try {
        element.dispatchEvent(
          new InputEvent('input', {
            bubbles: true,
            inputType: 'insertText',
            data: value
          })
        );
      } catch {
        element.dispatchEvent(
          new Event('input', {
            bubbles: true
          })
        );
      }

      return;
    }

    const prototype = Object.getPrototypeOf(element);

    const descriptor =
      Object.getOwnPropertyDescriptor(
        prototype,
        'value'
      );

    if (descriptor?.set) {
      descriptor.set.call(element, value);
    } else {
      element.value = value;
    }

    element.dispatchEvent(
      new Event('input', {
        bubbles: true
      })
    );

    element.dispatchEvent(
      new Event('change', {
        bubbles: true
      })
    );
  }

  function getLocalTime(timezone) {
    try {
      return new Intl.DateTimeFormat('ko-KR', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(new Date());
    } catch {
      return '--:--';
    }
  }

  // ============================================================
  // Composer 탐색
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
  // Template
  // ============================================================

  function templatesExist() {
    return Boolean(
      document.getElementById(
        COMPOSER_TEMPLATE_ID
      ) &&
      document.getElementById(
        WARNING_TEMPLATE_ID
      )
    );
  }

  async function ensureTemplates() {
    if (templatesExist()) {
      templateLoaded = true;
      return true;
    }

    if (templateLoaded) return true;

    if (templateLoadingPromise) {
      return templateLoadingPromise;
    }

    templateLoadingPromise = (async () => {
      try {
        const resourceUrl =
          chrome.runtime.getURL(UI_FILE);

        const response =
          await fetch(resourceUrl);

        if (!response.ok) {
          throw new Error(
            `UI template HTTP ${response.status}`
          );
        }

        const html =
          await response.text();

        const wrapper =
          document.createElement('div');

        wrapper.innerHTML = html;

        wrapper
          .querySelectorAll('template')
          .forEach(template => {
            document.body.appendChild(
              template.cloneNode(true)
            );
          });

        if (!templatesExist()) {
          throw new Error(
            'ONEPACE template을 찾을 수 없습니다.'
          );
        }

        templateLoaded = true;

        return true;
      } catch (error) {
        console.error(
          '[ONEPACE] UI template 로드 실패:',
          error
        );

        return false;
      }
    })();

    try {
      return await templateLoadingPromise;
    } finally {
      templateLoadingPromise = null;
    }
  }

  // ============================================================
  // Composer UI
  // ============================================================

  async function createComposerUI(input) {
    if (!input) return null;

    const container =
      findComposerContainer(input);

    if (!container) return null;

    const existing =
      container.querySelector(
        `#${ROOT_ID}`
      );

    if (existing) {
      composerRoot = existing;
      return existing;
    }

    const loaded =
      await ensureTemplates();

    if (!loaded) return null;

    const template =
      document.getElementById(
        COMPOSER_TEMPLATE_ID
      );

    if (!template) return null;

    const root =
      document.createElement('div');

    root.id = ROOT_ID;

    root.appendChild(
      template.content.cloneNode(true)
    );

    const computed =
      getComputedStyle(container);

    if (computed.position === 'static') {
      container.style.position = 'relative';
    }

    if (computed.overflow === 'hidden') {
      container.style.overflow = 'visible';
    }

    container.insertBefore(
      root,
      input
    );

    composerRoot = root;

    bindCountryUI(root);
    updateCountryStatus();

    return root;
  }

  // ============================================================
  // 국가 UI
  // ============================================================

  function bindCountryUI(root) {
    if (!root) return;

    if (
      root.dataset.onepaceBound === 'true'
    ) {
      return;
    }

    root.dataset.onepaceBound = 'true';

    const button =
      root.querySelector(
        '.onepace-globe-button'
      );

    const status =
      root.querySelector(
        '.onepace-country-status'
      );

    const statusCountry =
      root.querySelector(
        '.onepace-status-country'
      );

    const statusTime =
      root.querySelector(
        '.onepace-status-time'
      );

    const popup =
      root.querySelector(
        '.onepace-country-popup'
      );

    const search =
      root.querySelector(
        '.onepace-country-search'
      );

    const list =
      root.querySelector(
        '.onepace-country-list'
      );

    const close =
      root.querySelector(
        '.onepace-country-close'
      );

    if (
      !button ||
      !status ||
      !statusCountry ||
      !statusTime ||
      !popup ||
      !search ||
      !list ||
      !close
    ) {
      console.error(
        '[ONEPACE] Country UI element 누락'
      );

      return;
    }

    function renderCountryList(query = '') {
      const normalizedQuery =
        String(query)
          .trim()
          .toLowerCase();

      const filtered =
        COUNTRIES.filter(country =>
          country.name
            .toLowerCase()
            .includes(normalizedQuery) ||
          country.nationality
            .toLowerCase()
            .includes(normalizedQuery)
        );

      if (!filtered.length) {
        list.innerHTML = `
          <div class="onepace-country-empty">
            검색 결과가 없습니다.
          </div>
        `;

        return;
      }

      list.innerHTML =
        filtered
          .map(country => {
            const selected =
              selectedCountry?.code ===
              country.code;

            return `
              <button
                type="button"
                class="onepace-country-item ${
                  selected ? 'selected' : ''
                }"
                data-country-code="${escapeHtml(
                  country.code
                )}"
              >
                <span class="onepace-country-flag">
                  ${country.flag}
                </span>

                <span class="onepace-country-name">
                  ${escapeHtml(
                    country.nationality
                  )}
                </span>
              </button>
            `;
          })
          .join('');

      list
        .querySelectorAll(
          '.onepace-country-item'
        )
        .forEach(item => {
          item.addEventListener(
            'click',
            event => {
              event.preventDefault();
              event.stopPropagation();

              const code =
                item.dataset.countryCode;

              selectedCountry =
                COUNTRIES.find(
                  country =>
                    country.code === code
                ) || null;

              renderCountryList(
                search.value
              );

              updateCountryStatus();

              search.value = '';

              popup.classList.remove('open');
              button.classList.remove('open');

              lastAnalysisKey = '';
              latestRequestKey = '';
              suppressedText = '';

              currentAnalysis = null;
              currentDetectedExpression = '';
              activeDetectedExpression = '';

              removeWarning();
              removeHighlight();

              analyzeCurrentInput();
            }
          );
        });
    }

    button.addEventListener(
      'click',
      event => {
        event.preventDefault();
        event.stopPropagation();

        const isOpen =
          popup.classList.contains('open');

        if (isOpen) {
          popup.classList.remove('open');
          button.classList.remove('open');
          return;
        }

        renderCountryList();

        search.value = '';

        popup.classList.add('open');
        button.classList.add('open');

        setTimeout(() => {
          search.focus();
        }, 0);
      }
    );

    search.addEventListener(
      'input',
      () => {
        renderCountryList(
          search.value
        );
      }
    );

    close.addEventListener(
      'click',
      event => {
        event.preventDefault();
        event.stopPropagation();

        popup.classList.remove('open');
        button.classList.remove('open');
      }
    );

    document.addEventListener(
      'click',
      event => {
        if (root.contains(event.target)) {
          return;
        }

        popup.classList.remove('open');
        button.classList.remove('open');
      },
      true
    );

    renderCountryList();
  }

  function updateCountryStatus() {
    if (!composerRoot) return;

    const status =
      composerRoot.querySelector(
        '.onepace-country-status'
      );

    const statusCountry =
      composerRoot.querySelector(
        '.onepace-status-country'
      );

    const statusTime =
      composerRoot.querySelector(
        '.onepace-status-time'
      );

    if (
      !status ||
      !statusCountry ||
      !statusTime
    ) {
      return;
    }

    if (!selectedCountry) {
      status.classList.remove('show');
      statusCountry.textContent = '';
      statusTime.textContent = '';
      return;
    }

    statusCountry.textContent =
      selectedCountry.nationality;

    statusTime.textContent =
      `(현지 시각 ${getLocalTime(
        selectedCountry.timezone
      )})`;

    status.classList.add('show');
  }

  // ============================================================
  // API
  // ============================================================

  async function analyzeMessage(
    message,
    country
  ) {
    if (!message || !country) {
      return {
        risky: false,
        country
      };
    }

    try {
      const response =
        await fetch(
          ANALYZE_ENDPOINT,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body: JSON.stringify({
              text: message,
              counterpartCountry:
                country.code
            })
          }
        );

      if (!response.ok) {
        const errorText =
          await response
            .text()
            .catch(() => '');

        console.error(
          '[ONEPACE] API 응답 오류:',
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

      return {
        risky:
          data?.riskDetected === true,

        country,

        detectedExpression:
          data?.detectedExpression || '',

        realtimeDetection:
          data?.realtimeDetection || '',

        nuanceExplanation:
          data?.nuanceExplanation || '',

        suggestedText:
          data?.suggestedText || '',

        raw: data
      };
    } catch (error) {
      console.error(
        '[ONEPACE] API 호출 실패:',
        error
      );

      return {
        risky: false,
        country,
        error
      };
    }
  }

  // ============================================================
  // 문자열 정규화
  // ============================================================

  function normalizeForMatch(text) {
    const original =
      String(text ?? '');

    let normalized = '';
    const positionMap = [];

    for (
      let i = 0;
      i < original.length;
      i++
    ) {
      const char = original[i];

      if (
        /[\p{L}\p{N}]/u.test(char)
      ) {
        normalized +=
          char.toLowerCase();

        positionMap.push(i);
      }
    }

    return {
      normalized,
      positionMap
    };
  }

  // ============================================================
  // detectedExpression 실제 입력 위치 찾기
  // ============================================================

  function findDetectedExpressionRange(
    fullText,
    detectedExpression
  ) {
    const original =
      String(fullText ?? '');

    const target =
      String(
        detectedExpression ?? ''
      ).trim();

    if (!original || !target) {
      return null;
    }

    // ----------------------------------------------------------
    // 1. 완전 일치
    // ----------------------------------------------------------

    const exactIndex =
      original
        .toLowerCase()
        .indexOf(
          target.toLowerCase()
        );

    if (exactIndex !== -1) {
      return {
        start: exactIndex,
        end:
          exactIndex +
          target.length
      };
    }

    // ----------------------------------------------------------
    // 2. 정규화 비교
    // ----------------------------------------------------------

    const textData =
      normalizeForMatch(original);

    const targetData =
      normalizeForMatch(target);

    const normalizedText =
      textData.normalized;

    const normalizedTarget =
      targetData.normalized;

    if (
      !normalizedText ||
      !normalizedTarget
    ) {
      return null;
    }

    const normalizedIndex =
      normalizedText.indexOf(
        normalizedTarget
      );

    if (normalizedIndex === -1) {
      return null;
    }

    const normalizedStart =
      normalizedIndex;

    const normalizedEnd =
      normalizedIndex +
      normalizedTarget.length -
      1;

    const start =
      textData.positionMap[
        normalizedStart
      ];

    const lastCharacterIndex =
      textData.positionMap[
        normalizedEnd
      ];

    if (
      start === undefined ||
      lastCharacterIndex === undefined
    ) {
      return null;
    }

    return {
      start,
      end:
        lastCharacterIndex + 1
    };
  }

  // ============================================================
  // Highlight Overlay
  // ============================================================

  function createHighlightOverlay(
    input,
    range
  ) {
    removeHighlight();

    if (!input || !range) {
      return null;
    }

    const text =
      getText(input);

    if (!text) {
      return null;
    }

    const overlay =
      document.createElement('div');

    overlay.className =
      'onepace-input-overlay';

    overlay.dataset.onepaceOverlay =
      'true';

    const inputRect =
      input.getBoundingClientRect();

    const parent =
      input.offsetParent ||
      input.parentElement ||
      document.body;

    const parentRect =
      parent.getBoundingClientRect();

    const style =
      getComputedStyle(input);

    // ----------------------------------------------------------
    // Overlay
    // ----------------------------------------------------------

    overlay.style.position =
      'absolute';

    overlay.style.left =
      `${inputRect.left - parentRect.left}px`;

    overlay.style.top =
      `${inputRect.top - parentRect.top}px`;

    overlay.style.width =
      `${inputRect.width}px`;

    overlay.style.height =
      `${inputRect.height}px`;

    overlay.style.padding =
      style.padding;

    overlay.style.margin =
      '0';

    overlay.style.border =
      '0';

    overlay.style.boxSizing =
      'border-box';

    overlay.style.background =
      'transparent';

    overlay.style.overflow =
      'hidden';

    overlay.style.pointerEvents =
      'none';

    overlay.style.zIndex =
      '10';

    overlay.style.color =
      'transparent';

    overlay.style.transform =
      `translate(${-input.scrollLeft}px, ${-input.scrollTop}px)`;

    // ----------------------------------------------------------
    // 위험 표현 위치 계산
    // ----------------------------------------------------------

    const beforeText =
      text.slice(
        0,
        range.start
      );

    const detectedText =
      text.slice(
        range.start,
        range.end
      );

    const canvas =
      document.createElement('canvas');

    const context =
      canvas.getContext('2d');

    if (!context) {
      return null;
    }

    context.font =
      style.font ||
      `${style.fontSize} ${style.fontFamily}`;

    const lines =
      beforeText.split('\n');

    const currentLine =
      lines[lines.length - 1] || '';

    const lineIndex =
      lines.length - 1;

    const lineHeight =
      parseFloat(style.lineHeight) ||
      parseFloat(style.fontSize) * 1.4;

    const paddingLeft =
      parseFloat(style.paddingLeft) || 0;

    const paddingTop =
      parseFloat(style.paddingTop) || 0;

    const beforeWidth =
      context.measureText(
        currentLine
      ).width;

    const detectedWidth =
      context.measureText(
        detectedText
      ).width;

    // ----------------------------------------------------------
    // 빨간 밑줄
    // ----------------------------------------------------------

    const underline =
      document.createElement('div');

    underline.className =
      'op-detected-expression';

    underline.dataset.expression =
      detectedText;

    underline.style.position =
      'absolute';

    underline.style.left =
      `${paddingLeft + beforeWidth}px`;

    underline.style.top =
      `${paddingTop + lineIndex * lineHeight}px`;

    underline.style.width =
      `${Math.max(detectedWidth, 4)}px`;

    underline.style.height =
      `${lineHeight}px`;

    underline.style.background =
      'transparent';

    underline.style.boxSizing =
      'border-box';

    underline.style.borderRadius =
      '2px';

    underline.style.pointerEvents =
      'auto';

    underline.style.cursor =
      'pointer';

    underline.style.zIndex =
      '20';

    // ★ 빨간색 밑줄
    underline.style.boxShadow =
      'inset 0 -2px 0 #ff4d67';

    // ----------------------------------------------------------
    // Hover
    // ----------------------------------------------------------

    underline.addEventListener(
      'mouseenter',
      () => {
        underline.style.background =
          'rgba(128, 128, 128, 0.18)';

        underline.style.boxShadow =
          'inset 0 -2px 0 #ff4d67';
      }
    );

    underline.addEventListener(
      'mouseleave',
      () => {
        underline.style.background =
          'transparent';

        underline.style.boxShadow =
          'inset 0 -2px 0 #ff4d67';
      }
    );

    // ----------------------------------------------------------
    // 클릭
    // ----------------------------------------------------------

    underline.addEventListener(
      'mousedown',
      event => {
        event.preventDefault();
        event.stopPropagation();
      }
    );

    underline.addEventListener(
      'click',
      event => {
        event.preventDefault();
        event.stopPropagation();

        activeDetectedExpression =
          detectedText;

        underline.classList.add(
          'op-detected-expression-active'
        );

        if (currentAnalysis?.risky) {
          showWarning(
            input,
            currentAnalysis
          );
        }
      }
    );

    // ----------------------------------------------------------
    // Overlay 삽입
    // ----------------------------------------------------------

    overlay.appendChild(
      underline
    );

    parent.appendChild(
      overlay
    );

    currentOverlay =
      overlay;

    // ----------------------------------------------------------
    // 위치 동기화
    // ----------------------------------------------------------

    const sync = () => {
      if (
        !currentOverlay ||
        currentOverlay !== overlay
      ) {
        return;
      }

      const rect =
        input.getBoundingClientRect();

      const pRect =
        parent.getBoundingClientRect();

      overlay.style.left =
        `${rect.left - pRect.left}px`;

      overlay.style.top =
        `${rect.top - pRect.top}px`;

      overlay.style.width =
        `${rect.width}px`;

      overlay.style.height =
        `${rect.height}px`;

      overlay.style.transform =
        `translate(${-input.scrollLeft}px, ${-input.scrollTop}px)`;
    };

    input.addEventListener(
      'scroll',
      sync
    );

    window.addEventListener(
      'resize',
      sync
    );

    overlay._onepaceSync =
      sync;

    overlay._onepaceInput =
      input;

    return overlay;
  }

  // ============================================================
  // Highlight 제거
  // ============================================================

  function removeHighlight() {
    if (!currentOverlay) {
      document
        .querySelectorAll(
          '[data-onepace-overlay="true"]'
        )
        .forEach(element => {
          element.remove();
        });

      return;
    }

    const input =
      currentOverlay._onepaceInput;

    const sync =
      currentOverlay._onepaceSync;

    if (
      input &&
      sync
    ) {
      input.removeEventListener(
        'scroll',
        sync
      );
    }

    window.removeEventListener(
      'resize',
      sync
    );

    currentOverlay.remove();

    currentOverlay =
      null;
  }

  // ============================================================
  // Highlight 표시
  // ============================================================

  function showHighlight(
    input,
    analysis
  ) {
    removeHighlight();

    if (
      !input ||
      !analysis?.risky
    ) {
      return;
    }

    const text =
      getText(input);

    if (!text) {
      return;
    }

    const expression =
      String(
        analysis.detectedExpression ||
        ''
      ).trim();

    // ----------------------------------------------------------
    // detectedExpression이 실제 입력에 존재
    // ----------------------------------------------------------

    if (expression) {
      const range =
        findDetectedExpressionRange(
          text,
          expression
        );

      if (range) {
        const actualExpression =
          text.slice(
            range.start,
            range.end
          );

        currentDetectedExpression =
          actualExpression;

        activeDetectedExpression =
          '';

        createHighlightOverlay(
          input,
          range
        );

        console.log(
          '[ONEPACE] detectedExpression 밑줄 표시:',
          {
            apiExpression:
              expression,

            actualExpression
          }
        );

        return;
      }
    }

    // ----------------------------------------------------------
    // detectedExpression을 찾지 못한 경우
    // 전체 텍스트에 밑줄
    // ----------------------------------------------------------

    const fullRange = {
      start: 0,
      end: text.length
    };

    currentDetectedExpression =
      text;

    activeDetectedExpression =
      '';

    createHighlightOverlay(
      input,
      fullRange
    );
  }

  // ============================================================
  // Warning 위치
  // ============================================================

  function positionWarning(
    input,
    wrapper
  ) {
    if (
      !input ||
      !wrapper
    ) {
      return;
    }

    const rect =
      input.getBoundingClientRect();

    const bubble =
      wrapper.querySelector(
        '.onepace-warning'
      );

    if (!bubble) return;

    const bubbleRect =
      bubble.getBoundingClientRect();

    const bubbleWidth =
      bubbleRect.width || 330;

    const bubbleHeight =
      bubbleRect.height || 220;

    const gap = 10;

    let left =
      rect.left;

    if (
      activeDetectedExpression
    ) {
      try {
        const text =
          getText(input);

        const range =
          findDetectedExpressionRange(
            text,
            activeDetectedExpression
          );

        if (range) {
          const style =
            getComputedStyle(input);

          const canvas =
            document.createElement(
              'canvas'
            );

          const context =
            canvas.getContext('2d');

          if (context) {
            context.font =
              style.font ||
              `${style.fontSize} ${style.fontFamily}`;

            const beforeText =
              text.slice(
                0,
                range.start
              );

            const measured =
              context.measureText(
                beforeText
              ).width;

            left =
              rect.left +
              Math.min(
                measured,
                Math.max(
                  0,
                  rect.width -
                  bubbleWidth
                )
              );
          }
        }
      } catch {}
    }

    const maxLeft =
      window.innerWidth -
      bubbleWidth -
      16;

    left =
      Math.min(
        left,
        maxLeft
      );

    left =
      Math.max(
        16,
        left
      );

    let top =
      rect.top -
      bubbleHeight -
      gap;

    if (top < 16) {
      top =
        rect.bottom +
        gap;
    }

    wrapper.style.position =
      'fixed';

    wrapper.style.left =
      `${left}px`;

    wrapper.style.top =
      `${top}px`;

    wrapper.style.right =
      'auto';

    wrapper.style.bottom =
      'auto';

    wrapper.style.width =
      '330px';

    wrapper.style.maxWidth =
      'calc(100vw - 32px)';

    wrapper.style.margin =
      '0';

    wrapper.style.transform =
      'none';
  }

  // ============================================================
  // Warning
  // ============================================================

  async function showWarning(
    input,
    analysis
  ) {
    if (
      !input ||
      !analysis?.risky
    ) {
      return;
    }

    removeWarning();

    const loaded =
      await ensureTemplates();

    if (!loaded) return;

    const template =
      document.getElementById(
        WARNING_TEMPLATE_ID
      );

    if (!template) {
      console.error(
        '[ONEPACE] warning template 없음'
      );

      return;
    }

    const wrapper =
      document.createElement('div');

    wrapper.id =
      WARNING_ID;

    wrapper.appendChild(
      template.content.cloneNode(true)
    );

    const backdrop =
      wrapper.querySelector(
        '.onepace-warning-backdrop'
      );

    const warning =
      wrapper.querySelector(
        '.onepace-warning'
      );

    const country =
      wrapper.querySelector(
        '.onepace-warning-country'
      );

    const reason =
      wrapper.querySelector(
        '.onepace-warning-reason'
      );

    const original =
      wrapper.querySelector(
        '.onepace-warning-original-text'
      );

    const suggestion =
      wrapper.querySelector(
        '.onepace-warning-suggestion-text'
      );

    const sendAnyway =
      wrapper.querySelector(
        '.onepace-send-anyway'
      );

    const useSuggestion =
      wrapper.querySelector(
        '.onepace-use-suggestion'
      );

    // ----------------------------------------------------------
    // 국가
    // ----------------------------------------------------------

    if (country) {
      country.textContent =
        analysis.country?.nationality ||
        '';
    }

    // ----------------------------------------------------------
    // 이유
    // ----------------------------------------------------------

    if (reason) {
      reason.textContent =
        analysis.nuanceExplanation ||
        analysis.realtimeDetection ||
        '문화적 맥락에 따라 다르게 받아들여질 수 있어요.';
    }

    // ----------------------------------------------------------
    // 원문
    // ----------------------------------------------------------

    if (original) {
      original.textContent =
        activeDetectedExpression ||
        currentDetectedExpression ||
        analysis.detectedExpression ||
        getText(input).trim();
    }

    // ----------------------------------------------------------
    // 제안
    // ----------------------------------------------------------

    if (suggestion) {
      suggestion.textContent =
        analysis.suggestedText ||
        '';
    }

    // ----------------------------------------------------------
    // 그냥 보내기
    // ----------------------------------------------------------

    if (sendAnyway) {
      sendAnyway.addEventListener(
        'click',
        event => {
          event.preventDefault();
          event.stopPropagation();

          removeWarning();
        }
      );
    }

    // ----------------------------------------------------------
    // 제안 사용
    // ----------------------------------------------------------

    if (useSuggestion) {
      useSuggestion.addEventListener(
        'click',
        event => {
          event.preventDefault();
          event.stopPropagation();

          const suggestedText =
            String(
              analysis.suggestedText ||
              ''
            ).trim();

          if (!suggestedText) {
            removeWarning();
            return;
          }

          suppressedText =
            suggestedText;

          lastAnalysisKey =
            `${selectedCountry?.code || ''}:${suggestedText}`;

          latestRequestKey =
            lastAnalysisKey;

          setText(
            input,
            suggestedText
          );

          currentAnalysis =
            analysis;

          currentDetectedExpression =
            '';

          activeDetectedExpression =
            '';

          removeHighlight();
          removeWarning();

          activeComposer =
            input;

          try {
            input.focus();

            if (
              input.isContentEditable
            ) {
              const range =
                document.createRange();

              const selection =
                window.getSelection();

              range.selectNodeContents(
                input
              );

              range.collapse(false);

              selection.removeAllRanges();

              selection.addRange(
                range
              );
            } else {
              input.setSelectionRange(
                input.value.length,
                input.value.length
              );
            }
          } catch {}
        }
      );
    }

    // ----------------------------------------------------------
    // Backdrop
    // ----------------------------------------------------------

    if (backdrop) {
      backdrop.addEventListener(
        'click',
        event => {
          if (
            event.target ===
            backdrop
          ) {
            removeWarning();
          }
        }
      );

      backdrop.style.position =
        'static';

      backdrop.style.inset =
        'auto';

      backdrop.style.width =
        'auto';

      backdrop.style.height =
        'auto';

      backdrop.style.background =
        'transparent';

      backdrop.style.display =
        'block';

      backdrop.style.pointerEvents =
        'none';
    }

    if (warning) {
      warning.style.pointerEvents =
        'auto';
    }

    document.body.appendChild(
      wrapper
    );

    positionWarning(
      input,
      wrapper
    );

    const reposition = () => {
      if (
        document.getElementById(
          WARNING_ID
        ) !== wrapper
      ) {
        return;
      }

      positionWarning(
        input,
        wrapper
      );
    };

    wrapper._onepaceReposition =
      reposition;

    window.addEventListener(
      'resize',
      reposition
    );

    window.addEventListener(
      'scroll',
      reposition,
      true
    );
  }

  // ============================================================
  // Warning 제거
  // ============================================================

  function removeWarning() {
    const existing =
      document.getElementById(
        WARNING_ID
      );

    if (!existing) return;

    const reposition =
      existing._onepaceReposition;

    if (reposition) {
      window.removeEventListener(
        'resize',
        reposition
      );

      window.removeEventListener(
        'scroll',
        reposition,
        true
      );
    }

    existing.remove();
  }

  // ============================================================
  // 현재 입력 분석
  // ============================================================

  async function analyzeCurrentInput() {
    const input =
      activeComposer ||
      findComposer();

    if (!input) return;

    activeComposer =
      input;

    // ----------------------------------------------------------
    // 비활성
    // ----------------------------------------------------------

    if (!enabled) {
      removeHighlight();
      removeWarning();
      return;
    }

    // ----------------------------------------------------------
    // 국가 미선택
    // ----------------------------------------------------------

    if (!selectedCountry) {
      removeHighlight();
      removeWarning();

      lastAnalysisKey = '';
      latestRequestKey = '';

      return;
    }

    // ----------------------------------------------------------
    // 메시지
    // ----------------------------------------------------------

    const message =
      getText(input).trim();

    if (!message) {
      removeHighlight();
      removeWarning();

      lastAnalysisKey = '';
      latestRequestKey = '';

      suppressedText = '';

      currentAnalysis = null;

      currentDetectedExpression = '';
      activeDetectedExpression = '';

      return;
    }

    // ----------------------------------------------------------
    // 제안문 적용 직후 재분석 방지
    // ----------------------------------------------------------

    if (
      suppressedText &&
      message === suppressedText
    ) {
      removeHighlight();
      removeWarning();
      return;
    }

    if (
      suppressedText &&
      message !== suppressedText
    ) {
      suppressedText = '';
    }

    // ----------------------------------------------------------
    // 동일 요청 방지
    // ----------------------------------------------------------

    const analysisKey =
      `${selectedCountry.code}:${message}`;

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

    // ----------------------------------------------------------
    // API
    // ----------------------------------------------------------

    const analysis =
      await analyzeMessage(
        message,
        selectedCountry
      );

    // ----------------------------------------------------------
    // 최신 요청인지 확인
    // ----------------------------------------------------------

    if (
      analysisKey !==
      latestRequestKey
    ) {
      return;
    }

    const latestInputText =
      getText(input).trim();

    if (
      latestInputText !==
      message
    ) {
      return;
    }

    // ----------------------------------------------------------
    // 분석 결과 저장
    // ----------------------------------------------------------

    currentAnalysis =
      analysis;

    console.log(
      '[ONEPACE] 분석 결과:',
      analysis
    );

    // ----------------------------------------------------------
    // 위험 없음
    // ----------------------------------------------------------

    if (!analysis.risky) {
      removeHighlight();
      removeWarning();

      currentDetectedExpression =
        '';

      activeDetectedExpression =
        '';

      return;
    }

    // ----------------------------------------------------------
    // 위험 표현 표시
    // ----------------------------------------------------------

    showHighlight(
      input,
      analysis
    );
  }

  // ============================================================
  // 분석 예약
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
        350
      );
  }

  // ============================================================
  // Input 이벤트
  // ============================================================

  function handleInputEvent(event) {
    if (!enabled) return;

    const target =
      event.target;

    if (!target) return;

    const composer =
      target.closest?.(
        '#messageInput,' +
        '#input,' +
        '[data-onepace-composer],' +
        '[data-qa="message_input"],' +
        '[contenteditable="true"][role="textbox"],' +
        'textarea'
      );

    if (!composer) return;

    const actualComposer =
      findComposer();

    if (
      actualComposer &&
      actualComposer !== composer
    ) {
      return;
    }

    activeComposer =
      composer;

    // 사용자가 다시 입력하면
    // 기존 결과 제거
    removeHighlight();
    removeWarning();

    // 새로운 입력 분석
    scheduleAnalysis();
  }

  // ============================================================
  // Focus 이벤트
  // ============================================================

  function handleFocusEvent(event) {
    if (!enabled) return;

    const target =
      event.target;

    if (!target) return;

    const composer =
      target.closest?.(
        '#messageInput,' +
        '#input,' +
        '[data-onepace-composer],' +
        '[data-qa="message_input"],' +
        '[contenteditable="true"][role="textbox"],' +
        'textarea'
      );

    if (!composer) return;

    activeComposer =
      composer;

    if (
      !document.getElementById(
        ROOT_ID
      )
    ) {
      createComposerUI(
        composer
      );
    }
  }

  // ============================================================
  // 전송 감지
  // ============================================================

  document.addEventListener(
    'click',
    event => {
      if (!enabled) return;

      const target =
        event.target;

      if (!target) return;

      const button =
        target.closest?.('button');

      if (!button) return;

      const text =
        (
          button.innerText ||
          button.textContent ||
          ''
        )
          .trim()
          .toLowerCase();

      if (
        text.includes('전송') ||
        text.includes('send')
      ) {
        setTimeout(() => {
          const input =
            activeComposer ||
            findComposer();

          if (!input) return;

          const currentText =
            getText(input).trim();

          if (!currentText) {
            suppressedText = '';

            lastAnalysisKey = '';
            latestRequestKey = '';

            currentAnalysis = null;

            currentDetectedExpression =
              '';

            activeDetectedExpression =
              '';

            removeHighlight();
            removeWarning();
          }
        }, 100);
      }
    },
    true
  );

  // ============================================================
  // Scan
  // ============================================================

  async function scan() {
    if (!enabled) return;

    let input =
      activeComposer;

    if (
      !input ||
      !document.contains(input)
    ) {
      input =
        findComposer();
    }

    if (!input) return;

    activeComposer =
      input;

    await createComposerUI(
      input
    );
  }

  // ============================================================
  // 전체 제거
  // ============================================================

  function removeAll() {
    clearTimeout(
      analysisTimer
    );

    analysisTimer = null;

    lastAnalysisKey = '';
    latestRequestKey = '';

    suppressedText = '';

    currentAnalysis = null;

    currentDetectedExpression =
      '';

    activeDetectedExpression =
      '';

    removeHighlight();
    removeWarning();

    document
      .querySelectorAll(
        `#${ROOT_ID}`
      )
      .forEach(element => {
        element.remove();
      });

    composerRoot = null;
    activeComposer = null;
  }

  // ============================================================
  // 이벤트 등록
  // ============================================================

  document.addEventListener(
    'input',
    handleInputEvent,
    true
  );

  document.addEventListener(
    'focusin',
    handleFocusEvent,
    true
  );

  // ============================================================
  // Chrome Runtime Message
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
    }
  );

  // ============================================================
  // 초기 상태
  // ============================================================

  chrome.storage.local.get(
    'onepaceEnabled',
    result => {
      // 저장된 값이 없으면 최초 실행
      if (
        typeof result.onepaceEnabled !==
        'boolean'
      ) {
        chrome.storage.local.set(
          {
            onepaceEnabled: true
          },
          () => {
            enabled = true;

            console.log(
              '[ONEPACE] 최초 실행 → 활성화:',
              enabled
            );

            scan();
          }
        );

        return;
      }

      enabled =
        result.onepaceEnabled === true;

      console.log(
        '[ONEPACE] storage 값:',
        result.onepaceEnabled
      );

      console.log(
        '[ONEPACE] 초기 활성화 상태:',
        enabled
      );

      if (enabled) {
        scan();
      } else {
        removeAll();
      }
    }
  );

  // ============================================================
  // Storage 변경
  // ============================================================

  chrome.storage.onChanged.addListener(
    (
      changes,
      areaName
    ) => {
      if (
        areaName !== 'local' ||
        !changes.onepaceEnabled
      ) {
        return;
      }

      const newEnabled =
        changes.onepaceEnabled.newValue ===
        true;

      enabled =
        newEnabled;

      if (!enabled) {
        removeAll();
        return;
      }

      scan();
    }
  );

  // ============================================================
  // 현지 시간 갱신
  // ============================================================

  setInterval(() => {
    if (!selectedCountry) return;

    updateCountryStatus();
  }, 30000);

  // ============================================================
  // DOM Observer
  // ============================================================

  let observerTimer = null;

  const observer =
    new MutationObserver(() => {
      if (!enabled) return;

      if (observerTimer) return;

      observerTimer =
        setTimeout(() => {
          observerTimer = null;

          const currentInput =
            findComposer();

          if (!currentInput) return;

          if (
            currentInput !==
            activeComposer
          ) {
            activeComposer =
              currentInput;

            removeHighlight();
            removeWarning();

            createComposerUI(
              currentInput
            );
          } else if (
            !document.getElementById(
              ROOT_ID
            )
          ) {
            createComposerUI(
              currentInput
            );
          }
        }, 300);
    });

  observer.observe(
    document.documentElement,
    {
      childList: true,
      subtree: true
    }
  );

  // ============================================================
  // 시작
  // ============================================================

  scan();

  console.log(
    '[ONEPACE] Highlight-based AI analysis connected'
  );
})();