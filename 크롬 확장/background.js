// ============================================================
// ONEPACE Background Service Worker
// ============================================================

const CONTENT_SCRIPT_ID = "onepace-global-content";


// ============================================================
// 메시지
// ============================================================

chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {

    // ----------------------------------------------------------
    // Side Panel에서 보여줄 화면만 저장
    // 절대 Side Panel을 여기서 열지 않음
    // ----------------------------------------------------------

    if (message.action === "open_side_panel") {

      const view =
        message.view === "dashboard"
          ? "dashboard"
          : "summary";

      chrome.storage.local.set({
        onepaceActiveView: view
      });

      sendResponse({
        success: true
      });

      return true;
    }


    // ----------------------------------------------------------
    // ONEPACE ON / OFF
    // ----------------------------------------------------------

    if (message.action === "set_onepace_active") {

      const active = Boolean(message.active);

      setOnepaceActive(active)
        .then(() => {

          sendResponse({
            success: true,
            active
          });

        })
        .catch((error) => {

          console.error(
            "ONEPACE activation failed:",
            error
          );

          sendResponse({
            success: false,
            error: error.message
          });

        });

      return true;
    }


    // ----------------------------------------------------------
    // 현재 상태
    // ----------------------------------------------------------

    if (message.action === "get_onepace_state") {

      chrome.storage.local.get(
        ["onepaceEnabled"],
        (result) => {

          sendResponse({
            active:
              result.onepaceEnabled !== false
          });

        }
      );

      return true;
    }

  }
);


// ============================================================
// ONEPACE ON / OFF
// ============================================================

async function setOnepaceActive(active) {

  // content.js가 감시하는 실제 상태
  await chrome.storage.local.set({
    onepaceEnabled: active
  });


  // ==========================================================
  // OFF
  // ==========================================================

  if (!active) {

    try {

      await chrome.scripting.unregisterContentScripts({
        ids: [CONTENT_SCRIPT_ID]
      });

    } catch (error) {

      // 등록되어 있지 않으면 무시
      console.warn(
        "ONEPACE unregister:",
        error
      );

    }

    return;
  }


  // ==========================================================
  // ON
  // ==========================================================

  // ----------------------------------------------------------
  // 앞으로 열리는 페이지에도 자동 연결
  // ----------------------------------------------------------

  try {

    await chrome.scripting.registerContentScripts([
      {
        id: CONTENT_SCRIPT_ID,

        js: [
          "content.js"
        ],

        matches: [
          "<all_urls>",
          "file:///*"
        ],

        runAt: "document_idle",

        persistAcrossSessions: true
      }
    ]);

  } catch (error) {

    // 이미 등록되어 있으면 정상
    if (
      !String(error.message)
        .toLowerCase()
        .includes("already exists")
    ) {

      console.warn(
        "ONEPACE content script registration:",
        error
      );

    }

  }


  // ----------------------------------------------------------
  // 현재 탭에도 즉시 연결
  // ----------------------------------------------------------

  const tabs =
    await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

  const tab = tabs[0];

  if (
    !tab?.id ||
    !isSupportedPage(tab.url)
  ) {
    return;
  }


  try {

    await chrome.scripting.executeScript({
      target: {
        tabId: tab.id
      },
      files: [
        "content.js"
      ]
    });

  } catch (error) {

    console.warn(
      "ONEPACE current tab injection:",
      error
    );

  }

}


// ============================================================
// 페이지 이동 감지
// ============================================================

chrome.tabs.onUpdated.addListener(
  async (tabId, changeInfo, tab) => {

    if (changeInfo.status !== "complete") {
      return;
    }

    if (!isSupportedPage(tab.url)) {
      return;
    }


    const result =
      await chrome.storage.local.get([
        "onepaceEnabled"
      ]);


    if (result.onepaceEnabled === false) {
      return;
    }


    try {

      await chrome.scripting.executeScript({
        target: {
          tabId
        },
        files: [
          "content.js"
        ]
      });

    } catch (error) {

      console.warn(
        "ONEPACE automatic injection:",
        error
      );

    }

  }
);


// ============================================================
// 지원 페이지
// ============================================================

function isSupportedPage(url) {

  if (!url) {
    return false;
  }

  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("file:///")
  );

}


// ============================================================
// Chrome 시작
// ============================================================

chrome.runtime.onStartup.addListener(
  async () => {

    const result =
      await chrome.storage.local.get([
        "onepaceEnabled"
      ]);

    if (result.onepaceEnabled !== false) {
      await setOnepaceActive(true);
    }

  }
);


// ============================================================
// 설치
// ============================================================

chrome.runtime.onInstalled.addListener(
  async () => {

    const result =
      await chrome.storage.local.get([
        "onepaceEnabled"
      ]);

    if (
      typeof result.onepaceEnabled === "undefined"
    ) {

      await chrome.storage.local.set({
        onepaceEnabled: true
      });

    }

  }
);