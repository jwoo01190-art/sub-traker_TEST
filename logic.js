// 구독 데이터(subscription) 예시
//{
//  "id": "sub_1",
//  "name": "넷플릭스",
//  "amount": 13500,
//  "cycle": "monthly", // "monthly" 또는 "yearly"
//  "nextPaymentDate": "2024-06-15",
//  "category": "영상"
//}

// 구독 1건을 받아 월 기준 금액으로 환산해 반환한다.
// cycle이 "yearly"면 12로 나누고, 원 단위로 반올림한다.
// 구독 1개의 금액을 월 단위 금액으로 통일한다.
// 매월 결제라면 원래 금액을 그대로 사용하고,
// 매년 결제라면 12개월로 나눈 뒤 가장 가까운 원 단위로 반올림한다.
// @param {Object} subscription 구독 정보
// @returns {number} 월 기준 금액
function convertToMonthlyAmount(subscription) {
  if (subscription.cycle === "yearly") {
    return Math.round(subscription.amount / 12);
  }
  return subscription.amount;
}

// 구독 데이터 배열을 받아 월 기준 금액으로 환산한 총합을 반환한다.
// 여러 구독의 월 기준 금액을 모두 더한다.
// 연간 구독도 convertToMonthlyAmount를 거치므로 월 구독과 같은 기준으로 계산된다.
// @param {Object[]} subscriptions 구독 목록
// @returns {number} 전체 월 합계
function calculateTotalMonthlyAmount(subscriptions) {
  // reduce는 목록을 처음부터 순회하며 total에 각 구독 금액을 누적한다.
  return subscriptions.reduce((total, subscription) => {
    return total + convertToMonthlyAmount(subscription);
  }, 0);
}

// 구독 목록 배열을 받아 연간 지출 합계를 반환한다.
// 월 합계에 12를 곱해서 계산한다.
// 전체 월 합계를 12배하여 1년 예상 지출을 계산한다.
// 실제로 매년 결제되는 시점과 상관없이 화면의 비교 기준을 월 합계로 통일한다.
// @param {Object[]} subscriptions 구독 목록
// @returns {number} 전체 연간 합계
function calculateTotalYearlyAmount(subscriptions) {
  const totalMonthlyAmount = calculateTotalMonthlyAmount(subscriptions);
  return totalMonthlyAmount * 12;
}

// 오늘 날짜와 결제 예정일을 받아 남은 일수를 반환한다.
// 두 값 모두 "YYYY-MM-DD" 형식의 문자열이다.
// 시각은 무시하고 날짜만 비교. 오늘이면 0, 지난 날짜면 음수.
// 오늘부터 다음 결제일까지 며칠 남았는지 계산한다.
// Date 객체끼리 빼면 밀리초 차이가 나오므로 하루의 밀리초로 나눈다.
// @param {string} today 오늘 날짜 (YYYY-MM-DD)
// @param {string} nextPaymentDate 다음 결제일 (YYYY-MM-DD)
// @returns {number} 남은 일수. 지난 날짜는 음수, 오늘은 0이다.
function calculateDaysUntilNextPayment(today, nextPaymentDate) {
  const todayDate = new Date(today);
  const nextPayment = new Date(nextPaymentDate);
  const timeDifference = nextPayment - todayDate;
  const daysDifference = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
  return daysDifference;
}

// 결제일이 N일 이내로 임박한 항목만 반환한다. 지난 것은 제외
// 지정한 기간 안에 결제될 구독만 골라낸다.
// 이미 지난 결제일은 제외하고, 오늘부터 days일 뒤까지의 항목을 포함한다.
// @param {Object[]} subscriptions 구독 목록
// @param {string} today 기준 날짜 (YYYY-MM-DD)
// @param {number} days 기준 날짜로부터 확인할 최대 일수
// @returns {Object[]} 조건에 맞는 구독 목록
function filterSubscriptionsByNextPayment(subscriptions, today, days) {
  // filter는 조건식이 true인 구독만 새 배열에 남긴다.
  return subscriptions.filter(subscription => {
    const daysUntilNextPayment = calculateDaysUntilNextPayment(today, subscription.nextPaymentDate);
    return daysUntilNextPayment >= 0 && daysUntilNextPayment <= days;
  });
}

// 카테고리별로 묶어 { 카테고리: 월합계 } 형태로 반환한다.
// 예: { "영상": 13500, "음악": 10900 }
// 구독을 카테고리별로 묶고, 각 카테고리의 월 기준 합계를 계산한다.
// reduce가 만드는 결과 객체는 { 카테고리명: 월 합계 } 형태가 된다.
// @param {Object[]} subscriptions 구독 목록
// @returns {Object} 카테고리별 월 합계
function groupSubscriptionsByCategory(subscriptions) {
  // reduce의 result는 카테고리별 합계를 담아갈 빈 객체에서 시작한다.
  return subscriptions.reduce((result, subscription) => {
    const monthlyAmount = convertToMonthlyAmount(subscription);
    if (result[subscription.category]) {
      result[subscription.category] += monthlyAmount;
    } else {
      result[subscription.category] = monthlyAmount;
    }
    return result;
  }, {});
}

// 카드별로 묶어 { 카드: 월합계 } 형태로 반환한다.
// 예: { "신한카드": 13500, "KB카드": 10900 }
// 구독을 결제 수단별로 묶고, 각 결제 수단의 월 기준 합계를 계산한다.
// 현재 화면에서는 사용하지 않지만 다른 통계 화면에서 재사용할 수 있다.
// @param {Object[]} subscriptions 구독 목록
// @returns {Object} 결제 수단별 월 합계
function groupSubscriptionsByPaymentMethod(subscriptions) {
  // 결제 수단을 객체의 키로 사용하여 같은 수단의 금액을 누적한다.
  return subscriptions.reduce((result, subscription) => {
    const monthlyAmount = convertToMonthlyAmount(subscription);
    if (result[subscription.paymentMethod]) {
      result[subscription.paymentMethod] += monthlyAmount;
    } else {
      result[subscription.paymentMethod] = monthlyAmount;
    }
    return result;
  }, {});
}