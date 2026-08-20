document.addEventListener('DOMContentLoaded', async () => {

  // ============================================================
  // ELEMENTS
  // ============================================================

  const tabSummary =
    document.getElementById('tabSummary');

  const tabDashboard =
    document.getElementById('tabDashboard');

  const summaryView =
    document.getElementById('summaryView');

  const dashboardView =
    document.getElementById('dashboardView');

  const meetingFileInput =
    document.getElementById('meetingFileInput');

  const meetingUploadButton =
    document.getElementById('meetingUploadButton');

  const meetingFileInfo =
    document.getElementById('meetingFileInfo');

  const meetingFileName =
    document.getElementById('meetingFileName');

  const meetingFileRemove =
    document.getElementById('meetingFileRemove');

  const meetingSummaryButton =
    document.getElementById('meetingSummaryButton');

  const meetingLoading =
    document.getElementById('meetingLoading');

  const meetingSummaryResult =
    document.getElementById('meetingSummaryResult');


  // ============================================================
  // REQUIRED ELEMENT CHECK
  // ============================================================

  if (
    !tabSummary ||
    !tabDashboard ||
    !summaryView ||
    !dashboardView ||
    !meetingFileInput ||
    !meetingUploadButton ||
    !meetingFileInfo ||
    !meetingFileName ||
    !meetingFileRemove ||
    !meetingSummaryButton ||
    !meetingLoading ||
    !meetingSummaryResult
  ) {
    console.error(
      '[ONE PACE] 사이드패널 필수 요소를 찾을 수 없습니다.'
    );

    return;
  }


  // ============================================================
  // INITIAL STATE
  // ============================================================

  // 처음에는 AI 결과를 절대 보여주지 않음
  meetingSummaryResult.style.display = 'none';

  // 회의록 파일도 선택되지 않은 상태
  meetingFileInfo.style.display = 'none';

  // 분석 버튼도 숨김
  meetingSummaryButton.style.display = 'none';

  // 로딩도 숨김
  meetingLoading.style.display = 'none';


  // ============================================================
  // TAB
  // ============================================================

  function showSummary() {

    tabSummary.classList.add('active');
    tabDashboard.classList.remove('active');

    summaryView.style.display = 'flex';
    dashboardView.style.display = 'none';

  }


  function showDashboard() {

    tabSummary.classList.remove('active');
    tabDashboard.classList.add('active');

    summaryView.style.display = 'none';
    dashboardView.style.display = 'flex';

  }


  tabSummary.addEventListener(
    'click',
    async () => {

      showSummary();

      try {

        await chrome.storage.local.set({
          onepaceView: 'summary'
        });

      } catch (error) {

        console.warn(
          '[ONE PACE] 탭 상태 저장 실패:',
          error
        );

      }

    }
  );


  tabDashboard.addEventListener(
    'click',
    async () => {

      showDashboard();

      try {

        await chrome.storage.local.set({
          onepaceView: 'dashboard'
        });

      } catch (error) {

        console.warn(
          '[ONE PACE] 탭 상태 저장 실패:',
          error
        );

      }

    }
  );


  // 저장된 탭 상태 불러오기
  try {

    const {
      onepaceView = 'summary'
    } = await chrome.storage.local.get(
      'onepaceView'
    );

    if (onepaceView === 'dashboard') {

      showDashboard();

    } else {

      showSummary();

    }

  } catch (error) {

    console.warn(
      '[ONE PACE] 탭 상태 불러오기 실패:',
      error
    );

    showSummary();

  }


  // ============================================================
  // MEETING FILE
  // ============================================================

  let selectedMeetingFile = null;


  // ============================================================
  // FILE UPLOAD BUTTON
  // ============================================================

  meetingUploadButton.addEventListener(
    'click',
    () => {

      meetingFileInput.click();

    }
  );


  // ============================================================
  // FILE SELECTED
  // ============================================================

  meetingFileInput.addEventListener(
    'change',
    () => {

      const file =
        meetingFileInput.files?.[0];

      if (!file) {

        return;

      }


      console.log(
        '[ONE PACE] 선택된 회의록:',
        file.name
      );


      selectedMeetingFile = file;


      // 파일 이름 표시
      meetingFileName.textContent =
        file.name;

      meetingFileInfo.style.display =
        'flex';


      // 분석 버튼 표시
      meetingSummaryButton.style.display =
        'flex';


      // 새 파일을 선택했으므로
      // 기존 결과는 다시 숨김
      meetingSummaryResult.style.display =
        'none';


      // 이전 저장 결과 삭제
      chrome.storage.local.remove(
        'onepaceMeetingSummary'
      );


      console.log(
        '[ONE PACE] 회의록 선택 완료'
      );

    }
  );


  // ============================================================
  // REMOVE FILE
  // ============================================================

  meetingFileRemove.addEventListener(
    'click',
    async () => {

      console.log(
        '[ONE PACE] 회의록 제거'
      );


      selectedMeetingFile = null;


      meetingFileInput.value =
        '';


      meetingFileInfo.style.display =
        'none';


      meetingSummaryButton.style.display =
        'none';


      meetingSummaryResult.style.display =
        'none';


      meetingLoading.style.display =
        'none';


      try {

        await chrome.storage.local.remove(
          'onepaceMeetingSummary'
        );

      } catch (error) {

        console.warn(
          '[ONE PACE] 저장된 회의록 결과 삭제 실패:',
          error
        );

      }

    }
  );


  // ============================================================
  // READ FILE
  // ============================================================

  async function readMeetingFile(file) {

    if (!file) {

      throw new Error(
        '회의록 파일이 없습니다.'
      );

    }


    console.log(
      '[ONE PACE] 파일 읽기:',
      file.name
    );


    const text =
      await file.text();


    const trimmed =
      text.trim();


    if (!trimmed) {

      throw new Error(
        '회의록 내용이 비어 있습니다.'
      );

    }


    console.log(
      '[ONE PACE] 회의록 글자 수:',
      trimmed.length
    );


    return trimmed;

  }


  // ============================================================
  // TEXT → MESSAGES
  // ============================================================

  function convertTextToMessages(text) {

    return [
      {
        sender: '회의록',
        text: text,
        timestamp: new Date().toISOString()
      }
    ];

  }


  // ============================================================
  // JSON MEETING FILE
  // ============================================================

  function parseMeetingJSON(text) {

    try {

      const parsed =
        JSON.parse(text);


      if (
        parsed &&
        Array.isArray(parsed.messages)
      ) {

        return parsed.messages.map(
          message => ({

            sender:
              message.sender ||
              '알 수 없음',

            text:
              message.text ||
              '',

            timestamp:
              message.timestamp ||
              new Date().toISOString()

          })
        );

      }


      // messages 배열이 없는 JSON이면
      // 일반 텍스트로 처리할 수 있도록 null 반환
      return null;

    } catch (error) {

      console.warn(
        '[ONE PACE] JSON 파싱 실패:',
        error
      );

      return null;

    }

  }


  // ============================================================
  // GENERATE MEETING SUMMARY
  // ============================================================

  async function generateMeetingSummary() {

    console.log(
      '[ONE PACE] generateMeetingSummary 실행'
    );


    // ----------------------------------------------------------
    // FILE CHECK
    // ----------------------------------------------------------

    if (!selectedMeetingFile) {

      alert(
        '회의록을 먼저 추가해주세요.'
      );

      return;

    }


    console.log(
      '[ONE PACE] 선택된 파일:',
      selectedMeetingFile.name
    );


    // ----------------------------------------------------------
    // UI — ANALYZING
    // ----------------------------------------------------------

    meetingLoading.style.display =
      'flex';


    meetingSummaryButton.disabled =
      true;


    meetingSummaryButton.textContent =
      'AI 분석 중...';


    // 분석 중에는 결과 숨김
    meetingSummaryResult.style.display =
      'none';


    try {

      // ========================================================
      // READ FILE
      // ========================================================

      const fileText =
        await readMeetingFile(
          selectedMeetingFile
        );


      console.log(
        '[ONE PACE] 파일 읽기 완료'
      );


      // ========================================================
      // CONVERT TO MESSAGES
      // ========================================================

      let messages = null;


      const fileName =
        selectedMeetingFile.name.toLowerCase();


      if (
        fileName.endsWith('.json')
      ) {

        console.log(
          '[ONE PACE] JSON 회의록 감지'
        );


        messages =
          parseMeetingJSON(
            fileText
          );


        if (messages) {

          console.log(
            '[ONE PACE] JSON messages:',
            messages
          );

        }

      }


      // TXT / MD
      if (!messages) {

        console.log(
          '[ONE PACE] 일반 텍스트 회의록으로 처리'
        );


        messages =
          convertTextToMessages(
            fileText
          );

      }


      // ========================================================
      // FINAL REQUEST BODY
      // ========================================================

      const requestBody = {
        messages: messages
      };


      console.log(
        '[ONE PACE] API 요청:',
        requestBody
      );


      // ========================================================
      // API REQUEST
      // ========================================================

      const API_URL =
        'https://api.onepace.site/api/meeting-summary/generate';


      console.log(
        '[ONE PACE] 회의 요약 API 호출:',
        API_URL
      );


      const response =
        await fetch(
          API_URL,
          {

            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',

              'Accept':
                'application/json'
            },

            body:
              JSON.stringify(
                requestBody
              )

          }
        );


      console.log(
        '[ONE PACE] API status:',
        response.status
      );


      // ========================================================
      // API ERROR
      // ========================================================

      if (!response.ok) {

        const errorText =
          await response.text();


        console.error(
          '[ONE PACE] API 응답 오류:',
          errorText
        );


        throw new Error(
          `API 오류 ${response.status}: ${errorText}`
        );

      }


      // ========================================================
      // API JSON
      // ========================================================

      const result =
        await response.json();


      console.log(
        '[ONE PACE] 회의 요약 API 결과:',
        result
      );


      // ========================================================
      // RESULT VALIDATION
      // ========================================================

      if (
        !result ||
        typeof result !== 'object'
      ) {

        throw new Error(
          'API 응답 형식이 올바르지 않습니다.'
        );

      }


      // ========================================================
      // SAVE
      // ========================================================

      await chrome.storage.local.set({

        onepaceMeetingSummary:
          result

      });


      console.log(
        '[ONE PACE] 회의 요약 결과 저장 완료'
      );


      // ========================================================
      // RENDER
      // ========================================================

      renderMeetingSummary(
        result
      );


      // ========================================================
      // SHOW RESULT
      // ========================================================

      meetingSummaryResult.style.display =
        'block';


      console.log(
        '[ONE PACE] 회의 요약 결과 표시 완료'
      );


    } catch (error) {

      console.error(
        '[ONE PACE] 회의록 분석 실패:',
        error
      );


      // 실패하면 결과 박스 숨김
      meetingSummaryResult.style.display =
        'none';


      alert(
        '회의록 분석에 실패했습니다.\n\n' +
        `${error.message || '알 수 없는 오류'}`
      );


    } finally {

      meetingLoading.style.display =
        'none';


      meetingSummaryButton.disabled =
        false;


      meetingSummaryButton.textContent =
        'AI로 회의록 요약하기';

    }

  }


  // ============================================================
  // RENDER RESULT
  // ============================================================

  function renderMeetingSummary(result) {

    console.log(
      '[ONE PACE] renderMeetingSummary:',
      result
    );


    const goal =
      document.getElementById(
        'meetingGoal'
      );


    const summary =
      document.getElementById(
        'meetingSummaryText'
      );


    const actionInfo =
      document.getElementById(
        'meetingActionInfo'
      );


    const statusInfo =
      document.getElementById(
        'meetingStatusInfo'
      );


    const decisions =
      document.getElementById(
        'meetingDecisions'
      );


    // ==========================================================
    // SUMMARY
    // ==========================================================

    if (summary) {

      summary.textContent =
        result.summary ||
        '요약 내용이 없습니다.';

    }


    // ==========================================================
    // GOAL
    // ==========================================================

    if (goal) {

      goal.textContent =
        result.goal ||
        '회의 목표가 없습니다.';

    }


    // ==========================================================
    // ACTION ITEMS
    // ==========================================================

    const actionItems =
      Array.isArray(
        result.actionItems
      )
        ? result.actionItems
        : [];


    if (actionInfo) {

      if (
        actionItems.length === 0
      ) {

        actionInfo.innerHTML =
          '<li>담당 업무가 없습니다.</li>';

      } else {

        actionInfo.innerHTML =
          actionItems
            .map(
              item => `

                <li>
                  담당자:
                  ${escapeHTML(
                    item.assignee || '-'
                  )}
                </li>

                <li>
                  마감기한:
                  ${escapeHTML(
                    item.dueDate || '-'
                  )}
                </li>

              `
            )
            .join('');

      }

    }


    // ==========================================================
    // STATUS
    // ==========================================================

    if (statusInfo) {

      if (
        actionItems.length === 0
      ) {

        statusInfo.innerHTML =
          '<li>상태 정보가 없습니다.</li>';

      } else {

        const item =
          actionItems[0];


        statusInfo.innerHTML = `

          <li>
            긴급도:
            🟠 ${escapeHTML(
              item.urgency || '-'
            )}
          </li>

          <li>
            승인 상태:
            ${escapeHTML(
              item.approvalStatus || '-'
            )}
          </li>

          <li>
            피드백 상태:
            ${escapeHTML(
              item.feedbackStatus || '-'
            )}
          </li>

        `;

      }

    }


    // ==========================================================
    // DECISIONS
    // ==========================================================

    if (decisions) {

      const decisionList =
        Array.isArray(
          result.decisions
        )
          ? result.decisions
          : [];


      if (
        decisionList.length === 0
      ) {

        decisions.innerHTML =
          '<li>결정된 사항이 없습니다.</li>';

      } else {

        decisions.innerHTML =
          decisionList
            .map(
              decision => {

                const text =
                  typeof decision === 'string'
                    ? decision
                    : (
                        decision?.title ||
                        decision?.text ||
                        decision?.content ||
                        ''
                      );


                return `
                  <li>
                    ${escapeHTML(text)}
                  </li>
                `;

              }
            )
            .join('');

      }

    }


    // ==========================================================
    // TITLE
    // ==========================================================

    const summaryTitle =
      document.getElementById(
        'summaryTitle'
      );


    if (summaryTitle) {

      summaryTitle.textContent =
        'AI 요약 생성 완료';

    }


    // ==========================================================
    // DATE
    // ==========================================================

    const summaryDate =
      document.getElementById(
        'summaryDate'
      );


    if (summaryDate) {

      const now =
        new Date();


      summaryDate.textContent =
        `${now.getMonth() + 1}월 ` +
        `${now.getDate()}일 ` +
        `${String(
          now.getHours()
        ).padStart(2, '0')}:` +
        `${String(
          now.getMinutes()
        ).padStart(2, '0')} ` +
        `회의 기준`;

    }

  }


  // ============================================================
  // ESCAPE HTML
  // ============================================================

  function escapeHTML(value) {

    return String(value)

      .replace(
        /&/g,
        '&amp;'
      )

      .replace(
        /</g,
        '&lt;'
      )

      .replace(
        />/g,
        '&gt;'
      )

      .replace(
        /"/g,
        '&quot;'
      )

      .replace(
        /'/g,
        '&#039;'
      );

  }


  // ============================================================
  // GENERATE BUTTON
  // ============================================================

  meetingSummaryButton.addEventListener(
    'click',
    () => {

      console.log(
        '[ONE PACE] 회의록 분석 버튼 클릭됨'
      );


      generateMeetingSummary();

    }
  );


  // ============================================================
  // COPY SUMMARY
  // ============================================================

  const copySummaryButton =
    document.getElementById(
      'copySummaryButton'
    );


  if (copySummaryButton) {

    copySummaryButton.addEventListener(
      'click',
      async () => {

        try {

          const {
            onepaceMeetingSummary
          } =
            await chrome.storage.local.get(
              'onepaceMeetingSummary'
            );


          if (
            !onepaceMeetingSummary
          ) {

            alert(
              '먼저 회의록을 분석해주세요.'
            );

            return;

          }


          const decisions =
            Array.isArray(
              onepaceMeetingSummary.decisions
            )
              ? onepaceMeetingSummary.decisions
              : [];


          const actionItems =
            Array.isArray(
              onepaceMeetingSummary.actionItems
            )
              ? onepaceMeetingSummary.actionItems
              : [];


          const text = [

            '회의 요약',

            onepaceMeetingSummary.summary ||
              '',


            '',

            '목표',

            onepaceMeetingSummary.goal ||
              '',


            '',

            '결정사항',

            ...decisions.map(
              decision =>
                `- ${
                  typeof decision === 'string'
                    ? decision
                    : (
                        decision?.title ||
                        decision?.text ||
                        decision?.content ||
                        ''
                      )
                }`
            ),


            '',

            'Action Items',

            ...actionItems.map(
              item =>
                `- ${
                  item.title || ''
                } / ${
                  item.assignee || '-'
                } / ${
                  item.dueDate || '-'
                }`
            )

          ].join('\n');


          await navigator.clipboard.writeText(
            text
          );


          copySummaryButton.textContent =
            '복사 완료 ✓';


          setTimeout(
            () => {

              copySummaryButton.textContent =
                '요약 텍스트 복사';

            },
            1500
          );


        } catch (error) {

          console.error(
            '[ONE PACE] 복사 실패:',
            error
          );


          alert(
            '요약 복사에 실패했습니다.'
          );

        }

      }
    );

  }


  // ============================================================
  // IMPORTANT
  // ============================================================
  //
  // 저장된 결과가 있어도 자동으로 보여주지 않는다.
  //
  // 이유:
  // 사이드패널을 다시 열었을 때
  // "회의록 추가 전" 상태에서는
  // AI 결과 박스가 나타나면 안 되기 때문.
  //
  // 따라서 현재 selectedMeetingFile이 없으면
  // 무조건 결과를 숨긴다.
  //
  // ============================================================

  const {
    onepaceMeetingSummary = null
  } =
    await chrome.storage.local.get(
      'onepaceMeetingSummary'
    );


  console.log(
    '[ONE PACE] 저장된 회의 요약 존재 여부:',
    !!onepaceMeetingSummary
  );


  // 현재 파일이 선택되지 않았으므로
  // 저장된 결과가 있어도 숨김
  meetingSummaryResult.style.display =
    'none';


  console.log(
    '[ONE PACE] 초기 상태: 회의록 추가 전 → 결과 박스 숨김'
  );

});