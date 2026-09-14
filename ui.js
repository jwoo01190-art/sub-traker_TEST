// 숫자를 한국 원화 표시 문자열로 바꾼다.
// 예를 들어 13500은 "13,500원"이 된다.
// @param {number} amount 표시할 금액
// @returns {string} 화면에 표시할 원화 문자열
function formatWon(amount) {
  return `${Number(amount || 0).toLocaleString("ko-KR")}원`;
}

// 날짜 입력값을 사용자가 읽기 쉬운 월/일 형식으로 바꾼다.
// 시간대 차이로 날짜가 하루 밀리지 않도록 자정 시간을 명시한다.
// @param {string} dateString YYYY-MM-DD 형식의 날짜
// @returns {string} 한국어 날짜 문자열
function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(date);
}

// 상단 요약 영역의 월 합계, 연간 합계, 이번 주 결제 예정 수를 갱신한다.
// 계산 자체는 logic.js 함수에 맡기고, 이 함수는 결과를 DOM에 넣는 역할만 한다.
// @param {Object[]} subscriptions 현재 구독 목록
// @param {string} today 기준 날짜
function renderSummary(subscriptions, today) {
  const monthlyTotal = calculateTotalMonthlyAmount(subscriptions);
  const yearlyTotal = calculateTotalYearlyAmount(subscriptions);
  const upcoming = filterSubscriptionsByNextPayment(subscriptions, today, 7);

  document.querySelector("#monthlyTotal").textContent = formatWon(monthlyTotal);
  document.querySelector("#yearlyTotal").textContent = formatWon(yearlyTotal);
  document.querySelector("#upcomingTotal").textContent = `${upcoming.length}건`;
  document.querySelector("#upcomingNote").textContent = upcoming.length ? `${formatWon(calculateTotalMonthlyAmount(upcoming))} 규모` : "앞으로 7일";
}

// 구독 목록을 카드 HTML로 만들어 화면에 표시한다.
// 결제일이 가까운 순서로 정렬하지만 원본 배열은 변경하지 않는다.
// @param {Object[]} subscriptions 현재 구독 목록
// @param {string} today 기준 날짜
function renderSubscriptionList(subscriptions, today) {
  const list = document.querySelector("#subscriptionList");
  document.querySelector("#subscriptionCount").textContent = subscriptions.length;

  if (!subscriptions.length) {
    list.innerHTML = '<div class="empty-state"><strong>아직 등록된 구독이 없습니다.</strong><span>오른쪽 폼에서 첫 구독을 추가해 보세요.</span></div>';
    return;
  }

  // [...subscriptions]로 복사한 뒤 정렬하여 상태 배열의 순서는 유지한다.
  const sortedSubscriptions = [...subscriptions].sort((first, second) => first.nextPaymentDate.localeCompare(second.nextPaymentDate));
  list.innerHTML = sortedSubscriptions.map(subscription => {
    const days = calculateDaysUntilNextPayment(today, subscription.nextPaymentDate);
    const ddayLabel = days < 0 ? `D+${Math.abs(days)}` : days === 0 ? "오늘" : `D-${days}`;
    const monthlyAmount = convertToMonthlyAmount(subscription);
    return `
      <article class="subscription-card">
        <div>
          <h3 class="service-name">${escapeHtml(subscription.name)}</h3>
          <div class="service-meta">
            <span>${escapeHtml(subscription.category)}</span>
            <span>${formatDate(subscription.nextPaymentDate)}</span>
            ${subscription.paymentMethod ? `<span>${escapeHtml(subscription.paymentMethod)}</span>` : ""}
          </div>
        </div>
        <div class="service-amount">
          <strong>${formatWon(monthlyAmount)}</strong>
          <span>${subscription.cycle === "yearly" ? "월 환산" : "매월"}</span>
        </div>
        <div class="dday${days === 0 ? " today" : ""}">${ddayLabel}</div>
        <div class="card-actions">
          <button class="icon-button" type="button" data-action="edit" data-id="${subscription.id}">수정</button>
          <button class="icon-button" type="button" data-action="delete" data-id="${subscription.id}">삭제</button>
        </div>
      </article>`;
  }).join("");
}

// 카테고리별 월 지출 비중을 막대 그래프로 표시한다.
// 각 카테고리 금액을 전체 월 합계로 나누어 백분율을 만든다.
// @param {Object[]} subscriptions 현재 구독 목록
function renderCategories(subscriptions) {
  const categoryList = document.querySelector("#categoryList");
  const categories = groupSubscriptionsByCategory(subscriptions);
  const total = Object.values(categories).reduce((sum, value) => sum + value, 0);

  if (!total) {
    categoryList.innerHTML = '<p class="category-empty">구독을 추가하면 지출 구성이 표시됩니다.</p>';
    return;
  }

  categoryList.innerHTML = Object.entries(categories)
    .sort(([, first], [, second]) => second - first)
    .map(([category, amount]) => {
      const percentage = Math.round(amount / total * 100);
      return `<div class="category-row"><span class="category-name">${escapeHtml(category)}</span><div class="category-track"><div class="category-bar" style="width: ${percentage}%"></div></div><span class="category-value">${percentage}%</span></div>`;
    }).join("");
}

// 화면에 있는 모든 데이터 영역을 한 번에 다시 그린다.
// 구독이 추가·수정·삭제될 때 이 함수를 호출하면 화면이 같은 상태로 맞춰진다.
// @param {Object[]} subscriptions 현재 구독 목록
// @param {string} today 기준 날짜
function renderApp(subscriptions, today) {
  renderSummary(subscriptions, today);
  renderSubscriptionList(subscriptions, today);
  renderCategories(subscriptions);
}

// 선택한 구독의 데이터를 입력 폼에 채워 수정 모드로 전환한다.
// 숨겨진 ID도 함께 보관하므로 저장할 때 새 항목이 아니라 기존 항목을 교체할 수 있다.
// @param {Object} subscription 수정할 구독
function fillForm(subscription) {
  document.querySelector("#subscriptionId").value = subscription.id;
  document.querySelector("#name").value = subscription.name;
  document.querySelector("#amount").value = subscription.amount;
  document.querySelector("#cycle").value = subscription.cycle;
  document.querySelector("#nextPaymentDate").value = subscription.nextPaymentDate;
  document.querySelector("#category").value = subscription.category;
  document.querySelector("#paymentMethod").value = subscription.paymentMethod || "";
  document.querySelector("#formTitle").textContent = "구독 수정";
  document.querySelector("#submitButton").textContent = "변경 저장";
  document.querySelector("#cancelEditButton").hidden = false;
}

// 입력 폼을 새 구독 추가 상태로 되돌린다.
// 수정 모드에서만 보이는 취소 버튼과 문구도 함께 초기화한다.
function resetForm() {
  document.querySelector("#subscriptionForm").reset();
  document.querySelector("#subscriptionId").value = "";
  document.querySelector("#formTitle").textContent = "새 구독 추가";
  document.querySelector("#submitButton").textContent = "구독 저장";
  document.querySelector("#cancelEditButton").hidden = true;
}

// 사용자 입력을 HTML에 넣기 전에 특수문자를 안전한 문자实体로 바꾼다.
// 서비스 이름이나 카테고리에 HTML 문자가 들어와도 화면의 마크업으로 실행되지 않는다.
// @param {*} value 화면에 표시할 사용자 입력값
// @returns {string} HTML에 안전하게 넣을 수 있는 문자열
function escapeHtml(value) {
  // replace의 콜백은 발견한 특수문자 하나를 해당 HTML 엔티티로 바꾼다.
  return String(value).replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}
