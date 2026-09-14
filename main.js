const STORAGE_KEY = "subscription-control-room";
const today = new Date().toISOString().slice(0, 10);
let subscriptions = loadSubscriptions();

// localStorage에서 저장된 구독 목록을 읽어온다.
// 저장값이 없거나 JSON 형식이 깨졌다면 빈 배열로 시작한다.
// @returns {Object[]} 저장된 구독 목록
function loadSubscriptions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.warn("저장된 구독 데이터를 읽지 못했습니다.", error);
    return [];
  }
}

// 현재 메모리의 구독 목록을 JSON 문자열로 바꾸어 localStorage에 저장한다.
// 브라우저를 닫았다가 다시 열어도 데이터가 남는 이유가 이 함수 때문이다.
function saveSubscriptions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
}

// 새 구독을 구별하기 위한 문자열 ID를 만든다.
// 시간과 임의의 문자열을 함께 사용하여 같은 ID가 생길 가능성을 낮춘다.
// @returns {string} 새 구독 ID
function createId() {
  return `sub_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// 폼의 입력값을 읽어 구독 객체 하나로 변환한다.
// 수정 중인 항목은 숨겨진 ID를 재사용하고, 새 항목은 새 ID를 만든다.
// @returns {Object} 저장할 구독 데이터
function readForm() {
  const form = document.querySelector("#subscriptionForm");
  const formData = new FormData(form);
  return {
    id: formData.get("subscriptionId") || createId(),
    name: String(formData.get("name")).trim(),
    amount: Number(formData.get("amount")),
    cycle: formData.get("cycle"),
    nextPaymentDate: formData.get("nextPaymentDate"),
    category: String(formData.get("category")).trim(),
    paymentMethod: String(formData.get("paymentMethod") || "").trim()
  };
}

// 데이터 저장과 화면 다시 그리기를 순서대로 실행한다.
// 추가·수정·삭제 뒤에 공통으로 호출하여 목록과 요약을 함께 갱신한다.
function refresh() {
  saveSubscriptions();
  renderApp(subscriptions, today);
}

// HTML이 모두 준비된 뒤 초기 화면과 사용자 이벤트를 설정한다.
// DOMContentLoaded 안에서 querySelector를 실행해야 HTML 요소를 안전하게 찾을 수 있다.
document.addEventListener("DOMContentLoaded", () => {
  document.querySelector("#todayLabel").textContent = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());
  document.querySelector("#nextPaymentDate").value = today;
  renderApp(subscriptions, today);

  // 폼 제출 이벤트: 새 구독 추가와 기존 구독 수정은 같은 흐름으로 처리한다.
  document.querySelector("#subscriptionForm").addEventListener("submit", event => {
    event.preventDefault();
    const subscription = readForm();
    const existingIndex = subscriptions.findIndex(item => item.id === subscription.id);
    if (existingIndex >= 0) {
      subscriptions[existingIndex] = subscription;
    } else {
      subscriptions.push(subscription);
    }
    resetForm();
    refresh();
  });

  // 목록 하나에 클릭 이벤트를 등록하고, 실제 버튼은 data-action으로 구분한다.
  // 카드가 다시 렌더링되어도 부모 목록의 이벤트 하나가 계속 동작한다.
  document.querySelector("#subscriptionList").addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const subscription = subscriptions.find(item => item.id === button.dataset.id);
    if (!subscription) return;

    if (button.dataset.action === "delete") {
      if (!window.confirm(`${subscription.name} 구독을 삭제할까요?`)) return;
      subscriptions = subscriptions.filter(item => item.id !== subscription.id);
      refresh();
      return;
    }

    fillForm(subscription);
    document.querySelector("#formPanel").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.querySelector("#cancelEditButton").addEventListener("click", resetForm);
  // 상단의 새 구독 버튼을 누르면 폼으로 이동하고 이름 입력칸에 포커스를 준다.
  document.querySelector("#focusFormButton").addEventListener("click", () => {
    resetForm();
    document.querySelector("#formPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    document.querySelector("#name").focus();
  });
});
