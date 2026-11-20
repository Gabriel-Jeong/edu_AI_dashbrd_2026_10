(() => {
  const snapshot = window.SAMPLE_SNAPSHOT;

  if (!snapshot || !snapshot.sites) return;

  const updateQuantity = (siteName, prefix, activityLabel) => {
    const site = snapshot.sites[siteName];
    const quantity = document.getElementById(`${prefix}-quantity`);

    if (!site || !quantity) return;

    const [completedText, targetText] = quantity.children;
    if (!completedText || !targetText) return;

    const formatQuantity = (value) => (
      Number.isSafeInteger(value) && value >= 0
        ? value.toLocaleString("ko-KR")
        : "확인 불가"
    );

    completedText.textContent = `${activityLabel} ${formatQuantity(site.completed)}개`;
    targetText.textContent = `· 목표 ${formatQuantity(site.target)}개`;
  };

  updateQuantity("factory", "factory", "생산");
  updateQuantity("warehouse", "warehouse", "출고");
})();