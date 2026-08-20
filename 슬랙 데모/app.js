const channelData = {
  general: {
    title: "general",
    description: "팀 전체 공지와 일상적인 대화를 위한 채널"
  },
  design: {
    title: "design",
    description: "디자인 관련 논의와 피드백을 위한 채널"
  },
  development: {
    title: "development",
    description: "개발 진행 상황을 공유하는 채널"
  },
  marketing: {
    title: "marketing",
    description: "마케팅 및 캠페인 관련 채널"
  }
};

const channelName = document.getElementById("channelName");
const channelDescription = document.getElementById("channelDescription");
const messages = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const rightPanel = document.getElementById("rightPanel");
const closePanel = document.getElementById("closePanel");
const summaryBtn = document.getElementById("summaryBtn");
const summaryResult = document.getElementById("summaryResult");
const postSummary = document.getElementById("postSummary");
const toast = document.getElementById("toast");

function showToast(text) {
  toast.textContent = text;
  toast.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.add("hidden"), 2200);
}

document.querySelectorAll(".channel").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".channel").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const data = channelData[btn.dataset.channel];
    channelName.textContent = data.title;
    channelDescription.textContent = data.description;
    document.getElementById("introTitle").textContent = `${data.title}에 오신 것을 환영합니다!`;
    messages.scrollTop = 0;
  });
});

sendBtn.addEventListener("click", sendMessage);

messageInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  const article = document.createElement("article");
  article.className = "message";
  article.innerHTML = `
    <div class="avatar me">Y</div>
    <div class="message-content">
      <div class="message-meta">
        <strong>You</strong>
        <span>방금 전</span>
      </div>
      <p></p>
    </div>
  `;

  article.querySelector("p").textContent = text;
  messages.appendChild(article);
  messageInput.value = "";
  messages.scrollTop = messages.scrollHeight;
}

document.querySelector(".workspace .icon-btn").addEventListener("click", () => {
  showToast("워크스페이스 메뉴");
});

document.querySelectorAll(".top-btn").forEach(btn => {
  btn.addEventListener("click", () => showToast("Slack 기능 데모"));
});

/*
 * ONEPACE 확장 프로그램이 나중에 이 영역에 주입될 수 있도록
 * DOM 구조를 단순하게 유지한다.
 *
 * 예정:
 * - #onepace-root
 * - 입력창 실시간 감지
 * - GNB ONEPACE 아이콘
 * - AI 요약 사이드 패널
 */
const onepaceRoot = document.createElement("div");
onepaceRoot.id = "onepace-root";
document.body.appendChild(onepaceRoot);
