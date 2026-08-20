(() => {
  'use strict';

  // ============================================================
  // ONE PACE CONTENT SCRIPT
  //
  // content-ui.html + content.css 기준
  //
  // 역할
  // 1. 상대 국가 선택
  // 2. 국가 상태 표시
  // 3. 입력값 실시간 분석
  // 4. API riskDetected 처리
  // 5. 오해 가능성 말풍선 표시
  // 6. 추천 표현 적용
  //
  // API
  // https://api.onepace.site/api/culture-translation/analyze
  // ============================================================


  // ============================================================
  // 중복 실행 방지
  // ============================================================

  if (window.top !== window.self) {
    return;
  }

  if (
    document.documentElement.dataset.onepaceLoaded === 'true'
  ) {
    return;
  }

  document.documentElement.dataset.onepaceLoaded = 'true';


  // ============================================================
  // 설정
  // ============================================================

  const ROOT_ID = 'onepace-global-root';
  const WARNING_ID = 'onepace-realtime-warning';

  const COMPOSER_TEMPLATE_ID =
    'onepace-composer-template';

  const WARNING_TEMPLATE_ID =
    'onepace-warning-template';

  const UI_FILE =
    'content-ui.html';

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


  // ============================================================
  // HTML Escape
  // ============================================================

  function escapeHtml(value) {
    return String(value ?? '').replace(
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
  // 입력값 읽기
  // ============================================================

  function getText(element) {
    if (!element) {
      return '';
    }

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
  // 입력값 변경
  // ============================================================

  function setText(element, text) {
    if (!element) {
      return;
    }

    const value = String(text ?? '');

    if (element.isContentEditable) {
      element.focus();

      element.textContent = value;

      element.dispatchEvent(
        new InputEvent('input', {
          bubbles: true,
          inputType: 'insertText',
          data: value
        })
      );

      return;
    }

    element.focus();

    const prototype =
      Object.getPrototypeOf(element);

    const valueSetter =
      Object.getOwnPropertyDescriptor(
        prototype,
        'value'
      )?.set;

    if (valueSetter) {
      valueSetter.call(
        element,
        value
      );
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
      ).format(new Date());
    } catch {
      return '--:--';
    }
  }


  // ============================================================
  // Composer 찾기
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

        if (!element) {
          continue;
        }

        if (
          element.closest('#onepace-global-root') ||
          element.closest('#onepace-realtime-warning')
        ) {
          continue;
        }


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
  // Composer Container
  // ============================================================

  function findComposerContainer(input) {

    if (!input) {
      return null;
    }


    const container =
      input.closest(
        '[data-onepace-composer-container]'
      ) ||
      input.closest('.composer') ||
      input.closest('.composer-wrap') ||
      input.closest('[data-qa="message_input_container"]');


    if (container) {
      return container;
    }


    return input.parentElement;
  }


  // ============================================================
  // Template 확인
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


  // ============================================================
  // content-ui.html 로드
  // ============================================================

  async function ensureTemplates() {

    if (templatesExist()) {

      templateLoaded = true;

      return true;
    }


    if (templateLoaded) {
      return true;
    }


    if (templateLoadingPromise) {
      return templateLoadingPromise;
    }


    templateLoadingPromise =
      (async () => {

        try {

          const resourceUrl =
            chrome.runtime.getURL(UI_FILE);


          console.log(
            '[ONEPACE] UI template loading:',
            resourceUrl
          );


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


          const templates =
            wrapper.querySelectorAll('template');


          templates.forEach((template) => {

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


          console.log(
            '[ONEPACE] UI template loaded'
          );


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
  // Composer UI 생성
  // ============================================================

  async function createComposerUI(input) {

    if (!input) {
      return null;
    }


    const container =
      findComposerContainer(input);


    if (!container) {
      return null;
    }


    let existing =
      container.querySelector(
        `#${ROOT_ID}`
      );


    if (existing) {

      composerRoot = existing;

      return existing;
    }


    const loaded =
      await ensureTemplates();


    if (!loaded) {
      return null;
    }


    const template =
      document.getElementById(
        COMPOSER_TEMPLATE_ID
      );


    if (!template) {
      return null;
    }


    const root =
      document.createElement('div');


    root.id = ROOT_ID;


    const fragment =
      template.content.cloneNode(true);


    root.appendChild(fragment);


    const computed =
      getComputedStyle(container);


    if (
      computed.position === 'static'
    ) {
      container.style.position = 'relative';
    }


    if (
      computed.overflow === 'hidden'
    ) {
      container.style.overflow = 'visible';
    }


    // 입력창 위에 삽입
    container.insertBefore(
      root,
      input
    );


    composerRoot = root;


    bindCountryUI(root);


    updateCountryStatus();


    console.log(
      '[ONEPACE] Composer UI created'
    );


    return root;
  }


  // ============================================================
  // 국가 UI
  // ============================================================

  function bindCountryUI(root) {

    if (!root) {
      return;
    }


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
        COUNTRIES.filter(
          (country) => {

            return (
              country.name
                .toLowerCase()
                .includes(normalizedQuery) ||

              country.nationality
                .toLowerCase()
                .includes(normalizedQuery)
            );

          }
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
          .map((country) => {

            const selected =
              selectedCountry?.code ===
              country.code;


            return `
              <button
                type="button"
                class="onepace-country-item ${selected ? 'selected' : ''}"
                data-country-code="${escapeHtml(country.code)}"
              >
                <span class="onepace-country-flag">
                  ${country.flag}
                </span>

                <span class="onepace-country-name">
                  ${escapeHtml(country.nationality)}
                </span>
              </button>
            `;

          })
          .join('');


      list
        .querySelectorAll(
          '.onepace-country-item'
        )
        .forEach((item) => {

          item.addEventListener(
            'click',
            (event) => {

              event.preventDefault();
              event.stopPropagation();


              const code =
                item.dataset.countryCode;


              selectedCountry =
                COUNTRIES.find(
                  (country) =>
                    country.code === code
                ) || null;


              search.value = '';


              renderCountryList();


              updateCountryStatus();


              lastAnalysisKey = '';


              analyzeCurrentInput();

            }
          );

        });

    }


    button.addEventListener(
      'click',
      (event) => {

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
      (event) => {

        event.preventDefault();
        event.stopPropagation();


        popup.classList.remove('open');
        button.classList.remove('open');


        updateCountryStatus();


        lastAnalysisKey = '';


        analyzeCurrentInput();

      }
    );


    document.addEventListener(
      'click',
      (event) => {

        if (
          root.contains(event.target)
        ) {
          return;
        }


        popup.classList.remove('open');
        button.classList.remove('open');

      },
      true
    );


    renderCountryList();

  }


  // ============================================================
  // 국가 상태 업데이트
  // ============================================================

  function updateCountryStatus() {

    if (!composerRoot) {
      return;
    }


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
  // API 분석
  // ============================================================

  async function analyzeMessage(
    message,
    country
  ) {

    const cleanMessage =
      String(message ?? '').trim();


    console.log(
      '[ONEPACE] API 요청 시작'
    );

    console.log(
      '[ONEPACE] text:',
      cleanMessage
    );

    console.log(
      '[ONEPACE] country:',
      country?.code
    );


    if (
      !cleanMessage ||
      !country
    ) {

      return {
        risky: false,
        country
      };

    }


    try {

      const requestBody = {
        text: cleanMessage,
        counterpartCountry: country.code
      };


      console.log(
        '[ONEPACE] API request body:',
        requestBody
      );


      const response =
        await fetch(
          ANALYZE_ENDPOINT,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body:
              JSON.stringify(
                requestBody
              )
          }
        );


      console.log(
        '[ONEPACE] API status:',
        response.status
      );


      if (!response.ok) {

        console.warn(
          '[ONEPACE] 분석 API 응답 오류:',
          response.status
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


      const risky =
        data?.riskDetected === true;


      return {

        risky,

        country,

        detectedExpression:
          data?.detectedExpression || '',

        realtimeDetection:
          data?.realtimeDetection || '',

        nuanceExplanation:
          data?.nuanceExplanation || '',

        suggestedText:
          data?.suggestedText || '',

        raw:
          data

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
  // 경고창 표시
  //
  // 중요:
  // content-ui.html의 클래스명을 그대로 사용한다.
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


    if (!loaded) {
      return;
    }


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


    // ==========================================================
    // 핵심
    //
    // wrapper 자체는 CSS에서 fixed 말풍선으로 처리
    // template 내부 구조는 content-ui.html 그대로 사용
    // ==========================================================

    wrapper.appendChild(
      template.content.cloneNode(true)
    );


    const warning =
      wrapper.querySelector(
        '.onepace-warning'
      );

    const backdrop =
      wrapper.querySelector(
        '.onepace-warning-backdrop'
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


    if (!warning) {

      console.error(
        '[ONEPACE] .onepace-warning 없음'
      );

      return;
    }


    // ==========================================================
    // 데이터 삽입
    // ==========================================================

    if (country) {

      country.textContent =
        analysis.country?.nationality ||
        '';

    }


    if (reason) {

      reason.textContent =
        analysis.nuanceExplanation ||
        analysis.realtimeDetection ||
        '문화적 차이로 오해가 발생할 수 있는 표현이에요.';

    }


    if (original) {

      original.textContent =
        getText(input).trim();

    }


    if (suggestion) {

      suggestion.textContent =
        analysis.suggestedText ||
        '더 자연스럽게 전달할 수 있는 표현을 확인해 주세요.';

    }


    // ==========================================================
    // 그대로 전송
    // ==========================================================

    if (sendAnyway) {

      sendAnyway.addEventListener(
        'click',
        (event) => {

          event.preventDefault();
          event.stopPropagation();

          removeWarning();

          try {
            input.focus();
          } catch {}

        }
      );

    }


    // ==========================================================
    // 수정해서 전송
    // ==========================================================

    if (useSuggestion) {

      useSuggestion.addEventListener(
        'click',
        (event) => {

          event.preventDefault();
          event.stopPropagation();


          const suggestedText =
            analysis.suggestedText;


          if (!suggestedText) {

            removeWarning();

            return;
          }


          setText(
            input,
            suggestedText
          );


          activeComposer =
            input;


          lastAnalysisKey =
            `${selectedCountry?.code || ''}:${suggestedText.trim()}`;


          removeWarning();


          try {
            input.focus();
          } catch {}

        }
      );

    }


    // ==========================================================
    // 배경 클릭
    // ==========================================================

    if (backdrop) {

      backdrop.addEventListener(
        'click',
        (event) => {

          if (
            event.target === backdrop
          ) {

            removeWarning();

          }

        }
      );

    }


    document.body.appendChild(
      wrapper
    );


    console.log(
      '[ONEPACE] 경고창 표시',
      {
        country:
          analysis.country?.code,

        original:
          getText(input).trim(),

        suggestion:
          analysis.suggestedText
      }
    );

  }


  // ============================================================
  // 경고창 제거
  // ============================================================

  function removeWarning() {

    const existing =
      document.getElementById(
        WARNING_ID
      );


    if (existing) {
      existing.remove();
    }

  }


  // ============================================================
  // 현재 입력 분석
  // ============================================================

  async function analyzeCurrentInput() {

    const input =
      activeComposer ||
      findComposer();


    if (!input) {

      console.log(
        '[ONEPACE] 입력창을 찾을 수 없음'
      );

      return;
    }


    if (!enabled) {

      removeWarning();

      return;
    }


    if (!selectedCountry) {

      removeWarning();

      lastAnalysisKey = '';
      latestRequestKey = '';

      return;
    }


    const message =
      getText(input).trim();


    if (!message) {

      removeWarning();

      lastAnalysisKey = '';
      latestRequestKey = '';

      return;
    }


    const analysisKey =
      `${selectedCountry.code}:${message}`;


    if (
      analysisKey === lastAnalysisKey
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


    // ==========================================================
    // 오래된 응답 무시
    // ==========================================================

    if (
      analysisKey !== latestRequestKey
    ) {

      console.log(
        '[ONEPACE] 오래된 API 응답 무시'
      );

      return;
    }


    // ==========================================================
    // 실제 현재 입력과 다시 비교
    //
    // 사용자가 API 응답을 기다리는 사이
    // 입력값을 바꿨다면 무조건 폐기
    // ==========================================================

    const currentInputText =
      getText(input).trim();


    if (
      currentInputText !== message
    ) {

      console.log(
        '[ONEPACE] 입력값 변경으로 API 응답 폐기'
      );

      return;
    }


    if (!analysis.risky) {

      removeWarning();

      return;
    }


    await showWarning(
      input,
      analysis
    );

  }


  // ============================================================
  // Debounce
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
  // 입력 이벤트
  // ============================================================

  function bindInputMonitoring(input) {

    if (!input) {
      return;
    }


    activeComposer =
      input;


    if (
      input.dataset.onepaceInputBound ===
      'true'
    ) {

      return;
    }


    input.dataset.onepaceInputBound =
      'true';


    input.addEventListener(
      'input',
      () => {

        activeComposer =
          input;


        // 입력이 바뀌면 이전 결과를 즉시 무효화
        latestRequestKey = '';


        scheduleAnalysis();

      },
      false
    );


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
  // 전체 스캔
  // ============================================================

  async function scan() {

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


    await createComposerUI(
      input
    );


    bindInputMonitoring(
      input
    );

  }


  // ============================================================
  // 전체 UI 제거
  // ============================================================

  function removeAll() {

    clearTimeout(
      analysisTimer
    );


    analysisTimer =
      null;


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


    composerRoot = null;

  }


  // ============================================================
  // Extension message
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

      updateCountryStatus();

    },
    30000
  );


  // ============================================================
  // DOM 변경 감지
  // ============================================================

  let observerTimer = null;


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

              observerTimer = null;


              const currentInput =
                findComposer();


              if (
                currentInput &&
                currentInput !== activeComposer
              ) {

                activeComposer =
                  currentInput;


                scan();


              } else if (
                currentInput &&
                !document.getElementById(
                  ROOT_ID
                )
              ) {

                scan();

              }

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
  // 초기 실행
  // ============================================================

  scan();


  console.log(
    '[ONEPACE] Realtime AI analysis connected:',
    ANALYZE_ENDPOINT
  );

})();