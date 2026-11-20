(() => {
  const snapshot = window.SAMPLE_SNAPSHOT;

  if (!snapshot || !snapshot.sites) return;

  const updateProductionCard = (siteName, prefix, activityLabel, siteLabel) => {
    const site = snapshot.sites[siteName];
    const quantity = document.getElementById(`${prefix}-quantity`);
    const progressText = document.getElementById(`${prefix}-progress-text`);
    const progress = document.getElementById(`${prefix}-progress`);
    const exceeded = document.getElementById(`${prefix}-exceeded`);

    if (!site || !quantity || !progressText || !progress || !exceeded) return;

    const [completedText, targetText] = quantity.children;
    if (!completedText || !targetText) return;

    const isQuantity = (value) => (
      Number.isSafeInteger(value) && value >= 0
    );
    const formatQuantity = (value) => (
      isQuantity(value) ? value.toLocaleString("ko-KR") : "확인 불가"
    );

    completedText.textContent = isQuantity(site.completed)
      ? `${activityLabel} ${formatQuantity(site.completed)}개`
      : `${activityLabel} 확인 불가`;
    targetText.textContent = `· 목표 ${formatQuantity(site.target)}개`;

    if (!isQuantity(site.completed) || !isQuantity(site.target) || site.target === 0) {
      progressText.textContent = "계획 대비 목표를 확인해 주세요";
      progress.hidden = true;
      exceeded.hidden = true;
      return;
    }

    const attainment = (site.completed / site.target) * 100;
    if (!Number.isFinite(attainment)) {
      progressText.textContent = "계획 대비 목표를 확인해 주세요";
      progress.hidden = true;
      exceeded.hidden = true;
      return;
    }

    progressText.textContent = `계획 대비 ${attainment.toFixed(1)}%`;
    progress.value = Math.min(attainment, 100);
    progress.setAttribute(
      "aria-label",
      `${siteLabel} 목표 달성률 ${attainment.toFixed(1)}%`,
    );
    progress.hidden = false;
    exceeded.hidden = site.completed <= site.target;
  };

  const formatGraphHour = (timestamp) => {
    if (typeof timestamp !== "string" || Number.isNaN(Date.parse(timestamp))) {
      return null;
    }

    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date(timestamp)).replace("시", "") + "시";
  };

  const renderGraph = (siteName, prefix, siteLabel) => {
    const graph = document.getElementById(`${prefix}-graph`);
    const site = snapshot.sites[siteName];
    if (!graph) return;

    const loading = graph.querySelector(".loading-graph");
    const empty = graph.querySelector("p[hidden]");
    const graphScroll = graph.querySelector(".graph-scroll");
    const description = graph.querySelector("p[hidden]:last-of-type");

    if (!loading || !empty || !graphScroll || !description) return;

    const history = site?.history;
    const entries = Array.isArray(history) ? history : [];
    const validEntries = entries.filter((entry) => (
      entry
      && formatGraphHour(entry.timestamp) !== null
      && Number.isSafeInteger(entry.quantity)
      && entry.quantity >= 0
    ));

    if (validEntries.length === 0) {
      loading.hidden = true;
      graphScroll.replaceChildren();
      graphScroll.hidden = true;
      empty.hidden = false;
      description.hidden = true;
      return;
    }

    const maximum = Math.max(...validEntries.map((entry) => entry.quantity), 1);
    const rows = document.createElement("div");
    rows.className = "graph-bars";
    rows.setAttribute("role", "list");
    rows.setAttribute("aria-label", `${siteLabel} 시간별 완료 수량`);

    for (const entry of validEntries) {
      const hour = formatGraphHour(entry.timestamp);
      const row = document.createElement("div");
      row.className = "graph-bar-item";
      row.setAttribute("role", "listitem");

      const barArea = document.createElement("div");
      barArea.className = "graph-bar-area";

      const value = document.createElement("span");
      value.className = "graph-bar-value";
      value.textContent = entry.quantity.toLocaleString("ko-KR");

      const bar = document.createElement("span");
      bar.className = "graph-bar";
      bar.style.height = `${(entry.quantity / maximum) * 100}%`;

      const label = document.createElement("span");
      label.className = "graph-bar-hour";
      label.textContent = hour;

      barArea.append(value, bar);
      row.append(barArea, label);
      rows.append(row);
    }

    graphScroll.replaceChildren(rows);
    graphScroll.hidden = false;
    loading.hidden = true;
    empty.hidden = true;
    description.hidden = false;
  };

  const formatStatusTime = (timestamp) => {
    if (typeof timestamp !== "string" || Number.isNaN(Date.parse(timestamp))) {
      return "기록 없음";
    }

    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).format(new Date(timestamp));
  };

  const formatMinutesAgo = (eventAt, viewTime) => {
    if (
      typeof eventAt !== "string"
      || typeof viewTime !== "string"
      || Number.isNaN(Date.parse(eventAt))
      || Number.isNaN(Date.parse(viewTime))
      || Date.parse(eventAt) > Date.parse(viewTime)
    ) {
      return "시각 확인 필요";
    }

    return `${Math.floor((Date.parse(viewTime) - Date.parse(eventAt)) / 60_000)}분 전`;
  };

  const getSiteStatus = (site) => {
    const status = site?.status;
    const processingState = site?.processingState;
    const validEventTime = (
      typeof site?.lastEventAt === "string"
      && !Number.isNaN(Date.parse(site.lastEventAt))
      && typeof snapshot.viewTime === "string"
      && !Number.isNaN(Date.parse(snapshot.viewTime))
      && Date.parse(site.lastEventAt) <= Date.parse(snapshot.viewTime)
    );
    const isLate = validEventTime
      && Date.parse(snapshot.viewTime) - Date.parse(site.lastEventAt) > 30 * 60_000;

    if (status === "warning" || isLate || processingState === "paused") {
      return { badge: "지연 확인", className: "warning" };
    }
    if (status === "normal" && processingState === "completed" && validEventTime) {
      return { badge: "정상", className: "good" };
    }
    return { badge: "확인 필요", className: "neutral" };
  };

  const updateSiteStatusCard = (siteName, elementId, descriptionText) => {
    const site = snapshot.sites?.[siteName];
    const card = document.getElementById(elementId);
    if (!site || !card) return;

    const badge = card.querySelector(".badge");
    const description = card.querySelector("p:not(.meta)");
    const meta = card.querySelector(".meta");
    if (!badge || !description || !meta) return;

    const state = getSiteStatus(site);
    badge.textContent = state.badge;
    badge.className = `badge ${state.className}`;
    description.textContent = typeof site.note === "string" && site.note
      ? site.note
      : descriptionText;
    meta.textContent = `기준 시각 대비: ${formatMinutesAgo(site.lastEventAt, snapshot.viewTime)} · 발생 시각: ${formatStatusTime(site.lastEventAt)}`;
  };

  const updateAlertsStatusCard = () => {
    const card = document.getElementById("alerts-status");
    const alerts = snapshot.services?.alerts;
    if (!card || !alerts) return;

    const badge = card.querySelector(".badge");
    const description = card.querySelector("p:not(.meta)");
    const meta = card.querySelector(".meta");
    if (!badge || !description || !meta) return;

    const states = {
      sent: { badge: "전송 성공", className: "good", description: "알림 전송이 완료됐습니다." },
      failed: { badge: "전송 실패", className: "danger", description: "담당자에게 알림을 전달하지 못했습니다." },
    };
    const state = states[alerts.status];

    if (!state) {
      badge.textContent = "확인 필요";
      badge.className = "badge neutral";
      description.textContent = "전송 기록을 확인할 수 없습니다.";
    } else {
      badge.textContent = state.badge;
      badge.className = `badge ${state.className}`;
      description.textContent = alerts.status === "sent"
        && typeof alerts.note === "string"
        && alerts.note
        ? alerts.note
        : state.description;
    }

    meta.textContent = `마지막 전송 시도: ${formatStatusTime(alerts.lastAttemptAt)}`;
  };

  updateProductionCard("factory", "factory", "생산", "텀블공장");
  updateProductionCard("warehouse", "warehouse", "출고", "물류창고");
  renderGraph("factory", "factory", "텀블공장");
  renderGraph("warehouse", "warehouse", "물류창고");
  updateSiteStatusCard("factory", "factory-status", "생산 기록 상태를 확인할 수 없습니다.");
  updateSiteStatusCard("warehouse", "warehouse-status", "출고 기록 상태를 확인할 수 없습니다.");
  updateAlertsStatusCard();
})();