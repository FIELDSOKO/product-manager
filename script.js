const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzN6ULmcDYUWLTmft67k_Wrra1WazV_aHroJPE63kQnFyLo9LW4_8Rb43qo9hxyTn9krw/exec";
const APP_VERSION = window.__APP_VERSION || "2026.07.02.13";

let selectedItem = null;
let codeReader = null;
let scannerRunning = false;
let scannerLocked = false;
let lastScanJan = "";
let sameScanCount = 0;
let scannerVideoReady = false;
let scannerReadyAt = 0;
let decodeStartAt = 0;
let lastScanPointInfo = null;
let scannerGuideCandidateTimer_ = null;
let saveSuccessAnimationTimer_ = null;
let buttonPressFeedbackInitialized_ = false;
const SCAN_START_SUSPICIOUS_MS = 450;
const SUSPICIOUS_CONFIRM_COUNT = 3;
const GUIDE_ROI_X_MARGIN_RATIO = 0.12;
const GUIDE_ROI_Y_MARGIN_RATIO = 0.34;
const GUIDE_ROI_SOFT_MARGIN_RATIO = 0.08;
const AUX_GUIDE_WIDTH_VW_RATIO = 0.90;
const AUX_GUIDE_WIDTH_EDGE_PX = 20;
const AUX_GUIDE_HEIGHT_VH_RATIO = 0.28;
const AUX_GUIDE_HEIGHT_MAX_PX = 220;
const AUX_GUIDE_HEIGHT_MIN_PX = 96;
const CAMERA_IDEAL_WIDTH_PRIMARY = 1920;
const CAMERA_IDEAL_HEIGHT_PRIMARY = 1080;
const CAMERA_IDEAL_WIDTH_FALLBACK = 1280;
const CAMERA_IDEAL_HEIGHT_FALLBACK = 720;
const CAMERA_IDEAL_FPS_PRIMARY = 60;
const CAMERA_IDEAL_FPS_FALLBACK = 30;
const AUX_SCAN_START_DELAY_MS = 600;
const AUX_SCAN_INTERVAL_MS = 400;

let auxiliaryCodeReader = null;
let auxiliaryScanTimer = null;
let auxiliaryScanBusy = false;
let auxiliaryScanLastAt = 0;
let auxiliaryScanPatternIndex = 0;
let auxiliaryScanStopped = true;
let auxiliaryScanSessionId = 0;
let auxiliaryScanCanvas = null;

let currentStream = null;
let currentVideoTrack = null;
let currentZoom = 1;
let minZoom = 1;
let maxZoom = 1;
let pinchStartDistance = 0;
let pinchStartZoom = 1;

let currentSearchPayload = null;
let currentOffset = 0;
const SEARCH_LIMIT = 20;
let resultListReturnAvailable = false;
let resultListReturnScrollY = 0;
let activeSection = "menu";
let scannerMode = "search";
let selectedInventoryItem = null;
let selectedMapLocation = "";
let currentMapFloor = "1F";
let currentMapState = {};
let currentMapMemoLocations = {};
let mapLocationMemoRequestSeq_ = 0;
let selectedMapLocationPendingState_ = "";
let mapScaleValue = 1;
let mapMinScaleValue = 0.6;
let mapPinchStartDistance = 0;
let mapPinchStartScale = 1;
let mapPinchCenterClientX = 0;
let mapPinchCenterClientY = 0;
let mapPinchStartScrollLeft = 0;
let mapPinchStartScrollTop = 0;
let mapPinchCenterMapX = 0;
let mapPinchCenterMapY = 0;
let currentMapData = null;
let currentInventoryMarkedListActive = false;
let currentInventoryMarkedListLocation = "";
let currentInventoryMarkedListTitle = "";
let currentInventoryBackButtonLabel = "記入済商品一覧へ戻る";
const INVENTORY_MAP_VIEW_PADDING_PX = 0;
const INVENTORY_MAP_CACHE_SCHEMA_VERSION = 11;
let currentInventoryMapLayoutSignature_ = "";
let currentInventoryMapOriginalLayoutMetrics_ = null;
let inventoryMapStateRefreshTimer_ = null;
let inventoryMapStateRefreshBusy_ = false;
let inventoryMapStateRefreshFloor_ = "";
let inventoryMapLayoutRenderSeq_ = 0;
let inventoryMapPendingLayoutFrame_ = 0;
let inventoryMapFitMode_ = false;
let inventoryMapBackgroundPrepareScheduled_ = false;
let inventoryMapBackgroundPrepareWaiting_ = false;
const inventoryMapBackgroundPreparePromises_ = {};
let commonActionConfirmCallback_ = null;
let inventorySearchListReturnAvailable_ = false;
let inventorySearchListReturnScrollY_ = 0;
let selectedInventorySearchListItemRef_ = null;
let selectedInventorySearchListStatusEl_ = null;
let selectedInventorySearchListElement_ = null;
let selectedInventorySearchListPlaceholder_ = null;
let selectedInventorySearchListRemoved_ = false;
let inventorySearchPayload_ = null;
let inventorySearchOffset_ = 0;
let inventorySearchOffsetAdjustment_ = 0;
let inventorySearchVisibleCount_ = 0;
let inventorySearchHasMore_ = false;
let inventorySearchTotal_ = 0;
const INVENTORY_SEARCH_LIMIT_ = 20;
const inventoryMapRequestPromises_ = {};
let inventoryMapOpenRequestSeq_ = 0;
let stockCheckSearchPayload_ = null;
let stockCheckSearchOffset_ = 0;
let stockCheckSearchHasMore_ = false;
let stockCheckSearchTotal_ = 0;
let stockCheckSelectedItem_ = null;
let stockCheckListScrollY_ = 0;
let stockCheckReturnSource_ = "stockList";
const STOCK_CHECK_SEARCH_LIMIT_ = 20;
let stockCheckHistorySearchPayload_ = null;
let stockCheckHistoryOffset_ = 0;
let stockCheckHistoryHasMore_ = false;
let stockCheckHistoryTotal_ = 0;
let stockCheckHistoryListScrollY_ = 0;
let stockCheckHistorySelectedItem_ = null;
const STOCK_CHECK_HISTORY_LIMIT_ = 20;


function initApp_() {
  setupButtonPressFeedback_();
  setAppVersion();
  if (window.__APP_LOADING && window.__APP_LOADING.startMasterTimeout) {
    window.__APP_LOADING.startMasterTimeout();
  }
  loadMasterUpdatedAt();
}

if (document.readyState === "complete") {
  initApp_();
} else {
  window.addEventListener("load", initApp_);
}


function setupButtonPressFeedback_() {
  if (buttonPressFeedbackInitialized_) return;
  buttonPressFeedbackInitialized_ = true;

  const targetSelector = [
    "button.primary",
    "button.success",
    "#backToResultListBtn",
    "#topFromProductBtn",
    "#topFromResultListBtn",
    "#bottomFromResultListBtn",
    "#inventoryBackToSearchListBtn",
    "#inventoryBackToSearchInitialBtn",
    "#inventoryBackToEntryBtn",
    "#inventoryBackToEntryBottomBtn",
    "#stockCheckBackToSearchInitialBtn",
    "#stockCheckListCard > button.secondary"
  ].join(",");

  let activeButton = null;

  function getTargetButton_(eventTarget) {
    if (!eventTarget || typeof eventTarget.closest !== "function") return null;
    return eventTarget.closest(targetSelector);
  }

  function beginPress_(event) {
    const button = getTargetButton_(event.target);
    if (!button) return;

    if (activeButton && activeButton !== button) {
      activeButton.classList.remove("buttonPressActive");
    }

    activeButton = button;
    button.classList.add("buttonPressActive");
  }

  function endPress_() {
    const button = activeButton;
    activeButton = null;
    if (!button) return;

    setTimeout(function() {
      button.classList.remove("buttonPressActive");
    }, 120);
  }

  if (window.PointerEvent) {
    document.addEventListener("pointerdown", beginPress_, true);
    window.addEventListener("pointerup", endPress_, true);
    window.addEventListener("pointercancel", endPress_, true);
  } else {
    document.addEventListener("touchstart", beginPress_, true);
    window.addEventListener("touchend", endPress_, true);
    window.addEventListener("touchcancel", endPress_, true);
    document.addEventListener("mousedown", beginPress_, true);
    window.addEventListener("mouseup", endPress_, true);
  }
}

function showMainSection(section) {
  const nextSection = section || "menu";
  const previousSection = activeSection;
  const wasMap = activeSection === "map";

  if (wasMap && nextSection !== "map") {
    stopInventoryMapAutoRefresh_();
  }

  if (nextSection === "menu") {
    if (previousSection === "search") {
      clearAll();
    } else if (previousSection === "inventory") {
      [
        "invTextInput",
        "invJanInput",
        "invHinbanInput",
        "invNameInput",
        "invColorInput",
        "invSizeInput",
        "invLocationInput"
      ].forEach(function(id) {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });
      const invStatusInput = document.getElementById("invStatusInput");
      if (invStatusInput) invStatusInput.value = "all";
      inventoryClearDisplayOnly_();
    } else if (previousSection === "stockCheck") {
      stockCheckSelectedItem_ = null;
      stockCheckListScrollY_ = 0;
      stockCheckReturnSource_ = "stockList";
      clearStockCheckInputValues_();
      hideStockCheckProductMessage_();
      stockCheckClearSearch();
      stockCheckHistoryClearSearch();
      stockCheckHistoryListScrollY_ = 0;
      stockCheckHistorySelectedItem_ = null;
      hideStockCheckHistoryDetailMessage_();
      hideStockCheckHistoryEditMessage_();
      stockCheckShowModeMenu_();
    }

    closeCommonActionConfirm_();

    const confirmModal = document.getElementById("confirmModal");
    if (confirmModal) confirmModal.classList.remove("show");

    const completeModal = document.getElementById("completeModal");
    if (completeModal) completeModal.classList.remove("show");
  }

  activeSection = nextSection;

  const menu = document.getElementById("mainMenu");
  const search = document.getElementById("searchView");
  const inv = document.getElementById("inventoryView");
  const map = document.getElementById("mapView");
  const stockCheck = document.getElementById("stockCheckView");

  if (menu) menu.classList.toggle("hidden", activeSection !== "menu");
  if (search) search.classList.toggle("hidden", activeSection !== "search");
  if (inv) inv.classList.toggle("hidden", activeSection !== "inventory");
  if (map) map.classList.toggle("hidden", activeSection !== "map");
  if (stockCheck) stockCheck.classList.toggle("hidden", activeSection !== "stockCheck");
  if (document.body) document.body.classList.toggle("map-active", activeSection === "map");

  if (activeSection === "search") {
    scannerMode = "search";
  }

  if (activeSection === "map") {
    stopInventoryMapAutoRefresh_();
    loadInventoryMapHandled_(currentMapFloor || "1F");
  }

  if (activeSection === "menu") {
    resumeInventoryMapBackgroundPrepare_();
  }
}

function backToAppHome_() {
  // どの内部画面から実行されても、アプリ起動直後のホーム画面へ確実に戻す。
  try {
    const stopResult = stopScanner();
    if (stopResult && typeof stopResult.catch === "function") stopResult.catch(function() {});
  } catch (e) {}
  try { closeScannerView_(); } catch (e) {}
  scannerMode = "search";

  try { clearAll(); } catch (e) {}
  try { inventoryBackToSearchInitial_(); } catch (e) {}

  try {
    stockCheckSelectedItem_ = null;
    stockCheckListScrollY_ = 0;
    stockCheckReturnSource_ = "stockList";
    clearStockCheckInputValues_();
    hideStockCheckProductMessage_();
    stockCheckClearSearch();
    stockCheckHistoryClearSearch();
    stockCheckHistoryListScrollY_ = 0;
    stockCheckHistorySelectedItem_ = null;
    hideStockCheckHistoryDetailMessage_();
    hideStockCheckHistoryEditMessage_();
    stockCheckShowModeMenu_();
  } catch (e) {}

  try {
    showMainSection("menu");
  } catch (e) {
    activeSection = "menu";
    const menu = document.getElementById("mainMenu");
    const search = document.getElementById("searchView");
    const inv = document.getElementById("inventoryView");
    const map = document.getElementById("mapView");
    const stockCheck = document.getElementById("stockCheckView");
    if (menu) menu.classList.remove("hidden");
    if (search) search.classList.add("hidden");
    if (inv) inv.classList.add("hidden");
    if (map) map.classList.add("hidden");
    if (stockCheck) stockCheck.classList.add("hidden");
    if (document.body) document.body.classList.remove("map-active");
  }
  try { window.scrollTo(0, 0); } catch (e) {}

  // 補助初期化や画面切替処理の成否にかかわらず、最終状態を必ずホーム画面に固定する。
  activeSection = "menu";
  try {
    const menu = document.getElementById("mainMenu");
    const search = document.getElementById("searchView");
    const inv = document.getElementById("inventoryView");
    const map = document.getElementById("mapView");
    const stockCheck = document.getElementById("stockCheckView");
    if (menu) menu.classList.remove("hidden");
    if (search) search.classList.add("hidden");
    if (inv) inv.classList.add("hidden");
    if (map) map.classList.add("hidden");
    if (stockCheck) stockCheck.classList.add("hidden");
    if (document.body) document.body.classList.remove("map-active");
  } catch (e) {}
}

function openInventoryMenu() {
  beginSearchLoading_();
  showMainSection("inventory");
  inventoryClearDisplayOnly_();
  setTimeout(endSearchLoading_, 120);
}

function openMapMenu() {
  beginSearchLoading_();
  showMainSection("map");
}

function openCommonActionConfirm_(message, callback) {
  const modal = document.getElementById("commonActionConfirmModal");
  const messageEl = document.getElementById("commonActionConfirmMessage");
  if (!modal || !messageEl || typeof callback !== "function") return;

  commonActionConfirmCallback_ = callback;
  messageEl.textContent = message || "";
  modal.classList.add("show");
  if (document.body) document.body.classList.add("common-action-confirm-open");
}

function closeCommonActionConfirm_() {
  const modal = document.getElementById("commonActionConfirmModal");
  if (modal) modal.classList.remove("show");
  if (document.body) document.body.classList.remove("common-action-confirm-open");
  commonActionConfirmCallback_ = null;
}

function executeCommonActionConfirm_() {
  const callback = commonActionConfirmCallback_;
  const modal = document.getElementById("commonActionConfirmModal");

  commonActionConfirmCallback_ = null;
  if (modal) modal.classList.remove("show");
  if (document.body) document.body.classList.remove("common-action-confirm-open");

  if (typeof callback === "function") {
    callback();
  }
}


function showInventoryMessage(type, text) {
  const el = document.getElementById("inventoryMessage");
  if (!el) return;
  el.className = "msg " + type;
  el.textContent = text || "";
}

function hideInventoryMessage() {
  const el = document.getElementById("inventoryMessage");
  if (!el) return;
  el.className = "msg";
  el.textContent = "";
}

function showMapMessage(type, text) {
  const el = document.getElementById("mapMessage");
  if (!el) return;
  el.className = "msg " + type;
  el.textContent = text || "";
}

function hideMapMessage() {
  const el = document.getElementById("mapMessage");
  if (!el) return;
  el.className = "msg";
  el.textContent = "";
}

function setAppVersion() {
  const el = document.getElementById("appVersion");
  if (el) el.textContent = "Ver." + APP_VERSION;
}

function callGas(action, params) {
  return new Promise(function(resolve, reject) {
    const callbackName = "__gasCallback_" + Date.now() + "_" + Math.floor(Math.random() * 100000);

    const query = new URLSearchParams();
    query.set("action", action);
    query.set("callback", callbackName);

    const timeoutMs = Math.max(30000, Number(params && params.__timeoutMs || 30000));

    Object.keys(params || {}).forEach(function(key) {
      if (key === "__timeoutMs") return;
      if (params[key] !== undefined && params[key] !== null) {
        query.set(key, String(params[key]));
      }
    });

    const script = document.createElement("script");
    script.src = GAS_API_URL + "?" + query.toString();
    script.async = true;

    const timer = setTimeout(function() {
      cleanup();
      reject(new Error("通信がタイムアウトしました。"));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
      if (script.parentNode) script.parentNode.removeChild(script);
      try {
        delete window[callbackName];
      } catch (e) {
        window[callbackName] = undefined;
      }
    }

    window[callbackName] = function(data) {
      cleanup();
      resolve(data);
    };

    script.onerror = function() {
      cleanup();
      reject(new Error("Apps Scriptとの通信に失敗しました。"));
    };

    document.body.appendChild(script);
  });
}

function callInventoryMapGasShared_(kind, floor, action, params, retryOnce) {
  const requestFloor = String(floor || "1F").toUpperCase() === "2F" ? "2F" : "1F";
  const key = kind + ":" + requestFloor;
  if (inventoryMapRequestPromises_[key]) return inventoryMapRequestPromises_[key];

  function run(attempt) {
    return callGas(action, params || {}).catch(function(err) {
      if (retryOnce !== false && attempt < 1) return run(attempt + 1);
      throw err;
    });
  }

  inventoryMapRequestPromises_[key] = run(0).then(function(res) {
    return res;
  }).finally(function() {
    delete inventoryMapRequestPromises_[key];
  });

  return inventoryMapRequestPromises_[key];
}

function loadMasterUpdatedAt() {
  callGas("updatedAt", {})
    .then(function(res) {
      const value = res && res.value ? res.value : "";
      document.getElementById("updatedAt").textContent =
        "商品マスタ更新日時：" + (value || "未取得");
      setLoading(false);
      notifyBootMasterUpdatedAtDone_();
    })
    .catch(function() {
      document.getElementById("updatedAt").textContent =
        "商品マスタ更新日時：取得失敗";
      setLoading(false);
      notifyBootMasterUpdatedAtDone_();
    });
}

function notifyBootMasterUpdatedAtDone_() {
  if (window.__APP_LOADING && window.__APP_LOADING.finishMaster) {
    window.__APP_LOADING.finishMaster();
  }
  scheduleInventoryMapBackgroundPrepare_();
}


function setSearchLoadingVisible_(v) {
  const el = document.getElementById("searchLoadingScreen");
  if (!el) return;
  el.classList.toggle("show", !!v);
  el.setAttribute("aria-hidden", v ? "false" : "true");
}

function beginSearchLoading_() {
  document.body.classList.add("search-loading-context");
  setLoading(true);
}

function endSearchLoading_() {
  setLoading(false);
  document.body.classList.remove("search-loading-context");
  setSearchLoadingVisible_(false);
}

function setLoading(v) {
  const app = document.getElementById("app");
  if (app) app.classList.toggle("loading", v);

  if (document.body && document.body.classList.contains("search-loading-context")) {
    setSearchLoadingVisible_(v);
  } else if (!v) {
    setSearchLoadingVisible_(false);
  }
}

function setScannerGuideState_(state) {
  const guide = document.querySelector(".scannerGuide");
  if (!guide) return;

  if (scannerGuideCandidateTimer_) {
    clearTimeout(scannerGuideCandidateTimer_);
    scannerGuideCandidateTimer_ = null;
  }

  guide.classList.remove("jan-candidate", "jan-success");

  if (state === "candidate") {
    guide.classList.add("jan-candidate");
    scannerGuideCandidateTimer_ = setTimeout(function() {
      guide.classList.remove("jan-candidate");
      scannerGuideCandidateTimer_ = null;
    }, 180);
  } else if (state === "success") {
    guide.classList.add("jan-success");
  }
}

function showSaveSuccessAnimation_() {
  const el = document.getElementById("saveSuccessAnimation");
  if (!el) return;

  if (saveSuccessAnimationTimer_) {
    clearTimeout(saveSuccessAnimationTimer_);
    saveSuccessAnimationTimer_ = null;
  }

  el.classList.remove("show");
  void el.offsetWidth;
  el.classList.add("show");
  el.setAttribute("aria-hidden", "false");

  saveSuccessAnimationTimer_ = setTimeout(function() {
    el.classList.remove("show");
    el.setAttribute("aria-hidden", "true");
    saveSuccessAnimationTimer_ = null;
  }, 760);
}

function showMessage(type, text) {
  const el = document.getElementById("message");
  el.className = "msg " + type;
  el.textContent = text || "";
}

function hideMessage() {
  const el = document.getElementById("message");
  el.className = "msg";
  el.textContent = "";
}

function getPayload() {
  return {
    text: document.getElementById("textInput").value.trim(),
    jan: document.getElementById("janInput").value.trim(),
    hinban: document.getElementById("hinbanInput").value.trim(),
    name: document.getElementById("nameInput").value.trim(),
    color: document.getElementById("colorInput").value.trim(),
    size: document.getElementById("sizeInput").value.trim(),
    location: document.getElementById("locationInput").value.trim()
  };
}

function searchProduct() {
  hideMessage();
  hideProduct();

  currentSearchPayload = getPayload();
  currentOffset = 0;

  runSearchPage(false);
}

function runSearchPage(append) {
  const payload = Object.assign({}, currentSearchPayload || getPayload(), {
    offset: currentOffset,
    limit: SEARCH_LIMIT
  });

  beginSearchLoading_();

  callGas("search", payload)
    .then(function(res) {
      endSearchLoading_();

      if (!res || !res.ok) {
        showMessage("error", res && res.message ? res.message : "検索に失敗しました。");
        if (res && res.items && res.items.length) showMultiResults(res.items, append, res);
        return;
      }

      const items = res.items || [];
      const total = Number(res.total || res.count || items.length || 0);
      const shown = Number(res.nextOffset || (currentOffset + items.length));

      if (!append && items.length === 1 && !res.hasMore && total === 1) {
        selectItem(items[0]);
        showMessage("success", "商品を見つけました。");
        return;
      }

      if (res.hasMore) {
        showMessage("info", total + "件中 " + shown + "件を表示しています。");
      } else {
        showMessage("info", total + "件見つかりました。商品を選んでください。");
      }

      showMultiResults(items, append, res);
      currentOffset = shown;
    })
    .catch(function(err) {
      endSearchLoading_();
      showMessage("error", err && err.message ? err.message : String(err));
    });
}

function loadMoreResults() {
  if (!currentSearchPayload) {
    showMessage("error", "先に検索してください。");
    return;
  }

  runSearchPage(true);
}

function showMultiResults(items, append, res) {
  const card = document.getElementById("multiCard");
  const list = document.getElementById("resultList");

  if (!append) {
    list.innerHTML = "";
  }

  const oldMore = document.getElementById("loadMoreBtnWrap");
  if (oldMore) oldMore.remove();

  (items || []).forEach(function(item) {
    const div = document.createElement("div");
    div.className = "resultItem";
    div.innerHTML =
      "<div><strong>" + escapeHtml(item.hinban) + "</strong> / " + escapeHtml(item.name) + "</div>" +
      "<div class=\"small\">JAN：" + escapeHtml(item.jan) + "</div>" +
      "<div class=\"small\">色：" + escapeHtml(item.color) + " / サイズ：" + escapeHtml(item.size) + "</div>" +
      "<div class=\"small\">現在ロケ：" + escapeHtml(item.location || "未設定") + "</div>";

    div.onclick = function() {
      resultListReturnAvailable = true;
      resultListReturnScrollY = window.scrollY || document.documentElement.scrollTop || 0;
      selectItem(item, true);
      card.classList.add("hidden");
      showMessage("success", "商品を選択しました。");
    };

    list.appendChild(div);
  });

  if (res && res.hasMore) {
    const wrap = document.createElement("div");
    wrap.id = "loadMoreBtnWrap";
    wrap.style.marginTop = "12px";

    const btn = document.createElement("button");
    btn.className = "primary wide";
    btn.textContent = "さらに20件読み込む";
    btn.onclick = loadMoreResults;

    wrap.appendChild(btn);
    list.appendChild(wrap);
  }

  card.classList.remove("hidden");
}

function selectItem(item, fromResultList) {
  selectedItem = item;
  document.getElementById("vHinban").textContent = item.hinban || "";
  document.getElementById("vName").textContent = item.name || "";
  document.getElementById("vJan").textContent = item.jan || "";
  document.getElementById("vColor").textContent = item.color || "";
  document.getElementById("vSize").textContent = item.size || "";
  document.getElementById("vLocation").textContent = item.location || "未設定";
  const backBtn = document.getElementById("backToResultListBtn");
  if (backBtn) backBtn.classList.toggle("hidden", !(fromResultList && resultListReturnAvailable));
  document.getElementById("productCard").classList.remove("hidden");
  document.getElementById("multiCard").classList.add("hidden");
  // document.getElementById("newLocationInput").focus();
}


function backToResultList() {
  if (!resultListReturnAvailable) return;

  document.getElementById("productCard").classList.add("hidden");
  document.getElementById("multiCard").classList.remove("hidden");
  const backBtn = document.getElementById("backToResultListBtn");
  if (backBtn) backBtn.classList.add("hidden");
  selectedItem = null;

}

function backToSearchForm_() {
}

function backToProductSearchInitial_() {
  clearAll();
}

function goTopHome() {
  // 商品検索・ロケ変更ページ内のトップへ戻る。
  // メインメニューへ戻る処理は showMainSection("menu") のボタンだけで行う。
  showMainSection("search");
  clearAll();

  const confirmModal = document.getElementById("confirmModal");
  if (confirmModal) confirmModal.classList.remove("show");

  const completeModal = document.getElementById("completeModal");
  if (completeModal) completeModal.classList.remove("show");

}

function hideProduct() {
  selectedItem = null;
  resultListReturnAvailable = false;
  resultListReturnScrollY = 0;
  document.getElementById("productCard").classList.add("hidden");
  document.getElementById("multiCard").classList.add("hidden");
  const backBtn = document.getElementById("backToResultListBtn");
  if (backBtn) backBtn.classList.add("hidden");
}

function openConfirm() {
  if (!selectedItem) {
    showMessage("error", "先に商品を検索してください。");
    return;
  }

  const newLoc = document.getElementById("newLocationInput").value.trim();

  if (!newLoc) {
    showMessage("error", "新ロケを入力してください。");
    return;
  }

  document.getElementById("mHinban").textContent = selectedItem.hinban || "";
  document.getElementById("mName").textContent = selectedItem.name || "";
  document.getElementById("mColor").textContent = selectedItem.color || "";
  document.getElementById("mSize").textContent = selectedItem.size || "";
  document.getElementById("mOldLocation").textContent = selectedItem.location || "未設定";
  document.getElementById("mNewLocation").textContent = newLoc;

  document.getElementById("confirmModal").classList.add("show");
}

function closeConfirm() {
  document.getElementById("confirmModal").classList.remove("show");
}

function confirmUpdate() {
  if (!selectedItem) return;

  const payload = {
    rowNo: selectedItem.rowNo,
    newLocation: document.getElementById("newLocationInput").value.trim(),
    expectedHinban: selectedItem.hinban,
    expectedJan: selectedItem.jan,
    expectedColor: selectedItem.color,
    expectedSize: selectedItem.size
  };

  closeConfirm();
  setLoading(true);

  callGas("updateLocation", payload)
    .then(function(res) {
      setLoading(false);

      if (!res || !res.ok) {
        showMessage("error", res && res.message ? res.message : "ロケ変更に失敗しました。");
        return;
      }

      document.getElementById("cHinban").textContent = res.item.hinban || "";
      document.getElementById("cName").textContent = res.item.name || "";
      document.getElementById("cColor").textContent = res.item.color || "";
      document.getElementById("cSize").textContent = res.item.size || "";
      document.getElementById("cOldLocation").textContent = res.oldLocation || "未設定";
      document.getElementById("cNewLocation").textContent = res.newLocation || "";

      showSaveSuccessAnimation_();
      document.getElementById("completeModal").classList.add("show");
      loadMasterUpdatedAt();
    })
    .catch(function(err) {
      setLoading(false);
      showMessage("error", err && err.message ? err.message : String(err));
    });
}

function finishComplete() {
  document.getElementById("completeModal").classList.remove("show");
  clearAll();
  showMessage("success", "次の商品をスキャンできます。");
}

function clearAll() {
  selectedItem = null;
  resultListReturnAvailable = false;
  resultListReturnScrollY = 0;
  document.getElementById("textInput").value = "";
  document.getElementById("janInput").value = "";
  document.getElementById("hinbanInput").value = "";
  document.getElementById("nameInput").value = "";
  document.getElementById("colorInput").value = "";
  document.getElementById("sizeInput").value = "";
  document.getElementById("locationInput").value = "";
  document.getElementById("newLocationInput").value = "";
  document.getElementById("productCard").classList.add("hidden");
  document.getElementById("multiCard").classList.add("hidden");
  const backBtn = document.getElementById("backToResultListBtn");
  if (backBtn) backBtn.classList.add("hidden");
  document.getElementById("resultList").innerHTML = "";
  lastScanJan = "";
  sameScanCount = 0;
  scannerVideoReady = false;
  scannerReadyAt = 0;
  decodeStartAt = 0;
  lastScanPointInfo = null;
  currentSearchPayload = null;
  currentOffset = 0;
  hideMessage();
}


async function toggleScanner() {
  if (scannerRunning) {
    await closeScannerManual();
    return;
  }

  if (scannerMode !== "stockCheckHistory") {
    scannerMode = activeSection === "inventory" ? "inventory" : activeSection === "stockCheck" ? "stockCheck" : "search";
  }

  if (typeof ZXing === "undefined") {
    if (scannerMode === "stockCheckHistory") scannerMode = "search";
    showMessage("error", "JAN読取ライブラリを読み込めませんでした。ページを再読み込みしてください。");
    return;
  }

  hideMessage();
  openScannerView_();

  try {
    const video = document.getElementById("readerVideo");
    if (!video) throw new Error("カメラ表示用のvideo要素が見つかりません。");

    video.setAttribute("playsinline", "true");
    video.setAttribute("muted", "true");
    video.muted = true;
    video.autoplay = true;

    if (video.srcObject) {
      try {
        video.srcObject.getTracks().forEach(function(track) { track.stop(); });
      } catch (e) {}
      video.srcObject = null;
    }

    await waitForScannerViewReady_();

    codeReader = createCodeReader_(true);

    scannerRunning = true;
    scannerLocked = false;
    lastScanJan = "";
    sameScanCount = 0;
      scannerVideoReady = false;
  
    setupScannerTouchEvents_();

    const deviceId = await getPreferredVideoDeviceId_();
    startDecodeFromVideoDevice_(deviceId || null, video, true, true);

    try {
      await waitForVideoReady_(video);
    } catch (readyErr) {
      if (!deviceId || !scannerRunning || scannerLocked) throw readyErr;
      await retryScannerWithNullDeviceAfterVideoTimeout_(video, readyErr);
    }

    scannerVideoReady = true;
    scannerReadyAt = Date.now();
    startAuxiliaryScanner_(video);

    currentStream = video.srcObject || null;
    currentVideoTrack = currentStream && currentStream.getVideoTracks ?
      (currentStream.getVideoTracks()[0] || null) : null;
    setupCameraCapabilities_();
    await requestCenterFocus_();
    if (scannerRunning && !scannerLocked && scannerVideoReady && isVideoRenderable_(video)) {
      setScannerVideoVisible_(true);
    }

  } catch (err) {
    await stopScanner();
    closeScannerView_();
    if (scannerMode === "stockCheckHistory") scannerMode = "search";
    showMessage("error", "カメラを起動できませんでした。\n\n原因：" + (err && err.message ? err.message : String(err)));
  }
}

function resetVideoStreamForRetry_(video) {
  try {
    const stream = video && video.srcObject ? video.srcObject : null;
    if (stream && stream.getTracks) {
      stream.getTracks().forEach(function(track) { track.stop(); });
    }
    if (video) video.srcObject = null;
  } catch (e) {}

  currentStream = null;
  currentVideoTrack = null;
  currentZoom = 1;
  minZoom = 1;
  maxZoom = 1;
  pinchStartDistance = 0;
  pinchStartZoom = 1;
  scannerVideoReady = false;
  scannerReadyAt = 0;
  decodeStartAt = 0;
  lastScanPointInfo = null;
  updateZoomButtons_();
}

async function retryScannerWithNullDeviceAfterVideoTimeout_(video, originalErr) {
  try {
    if (codeReader) codeReader.reset();
  } catch (e) {}

  resetVideoStreamForRetry_(video);

  if (!scannerRunning || scannerLocked) throw originalErr;

  codeReader = createCodeReader_(true);
  startDecodeFromVideoDevice_(null, video, true, false);

  try {
    await waitForVideoReady_(video);
  } catch (retryErr) {
    throw retryErr || originalErr;
  }
}

async function getPreferredVideoDeviceId_() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return null;

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videos = devices.filter(function(device) {
      return device.kind === "videoinput";
    });

    if (!videos.length) return null;

    const rear = videos.find(function(device) {
      return /back|rear|environment|外|背面|後面/i.test(device.label || "");
    });

    return (rear || videos[videos.length - 1]).deviceId || null;
  } catch (e) {
    return null;
  }
}

function getCameraConstraints_(deviceId, width, height, fps) {
  const video = {
    facingMode: { ideal: "environment" }
  };

  if (width && height) {
    video.width = { ideal: width };
    video.height = { ideal: height };
  }

  if (fps) {
    video.frameRate = { ideal: fps };
  }

  if (deviceId) {
    video.deviceId = { ideal: deviceId };
  }

  return {
    audio: false,
    video: video
  };
}

function startDecodeWithConstraints_(constraints, video, tryHarder) {
  return new Promise(function(resolve, reject) {
    if (!codeReader || typeof codeReader.decodeFromConstraints !== "function") {
      reject(new Error("decodeFromConstraints is not available."));
      return;
    }

    decodeStartAt = Date.now();

    codeReader.decodeFromConstraints(constraints, video, function(result, err) {
      handleDecodeResult_(result, err, video);
    }).then(resolve).catch(reject);
  });
}

function startDecodeWithBrowserDefault_(deviceId, video, tryHarder, allowNullRetry) {
  if (!codeReader) codeReader = createCodeReader_(tryHarder);
  decodeStartAt = Date.now();

  codeReader.decodeFromVideoDevice(deviceId || null, video, function(result, err) {
    handleDecodeResult_(result, err, video);
  }).catch(function(err) {
    if (!scannerRunning) return;

    if (allowNullRetry && deviceId) {
      try {
        if (codeReader) codeReader.reset();
      } catch (e) {}

      codeReader = createCodeReader_(tryHarder);
      startDecodeWithBrowserDefault_(null, video, tryHarder, false);
      return;
    }

    stopScanner().then(function() {
      closeScannerView_();
      if (scannerMode === "stockCheckHistory") scannerMode = "search";
      showMessage("error", "JAN読取の開始に失敗しました。\n\n原因：" + (err && err.message ? err.message : String(err)));
    });
  });
}

function startStagedCameraDecode_(deviceId, video, tryHarder, allowNullRetry) {
  if (!codeReader) codeReader = createCodeReader_(tryHarder);

  if (typeof codeReader.decodeFromConstraints !== "function") {
    startDecodeWithBrowserDefault_(deviceId, video, tryHarder, allowNullRetry);
    return;
  }

  const primaryConstraints = getCameraConstraints_(
    deviceId,
    CAMERA_IDEAL_WIDTH_PRIMARY,
    CAMERA_IDEAL_HEIGHT_PRIMARY,
    CAMERA_IDEAL_FPS_PRIMARY
  );

  const secondaryConstraints = getCameraConstraints_(
    deviceId,
    CAMERA_IDEAL_WIDTH_FALLBACK,
    CAMERA_IDEAL_HEIGHT_FALLBACK,
    CAMERA_IDEAL_FPS_FALLBACK
  );

  startDecodeWithConstraints_(primaryConstraints, video, tryHarder).catch(function() {
    if (!scannerRunning) return;

    try {
      if (codeReader) codeReader.reset();
    } catch (e) {}

    codeReader = createCodeReader_(tryHarder);

    startDecodeWithConstraints_(secondaryConstraints, video, tryHarder).catch(function() {
      if (!scannerRunning) return;

      try {
        if (codeReader) codeReader.reset();
      } catch (e) {}

      codeReader = createCodeReader_(tryHarder);
      startDecodeWithBrowserDefault_(deviceId, video, tryHarder, allowNullRetry);
    });
  });
}

function createCodeReader_(tryHarder) {
  const hints = new Map();
  hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.EAN_13]);

  if (tryHarder) {
    hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
  }

  return new ZXing.BrowserMultiFormatReader(hints, 50);
}


function createAuxiliaryCodeReader_() {
  const hints = new Map();
  hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.EAN_13]);
  hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
  return new ZXing.BrowserMultiFormatReader(hints);
}

function stopAuxiliaryScanner_() {
  auxiliaryScanSessionId += 1;
  auxiliaryScanStopped = true;

  if (auxiliaryScanTimer) {
    clearTimeout(auxiliaryScanTimer);
    auxiliaryScanTimer = null;
  }

  try {
    if (auxiliaryCodeReader) auxiliaryCodeReader.reset();
  } catch (e) {}

  auxiliaryCodeReader = null;
  auxiliaryScanBusy = false;
  auxiliaryScanLastAt = 0;
  auxiliaryScanPatternIndex = 0;

  if (auxiliaryScanCanvas) {
    auxiliaryScanCanvas.width = 1;
    auxiliaryScanCanvas.height = 1;
  }
  auxiliaryScanCanvas = null;
}

function startAuxiliaryScanner_(video) {
  stopAuxiliaryScanner_();

  if (!video || !isVideoRenderable_(video) || typeof ZXing === "undefined") return;

  const sessionId = auxiliaryScanSessionId;
  auxiliaryScanStopped = false;
  auxiliaryCodeReader = createAuxiliaryCodeReader_();
  auxiliaryScanCanvas = document.createElement("canvas");

  function scheduleNext_(delay) {
    if (auxiliaryScanStopped || sessionId !== auxiliaryScanSessionId) return;
    if (auxiliaryScanTimer) clearTimeout(auxiliaryScanTimer);
    auxiliaryScanTimer = setTimeout(runAuxiliaryScan_, Math.max(0, Number(delay || 0)));
  }

  async function runAuxiliaryScan_() {
    auxiliaryScanTimer = null;

    if (
      auxiliaryScanStopped ||
      sessionId !== auxiliaryScanSessionId ||
      auxiliaryScanBusy ||
      !scannerRunning ||
      scannerLocked ||
      !scannerVideoReady ||
      document.visibilityState === "hidden" ||
      !isVideoRenderable_(video)
    ) {
      if (!auxiliaryScanStopped && sessionId === auxiliaryScanSessionId && scannerRunning && !scannerLocked) {
        scheduleNext_(AUX_SCAN_INTERVAL_MS);
      }
      return;
    }

    const now = Date.now();
    const elapsedFromReady = now - Number(scannerReadyAt || 0);
    if (elapsedFromReady < AUX_SCAN_START_DELAY_MS) {
      scheduleNext_(AUX_SCAN_START_DELAY_MS - elapsedFromReady);
      return;
    }

    const elapsedFromLast = now - auxiliaryScanLastAt;
    if (elapsedFromLast < AUX_SCAN_INTERVAL_MS) {
      scheduleNext_(AUX_SCAN_INTERVAL_MS - elapsedFromLast);
      return;
    }

    auxiliaryScanBusy = true;
    auxiliaryScanLastAt = now;
    const patternIndex = auxiliaryScanPatternIndex;
    auxiliaryScanPatternIndex = (auxiliaryScanPatternIndex + 1) % 5;

    try {
      const frame = buildAuxiliaryScanFrame_(video, patternIndex);
      if (!frame || !auxiliaryCodeReader || typeof auxiliaryCodeReader.decodeFromCanvas !== "function") return;

      const result = await auxiliaryCodeReader.decodeFromCanvas(frame.canvas);
      if (
        result &&
        !auxiliaryScanStopped &&
        sessionId === auxiliaryScanSessionId &&
        scannerRunning &&
        !scannerLocked
      ) {
        scannerLocked = true;
        await onScanSuccess(mapAuxiliaryResultToVideo_(result, frame));
      }
    } catch (e) {
      // NotFoundExceptionを含む補助解析失敗は、通常解析を止めず次の低頻度候補へ進む。
    } finally {
      if (sessionId === auxiliaryScanSessionId) auxiliaryScanBusy = false;
      if (!auxiliaryScanStopped && sessionId === auxiliaryScanSessionId && scannerRunning && !scannerLocked) {
        scheduleNext_(AUX_SCAN_INTERVAL_MS);
      }
    }
  }

  scheduleNext_(AUX_SCAN_START_DELAY_MS);
}

function getGuideCropInVideoCoords_(video) {
  if (!video || !video.videoWidth || !video.videoHeight) return null;

  const videoRect = video.getBoundingClientRect();
  if (!videoRect.width || !videoRect.height) return null;

  const viewportWidth = window.innerWidth || videoRect.width;
  const viewportHeight = window.innerHeight || videoRect.height;
  const guideWidth = Math.min(
    viewportWidth * AUX_GUIDE_WIDTH_VW_RATIO,
    Math.max(1, viewportWidth - AUX_GUIDE_WIDTH_EDGE_PX)
  );
  const guideHeight = Math.max(
    AUX_GUIDE_HEIGHT_MIN_PX,
    Math.min(viewportHeight * AUX_GUIDE_HEIGHT_VH_RATIO, AUX_GUIDE_HEIGHT_MAX_PX)
  );
  const guideLeft = videoRect.left + (videoRect.width - guideWidth) / 2;
  const guideTop = videoRect.top + (videoRect.height - guideHeight) / 2;

  const sourceWidth = Number(video.videoWidth);
  const sourceHeight = Number(video.videoHeight);
  const coverScale = Math.max(videoRect.width / sourceWidth, videoRect.height / sourceHeight);
  if (!isFinite(coverScale) || coverScale <= 0) return null;

  const renderedWidth = sourceWidth * coverScale;
  const renderedHeight = sourceHeight * coverScale;
  const hiddenX = (renderedWidth - videoRect.width) / 2;
  const hiddenY = (renderedHeight - videoRect.height) / 2;

  let sourceX = (guideLeft - videoRect.left + hiddenX) / coverScale;
  let sourceY = (guideTop - videoRect.top + hiddenY) / coverScale;
  let sourceW = guideWidth / coverScale;
  let sourceH = guideHeight / coverScale;

  sourceX = Math.max(0, Math.min(sourceWidth - 1, sourceX));
  sourceY = Math.max(0, Math.min(sourceHeight - 1, sourceY));
  sourceW = Math.max(1, Math.min(sourceWidth - sourceX, sourceW));
  sourceH = Math.max(1, Math.min(sourceHeight - sourceY, sourceH));

  return { x: sourceX, y: sourceY, width: sourceW, height: sourceH };
}

function buildAuxiliaryScanFrame_(video, patternIndex) {
  const crop = getGuideCropInVideoCoords_(video);
  if (!crop || !auxiliaryScanCanvas) return null;

  const shouldUpscale = crop.width < 720;
  const scale = patternIndex === 4 && shouldUpscale ? 1.35 : 1;
  const targetWidth = Math.max(1, Math.round(crop.width * scale));
  const targetHeight = Math.max(1, Math.round(crop.height * scale));
  const canvas = auxiliaryScanCanvas;
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d", { willReadFrequently: patternIndex > 0 && patternIndex < 4 });
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(video, crop.x, crop.y, crop.width, crop.height, 0, 0, targetWidth, targetHeight);

  if (patternIndex > 0 && patternIndex < 4) {
    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    applyAuxiliaryPixelPattern_(imageData.data, patternIndex);
    ctx.putImageData(imageData, 0, 0);
  }

  return { canvas: canvas, crop: crop, scale: scale };
}

function applyAuxiliaryPixelPattern_(data, patternIndex) {
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    if (patternIndex === 1) {
      r = (r - 128) * 1.22 + 128;
      g = (g - 128) * 1.22 + 128;
      b = (b - 128) * 1.22 + 128;
    } else if (patternIndex === 2) {
      r = 255 * Math.pow(r / 255, 0.88);
      g = 255 * Math.pow(g / 255, 0.88);
      b = 255 * Math.pow(b / 255, 0.88);
    } else if (patternIndex === 3) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const enhanced = (gray - 128) * 1.18 + 128;
      r = enhanced;
      g = enhanced;
      b = enhanced;
    }

    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }
}

function mapAuxiliaryResultToVideo_(result, frame) {
  if (!result || !frame || !frame.crop) return result;

  const crop = frame.crop;
  const scale = Number(frame.scale || 1);
  const mappedPoints = [];

  try {
    const points = typeof result.getResultPoints === "function" ? (result.getResultPoints() || []) : [];
    points.forEach(function(point) {
      const x = typeof point.getX === "function" ? Number(point.getX()) : Number(point.x);
      const y = typeof point.getY === "function" ? Number(point.getY()) : Number(point.y);
      if (!isFinite(x) || !isFinite(y)) return;

      const mappedX = crop.x + x / scale;
      const mappedY = crop.y + y / scale;
      mappedPoints.push({
        x: mappedX,
        y: mappedY,
        getX: function() { return mappedX; },
        getY: function() { return mappedY; }
      });
    });
  } catch (e) {}

  return {
    getText: function() {
      return typeof result.getText === "function" ? result.getText() : String(result || "");
    },
    getResultPoints: function() {
      return mappedPoints;
    }
  };
}

function isVideoRenderable_(video) {
  return !!(
    video &&
    video.srcObject &&
    video.readyState >= 1 &&
    video.videoWidth > 0 &&
    video.videoHeight > 0
  );
}

function handleDecodeResult_(result, err, video) {
  if (result && !scannerLocked) {
    scannerLocked = true;
    onScanSuccess(result);
  }
}

function startDecodeFromVideoDevice_(deviceId, video, tryHarder, allowNullRetry) {
  startStagedCameraDecode_(deviceId, video, tryHarder, allowNullRetry);
}

function sleep_(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
}

function waitForScannerViewReady_() {
  return new Promise(function(resolve) {
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        resolve();
      });
    });
  });
}

function waitForVideoReady_(video) {
  return new Promise(function(resolve, reject) {
    const startedAt = Date.now();
    const timeoutMs = 5000;

    function isReady() {
      return isVideoRenderable_(video);
    }

    function finish() {
      cleanup();
      sleep_(20).then(resolve);
    }

    function failIfTimeout() {
      if (Date.now() - startedAt >= timeoutMs) {
        cleanup();
        reject(new Error("カメラ映像の準備がタイムアウトしました。"));
        return true;
      }
      return false;
    }

    function check() {
      if (isReady()) {
        finish();
        return;
      }
      if (failIfTimeout()) return;
      setTimeout(check, 30);
    }

    function cleanup() {
      video.removeEventListener("loadedmetadata", check);
      video.removeEventListener("loadeddata", check);
      video.removeEventListener("canplay", check);
      video.removeEventListener("playing", check);
    }

    video.addEventListener("loadedmetadata", check);
    video.addEventListener("loadeddata", check);
    video.addEventListener("canplay", check);
    video.addEventListener("playing", check);
    check();
  });
}

function setScannerVideoVisible_(visible) {
  const video = document.getElementById("readerVideo");
  if (!video) return;
  video.classList.toggle("camera-video-ready", !!visible);
}

function openScannerView_() {
  const box = document.getElementById("scannerBox");
  setScannerGuideState_("");
  setScannerVideoVisible_(false);
  document.body.classList.add("scanner-open");
  if (box) {
    box.classList.add("show");
    box.setAttribute("aria-hidden", "false");
  }
}

function closeScannerView_() {
  const box = document.getElementById("scannerBox");
  setScannerGuideState_("");
  setScannerVideoVisible_(false);
  document.body.classList.remove("scanner-open");
  if (box) {
    box.classList.remove("show");
    box.setAttribute("aria-hidden", "true");
  }
}

async function closeScannerManual() {
  await stopScanner();
  closeScannerView_();
  scannerMode = "search";
  hideMessage();
}

function setupCameraCapabilities_() {
  minZoom = 1;
  maxZoom = 1;
  currentZoom = 1;
  updateZoomButtons_();

  if (!currentVideoTrack || !currentVideoTrack.getCapabilities) return;

  try {
    const caps = currentVideoTrack.getCapabilities();

    if (caps.zoom) {
      minZoom = Number(caps.zoom.min || 1);
      maxZoom = Number(caps.zoom.max || 1);
      currentZoom = minZoom;
    }

    updateZoomButtons_();
  } catch (e) {}
}

function setZoomLevel(level) {
  applyZoom_(Number(level || 1));
}

function applyZoom_(target) {
  let z = Number(target || 1);

  if (maxZoom > minZoom) {
    z = Math.max(minZoom, Math.min(maxZoom, z));
  } else {
    z = 1;
  }

  currentZoom = z;
  updateZoomButtons_();

  if (!currentVideoTrack || !currentVideoTrack.applyConstraints || maxZoom <= minZoom) return;

  currentVideoTrack.applyConstraints({
    advanced: [{ zoom: z }]
  }).catch(function() {});
}

function updateZoomButtons_() {
  const buttons = [
    { el: document.getElementById("zoom1Btn"), value: 1 },
    { el: document.getElementById("zoom15Btn"), value: 1.5 },
    { el: document.getElementById("zoom2Btn"), value: 2 },
    { el: document.getElementById("zoom3Btn"), value: 3 }
  ].filter(function(x) {
    return !!x.el;
  });

  if (!buttons.length) return;

  let closest = buttons[0];
  buttons.forEach(function(btn) {
    if (Math.abs(currentZoom - btn.value) < Math.abs(currentZoom - closest.value)) {
      closest = btn;
    }
  });

  buttons.forEach(function(btn) {
    btn.el.classList.toggle("active", btn.el === closest.el);
  });
}

function resumeAuxiliaryScannerAfterVisibility_() {
  const video = document.getElementById("readerVideo");
  const stream = video && video.srcObject ? video.srcObject : currentStream;
  const tracks = stream && stream.getVideoTracks ? stream.getVideoTracks() : [];
  const track = tracks && tracks.length ? tracks[0] : null;

  if (
    document.visibilityState === "hidden" ||
    !scannerRunning ||
    scannerLocked ||
    !scannerVideoReady ||
    !video ||
    !isVideoRenderable_(video) ||
    !stream ||
    !track ||
    track.readyState !== "live"
  ) {
    return;
  }

  startAuxiliaryScanner_(video);
}

function setupScannerTouchEvents_() {
  const box = document.getElementById("scannerBox");
  if (!box || box.dataset.touchReady === "1") return;

  box.dataset.touchReady = "1";

  box.addEventListener("click", function(e) {
    if (!scannerRunning) return;
    if (e.target && e.target.closest && e.target.closest("button")) return;
    requestTapFocus_(e.clientX, e.clientY);
  });

  box.addEventListener("touchstart", function(e) {
    if (!scannerRunning) return;
    if (e.touches && e.touches.length === 2) {
      pinchStartDistance = getTouchDistance_(e.touches[0], e.touches[1]);
      pinchStartZoom = currentZoom;
    }
  }, { passive: true });

  box.addEventListener("touchmove", function(e) {
    if (!scannerRunning) return;
    if (e.touches && e.touches.length === 2 && pinchStartDistance > 0) {
      const d = getTouchDistance_(e.touches[0], e.touches[1]);
      applyZoom_(pinchStartZoom * (d / pinchStartDistance));
    }
  }, { passive: true });

  box.addEventListener("touchend", function() {
    pinchStartDistance = 0;
  }, { passive: true });
}



function requestTapFocus_(clientX, clientY) {
  const mark = document.getElementById("focusMark");
  const box = document.getElementById("scannerBox");

  if (mark && box) {
    const rect = box.getBoundingClientRect();
    mark.style.left = (clientX - rect.left) + "px";
    mark.style.top = (clientY - rect.top) + "px";
    mark.style.display = "block";
    setTimeout(function() { mark.style.display = "none"; }, 650);
  }

  if (!currentVideoTrack || !currentVideoTrack.applyConstraints || !box) return;

  try {
    const rect = box.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;

    currentVideoTrack.applyConstraints({
      advanced: [
        { focusMode: "single-shot" },
        { pointsOfInterest: [{ x: x, y: y }] }
      ]
    }).catch(function() {
      currentVideoTrack.applyConstraints({
        advanced: [{ focusMode: "continuous" }]
      }).catch(function() {});
    });
  } catch (e) {}
}

function requestCenterFocus_() {
  if (!currentVideoTrack || !currentVideoTrack.applyConstraints) return Promise.resolve();

  try {
    return currentVideoTrack.applyConstraints({
      advanced: [
        { focusMode: "continuous" },
        { pointsOfInterest: [{ x: 0.5, y: 0.5 }] }
      ]
    }).catch(function() {});
  } catch (e) {
    return Promise.resolve();
  }
}

async function stopScanner() {
  stopAuxiliaryScanner_();
  setScannerVideoVisible_(false);

  try {
    if (codeReader) codeReader.reset();

    if (currentStream) {
      currentStream.getTracks().forEach(function(track) { track.stop(); });
    }

    const video = document.getElementById("readerVideo");
    if (video) video.srcObject = null;
  } catch (e) {}

  currentStream = null;
  currentVideoTrack = null;
  currentZoom = 1;
  minZoom = 1;
  maxZoom = 1;
  pinchStartDistance = 0;
  pinchStartZoom = 1;

  scannerRunning = false;
  scannerLocked = false;
  lastScanJan = "";
  sameScanCount = 0;
  scannerVideoReady = false;
  scannerReadyAt = 0;
  decodeStartAt = 0;
  lastScanPointInfo = null;

  updateZoomButtons_();
  resumeInventoryMapBackgroundPrepare_();
}


function getDecodedText_(scanResult) {
  if (!scanResult) return "";

  try {
    if (typeof scanResult.getText === "function") {
      return String(scanResult.getText() || "");
    }
  } catch (e) {}

  return String(scanResult || "");
}

function getResultPointInfo_(scanResult) {
  try {
    if (!scanResult || typeof scanResult.getResultPoints !== "function") return null;

    const points = scanResult.getResultPoints() || [];
    const validPoints = points.map(function(point) {
      if (!point) return null;

      const x = typeof point.getX === "function" ? Number(point.getX()) : Number(point.x);
      const y = typeof point.getY === "function" ? Number(point.getY()) : Number(point.y);

      if (!isFinite(x) || !isFinite(y)) return null;
      return { x: x, y: y };
    }).filter(function(point) {
      return !!point;
    });

    if (validPoints.length < 2) return null;

    let minX = validPoints[0].x;
    let maxX = validPoints[0].x;
    let minY = validPoints[0].y;
    let maxY = validPoints[0].y;
    let sumX = 0;
    let sumY = 0;

    validPoints.forEach(function(point) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
      sumX += point.x;
      sumY += point.y;
    });

    const width = maxX - minX;
    const height = maxY - minY;
    const diagonal = Math.sqrt(width * width + height * height);

    return {
      count: validPoints.length,
      centerX: sumX / validPoints.length,
      centerY: sumY / validPoints.length,
      width: width,
      height: height,
      diagonal: diagonal
    };
  } catch (e) {
    return null;
  }
}

function isResultPointStable_(prev, current) {
  if (!prev || !current) return true;
  if (current.diagonal <= 0 || prev.diagonal <= 0) return true;

  const dx = current.centerX - prev.centerX;
  const dy = current.centerY - prev.centerY;
  const centerMove = Math.sqrt(dx * dx + dy * dy);
  const baseSize = Math.max(prev.diagonal, current.diagonal, 1);
  const sizeDiff = Math.abs(current.diagonal - prev.diagonal) / baseSize;

  return centerMove <= baseSize * 0.55 && sizeDiff <= 0.65;
}

function isResultPointExtreme_(pointInfo) {
  // resultPointsが取れない端末・状況では、通常読取を止めない。
  if (!pointInfo) return false;
  return pointInfo.diagonal > 0 && pointInfo.diagonal < 18;
}


function getGuideRoiInVideoCoords_() {
  const video = document.getElementById("readerVideo");
  if (!video || !video.videoWidth || !video.videoHeight) return null;

  const videoWidth = Number(video.videoWidth || 0);
  const videoHeight = Number(video.videoHeight || 0);
  if (!videoWidth || !videoHeight) return null;

  return {
    left: videoWidth * GUIDE_ROI_X_MARGIN_RATIO,
    right: videoWidth * (1 - GUIDE_ROI_X_MARGIN_RATIO),
    top: videoHeight * GUIDE_ROI_Y_MARGIN_RATIO,
    bottom: videoHeight * (1 - GUIDE_ROI_Y_MARGIN_RATIO),
    softLeft: videoWidth * Math.max(0, GUIDE_ROI_X_MARGIN_RATIO - GUIDE_ROI_SOFT_MARGIN_RATIO),
    softRight: videoWidth * Math.min(1, 1 - GUIDE_ROI_X_MARGIN_RATIO + GUIDE_ROI_SOFT_MARGIN_RATIO),
    softTop: videoHeight * Math.max(0, GUIDE_ROI_Y_MARGIN_RATIO - GUIDE_ROI_SOFT_MARGIN_RATIO),
    softBottom: videoHeight * Math.min(1, 1 - GUIDE_ROI_Y_MARGIN_RATIO + GUIDE_ROI_SOFT_MARGIN_RATIO)
  };
}

function getPointGuidePriority_(pointInfo) {
  // resultPointsが取れない場合は端末差で読めなくなるのを防ぐため、通常扱いにする。
  if (!pointInfo) return "unknown";

  const roi = getGuideRoiInVideoCoords_();
  if (!roi) return "unknown";

  const cx = Number(pointInfo.centerX);
  const cy = Number(pointInfo.centerY);
  if (!isFinite(cx) || !isFinite(cy)) return "unknown";

  if (cx >= roi.left && cx <= roi.right && cy >= roi.top && cy <= roi.bottom) {
    return "inside";
  }

  if (cx >= roi.softLeft && cx <= roi.softRight && cy >= roi.softTop && cy <= roi.softBottom) {
    return "near";
  }

  return "outside";
}

function isScanStartSuspicious_() {
  const now = Date.now();

  if (scannerReadyAt > 0 && now - scannerReadyAt < SCAN_START_SUSPICIOUS_MS) {
    return true;
  }

  return false;
}

function isSuspiciousScan_(jan, pointInfo, stablePoints, guidePriority) {
  if (isResultPointExtreme_(pointInfo)) return true;
  if (guidePriority === "outside") return true;
  if (isScanStartSuspicious_()) return true;

  // 同じ読取中にJANが急に変わり、かつ位置も安定していない場合だけ怪しい扱いにする。
  if (lastScanJan && jan !== lastScanJan && sameScanCount > 0 && !stablePoints) {
    return true;
  }

  // バーコード位置・サイズが大きく動いた場合だけ追加確認対象。
  if (!stablePoints) return true;

  return false;
}

async function confirmScanJan_(jan) {
  if (!scannerRunning) return;

  scannerLocked = true;

  lastScanJan = "";
  sameScanCount = 0;
  lastScanPointInfo = null;

  await stopScanner();
  closeScannerView_();

  if (scannerMode === "stockCheckHistory") {
    const historyJanInput = document.getElementById("stockHistoryJanInput");
    const historyTextInput = document.getElementById("stockHistoryTextInput");
    if (historyJanInput) historyJanInput.value = jan;
    if (historyTextInput) historyTextInput.value = "";
    stockCheckHistorySearch();
    scannerMode = "search";
    return;
  }

  if (scannerMode === "stockCheck") {
    const stockJanInput = document.getElementById("stockJanInput");
    const stockTextInput = document.getElementById("stockTextInput");
    if (stockJanInput) stockJanInput.value = jan;
    if (stockTextInput) stockTextInput.value = "";
    stockCheckSearch();
    scannerMode = "search";
    return;
  }

  if (scannerMode === "inventory") {
    const invJanInput = document.getElementById("invJanInput");
    const invHinbanInput = document.getElementById("invHinbanInput");
    if (invJanInput) invJanInput.value = jan;
    if (invHinbanInput) invHinbanInput.value = "";
    inventorySearch();
    scannerMode = "search";
    return;
  }

  document.getElementById("janInput").value = jan;
  document.getElementById("textInput").value = "";

  scannerMode = "search";
  searchProduct();
}


function isValidJan13(jan) {
  if (!/^\d{13}$/.test(jan)) return false;

  let sum = 0;

  for (let i = 0; i < 12; i++) {
    const n = Number(jan.charAt(i));
    sum += (i % 2 === 0) ? n : n * 3;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === Number(jan.charAt(12));
}

async function onScanSuccess(scanResult) {
  const text = getDecodedText_(scanResult).trim();
  const jan = text.replace(/[^\d]/g, "");
  const pointInfo = getResultPointInfo_(scanResult);
  const stablePoints = isResultPointStable_(lastScanPointInfo, pointInfo);
  const guidePriority = getPointGuidePriority_(pointInfo);

  if (!isValidJan13(jan)) {
    scannerLocked = false;
    return;
  }

  setScannerGuideState_("candidate");

  const suspicious = isSuspiciousScan_(jan, pointInfo, stablePoints, guidePriority);

  if (jan === lastScanJan) {
    sameScanCount += 1;
  } else {
    lastScanJan = jan;
    sameScanCount = 1;
  }

  lastScanPointInfo = pointInfo;

  const requiredCount = suspicious ? SUSPICIOUS_CONFIRM_COUNT : 2;

  if (sameScanCount >= requiredCount) {
    setScannerGuideState_("success");
    await confirmScanJan_(jan);
    return;
  }

  scannerLocked = false;
}
function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}



function isInventoryLocationText_(value) {
  const v = String(value || "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[‐‑‒–—―ー－−﹣－\-]+/g, "-")
    .toUpperCase()
    .replace(/^([A-Z]+)(\d+)$/, "$1-$2");
  if (v === "ネット") return true;
  return /^[A-Z]{1,3}-\d{1,3}$/.test(v);
}

function startInventoryScanner() {
  scannerMode = "inventory";
  toggleScanner();
}

function inventoryClearSearch() {
  selectedInventoryItem = null;
  const text = document.getElementById("invTextInput");
  const jan = document.getElementById("invJanInput");
  const hinban = document.getElementById("invHinbanInput");
  const name = document.getElementById("invNameInput");
  const color = document.getElementById("invColorInput");
  const size = document.getElementById("invSizeInput");
  const location = document.getElementById("invLocationInput");
  const status = document.getElementById("invStatusInput");
  if (text) text.value = "";
  if (jan) jan.value = "";
  if (hinban) hinban.value = "";
  if (name) name.value = "";
  if (color) color.value = "";
  if (size) size.value = "";
  if (location) location.value = "";
  if (status) status.value = "all";
  currentInventoryMarkedListActive = false;
  currentInventoryMarkedListLocation = "";
  currentInventoryMarkedListTitle = "";
  currentInventoryBackButtonLabel = "記入済商品一覧へ戻る";

  const card = document.getElementById("inventoryProductCard");
  const listCard = document.getElementById("inventoryListCard");
  if (card) card.classList.add("hidden");
  if (listCard) listCard.classList.add("hidden");
  hideInventoryMessage();
}

function inventoryClearDisplayOnly_() {
  selectedInventoryItem = null;
  inventorySearchListReturnAvailable_ = false;
  inventorySearchListReturnScrollY_ = 0;
  selectedInventorySearchListItemRef_ = null;
  selectedInventorySearchListStatusEl_ = null;
  selectedInventorySearchListElement_ = null;
  selectedInventorySearchListPlaceholder_ = null;
  selectedInventorySearchListRemoved_ = false;
  inventorySearchPayload_ = null;
  inventorySearchOffset_ = 0;
  inventorySearchOffsetAdjustment_ = 0;
  inventorySearchVisibleCount_ = 0;
  inventorySearchHasMore_ = false;
  inventorySearchTotal_ = 0;
  currentInventoryMarkedListActive = false;
  currentInventoryMarkedListLocation = "";
  currentInventoryMarkedListTitle = "";
  currentInventoryBackButtonLabel = "記入済商品一覧へ戻る";

  const productCard = document.getElementById("inventoryProductCard");
  const listCard = document.getElementById("inventoryListCard");
  const list = document.getElementById("inventoryList");

  if (productCard) productCard.classList.add("hidden");
  if (listCard) listCard.classList.add("hidden");
  if (list) list.innerHTML = "";

  updateInventoryBackToMarkedListButton_();
  hideInventoryMessage();
}

function inventoryBackToSearchInitial_() {
  inventoryClearSearch();
  inventoryClearDisplayOnly_();
}

function inventoryBackToEntry() {
  selectedInventoryItem = null;

  const productCard = document.getElementById("inventoryProductCard");
  const listCard = document.getElementById("inventoryListCard");
  if (productCard) productCard.classList.add("hidden");
  if (listCard) listCard.classList.remove("hidden");

  updateInventoryBackToMarkedListButton_();

}

function inventorySearch() {
  inventoryClearDisplayOnly_();

  inventorySearchPayload_ = {
    text: (document.getElementById("invTextInput") || {}).value || "",
    jan: (document.getElementById("invJanInput") || {}).value || "",
    hinban: (document.getElementById("invHinbanInput") || {}).value || "",
    name: (document.getElementById("invNameInput") || {}).value || "",
    color: (document.getElementById("invColorInput") || {}).value || "",
    size: (document.getElementById("invSizeInput") || {}).value || "",
    location: (document.getElementById("invLocationInput") || {}).value || "",
    statusFilter: (document.getElementById("invStatusInput") || {}).value || "all"
  };

  if (!String(inventorySearchPayload_.text || "").trim() && !String(inventorySearchPayload_.jan || "").trim() && !String(inventorySearchPayload_.hinban || "").trim() && !String(inventorySearchPayload_.name || "").trim() && !String(inventorySearchPayload_.color || "").trim() && !String(inventorySearchPayload_.size || "").trim() && !String(inventorySearchPayload_.location || "").trim() && String(inventorySearchPayload_.statusFilter || "all") === "all") {
    showInventoryMessage("error", "検索条件を入力してください。");
    inventorySearchPayload_ = null;
    return;
  }

  inventorySearchOffset_ = 0;
  inventorySearchOffsetAdjustment_ = 0;
  inventorySearchVisibleCount_ = 0;
  inventoryRunSearchPage_(false);
}

function inventoryRunSearchPage_(append, restoreScrollY) {
  if (!inventorySearchPayload_) {
    showInventoryMessage("error", "先に検索してください。");
    return;
  }

  const serverOffset = Math.max(0, inventorySearchOffset_ - inventorySearchOffsetAdjustment_);
  const payload = Object.assign({}, inventorySearchPayload_, {
    offset: serverOffset,
    limit: INVENTORY_SEARCH_LIMIT_
  });

  beginSearchLoading_();
  callGas("inventorySearch", payload)
    .then(function(res) {
      endSearchLoading_();
      if (!res || !res.ok) {
        showInventoryMessage("error", res && res.message ? res.message : "商品が見つかりませんでした。");
        return;
      }

      const items = res.items || [];
      inventorySearchTotal_ = Number(res.total || res.count || items.length || 0);
      inventorySearchOffset_ = Number(res.nextOffset || (serverOffset + items.length)) + inventorySearchOffsetAdjustment_;
      inventorySearchVisibleCount_ = append
        ? inventorySearchVisibleCount_ + items.length
        : items.length;
      inventorySearchHasMore_ = !!res.hasMore;

      if (!append && items.length === 1 && !inventorySearchHasMore_ && inventorySearchTotal_ === 1) {
        inventorySelectItem(items[0]);
        showInventoryMessage("success", "商品を見つけました。");
        return;
      }

      inventoryRenderList(items, "検索結果", false, append, res);
      if (inventorySearchHasMore_) {
        showInventoryMessage("info", inventorySearchTotal_ + "件中 " + inventorySearchVisibleCount_ + "件を表示しています。");
      } else {
        showInventoryMessage("info", inventorySearchTotal_ + "件見つかりました。商品を選んでください。");
      }
    })
    .catch(function(err) {
      endSearchLoading_();
      showInventoryMessage("error", err && err.message ? err.message : String(err));
    });
}

function inventoryLoadMoreResults_() {
  if (!inventorySearchPayload_ || !inventorySearchHasMore_) return;
  const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
  inventoryRunSearchPage_(true, scrollY);
}

function updateInventoryBackToMarkedListButton_() {
  const btn = document.getElementById("inventoryBackToMarkedListBtn");
  if (btn) {
    btn.textContent = currentInventoryBackButtonLabel || "一覧へ戻る";
    btn.classList.toggle("hidden", !currentInventoryMarkedListActive);
  }

  const searchBackBtn = document.getElementById("inventoryBackToSearchListBtn");
  if (searchBackBtn) {
    searchBackBtn.classList.toggle(
      "hidden",
      currentInventoryMarkedListActive || !inventorySearchListReturnAvailable_
    );
  }
}

function inventoryBackToMarkedList() {
  if (!currentInventoryMarkedListActive) return;

  const productCard = document.getElementById("inventoryProductCard");
  const listCard = document.getElementById("inventoryListCard");

  if (productCard) productCard.classList.add("hidden");
  if (listCard) listCard.classList.remove("hidden");
  selectedInventoryItem = null;
  updateInventoryBackToMarkedListButton_();
  hideInventoryMessage();
}

function inventoryBackToSearchResults() {
  if (currentInventoryMarkedListActive || !inventorySearchListReturnAvailable_) return;

  const productCard = document.getElementById("inventoryProductCard");
  const listCard = document.getElementById("inventoryListCard");

  if (productCard) productCard.classList.add("hidden");
  if (listCard) listCard.classList.remove("hidden");
  selectedInventoryItem = null;
  updateInventoryBackToMarkedListButton_();
  hideInventoryMessage();

}

function inventorySelectItem(item) {
  selectedInventoryItem = item;
  const pairs = [
    ["invHinban", item.hinban],
    ["invName", item.name],
    ["invJan", item.jan],
    ["invColor", item.color],
    ["invSize", item.size],
    ["invLocation", item.location || "未設定"]
  ];
  pairs.forEach(function(p) {
    const el = document.getElementById(p[0]);
    if (el) el.textContent = p[1] || "";
  });

  const stateLabel = document.getElementById("invStateLabel");
  if (stateLabel) stateLabel.textContent = "状態：" + (item.inventoryStatus === "記入済" ? "記入済" : "未記入");

  const card = document.getElementById("inventoryProductCard");
  if (card) card.classList.remove("hidden");
  updateInventoryBackToMarkedListButton_();
}

function inventoryMarkCurrent() {
  openCommonActionConfirm_("この商品を記入済にしますか？", function() {
    inventorySetCurrentStatus_("記入済");
  });
}

function inventoryUnmarkCurrent() {
  openCommonActionConfirm_("この商品の記入済を解除しますか？", function() {
    inventorySetCurrentStatus_("");
  });
}

function inventorySetCurrentStatus_(status) {
  if (!selectedInventoryItem) {
    showInventoryMessage("error", "先に商品を検索してください。");
    return;
  }

  beginSearchLoading_();
  callGas("inventorySetProductState", {
    rowNo: selectedInventoryItem.rowNo,
    inventoryKey: selectedInventoryItem.inventoryKey || "",
    jan: selectedInventoryItem.jan || "",
    hinban: selectedInventoryItem.hinban || "",
    color: selectedInventoryItem.color || "",
    size: selectedInventoryItem.size || "",
    status: status
  }).then(function(res) {
    endSearchLoading_();
    if (!res || !res.ok) {
      showInventoryMessage("error", res && res.message ? res.message : "保存に失敗しました。");
      return;
    }

    if (res.item) {
      selectedInventoryItem = Object.assign({}, selectedInventoryItem, res.item);
    }
    selectedInventoryItem.inventoryStatus = status === "記入済" ? "記入済" : "";
    let removedFromFilteredSearchList = false;

    if (!currentInventoryMarkedListActive && selectedInventorySearchListItemRef_) {
      if (res.item) {
        Object.assign(selectedInventorySearchListItemRef_, res.item);
      }
      selectedInventorySearchListItemRef_.inventoryStatus =
        status === "記入済" ? "記入済" : "";

      const currentStatusFilter = String(
        inventorySearchPayload_ && inventorySearchPayload_.statusFilter || "all"
      );
      const isMarkedNow = selectedInventorySearchListItemRef_.inventoryStatus === "記入済";
      const shouldRemoveFromSearchList =
        (currentStatusFilter === "unmarked" && isMarkedNow) ||
        (currentStatusFilter === "marked" && !isMarkedNow);

      if (shouldRemoveFromSearchList && selectedInventorySearchListElement_) {
        if (!selectedInventorySearchListRemoved_) {
          selectedInventorySearchListPlaceholder_ = document.createComment(
            "inventory-search-removed-item"
          );
          selectedInventorySearchListElement_.parentNode.insertBefore(
            selectedInventorySearchListPlaceholder_,
            selectedInventorySearchListElement_
          );
          selectedInventorySearchListElement_.remove();
          selectedInventorySearchListRemoved_ = true;

          inventorySearchTotal_ = Math.max(0, inventorySearchTotal_ - 1);
          inventorySearchVisibleCount_ = Math.max(0, inventorySearchVisibleCount_ - 1);
          inventorySearchOffsetAdjustment_ += 1;
        }

        removedFromFilteredSearchList = true;
        inventorySearchHasMore_ =
          Math.max(0, inventorySearchOffset_ - inventorySearchOffsetAdjustment_) < inventorySearchTotal_;

        const moreWrap = document.getElementById("inventoryLoadMoreBtnWrap");
        if (moreWrap && !inventorySearchHasMore_) moreWrap.remove();

        const inventoryList = document.getElementById("inventoryList");
        if (inventoryList && !inventoryList.querySelector(".resultItem")) {
          const empty = document.createElement("div");
          empty.className = "small inventorySearchEmptyPlaceholder";
          empty.textContent = "該当商品はありません。";
          inventoryList.insertBefore(empty, inventoryList.firstChild || null);
        }
      } else {
        if (
          selectedInventorySearchListRemoved_ &&
          selectedInventorySearchListElement_ &&
          selectedInventorySearchListPlaceholder_ &&
          selectedInventorySearchListPlaceholder_.parentNode
        ) {
          selectedInventorySearchListPlaceholder_.parentNode.insertBefore(
            selectedInventorySearchListElement_,
            selectedInventorySearchListPlaceholder_
          );
          selectedInventorySearchListPlaceholder_.remove();
          selectedInventorySearchListPlaceholder_ = null;
          selectedInventorySearchListRemoved_ = false;

          inventorySearchTotal_ += 1;
          inventorySearchVisibleCount_ += 1;
          inventorySearchOffsetAdjustment_ = Math.max(0, inventorySearchOffsetAdjustment_ - 1);

          const empty = document.querySelector(".inventorySearchEmptyPlaceholder");
          if (empty) empty.remove();
        }

        inventorySearchHasMore_ =
          Math.max(0, inventorySearchOffset_ - inventorySearchOffsetAdjustment_) < inventorySearchTotal_;

        if (selectedInventorySearchListStatusEl_) {
          selectedInventorySearchListStatusEl_.textContent =
            selectedInventorySearchListItemRef_.inventoryStatus || "未記入";
        }
      }
    }

    inventorySelectItem(selectedInventoryItem);
    showSaveSuccessAnimation_();

    if (status !== "記入済" && currentInventoryMarkedListActive) {
      inventoryReloadMarkedList_();
      return;
    }

    const successText = status === "記入済" ? "記入済にしました。" : "記入済を解除しました。";
    if (removedFromFilteredSearchList) {
      const countText = inventorySearchHasMore_
        ? inventorySearchTotal_ + "件中 " + inventorySearchVisibleCount_ + "件を表示しています。"
        : inventorySearchTotal_ + "件見つかりました。";
      showInventoryMessage("success", successText + "\n" + countText);
    } else {
      showInventoryMessage("success", successText);
    }
  }).catch(function(err) {
    endSearchLoading_();
    showInventoryMessage("error", err && err.message ? err.message : String(err));
  });
}

function inventoryClearListOpenState_() {
  selectedInventoryItem = null;

  currentInventoryBackButtonLabel = "記入済商品一覧へ戻る";

  const productCard = document.getElementById("inventoryProductCard");
  const listCard = document.getElementById("inventoryListCard");
  const list = document.getElementById("inventoryList");

  if (productCard) productCard.classList.add("hidden");
  if (listCard) listCard.classList.add("hidden");
  if (list) list.innerHTML = "";
  updateInventoryBackToMarkedListButton_();

  hideInventoryMessage();
}

function inventoryShowMarkedAll() {
  inventoryClearListOpenState_();
  currentInventoryMarkedListActive = true;
  currentInventoryMarkedListLocation = "";
  currentInventoryMarkedListTitle = "記入済商品一覧（全ロケ）";
  currentInventoryBackButtonLabel = "記入済商品一覧へ戻る";

  beginSearchLoading_();
  callGas("inventoryListMarkedProducts", { __timeoutMs: 60000 })
    .then(function(res) {
      endSearchLoading_();
      if (!res || !res.ok) {
        showInventoryMessage("error", res && res.message ? res.message : "一覧取得に失敗しました。");
        return;
      }
      inventoryRenderGroupedList(res.groups || [], "記入済商品一覧（全ロケ）");
      showInventoryMessage("info", "記入済商品を表示しました。");
    })
    .catch(function(err) {
      endSearchLoading_();
      showInventoryMessage("error", err && err.message ? err.message : String(err));
    });
}

function inventoryReloadMarkedList_() {
  const location = currentInventoryMarkedListLocation || "";
  beginSearchLoading_();
  callGas("inventoryListMarkedProducts", { location: location, __timeoutMs: 60000 })
    .then(function(res) {
      endSearchLoading_();
      if (!res || !res.ok) {
        showInventoryMessage("error", res && res.message ? res.message : "一覧取得に失敗しました。");
        return;
      }
      const productCard = document.getElementById("inventoryProductCard");
      if (productCard) productCard.classList.add("hidden");
      selectedInventoryItem = null;

      inventoryRenderGroupedList(
        res.groups || [],
        location ? ("記入済商品一覧：" + location) : "記入済商品一覧（全ロケ）"
      );
      showInventoryMessage("success", "記入済を解除しました。");
    })
    .catch(function(err) {
      endSearchLoading_();
      showInventoryMessage("error", err && err.message ? err.message : String(err));
    });
}

function inventoryClearAllMarked() {
  if (!confirm("全商品の記入済を解除しますか？")) return;
  const pin = prompt("PINコードを入力してください。");
  if (pin === null) return;

  beginSearchLoading_();
  callGas("inventoryClearAllProductStates", { pin: pin })
    .then(function(res) {
      endSearchLoading_();
      if (!res || !res.ok) {
        showInventoryMessage("error", res && res.message ? res.message : "解除に失敗しました。");
        return;
      }
      inventoryClearSearch();
      showInventoryMessage("success", "全商品の記入済を解除しました。");
    })
    .catch(function(err) {
      endSearchLoading_();
      showInventoryMessage("error", err && err.message ? err.message : String(err));
    });
}

function inventoryRenderList(items, title, keepReturnState, append, pageInfo) {
  if (!keepReturnState) {
    currentInventoryMarkedListActive = false;
    currentInventoryMarkedListLocation = "";
    currentInventoryMarkedListTitle = "";
    currentInventoryBackButtonLabel = "記入済商品一覧へ戻る";
    inventorySearchListReturnAvailable_ = true;
  }
  const card = document.getElementById("inventoryListCard");
  const titleEl = document.getElementById("inventoryListTitle");
  const list = document.getElementById("inventoryList");
  if (!card || !list) return;

  currentInventoryMarkedListTitle = title || "一覧";
  if (titleEl) titleEl.textContent = currentInventoryMarkedListTitle;
  updateInventoryBackToMarkedListButton_();
  if (!append) list.innerHTML = "";
  const oldMore = document.getElementById("inventoryLoadMoreBtnWrap");
  if (oldMore) oldMore.remove();

  (items || []).forEach(function(item) {
    const div = document.createElement("div");
    div.className = "resultItem";
    div.innerHTML =
      "<div><strong>" + escapeHtml(item.hinban) + "</strong> / " + escapeHtml(item.name) + "</div>" +
      "<div class=\"small\">JAN：" + escapeHtml(item.jan) + "</div>" +
      "<div class=\"small\">色：" + escapeHtml(item.color) + " / サイズ：" + escapeHtml(item.size) + "</div>" +
      "<div class=\"small\">現在ロケ：" + escapeHtml(item.location || "未設定") +
      " / 状態：<span class=\"inventoryListItemStatus\">" +
      escapeHtml(item.inventoryStatus || "未記入") + "</span></div>";
    div.onclick = function() {
      inventorySearchListReturnAvailable_ = !currentInventoryMarkedListActive;
      inventorySearchListReturnScrollY_ = window.scrollY || document.documentElement.scrollTop || 0;
      selectedInventorySearchListItemRef_ = currentInventoryMarkedListActive ? null : item;
      selectedInventorySearchListStatusEl_ = currentInventoryMarkedListActive
        ? null
        : div.querySelector(".inventoryListItemStatus");
      selectedInventorySearchListElement_ = currentInventoryMarkedListActive ? null : div;
      selectedInventorySearchListPlaceholder_ = null;
      selectedInventorySearchListRemoved_ = false;
      inventorySelectItem(item);
      card.classList.add("hidden");
    };
    list.appendChild(div);
  });

  if (!append && !(items || []).length) {
    list.innerHTML = "<div class=\"small\">該当商品はありません。</div>";
  }

  if (pageInfo && pageInfo.hasMore) {
    const wrap = document.createElement("div");
    wrap.id = "inventoryLoadMoreBtnWrap";
    wrap.style.marginTop = "12px";
    const btn = document.createElement("button");
    btn.className = "primary wide";
    btn.textContent = "さらに20件読み込む";
    btn.onclick = inventoryLoadMoreResults_;
    wrap.appendChild(btn);
    list.appendChild(wrap);
  }

  card.classList.remove("hidden");
}

function inventoryRenderGroupedList(groups, title) {
  const card = document.getElementById("inventoryListCard");
  const titleEl = document.getElementById("inventoryListTitle");
  const list = document.getElementById("inventoryList");
  if (!card || !list) return;

  currentInventoryMarkedListTitle = title || "一覧";
  if (titleEl) titleEl.textContent = currentInventoryMarkedListTitle;
  updateInventoryBackToMarkedListButton_();
  list.innerHTML = "";

  (groups || []).forEach(function(group) {
    const h = document.createElement("div");
    h.className = "inventoryGroupTitle";
    h.textContent = "ロケ：" + (group.location || "未設定");
    list.appendChild(h);

    (group.items || []).forEach(function(item) {
      const div = document.createElement("div");
      div.className = "resultItem";
      div.innerHTML =
        "<div><strong>" + escapeHtml(item.hinban) + "</strong> / " + escapeHtml(item.name) + "</div>" +
        "<div class=\"small\">JAN：" + escapeHtml(item.jan) + "</div>" +
        "<div class=\"small\">色：" + escapeHtml(item.color) + " / サイズ：" + escapeHtml(item.size) + "</div>" +
        "<div class=\"small\">タップして詳細表示・記入済解除できます。</div>";
      div.onclick = function() {
        selectedInventorySearchListItemRef_ = null;
        selectedInventorySearchListStatusEl_ = null;
        selectedInventorySearchListElement_ = null;
        selectedInventorySearchListPlaceholder_ = null;
        selectedInventorySearchListRemoved_ = false;
        inventorySelectItem(Object.assign({}, item, { inventoryStatus: "記入済" }));
        card.classList.add("hidden");
        showInventoryMessage("info", "商品詳細を表示しました。必要なら「記入済解除」を押してください。");
      };
      list.appendChild(div);
    });
  });

  if (!(groups || []).length) {
    list.innerHTML = "<div class=\"small\">記入済商品はありません。</div>";
  }

  card.classList.remove("hidden");
}




function getInventoryMapLayoutSignature_(data) {
  data = data || {};

  // レイアウト同一判定では layoutVersion / 更新日時を使わない。
  // 後から追加したキャッシュ更新確認で layoutVersion だけが変わった場合、
  // 実際の行列・セル・書式が同一でも renderInventoryMapGrid_ が再実行され、
  // 表示後約10秒の裏通信完了時にセル幅が崩れる原因になっていた。
  // ここでは実レイアウトを構成する値だけで署名を作る。
  var cells = data.cells || data.ce || [];

  function styleSignature_(style) {
    style = style || {};
    var borders = style.borders || {};
    var borderParts = ["top", "right", "bottom", "left"].map(function(side) {
      var b = borders[side] || {};
      return [
        side,
        b.visible ? "1" : "0",
        b.width || "",
        b.color || "",
        b.style || ""
      ].join(":");
    }).join(";");

    return [
      style.background || "",
      style.fontColor || "",
      style.fontWeight || "",
      style.fontSize || "",
      style.hasBorder ? "1" : "0",
      style.borderColor || "",
      borderParts
    ].join("~");
  }

  var cellParts = cells.map(function(cell) {
    cell = cell || {};
    return [
      cell.row || "",
      cell.col || "",
      cell.rowspan || "",
      cell.colspan || "",
      cell.isLocation ? "1" : "0",
      String(cell.value || ""),
      styleSignature_(cell.style || {})
    ].join("^");
  });

  var compactParts = [
    String(data.floor || currentMapFloor || "1F"),
    String(data.rows || data.r || ""),
    String(data.cols || data.c || ""),
    String((data.rowHeights || data.rh || []).join(",")),
    String((data.colWidths || data.cw || []).join(",")),
    cellParts.join("|")
  ];
  return compactParts.join("||");
}


function isInventoryMapLayoutRenderAllowed_(reason, renderedSignature, nextSignature) {
  reason = String(reason || "");

  // renderInventoryMapGrid_ を許可する理由を明示的に限定する。
  // 許可：初回描画 / 1F・2F切替 / 棚マップ更新日時変更 / キャッシュなし取得。
  const allowedReason =
    reason === "initial" ||
    reason === "floorChanged" ||
    reason === "layoutVersionChanged" ||
    reason === "cacheMissing";

  if (!allowedReason) return false;
  if (!renderedSignature) return true;
  if (renderedSignature !== nextSignature) return true;

  // 同一レイアウトなら、状態だけ更新する。
  return false;
}

function renderInventoryMap(data, layoutRenderReason) {
  const grid = document.getElementById("mapGrid");

  data = normalizeInventoryMapResponse_(data);
  const nextSignature = getInventoryMapLayoutSignature_(data);
  const renderedSignature = grid && grid.dataset ? (grid.dataset.layoutSignature || "") : "";

  currentMapState = (data && data.locationStates) || currentMapState || {};
  currentMapMemoLocations = (data && data.memoLocations) || currentMapMemoLocations || {};
  currentMapData = data;

  // 状態更新・自動更新・更新日時確認ではDOMを作り直さない。
  // 同じレイアウトが描画済みなら、セル状態だけを更新する。
  if (!isInventoryMapLayoutRenderAllowed_(layoutRenderReason, renderedSignature, nextSignature)) {
    currentInventoryMapLayoutSignature_ = nextSignature;
    applyInventoryMapStateOnly_(currentMapState);
    applyInventoryMapMemoMarkers_();
    updateMapZoomLabel_();
    return;
  }

  if (inventoryMapPendingLayoutFrame_) {
    cancelAnimationFrame(inventoryMapPendingLayoutFrame_);
    inventoryMapPendingLayoutFrame_ = 0;
  }

  const renderSeq = ++inventoryMapLayoutRenderSeq_;

  // renderInventoryMapGrid_ を呼ぶ条件：
  // 初回描画 / 1F・2F切替 / 棚マップ更新日時変更 / キャッシュなし取得 のみ。
  renderInventoryMapGrid_(grid, data, false);
  applyInventoryMapMemoMarkers_();
  currentInventoryMapLayoutSignature_ = nextSignature;
  if (grid && grid.dataset) grid.dataset.layoutSignature = nextSignature;

  inventoryMapPendingLayoutFrame_ = requestAnimationFrame(function() {
    inventoryMapPendingLayoutFrame_ = 0;
    if (renderSeq !== inventoryMapLayoutRenderSeq_) return;
    // 初回描画直後だけ全体表示倍率を計算する。resize/focus/状態更新からは呼ばない。
    fitInventoryMapToScreen_();
  });
}









function shouldUsePortraitMapLayout_() {
  // 棚卸しマップはスマホ縦/横・PC・再描画時でも常に現在採用中の90度向きを維持する。
  return true;
}

function getMapStateClass_(state) {
  if (state === "途中") return "mapStateProgress";
  if (state === "完了") return "mapStateDone";
  return "mapStateBlank";
}


function setInventoryMapCellStateClass_(el, state) {
  if (!el) return;
  el.classList.remove("mapStateBlank", "mapStateProgress", "mapStateDone");
  el.classList.add(getMapStateClass_(state || ""));
}

function applyInventoryMapStateOnly_(stateMap) {
  const grid = document.getElementById("mapGrid");
  if (!grid) return false;

  currentMapState = stateMap || {};
  const cells = grid.querySelectorAll(".mapCell[data-map-location-key]");
  if (!cells.length) return false;

  Array.prototype.forEach.call(cells, function(el) {
    const label = el.dataset.mapLocation || "";
    const state = getInventoryMapStateForLocation_(currentMapState, label);
    setInventoryMapCellStateClass_(el, state);
  });

  updateOpenMapActionSheetState_();
  return true;
}

function updateOpenMapActionSheetState_() {
  const back = document.getElementById("mapActionSheet");
  const st = document.getElementById("mapSheetState");
  if (!back || !st || !back.classList.contains("show") || !selectedMapLocation) return;
  const state = getInventoryMapStateForLocation_(currentMapState, selectedMapLocation);
  st.textContent = "現在：" + (state === "途中" ? "🟨途中" : state === "完了" ? "🟩完了" : "⬜空欄");
}

function hasInventoryMapMemoForLocation_(location) {
  const key = normalizeInventoryLocationKey_(location);
  return !!(currentMapMemoLocations && (currentMapMemoLocations[location] || currentMapMemoLocations[key]));
}

function applyInventoryMapMemoMarkers_() {
  const grid = document.getElementById("mapGrid");
  if (!grid) return;
  const cells = grid.querySelectorAll(".mapCell[data-map-location-key]");
  Array.prototype.forEach.call(cells, function(el) {
    const location = el.dataset.mapLocation || "";
    el.classList.toggle("mapCellHasMemo", hasInventoryMapMemoForLocation_(location));
  });
}

function setMapLocationMemoLoading_(loading, message) {
  const input = document.getElementById("mapLocationMemoInput");
  const button = document.getElementById("mapLocationMemoSaveBtn");
  const clearButton = document.getElementById("mapLocationMemoClearBtn");
  const messageEl = document.getElementById("mapLocationMemoMessage");
  if (input) input.disabled = !!loading;
  if (button) button.disabled = !!loading;
  if (clearButton) clearButton.disabled = !!loading;
  if (messageEl) messageEl.textContent = message || "";
}

function loadSelectedMapLocationMemo_() {
  const location = selectedMapLocation;
  const floor = currentMapFloor || "1F";
  const input = document.getElementById("mapLocationMemoInput");
  if (!location || !input) return;

  const requestSeq = ++mapLocationMemoRequestSeq_;
  input.value = "";
  input.dataset.savedMemo = "";
  input.dataset.savedMemoFloor = "";
  input.dataset.savedMemoLocation = "";
  setMapLocationMemoLoading_(true, "メモを読み込み中…");

  callGas("inventoryGetLocationMemo", { floor: floor, location: location })
    .then(function(res) {
      if (requestSeq !== mapLocationMemoRequestSeq_ || selectedMapLocation !== location || currentMapFloor !== floor) return;
      if (!res || !res.ok) {
        setMapLocationMemoLoading_(false, res && res.message ? res.message : "メモを取得できませんでした。");
        return;
      }
      input.value = res.memo || "";
      input.dataset.savedMemo = input.value;
      input.dataset.savedMemoFloor = floor;
      input.dataset.savedMemoLocation = location;
      setMapLocationMemoLoading_(false, "");
    })
    .catch(function(err) {
      if (requestSeq !== mapLocationMemoRequestSeq_ || selectedMapLocation !== location || currentMapFloor !== floor) return;
      setMapLocationMemoLoading_(false, err && err.message ? err.message : String(err));
    });
}

function saveSelectedMapLocationMemo() {
  saveSelectedMapLocationDetail();
}



function getMapStateDisplayText_(state) {
  return state === "完了" ? "完了" : state === "途中" ? "途中" : "クリア";
}

function updateMapPendingStateButtons_() {
  const buttons = [
    { id: "mapStateChoiceProgress", state: "途中" },
    { id: "mapStateChoiceComplete", state: "完了" },
    { id: "mapStateChoiceClear", state: "" }
  ];
  buttons.forEach(function(item) {
    const el = document.getElementById(item.id);
    if (el) el.classList.toggle("isSelected", selectedMapLocationPendingState_ === item.state);
  });
}

function saveSelectedMapLocationDetail() {
  const location = selectedMapLocation;
  const floor = currentMapFloor || "1F";
  const input = document.getElementById("mapLocationMemoInput");
  if (!location || !isInventoryLocationText_(location) || !input) return;

  const status = selectedMapLocationPendingState_ || "";
  const memo = input.value || "";
  const message = "この内容で保存しますか？\n\n状態：" + getMapStateDisplayText_(status) + "\n\nメモ：\n" + (memo || "（空欄）");

  openCommonActionConfirm_(message, function() {
    setMapLocationMemoLoading_(true, "保存中…");
    callGas("inventorySaveLocationDetail", {
      floor: floor,
      location: location,
      status: status,
      memo: memo
    }).then(function(res) {
      if (selectedMapLocation !== location || currentMapFloor !== floor) return;
      if (!res || !res.ok) {
        if (input.dataset.savedMemoFloor === floor && input.dataset.savedMemoLocation === location) {
          input.value = input.dataset.savedMemo || "";
        }
        selectedMapLocationPendingState_ = getInventoryMapStateForLocation_(currentMapState, location) || "";
        updateMapPendingStateButtons_();
        setMapLocationMemoLoading_(false, res && res.message ? res.message : "保存できませんでした。");
        return;
      }

      currentMapState = currentMapState || {};
      const key = normalizeInventoryLocationKey_(location);
      if (status) {
        currentMapState[location] = status;
        currentMapState[key] = status;
      } else {
        delete currentMapState[location];
        delete currentMapState[key];
      }

      currentMapMemoLocations = currentMapMemoLocations || {};
      if (String(memo).trim()) {
        currentMapMemoLocations[location] = true;
        currentMapMemoLocations[key] = true;
      } else {
        delete currentMapMemoLocations[location];
        delete currentMapMemoLocations[key];
      }

      input.dataset.savedMemo = memo;
      input.dataset.savedMemoFloor = floor;
      input.dataset.savedMemoLocation = location;
      applyInventoryMapStateOnly_(currentMapState);
      applyInventoryMapMemoMarkers_();
      closeMapActionSheet();
      showMapMessage("success", "状態とメモを保存しました。");
    }).catch(function(err) {
      if (selectedMapLocation !== location || currentMapFloor !== floor) return;
      if (input.dataset.savedMemoFloor === floor && input.dataset.savedMemoLocation === location) {
        input.value = input.dataset.savedMemo || "";
      }
      selectedMapLocationPendingState_ = getInventoryMapStateForLocation_(currentMapState, location) || "";
      updateMapPendingStateButtons_();
      setMapLocationMemoLoading_(false, err && err.message ? err.message : String(err));
    });
  });
}

function clearSelectedMapLocationMemo() {
  const location = selectedMapLocation;
  const floor = currentMapFloor || "1F";
  const input = document.getElementById("mapLocationMemoInput");
  if (!location || !isInventoryLocationText_(location) || !input) return;

  openCommonActionConfirm_("このロケのメモ入力を空にしますか？\n\n階：" + floor + "\nロケ：" + location, function() {
    input.value = "";
    const messageEl = document.getElementById("mapLocationMemoMessage");
    if (messageEl) messageEl.textContent = "メモ入力を空にしました。保存ボタンを押すまで保存されません。";
  });
}

function openLocationMemoList() {
  const back = document.getElementById("locationMemoListSheet");
  const list = document.getElementById("locationMemoList");
  const message = document.getElementById("locationMemoListMessage");
  if (back) back.classList.add("show");
  if (list) list.innerHTML = "";
  if (message) message.textContent = "読み込み中…";

  callGas("inventoryListLocationMemos", {})
    .then(function(res) {
      if (!res || !res.ok) {
        if (message) message.textContent = res && res.message ? res.message : "メモ一覧を取得できませんでした。";
        return;
      }
      renderLocationMemoList_(res.items || []);
    })
    .catch(function(err) {
      if (message) message.textContent = err && err.message ? err.message : String(err);
    });
}

function closeLocationMemoList() {
  const back = document.getElementById("locationMemoListSheet");
  if (back) back.classList.remove("show");
}

function renderLocationMemoList_(items) {
  const list = document.getElementById("locationMemoList");
  const message = document.getElementById("locationMemoListMessage");
  if (!list) return;
  list.innerHTML = "";
  if (!items.length) {
    if (message) message.textContent = "保存されているメモはありません。";
    return;
  }
  if (message) message.textContent = items.length + "件";
  items.forEach(function(item) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "locationMemoListItem";
    const head = document.createElement("div");
    head.className = "locationMemoListHead";
    head.textContent = (item.floor || "1F") + "　" + (item.location || "");
    const body = document.createElement("div");
    body.className = "locationMemoListBody";
    body.textContent = item.memo || "";
    button.appendChild(head);
    button.appendChild(body);
    button.onclick = function(event) {
      if (event) event.stopPropagation();
      const targetFloor = item.floor === "2F" ? "2F" : "1F";
      const targetLocation = item.location || "";
      const messageEl = document.getElementById("locationMemoListMessage");
      if (messageEl) messageEl.textContent = "対象ロケを開いています…";
      button.disabled = true;

      const mapReadyPromise = currentMapFloor !== targetFloor
        ? loadInventoryMap(targetFloor)
        : Promise.resolve(currentMapData);

      mapReadyPromise
        .then(function() {
          if (currentMapFloor !== targetFloor) throw new Error("対象階を開けませんでした。");
          const grid = document.getElementById("mapGrid");
          const targetKey = normalizeInventoryLocationKey_(targetLocation);
          const cells = grid ? grid.querySelectorAll(".mapCell[data-map-location-key]") : [];
          const targetCell = Array.prototype.find.call(cells, function(cell) {
            return cell.dataset.mapLocationKey === targetKey;
          });
          if (!targetCell) throw new Error("対象ロケをマップ上で確認できませんでした。");

          openMapActionSheet(targetLocation);
          const actionSheet = document.getElementById("mapActionSheet");
          if (!actionSheet || !actionSheet.classList.contains("show") || selectedMapLocation !== targetLocation) {
            closeMapActionSheet();
            throw new Error("対象ロケの画面を開けませんでした。");
          }
          closeLocationMemoList();
        })
        .catch(function(err) {
          if (messageEl) messageEl.textContent = "エラー：" + (err && err.message ? err.message : String(err));
        })
        .finally(function() {
          button.disabled = false;
        });
    };
    list.appendChild(button);
  });
}

function confirmClearAllLocationMemos() {
  openCommonActionConfirm_("全メモを一括削除しますか？\n状態・商品データは削除されません。", function() {
    const pin = prompt("PINコードを入力してください。");
    if (pin === null) return;
    callGas("inventoryClearAllLocationMemos", { pin: pin })
      .then(function(res) {
        if (!res || !res.ok) {
          const message = document.getElementById("locationMemoListMessage");
          if (message) message.textContent = res && res.message ? res.message : "削除できませんでした。";
          return;
        }
        currentMapMemoLocations = {};
        applyInventoryMapMemoMarkers_();
        renderLocationMemoList_([]);
        const message = document.getElementById("locationMemoListMessage");
        if (message) message.textContent = "全メモを削除しました。";
      })
      .catch(function(err) {
        const message = document.getElementById("locationMemoListMessage");
        if (message) message.textContent = err && err.message ? err.message : String(err);
      });
  });
}

function startInventoryMapAutoRefresh_() {
  if (activeSection !== "map") return;

  // 多重起動禁止：開始前に必ず既存タイマーを停止する。
  stopInventoryMapAutoRefresh_();

  inventoryMapStateRefreshFloor_ = currentMapFloor || "1F";
  inventoryMapStateRefreshTimer_ = setInterval(refreshInventoryMapStateOnly_, 3000);
}

function stopInventoryMapAutoRefresh_() {
  if (inventoryMapStateRefreshTimer_) {
    clearInterval(inventoryMapStateRefreshTimer_);
    inventoryMapStateRefreshTimer_ = null;
  }
  inventoryMapStateRefreshBusy_ = false;
  inventoryMapStateRefreshFloor_ = "";
}

function refreshInventoryMapStateOnly_() {
  if (activeSection !== "map") {
    stopInventoryMapAutoRefresh_();
    return;
  }
  if (inventoryMapStateRefreshBusy_) return;

  const grid = document.getElementById("mapGrid");
  if (!grid || !grid.dataset || !grid.dataset.layoutSignature) return;

  const requestFloor = currentMapFloor || "1F";
  const requestSeq = inventoryMapOpenRequestSeq_;
  inventoryMapStateRefreshBusy_ = true;

  callInventoryMapGasShared_("states", requestFloor, "inventoryGetMapStates", { floor: requestFloor }, false)
    .then(function(res) {
      if (activeSection !== "map" || currentMapFloor !== requestFloor || requestSeq !== inventoryMapOpenRequestSeq_) return;
      if (!res || !res.ok) return;
      currentMapState = res.locationStates || {};
      if (currentMapData) currentMapData.locationStates = currentMapState;
      applyInventoryMapStateOnly_(currentMapState);
      updateMapZoomLabel_();
    })
    .catch(function() {})
    .finally(function() {
      inventoryMapStateRefreshBusy_ = false;
    });
}



function openMapActionSheet(location) {
  if (!isInventoryLocationText_(location)) return;
  selectedMapLocation = location || "";
  selectedMapLocationPendingState_ = getInventoryMapStateForLocation_(currentMapState, selectedMapLocation) || "";
  const state = selectedMapLocationPendingState_;
  const back = document.getElementById("mapActionSheet");
  const loc = document.getElementById("mapSheetLocation");
  const st = document.getElementById("mapSheetState");
  if (loc) loc.textContent = "📍 ロケ：" + selectedMapLocation + "（" + (currentMapFloor || "1F") + "）";
  if (st) st.textContent = "現在：" + (state === "途中" ? "🟨途中" : state === "完了" ? "🟩完了" : "⬜空欄");
  updateMapPendingStateButtons_();
  if (back) back.classList.add("show");
  loadSelectedMapLocationMemo_();
}

function closeMapActionSheet() {
  mapLocationMemoRequestSeq_++;
  const back = document.getElementById("mapActionSheet");
  if (back) back.classList.remove("show");
  const messageEl = document.getElementById("mapLocationMemoMessage");
  if (messageEl) messageEl.textContent = "";
}

function mapSetSelectedLocationState(state) {
  if (!selectedMapLocation || !isInventoryLocationText_(selectedMapLocation)) return;
  selectedMapLocationPendingState_ = state || "";
  updateMapPendingStateButtons_();
  const messageEl = document.getElementById("mapLocationMemoMessage");
  if (messageEl) messageEl.textContent = "状態を選択しました。保存ボタンを押すまで保存されません。";
}

function mapClearAllLocationStates() {
  if (!confirm("全ロケ状態をクリアしますか？商品記入済状態は消えません。")) return;
  const pin = prompt("PINコードを入力してください。");
  if (pin === null) return;

  beginSearchLoading_();
  callGas("inventoryClearAllLocationStates", { pin: pin })
    .then(function(res) {
      endSearchLoading_();
      if (!res || !res.ok) {
        showMapMessage("error", res && res.message ? res.message : "クリアに失敗しました。");
        return;
      }
      currentMapState = {};
      applyInventoryMapStateOnly_(currentMapState);
      showMapMessage("success", "全ロケ状態をクリアしました。");
    })
    .catch(function(err) {
      endSearchLoading_();
      showMapMessage("error", err && err.message ? err.message : String(err));
    });
}

function mapShowMarkedAll() {
  beginSearchLoading_();
  callGas("inventoryListMarkedProducts", { __timeoutMs: 60000 })
    .then(function(res) {
      endSearchLoading_();
      if (!res || !res.ok) {
        showMapMessage("error", res && res.message ? res.message : "一覧取得に失敗しました。");
        return;
      }
      showMainSection("inventory");
      currentInventoryMarkedListActive = true;
      currentInventoryMarkedListLocation = "";
      currentInventoryMarkedListTitle = "記入済 全ロケ商品一覧";
      currentInventoryBackButtonLabel = "一覧へ戻る";
      inventoryRenderGroupedList(res.groups || [], "記入済 全ロケ商品一覧");
    })
    .catch(function(err) {
      endSearchLoading_();
      showMapMessage("error", err && err.message ? err.message : String(err));
    });
}

function mapShowSelectedMarkedProducts() {
  mapShowSelectedProductsByStatus("marked");
}

function mapShowSelectedAllProducts() {
  mapShowSelectedProductsByStatus("");
}

function mapShowSelectedProductsByStatus(filter) {
  if (!selectedMapLocation || !isInventoryLocationText_(selectedMapLocation)) return;
  const location = selectedMapLocation;
  const statusFilter = filter === "marked" ? "marked" : filter === "unmarked" ? "unmarked" : "";
  closeMapActionSheet();
  beginSearchLoading_();
  callGas("inventoryListProductsByLocation", {
    location: location,
    statusFilter: statusFilter,
    __timeoutMs: 60000
  })
    .then(function(res) {
      endSearchLoading_();
      if (!res || !res.ok) {
        showMapMessage("error", res && res.message ? res.message : "一覧取得に失敗しました。");
        return;
      }
      showMainSection("inventory");
      const title = statusFilter === "marked"
        ? "このロケの記入済商品：" + location
        : statusFilter === "unmarked"
          ? "このロケの未記入商品：" + location
          : "このロケの商品一覧：" + location;
      currentInventoryMarkedListActive = true;
      currentInventoryMarkedListLocation = location;
      currentInventoryMarkedListTitle = title;
      currentInventoryBackButtonLabel = "一覧へ戻る";
      inventoryRenderList(res.items || [], title, true);
    })
    .catch(function(err) {
      endSearchLoading_();
      showMapMessage("error", err && err.message ? err.message : String(err));
    });
}




function openStockCheckMenu() {
  stockCheckReturnSource_ = "stockList";
  stockCheckShowModeMenu_();
  showMainSection("stockCheck");
}

function stockCheckShowModeMenu_() {
  ["stockCheckMenuCard"].forEach(function(id){ const el=document.getElementById(id); if(el) el.classList.remove("hidden"); });
  ["stockCheckSearchCard","stockCheckListCard","stockCheckProductCard","stockCheckHistorySearchCard","stockCheckHistoryListCard","stockCheckHistoryDetailCard","stockCheckHistoryEditCard"].forEach(function(id){ const el=document.getElementById(id); if(el) el.classList.add("hidden"); });
}

function stockCheckBackToModeMenu() {
  const historyIds=["stockCheckHistorySearchCard","stockCheckHistoryListCard","stockCheckHistoryDetailCard","stockCheckHistoryEditCard"];
  const leavingHistory=historyIds.some(function(id){ const el=document.getElementById(id); return el && !el.classList.contains("hidden"); });
  if(leavingHistory) stockCheckHistoryClearSearch();
  stockCheckShowModeMenu_();
}

function openStockCheckInput() {
  const menu=document.getElementById("stockCheckMenuCard"); if(menu) menu.classList.add("hidden");
  stockCheckShowSearch_();
}

function openStockCheckHistory() {
  const menu=document.getElementById("stockCheckMenuCard"); if(menu) menu.classList.add("hidden");
  ["stockCheckSearchCard","stockCheckListCard","stockCheckProductCard","stockCheckHistoryListCard","stockCheckHistoryDetailCard","stockCheckHistoryEditCard"].forEach(function(id){ const el=document.getElementById(id); if(el) el.classList.add("hidden"); });
  const search=document.getElementById("stockCheckHistorySearchCard"); if(search) search.classList.remove("hidden");
  if (stockCheckHistorySearchPayload_ && document.getElementById("stockCheckHistoryList") && document.getElementById("stockCheckHistoryList").children.length) {
    const list=document.getElementById("stockCheckHistoryListCard"); if(list) list.classList.remove("hidden");
  } else {
    stockCheckHistorySearchPayload_=stockCheckHistoryGetPayload_();
    stockCheckHistoryOffset_=0;
    stockCheckHistoryRunPage_(false);
  }
}

function stockCheckBackToMenu() {
  const historyIds=["stockCheckHistorySearchCard","stockCheckHistoryListCard","stockCheckHistoryDetailCard","stockCheckHistoryEditCard"];
  const leavingHistory=historyIds.some(function(id){ const el=document.getElementById(id); return el && !el.classList.contains("hidden"); });
  if(leavingHistory) stockCheckHistoryClearSearch();
  backToAppHome_();
}

function startStockCheckScanner() {
  scannerMode = "stockCheck";
  toggleScanner();
}

function startStockCheckHistoryScanner() {
  scannerMode = "stockCheckHistory";
  toggleScanner();
}


function showStockCheckMessage_(type, text) {
  const el = document.getElementById("stockCheckMessage");
  if (!el) return;
  el.className = "msg " + type;
  el.textContent = text || "";
}

function hideStockCheckMessage_() {
  const el = document.getElementById("stockCheckMessage");
  if (!el) return;
  el.className = "msg";
  el.textContent = "";
}

function showStockCheckProductMessage_(type, text) {
  const el = document.getElementById("stockCheckProductMessage");
  if (!el) return;
  el.className = "msg " + type;
  el.textContent = text || "";
}

function hideStockCheckProductMessage_() {
  const el = document.getElementById("stockCheckProductMessage");
  if (!el) return;
  el.className = "msg";
  el.textContent = "";
}

function stockCheckShowSearch_() {
  const search = document.getElementById("stockCheckSearchCard");
  const list = document.getElementById("stockCheckListCard");
  const product = document.getElementById("stockCheckProductCard");
  const menu = document.getElementById("stockCheckMenuCard");
  if (menu) menu.classList.add("hidden");
  ["stockCheckHistorySearchCard","stockCheckHistoryListCard","stockCheckHistoryDetailCard","stockCheckHistoryEditCard"].forEach(function(id){ const el=document.getElementById(id); if(el) el.classList.add("hidden"); });
  if (search) search.classList.remove("hidden");
  if (list) list.classList.add("hidden");
  if (product) product.classList.add("hidden");
}

function stockCheckClearSearch() {
  ["stockTextInput","stockJanInput","stockHinbanInput","stockNameInput","stockColorInput","stockSizeInput","stockLocationInput"].forEach(function(id) {
    const el = document.getElementById(id); if (el) el.value = "";
  });
  stockCheckSearchPayload_ = null;
  stockCheckSearchOffset_ = 0;
  stockCheckSearchHasMore_ = false;
  stockCheckSearchTotal_ = 0;
  const list = document.getElementById("stockCheckList"); if (list) list.innerHTML = "";
  stockCheckShowSearch_();
  hideStockCheckMessage_();
}

function stockCheckBackToSearchInitial_() {
  stockCheckSelectedItem_ = null;
  stockCheckListScrollY_ = 0;
  stockCheckReturnSource_ = "stockList";
  clearStockCheckInputValues_();
  hideStockCheckProductMessage_();
  stockCheckClearSearch();
}

function stockCheckSearch() {
  stockCheckSearchPayload_ = {
    text: (document.getElementById("stockTextInput") || {}).value || "",
    jan: (document.getElementById("stockJanInput") || {}).value || "",
    hinban: (document.getElementById("stockHinbanInput") || {}).value || "",
    name: (document.getElementById("stockNameInput") || {}).value || "",
    color: (document.getElementById("stockColorInput") || {}).value || "",
    size: (document.getElementById("stockSizeInput") || {}).value || "",
    location: (document.getElementById("stockLocationInput") || {}).value || ""
  };
  if (!Object.keys(stockCheckSearchPayload_).some(function(k) { return String(stockCheckSearchPayload_[k] || "").trim(); })) {
    showStockCheckMessage_("error", "検索条件を入力してください。");
    stockCheckSearchPayload_ = null;
    return;
  }
  stockCheckSearchOffset_ = 0;
  const list = document.getElementById("stockCheckList"); if (list) list.innerHTML = "";
  stockCheckRunSearchPage_(false);
}

function stockCheckRunSearchPage_(append, restoreScrollY) {
  if (!stockCheckSearchPayload_) return;
  const payload = Object.assign({}, stockCheckSearchPayload_, { offset: stockCheckSearchOffset_, limit: STOCK_CHECK_SEARCH_LIMIT_ });
  beginSearchLoading_();
  callGas("inventorySearch", payload).then(function(res) {
    endSearchLoading_();
    if (!res || !res.ok) { showStockCheckMessage_("error", res && res.message ? res.message : "商品が見つかりませんでした。"); return; }
    const items = res.items || [];
    stockCheckSearchTotal_ = Number(res.total || res.count || items.length || 0);
    stockCheckSearchOffset_ = Number(res.nextOffset || (stockCheckSearchOffset_ + items.length));
    stockCheckSearchHasMore_ = !!res.hasMore;
    stockCheckRenderList_(items, append);
    showStockCheckMessage_("info", stockCheckSearchHasMore_ ? stockCheckSearchTotal_ + "件中 " + stockCheckSearchOffset_ + "件を表示しています。" : stockCheckSearchTotal_ + "件見つかりました。商品を選んでください。");
  }).catch(function(err) { endSearchLoading_(); showStockCheckMessage_("error", err && err.message ? err.message : String(err)); });
}

function stockCheckRenderList_(items, append) {
  const search = document.getElementById("stockCheckSearchCard");
  const card = document.getElementById("stockCheckListCard");
  const list = document.getElementById("stockCheckList");
  if (!list || !card) return;
  if (!append) list.innerHTML = "";
  const old = document.getElementById("stockCheckLoadMoreWrap"); if (old) old.remove();
  (items || []).forEach(function(item) {
    const div = document.createElement("div");
    div.className = "resultItem";
    div.innerHTML = "<div><strong>" + escapeHtml(item.hinban) + "</strong> / " + escapeHtml(item.name) + "</div>" +
      "<div class=\"small\">JAN：" + escapeHtml(item.jan) + "</div>" +
      "<div class=\"small\">色：" + escapeHtml(item.color) + " / サイズ：" + escapeHtml(item.size) + "</div>" +
      "<div class=\"small\">現在ロケ：" + escapeHtml(item.location || "未設定") + "</div>";
    div.onclick = function() { stockCheckListScrollY_ = window.scrollY || document.documentElement.scrollTop || 0; openStockCheckProduct_(item, "stockList"); };
    list.appendChild(div);
  });
  if (stockCheckSearchHasMore_) {
    const wrap = document.createElement("div"); wrap.id = "stockCheckLoadMoreWrap"; wrap.style.marginTop = "12px";
    const btn = document.createElement("button"); btn.className = "primary wide"; btn.textContent = "さらに20件読み込む";
    btn.onclick = function(){ const y=window.scrollY || document.documentElement.scrollTop || 0; stockCheckRunSearchPage_(true, y); };
    wrap.appendChild(btn); list.appendChild(wrap);
  }
  if (search) search.classList.remove("hidden");
  card.classList.remove("hidden");
}

function stockCheckBackToSearch() {
  const search = document.getElementById("stockCheckSearchCard");
  const product = document.getElementById("stockCheckProductCard");
  if (search) search.classList.remove("hidden");
  if (product) product.classList.add("hidden");
}

function openStockCheckFromInventoryDetail() {
  if (!selectedInventoryItem) return;
  let source = "inventoryDetail";
  if (currentInventoryMarkedListActive) source = /未記入/.test(currentInventoryMarkedListTitle || "") ? "mapUnmarkedDetail" : "mapMarkedDetail";
  openStockCheckProduct_(selectedInventoryItem, source);
}

function openStockCheckProduct_(item, source) {
  stockCheckSelectedItem_ = Object.assign({}, item || {});
  stockCheckReturnSource_ = source || "stockList";
  showMainSection("stockCheck");
  const search = document.getElementById("stockCheckSearchCard");
  const list = document.getElementById("stockCheckListCard");
  const product = document.getElementById("stockCheckProductCard");
  ["stockCheckMenuCard","stockCheckHistorySearchCard","stockCheckHistoryListCard","stockCheckHistoryDetailCard","stockCheckHistoryEditCard"].forEach(function(id){ const el=document.getElementById(id); if(el) el.classList.add("hidden"); });
  if (search) search.classList.add("hidden"); if (list) list.classList.add("hidden"); if (product) product.classList.remove("hidden");
  [["stockJan",item.jan],["stockHinban",item.hinban],["stockName",item.name],["stockColor",item.color],["stockSize",item.size],["stockLocation",item.location || "未設定"]].forEach(function(p){ const el=document.getElementById(p[0]); if(el) el.textContent=p[1] || ""; });
  clearStockCheckInputValues_();
  hideStockCheckProductMessage_();
  const back=document.getElementById("stockCheckBackBtn"); if(back) back.textContent = source === "stockList" ? "← 在庫差異確認一覧へ戻る" : "← 移動元の商品詳細へ戻る";
}

function stockCheckBackFromProduct() {
  if (stockCheckReturnSource_ === "stockList") {
    const product=document.getElementById("stockCheckProductCard"), list=document.getElementById("stockCheckListCard");
    const search=document.getElementById("stockCheckSearchCard");
    if(product) product.classList.add("hidden"); if(search) search.classList.remove("hidden"); if(list) list.classList.remove("hidden");
    return;
  }
  showMainSection("inventory");
  const card=document.getElementById("inventoryProductCard"); if(card) card.classList.remove("hidden");
}

function getStockCheckNumbers_() {
  const s=document.getElementById("stockSystemQty"), a=document.getElementById("stockActualQty");
  const systemRaw = s ? String(s.value || "").trim() : "";
  const actualRaw = a ? String(a.value || "").trim() : "";
  const sv = systemRaw !== "" ? Number(systemRaw) : null;
  const av = actualRaw !== "" ? Number(actualRaw) : null;
  const hasBoth = systemRaw !== "" && actualRaw !== "";
  const finite = Number.isFinite(sv) && Number.isFinite(av);
  const integer = finite && Number.isInteger(sv) && Number.isInteger(av);
  const actualNonNegative = integer && av >= 0;
  return {
    system: sv,
    actual: av,
    systemRaw: systemRaw,
    actualRaw: actualRaw,
    hasBoth: hasBoth,
    finite: finite,
    integer: integer,
    actualNonNegative: actualNonNegative,
    valid: hasBoth && integer && actualNonNegative,
    difference: hasBoth && integer && actualNonNegative ? av - sv : null
  };
}

function updateStockCheckDifference() {
  const n=getStockCheckNumbers_(), box=document.getElementById("stockDifferenceBox"), incRow=document.getElementById("stockIncreaseRow"), decRow=document.getElementById("stockDecreaseRow"), inc=document.getElementById("stockIncreaseQty"), dec=document.getElementById("stockDecreaseQty");
  if(incRow) incRow.classList.add("hidden"); if(decRow) decRow.classList.add("hidden"); if(inc) inc.textContent=""; if(dec) dec.textContent="";
  if(!n.valid){ if(box) box.textContent="差異：未計算"; return; }
  if(n.difference>0){ if(box) box.textContent="差異：+"+n.difference; if(inc) inc.textContent=String(n.difference); if(incRow) incRow.classList.remove("hidden"); }
  else if(n.difference<0){ if(box) box.textContent="差異："+n.difference; if(dec) dec.textContent=String(Math.abs(n.difference)); if(decRow) decRow.classList.remove("hidden"); }
  else { if(box) box.textContent="差異なし"; }
}

function clearStockCheckInputValues_() {
  ["stockSystemQty","stockActualQty"].forEach(function(id){ const el=document.getElementById(id); if(el) el.value=""; });
  updateStockCheckDifference();
}

function confirmStockCheckClearInputs() {
  const n = getStockCheckNumbers_();
  let message = "入力した内容をクリアしますか？\n\n" +
    "システム在庫：" + (n.systemRaw || "未入力") + "\n" +
    "実在庫：" + (n.actualRaw || "未入力");

  if (n.valid) {
    if (n.difference === 0) {
      message += "\n差異なし";
    } else if (n.difference > 0) {
      message += "\n差異：+" + n.difference + "\n増やす数：" + n.difference;
    } else {
      message += "\n差異：" + n.difference + "\n減らす数：" + Math.abs(n.difference);
    }
  }

  openCommonActionConfirm_(message, function(){ clearStockCheckInputValues_(); });
}

function confirmStockCheckSave() {
  if(!stockCheckSelectedItem_) return;
  const n=getStockCheckNumbers_();
  if(!n.hasBoth){ showStockCheckProductMessage_("error","システム在庫と実在庫を入力してください。"); return; }
  if(!n.integer){ showStockCheckProductMessage_("error","システム在庫・実在庫は整数で入力してください。"); return; }
  if(!n.actualNonNegative){ showStockCheckProductMessage_("error","実在庫は0以上で入力してください。"); return; }
  hideStockCheckProductMessage_();
  const increase=n.difference>0?n.difference:"", decrease=n.difference<0?Math.abs(n.difference):"";
  let message="この内容で保存しますか？\n\nシステム在庫："+n.system+"\n実在庫："+n.actual+"\n";
  if(n.difference===0){
    message+="差異なし";
  } else if(n.difference>0){
    message+="差異：+"+n.difference+"\n増やす数："+increase;
  } else {
    message+="差異："+n.difference+"\n減らす数："+decrease;
  }
  openCommonActionConfirm_(message, function(){ saveStockCheck_(n, increase, decrease); });
}

function saveStockCheck_(n, increase, decrease) {
  const item=stockCheckSelectedItem_;
  beginSearchLoading_();
  callGas("saveStockCheck", { rowNo:item.rowNo||"", jan:item.jan||"", hinban:item.hinban||"", name:item.name||"", color:item.color||"", size:item.size||"", location:item.location||"", systemQty:n.system, actualQty:n.actual, increaseQty:increase, decreaseQty:decrease, difference:n.difference }).then(function(res){
    endSearchLoading_();
    if(!res || !res.ok){ showStockCheckProductMessage_("error",res && res.message ? res.message : "保存に失敗しました。"); return; }
    stockCheckHistorySearchPayload_=null;
    stockCheckHistoryOffset_=0;
    stockCheckHistoryHasMore_=false;
    stockCheckHistoryTotal_=0;
    stockCheckHistoryListScrollY_=0;
    stockCheckHistorySelectedItem_=null;
    const historyList=document.getElementById("stockCheckHistoryList"); if(historyList) historyList.innerHTML="";
    ["stockCheckHistoryListCard","stockCheckHistoryDetailCard","stockCheckHistoryEditCard"].forEach(function(id){ const el=document.getElementById(id); if(el) el.classList.add("hidden"); });
    showSaveSuccessAnimation_();
    showStockCheckProductMessage_("success","在庫差異確認を保存しました。");
  }).catch(function(err){ endSearchLoading_(); showStockCheckProductMessage_("error",err && err.message ? err.message : String(err)); });
}


function showStockCheckHistoryMessage_(type, text) {
  const el=document.getElementById("stockCheckHistoryMessage");
  if(!el) return;
  el.className="msg "+type;
  el.textContent=text||"";
}

function showStockCheckHistoryDetailMessage_(type, text) {
  const el=document.getElementById("stockCheckHistoryDetailMessage");
  if(!el) return;
  el.className="msg "+type;
  el.textContent=text||"";
}

function showStockCheckHistoryEditMessage_(type, text) {
  const el=document.getElementById("stockCheckHistoryEditMessage");
  if(!el) return;
  el.className="msg "+type;
  el.textContent=text||"";
}


function stockCheckHistoryGetPayload_() {
  return {
    text:(document.getElementById("stockHistoryTextInput")||{}).value||"",
    jan:(document.getElementById("stockHistoryJanInput")||{}).value||"",
    hinban:(document.getElementById("stockHistoryHinbanInput")||{}).value||"",
    name:(document.getElementById("stockHistoryNameInput")||{}).value||"",
    color:(document.getElementById("stockHistoryColorInput")||{}).value||"",
    size:(document.getElementById("stockHistorySizeInput")||{}).value||"",
    location:(document.getElementById("stockHistoryLocationInput")||{}).value||"",
    savedDate:(document.getElementById("stockHistoryDateInput")||{}).value||""
  };
}

function stockCheckHistorySearch() {
  stockCheckHistorySearchPayload_=stockCheckHistoryGetPayload_();
  stockCheckHistoryOffset_=0;
  stockCheckHistoryHasMore_=false;
  stockCheckHistoryTotal_=0;
  const list=document.getElementById("stockCheckHistoryList"); if(list) list.innerHTML="";
  stockCheckHistoryRunPage_(false);
}

function stockCheckHistoryClearSearch() {
  ["stockHistoryTextInput","stockHistoryJanInput","stockHistoryHinbanInput","stockHistoryNameInput","stockHistoryColorInput","stockHistorySizeInput","stockHistoryLocationInput","stockHistoryDateInput"].forEach(function(id){ const el=document.getElementById(id); if(el) el.value=""; });
  stockCheckHistorySearchPayload_=null;
  stockCheckHistoryOffset_=0;
  stockCheckHistoryHasMore_=false;
  stockCheckHistoryTotal_=0;
  const list=document.getElementById("stockCheckHistoryList"); if(list) list.innerHTML="";
  const card=document.getElementById("stockCheckHistoryListCard"); if(card) card.classList.add("hidden");
  showStockCheckHistoryMessage_("","");
}

function stockCheckHistoryRunPage_(append, restoreScrollY) {
  if(!stockCheckHistorySearchPayload_) stockCheckHistorySearchPayload_=stockCheckHistoryGetPayload_();
  const payload=Object.assign({},stockCheckHistorySearchPayload_,{offset:stockCheckHistoryOffset_,limit:STOCK_CHECK_HISTORY_LIMIT_});
  beginSearchLoading_();
  callGas("stockCheckHistoryList",payload).then(function(res){
    endSearchLoading_();
    if(!res||!res.ok){ showStockCheckHistoryMessage_("error",res&&res.message?res.message:"履歴取得に失敗しました。"); return; }
    const items=res.items||[];
    stockCheckHistoryTotal_=Number(res.total||0);
    stockCheckHistoryOffset_=Number(res.nextOffset||(stockCheckHistoryOffset_+items.length));
    stockCheckHistoryHasMore_=!!res.hasMore;
    stockCheckHistoryRenderList_(items,append);
    showStockCheckHistoryMessage_("info",stockCheckHistoryHasMore_?stockCheckHistoryTotal_+"件中 "+stockCheckHistoryOffset_+"件を表示しています。":stockCheckHistoryTotal_+"件の履歴があります。");
  }).catch(function(err){ endSearchLoading_(); showStockCheckHistoryMessage_("error",err&&err.message?err.message:String(err)); });
}

function stockCheckHistoryRenderList_(items, append) {
  const list=document.getElementById("stockCheckHistoryList"), card=document.getElementById("stockCheckHistoryListCard"), search=document.getElementById("stockCheckHistorySearchCard");
  if(!list||!card) return;
  if(!append) list.innerHTML="";
  const old=document.getElementById("stockCheckHistoryLoadMoreWrap"); if(old) old.remove();
  (items||[]).forEach(function(item){
    const div=document.createElement("div");
    div.className="resultItem";
    div.dataset.confirmationId=String(item.confirmationId||"");
    div.innerHTML=stockCheckHistoryListHtml_(item);
    div.onclick=function(){ stockCheckHistoryListScrollY_=window.scrollY||document.documentElement.scrollTop||0; stockCheckHistoryOpenDetail_(item); };
    list.appendChild(div);
  });
  if(stockCheckHistoryHasMore_){
    const wrap=document.createElement("div"); wrap.id="stockCheckHistoryLoadMoreWrap"; wrap.style.marginTop="12px";
    const btn=document.createElement("button"); btn.className="primary wide"; btn.textContent="さらに20件読み込む";
    btn.onclick=function(){ const y=window.scrollY||document.documentElement.scrollTop||0; stockCheckHistoryRunPage_(true,y); };
    wrap.appendChild(btn); list.appendChild(wrap);
  }
  if(search) search.classList.remove("hidden");
  card.classList.remove("hidden");
}

function stockCheckHistoryListHtml_(item) {
  return "<div><strong>"+escapeHtml(item.savedAt||"")+"</strong></div>"+
    "<div><strong>"+escapeHtml(item.hinban||"")+"</strong> / "+escapeHtml(item.name||"")+"</div>"+
    "<div class=\"small\">色："+escapeHtml(item.color||"")+" / サイズ："+escapeHtml(item.size||"")+" / ロケ："+escapeHtml(item.location||"未設定")+"</div>"+
    "<div class=\"small\">システム在庫："+escapeHtml(String(item.systemQty??""))+" / 実在庫："+escapeHtml(String(item.actualQty??""))+" / 差異："+escapeHtml(String(item.difference??""))+"</div>"+
    "<div class=\"small\">増やす数："+escapeHtml(String(item.increaseQty??""))+" / 減らす数："+escapeHtml(String(item.decreaseQty??""))+"</div>";
}

function stockCheckHistoryBackToSearch() {
  const search=document.getElementById("stockCheckHistorySearchCard"), detail=document.getElementById("stockCheckHistoryDetailCard"), edit=document.getElementById("stockCheckHistoryEditCard");
  if(search) search.classList.remove("hidden"); if(detail) detail.classList.add("hidden"); if(edit) edit.classList.add("hidden");
}

function stockCheckHistoryOpenDetail_(item) {
  stockCheckHistorySelectedItem_=Object.assign({},item||{});
  ["stockCheckMenuCard","stockCheckSearchCard","stockCheckListCard","stockCheckProductCard","stockCheckHistorySearchCard","stockCheckHistoryListCard","stockCheckHistoryEditCard"].forEach(function(id){ const el=document.getElementById(id); if(el) el.classList.add("hidden"); });
  const card=document.getElementById("stockCheckHistoryDetailCard"); if(card) card.classList.remove("hidden");
  stockCheckHistoryFillDetail_();
  showStockCheckHistoryDetailMessage_("","");
}

function stockCheckHistoryFillDetail_() {
  const i=stockCheckHistorySelectedItem_||{};
  const pairs={stockHistoryDetailSavedAt:i.savedAt,stockHistoryDetailJan:i.jan,stockHistoryDetailHinban:i.hinban,stockHistoryDetailName:i.name,stockHistoryDetailColor:i.color,stockHistoryDetailSize:i.size,stockHistoryDetailLocation:i.location||"未設定",stockHistoryDetailSystemQty:i.systemQty,stockHistoryDetailActualQty:i.actualQty,stockHistoryDetailDifference:i.difference,stockHistoryDetailIncreaseQty:i.increaseQty,stockHistoryDetailDecreaseQty:i.decreaseQty,stockHistoryDetailNote:i.note};
  Object.keys(pairs).forEach(function(id){ const el=document.getElementById(id); if(el) el.textContent=pairs[id]===undefined||pairs[id]===null?"":String(pairs[id]); });
}

function stockCheckHistoryBackFromDetail() {
  const detail=document.getElementById("stockCheckHistoryDetailCard"), list=document.getElementById("stockCheckHistoryListCard"), search=document.getElementById("stockCheckHistorySearchCard");
  if(detail) detail.classList.add("hidden"); if(search) search.classList.remove("hidden"); if(list) list.classList.remove("hidden");
}

function stockCheckHistoryStartEdit() {
  const i=stockCheckHistorySelectedItem_; if(!i) return;
  const detail=document.getElementById("stockCheckHistoryDetailCard"), edit=document.getElementById("stockCheckHistoryEditCard");
  if(detail) detail.classList.add("hidden"); if(edit) edit.classList.remove("hidden");
  const pairs={stockHistoryEditJan:i.jan,stockHistoryEditHinban:i.hinban,stockHistoryEditName:i.name,stockHistoryEditColor:i.color,stockHistoryEditSize:i.size,stockHistoryEditLocation:i.location||"未設定"};
  Object.keys(pairs).forEach(function(id){const el=document.getElementById(id);if(el)el.textContent=pairs[id]||"";});
  const s=document.getElementById("stockHistoryEditSystemQty"),a=document.getElementById("stockHistoryEditActualQty"),n=document.getElementById("stockHistoryEditNote");
  if(s)s.value=i.systemQty; if(a)a.value=i.actualQty; if(n)n.value=i.note||"";
  showStockCheckHistoryEditMessage_("","");
  stockCheckHistoryUpdateDifference();
}

function stockCheckHistoryCancelEdit() {
  const detail=document.getElementById("stockCheckHistoryDetailCard"), edit=document.getElementById("stockCheckHistoryEditCard");
  if(edit) edit.classList.add("hidden"); if(detail) detail.classList.remove("hidden");
}

function stockCheckHistoryGetEditNumbers_() {
  const s=document.getElementById("stockHistoryEditSystemQty"),a=document.getElementById("stockHistoryEditActualQty");
  const sr=s?String(s.value||"").trim():"", ar=a?String(a.value||"").trim():"";
  const sv=sr!==""?Number(sr):null,av=ar!==""?Number(ar):null;
  const valid=sr!==""&&ar!==""&&Number.isInteger(sv)&&Number.isInteger(av)&&av>=0;
  return {system:sv,actual:av,systemRaw:sr,actualRaw:ar,valid:valid,difference:valid?av-sv:null};
}

function stockCheckHistoryUpdateDifference() {
  const n=stockCheckHistoryGetEditNumbers_(),box=document.getElementById("stockHistoryEditDifferenceBox"),ir=document.getElementById("stockHistoryEditIncreaseRow"),dr=document.getElementById("stockHistoryEditDecreaseRow"),iv=document.getElementById("stockHistoryEditIncreaseQty"),dv=document.getElementById("stockHistoryEditDecreaseQty");
  if(ir)ir.classList.add("hidden");if(dr)dr.classList.add("hidden");if(iv)iv.textContent="";if(dv)dv.textContent="";
  if(!n.valid){if(box)box.textContent="差異：未計算";return;}
  if(n.difference>0){if(box)box.textContent="差異：+"+n.difference;if(iv)iv.textContent=String(n.difference);if(ir)ir.classList.remove("hidden");}
  else if(n.difference<0){if(box)box.textContent="差異："+n.difference;if(dv)dv.textContent=String(Math.abs(n.difference));if(dr)dr.classList.remove("hidden");}
  else if(box)box.textContent="差異なし";
}

function stockCheckHistoryConfirmUpdate() {
  const n=stockCheckHistoryGetEditNumbers_();
  if(!n.valid){showStockCheckHistoryEditMessage_("error","システム在庫・実在庫は整数で入力し、実在庫は0以上にしてください。");return;}
  const note=(document.getElementById("stockHistoryEditNote")||{}).value||"";
  let message="この内容で更新しますか？\n\nシステム在庫："+n.system+"\n実在庫："+n.actual+"\n";
  if(n.difference===0)message+="差異なし";else if(n.difference>0)message+="差異：+"+n.difference+"\n増やす数："+n.difference;else message+="差異："+n.difference+"\n減らす数："+Math.abs(n.difference);
  openCommonActionConfirm_(message,function(){stockCheckHistoryUpdate_(n,note);});
}

function stockCheckHistoryUpdate_(n,note) {
  const i=stockCheckHistorySelectedItem_; if(!i)return;
  beginSearchLoading_();
  callGas("stockCheckHistoryUpdate",{confirmationId:i.confirmationId,systemQty:n.system,actualQty:n.actual,note:note,difference:n.difference}).then(function(res){
    endSearchLoading_();
    if(!res||!res.ok){showStockCheckHistoryEditMessage_("error",res&&res.message?res.message:"更新に失敗しました。");return;}
    stockCheckHistorySelectedItem_=Object.assign({},i,res.item||{});
    const updatedItem=Object.assign({},stockCheckHistorySelectedItem_);
    const row=document.querySelector('#stockCheckHistoryList [data-confirmation-id="'+cssEscape_(String(i.confirmationId||""))+'"]');
    if(row){row.innerHTML=stockCheckHistoryListHtml_(updatedItem);row.onclick=function(){stockCheckHistoryListScrollY_=window.scrollY||document.documentElement.scrollTop||0;stockCheckHistoryOpenDetail_(updatedItem);};}
    const edit=document.getElementById("stockCheckHistoryEditCard"),detail=document.getElementById("stockCheckHistoryDetailCard");if(edit)edit.classList.add("hidden");if(detail)detail.classList.remove("hidden");
    stockCheckHistoryFillDetail_();showStockCheckHistoryDetailMessage_("success","履歴を更新しました。");
  }).catch(function(err){endSearchLoading_();showStockCheckHistoryEditMessage_("error",err&&err.message?err.message:String(err));});
}

function cssEscape_(value) {
  if(window.CSS&&typeof window.CSS.escape==="function")return window.CSS.escape(value);
  return String(value||"").replace(/["\\]/g,"\\$&");
}

function stockCheckHistoryConfirmDelete() {
  if(!stockCheckHistorySelectedItem_)return;
  openCommonActionConfirm_("この履歴を削除しますか？",function(){
    const pin=prompt("PINコードを入力してください。");
    if(pin===null)return;
    stockCheckHistoryDelete_(pin);
  });
}

function stockCheckHistoryDelete_(pin) {
  const i=stockCheckHistorySelectedItem_; if(!i)return;
  beginSearchLoading_();
  callGas("stockCheckHistoryDelete",{confirmationId:i.confirmationId,pin:pin}).then(function(res){
    endSearchLoading_();
    if(!res||!res.ok){showStockCheckHistoryDetailMessage_("error",res&&res.message?res.message:"削除に失敗しました。");return;}
    const row=document.querySelector('#stockCheckHistoryList [data-confirmation-id="'+cssEscape_(String(i.confirmationId||""))+'"]');if(row)row.remove();
    stockCheckHistoryTotal_=Math.max(0,stockCheckHistoryTotal_-1);stockCheckHistoryOffset_=Math.max(0,stockCheckHistoryOffset_-1);
    const loadMoreWrap=document.getElementById("stockCheckHistoryLoadMoreWrap");
    if(!stockCheckHistoryHasMore_&&loadMoreWrap) loadMoreWrap.remove();
    stockCheckHistorySelectedItem_=null;
    const detail=document.getElementById("stockCheckHistoryDetailCard"),list=document.getElementById("stockCheckHistoryListCard"),search=document.getElementById("stockCheckHistorySearchCard");if(detail)detail.classList.add("hidden");if(search)search.classList.remove("hidden");if(list)list.classList.remove("hidden");
    showStockCheckHistoryMessage_("success","履歴を削除しました。\n"+(stockCheckHistoryHasMore_?stockCheckHistoryTotal_+"件中 "+stockCheckHistoryOffset_+"件を表示しています。":stockCheckHistoryTotal_+"件の履歴があります。"));
  }).catch(function(err){endSearchLoading_();showStockCheckHistoryDetailMessage_("error",err&&err.message?err.message:String(err));});
}

function setupMapPinch_() {
  const outer = document.getElementById("mapOuter");
  if (!outer || outer.dataset.pinchReady === "1") return;

  outer.dataset.pinchReady = "1";

  outer.addEventListener("touchstart", function(e) {
    if (e.touches && e.touches.length === 2) {
      mapPinchStartDistance = getTouchDistance_(e.touches[0], e.touches[1]);
      mapPinchStartScale = Math.max(0.01, Number(mapScaleValue || 1));
      mapPinchCenterClientX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      mapPinchCenterClientY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      mapPinchStartScrollLeft = outer.scrollLeft || 0;
      mapPinchStartScrollTop = outer.scrollTop || 0;

      var pinchViewportPos = getInventoryMapPointInViewport_(outer, mapPinchCenterClientX, mapPinchCenterClientY);
      var currentTranslate = getInventoryMapCurrentGridTranslate_();
      mapPinchCenterMapX = (mapPinchStartScrollLeft + pinchViewportPos.x - currentTranslate.x) / mapPinchStartScale;
      mapPinchCenterMapY = (mapPinchStartScrollTop + pinchViewportPos.y - currentTranslate.y) / mapPinchStartScale;
    }
  }, { passive: true });

  outer.addEventListener("touchmove", function(e) {
    if (e.touches && e.touches.length === 2 && mapPinchStartDistance) {
      e.preventDefault();
      const d = getTouchDistance_(e.touches[0], e.touches[1]);
      const nextScale = Math.max(mapMinScaleValue || 0.05, Math.min(4, mapPinchStartScale * (d / mapPinchStartDistance)));
      setInventoryMapScale_(nextScale, mapPinchCenterClientX, mapPinchCenterClientY, {
        mode: "pinch",
        mapX: mapPinchCenterMapX,
        mapY: mapPinchCenterMapY
      });
    }
  }, { passive: false });

  outer.addEventListener("touchend", function(e) {
    if (!e.touches || e.touches.length < 2) {
      mapPinchStartDistance = 0;
      mapPinchStartScrollLeft = 0;
      mapPinchStartScrollTop = 0;
      mapPinchCenterMapX = 0;
      mapPinchCenterMapY = 0;
    }
  }, { passive: true });

  window.addEventListener("orientationchange", function() {
    setTimeout(function() {
      if (activeSection === "map" && currentMapData) {
        // 画面回転では再描画・全体表示再計算を行わない。
        // 保存済み元サイズと現在倍率を維持し、スクロール範囲だけ補正する。
        applyInventoryMapScaleTransform_();
        clampInventoryMapScroll_();
        updateMapZoomLabel_();
      }
    }, 300);
  });
}



function updateMapZoomLabel_() {
  const el = document.getElementById("mapZoomLabel");
  if (!el) return;
  el.textContent = "現在倍率 " + Math.round((mapScaleValue || 1) * 100) + "%";
}

function mapZoomIn() {
  setInventoryMapScale_((mapScaleValue || 1) * 1.15);
}

function mapZoomOut() {
  setInventoryMapScale_((mapScaleValue || 1) / 1.15);
}

function mapFitWhole() {
  fitInventoryMapToScreen_();
}

function getTouchDistance_(a, b) {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getInventoryMapPointInViewport_(outer, clientX, clientY) {
  if (!outer) return { x: 0, y: 0 };

  try {
    const rect = outer.getBoundingClientRect();
    return {
      x: Math.max(0, Number(clientX || 0) - rect.left),
      y: Math.max(0, Number(clientY || 0) - rect.top)
    };
  } catch (e) {
    return { x: 0, y: 0 };
  }
}

document.addEventListener("DOMContentLoaded", function() {
  showMainSection("menu");
});

window.addEventListener("pageshow", function() {
  resumeInventoryMapBackgroundPrepare_();
  resumeAuxiliaryScannerAfterVisibility_();
});

document.addEventListener("visibilitychange", function() {
  if (document.visibilityState === "hidden") {
    stopAuxiliaryScanner_();
  } else {
    resumeInventoryMapBackgroundPrepare_();
    resumeAuxiliaryScannerAfterVisibility_();
  }
});

window.addEventListener("resize", function() {
  if (activeSection === "map" && currentMapData) {
    // モバイルブラウザのアドレスバー表示変化などで、表示後数秒以内にresizeが発火することがある。
    // ここで全体表示を再計算すると見た目のセル幅が変わるため、倍率は維持してスクロール範囲だけ補正する。
    applyInventoryMapScaleTransform_();
    clampInventoryMapScroll_();
    updateMapZoomLabel_();
  }
});



/****************************************************
 * 棚卸しマップ レイアウトキャッシュ + 圧縮データ展開
 * 既存機能を維持し、レイアウトだけブラウザキャッシュ。
 * ロケ状態は毎回Apps Scriptから取得。
 ****************************************************/



function readInventoryMapLayoutFromBrowserCache_(floor, version) {
  try {
    const key = getInventoryMapCacheKey_(floor, version);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || String(data.layoutVersion || "") !== String(version || "")) return null;

    // 高速表示を優先するため、古いschemaのキャッシュも破棄しない。
    // 古い相対row/colキャッシュは normalizeInventoryMapResponse_ 側で元シート基準へ補正し、
    // 裏で最新schemaへ更新する。
    data.__cacheSchema = Number(data.cacheSchema || data.__cacheSchema || 0);
    return data;
  } catch (e) {
    return null;
  }
}

function readLatestInventoryMapLayoutFromBrowserCache_(floor) {
  try {
    const latestKey = localStorage.getItem("inventoryMapLayoutLatest:" + String(floor || "1F"));
    if (!latestKey) return null;
    const raw = localStorage.getItem(latestKey);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !data.ok) return null;

    // 既存ユーザーの高速表示を維持するため、旧キャッシュでも先に即表示する。
    // ただし cacheSchema が古い場合は loadInventoryMap 側で裏でフル取得して、新しい線だけセル対応キャッシュへ更新する。
    data.__cacheSchema = Number(data.cacheSchema || data.__cacheSchema || 0);
    return data;
  } catch (e) {
    return null;
  }
}

function writeInventoryMapLayoutToBrowserCache_(floor, version, data) {
  try {
    const key = getInventoryMapCacheKey_(floor, version);
    const layoutData = Object.assign({}, data || {});
    layoutData.cacheSchema = INVENTORY_MAP_CACHE_SCHEMA_VERSION;
    localStorage.setItem(key, JSON.stringify(layoutData));
    localStorage.setItem("inventoryMapLayoutLatest:" + String(floor || "1F"), key);
  } catch (e) {}
}



function canStartInventoryMapBackgroundPrepare_() {
  return (
    activeSection === "menu" &&
    !scannerRunning &&
    document.visibilityState !== "hidden"
  );
}

function resumeInventoryMapBackgroundPrepare_() {
  if (!inventoryMapBackgroundPrepareWaiting_) return;
  if (!canStartInventoryMapBackgroundPrepare_()) return;
  scheduleInventoryMapBackgroundPrepare_();
}

function scheduleInventoryMapBackgroundPrepare_() {
  if (inventoryMapBackgroundPrepareScheduled_) return;
  inventoryMapBackgroundPrepareScheduled_ = true;
  inventoryMapBackgroundPrepareWaiting_ = false;

  let priorityFloor = currentMapFloor || "1F";
  try {
    const savedFloor = String(localStorage.getItem("inventoryMapLastFloor") || "").toUpperCase();
    if (savedFloor === "1F" || savedFloor === "2F") priorityFloor = savedFloor;
  } catch (e) {}

  if (priorityFloor !== "1F" && priorityFloor !== "2F") priorityFloor = "1F";
  const secondaryFloor = priorityFloor === "1F" ? "2F" : "1F";

  const finishPrepare = function(waitForResume) {
    inventoryMapBackgroundPrepareScheduled_ = false;
    inventoryMapBackgroundPrepareWaiting_ = !!waitForResume;
  };

  const runSecondary = function() {
    if (!canStartInventoryMapBackgroundPrepare_()) {
      finishPrepare(true);
      return;
    }

    // もう一方の階は既存キャッシュがある場合だけ確認する。
    // キャッシュが無い階を起動直後に追加フル取得しない。
    prepareInventoryMapCacheInBackground_(secondaryFloor, false)
      .catch(function() {})
      .finally(function() {
        finishPrepare(false);
      });
  };

  const runPrimary = function() {
    if (!canStartInventoryMapBackgroundPrepare_()) {
      finishPrepare(true);
      return;
    }

    prepareInventoryMapCacheInBackground_(priorityFloor, true)
      .catch(function() {})
      .finally(function() {
        if (typeof window.requestIdleCallback === "function") {
          window.requestIdleCallback(runSecondary, { timeout: 12000 });
        } else {
          setTimeout(runSecondary, 6000);
        }
      });
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(runPrimary, { timeout: 6000 });
  } else {
    setTimeout(runPrimary, 2000);
  }
}

function prepareInventoryMapCacheInBackground_(floor, allowFullFetch) {
  const requestFloor = String(floor || "1F").toUpperCase();
  if (inventoryMapBackgroundPreparePromises_[requestFloor]) {
    return inventoryMapBackgroundPreparePromises_[requestFloor];
  }

  const promise = Promise.resolve()
    .then(function() {
      const cachedLayout = readLatestInventoryMapLayoutFromBrowserCache_(requestFloor);

      // 既存キャッシュがある場合は、起動中の事前取得では何もしない。
      // レイアウト変更確認は、利用者が次にマップを開いた時の inventoryGetMapMeta だけで行う。
      if (cachedLayout) {
        return null;
      }

      // 優先階以外は、キャッシュが無い場合にフル取得しない。
      if (allowFullFetch === false) {
        return null;
      }

      return callGas("inventoryGetMap", {
        floor: requestFloor,
        compact: "1",
        __timeoutMs: 60000
      }).then(function(fullRes) {
        const normalized = normalizeInventoryMapResponse_(fullRes);
        if (!normalized || !normalized.ok || !normalized.layoutVersion) return null;

        normalized.floor = requestFloor;
        const layoutOnly = Object.assign({}, normalized);
        delete layoutOnly.locationStates;
        writeInventoryMapLayoutToBrowserCache_(
          requestFloor,
          normalized.layoutVersion,
          layoutOnly
        );
        return normalized;
      });
    })
    .finally(function() {
      delete inventoryMapBackgroundPreparePromises_[requestFloor];
    });

  inventoryMapBackgroundPreparePromises_[requestFloor] = promise;
  return promise;
}


function expandInventoryMapBorders_(borders) {
  if (!borders) return null;

  const sides = ["top", "right", "bottom", "left"];
  const out = {};
  sides.forEach(function(side, i) {
    const b = borders[i] || [0];
    const visible = !!(
      b[0] ||
      Number(b[1] || 0) > 0 ||
      String(b[2] || "").trim() ||
      String(b[3] || "").trim()
    );
    out[side] = {
      visible: visible,
      width: Number(b[1] || 0),
      color: b[2] || "",
      style: b[3] || ""
    };
  });
  return out;
}

function loadInventoryMapHandled_(floor) {
  return loadInventoryMap(floor).catch(function(err) {
    if (activeSection === "map") {
      showMapMessage("error", err && err.message ? err.message : String(err));
    }
    return null;
  });
}

function loadInventoryMap(floor) {
  var requestedFloor = String(floor || "").toUpperCase();
  const previousFloor = currentMapFloor || "1F";
  currentMapFloor = requestedFloor === "2F" ? "2F" : "1F";
  const requestFloor = currentMapFloor;
  const requestSeq = ++inventoryMapOpenRequestSeq_;

  try { localStorage.setItem("inventoryMapLastFloor", requestFloor); } catch (e) {}
  const layoutReasonForFirstRender = previousFloor !== requestFloor ? "floorChanged" : "initial";
  stopInventoryMapAutoRefresh_();
  hideMapMessage();

  const cachedLayout = readLatestInventoryMapLayoutFromBrowserCache_(requestFloor);
  let showedCached = false;
  let cachedLayoutVersion = "";
  let cachedLayoutSchema = 0;

  if (cachedLayout) {
    const cachedNormalized = normalizeInventoryMapResponse_(Object.assign({}, cachedLayout));
    cachedNormalized.floor = requestFloor;
    cachedNormalized.locationStates = currentMapState || {};
    cachedLayoutVersion = String(cachedNormalized.layoutVersion || "");
    cachedLayoutSchema = Number(cachedLayout.__cacheSchema || cachedLayout.cacheSchema || 0);
    currentMapData = cachedNormalized;
    renderInventoryMap(cachedNormalized, layoutReasonForFirstRender);
    showMapMessage("info", requestFloor === "2F" ? "2階を表示中です。" : "1階を表示中です。");
    showedCached = true;
    endSearchLoading_();
  } else {
    beginSearchLoading_();
  }

  const statesPromise = callInventoryMapGasShared_("states", requestFloor, "inventoryGetMapStates", { floor: requestFloor })
    .then(function(res) {
      if (requestSeq !== inventoryMapOpenRequestSeq_ || currentMapFloor !== requestFloor) return null;
      if (!res || !res.ok) throw new Error(res && res.message ? res.message : "状態を取得できませんでした。");
      currentMapState = res.locationStates || {};
      if (currentMapData) currentMapData.locationStates = currentMapState;
      applyInventoryMapStateOnly_(currentMapState);
      updateMapZoomLabel_();
      return res;
    });

  const metaPromise = callInventoryMapGasShared_("meta", requestFloor, "inventoryGetMapMeta", { floor: requestFloor })
    .then(function(meta) {
      if (requestSeq !== inventoryMapOpenRequestSeq_ || currentMapFloor !== requestFloor) return null;
      if (!meta || !meta.ok) throw new Error(meta && meta.message ? meta.message : "マップ情報を取得できませんでした。");
      currentMapMemoLocations = meta.memoLocations || {};
      if (currentMapData) currentMapData.memoLocations = currentMapMemoLocations;
      applyInventoryMapMemoMarkers_();
      return meta;
    });

  const layoutPromise = metaPromise.then(function(meta) {
    if (!meta || requestSeq !== inventoryMapOpenRequestSeq_ || currentMapFloor !== requestFloor) return null;
    const metaLayoutVersion = meta.layoutVersion ? String(meta.layoutVersion) : "";

    if (showedCached && cachedLayoutSchema >= INVENTORY_MAP_CACHE_SCHEMA_VERSION && cachedLayoutVersion && metaLayoutVersion === cachedLayoutVersion) return null;
    if (showedCached && !metaLayoutVersion) return null;

    if (metaLayoutVersion) {
      const exactCached = readInventoryMapLayoutFromBrowserCache_(requestFloor, metaLayoutVersion);
      if (exactCached) {
        if (showedCached) return null;
        const merged = Object.assign({}, exactCached);
        merged.floor = requestFloor;
        merged.locationStates = currentMapState || {};
        merged.memoLocations = currentMapMemoLocations || {};
        merged.__layoutRenderReason = "cacheMissing";
        return merged;
      }
    }

    return callInventoryMapGasShared_("layout", requestFloor, "inventoryGetMap", { floor: requestFloor, compact: "1", __timeoutMs: 60000 })
      .then(function(fullRes) {
        if (requestSeq !== inventoryMapOpenRequestSeq_ || currentMapFloor !== requestFloor) return null;
        const normalized = normalizeInventoryMapResponse_(fullRes);
        if (normalized && normalized.ok && normalized.layoutVersion) {
          normalized.floor = requestFloor;
          const layoutOnly = Object.assign({}, normalized);
          delete layoutOnly.locationStates;
          writeInventoryMapLayoutToBrowserCache_(requestFloor, normalized.layoutVersion, layoutOnly);
        }
        normalized.locationStates = currentMapState || normalized.locationStates || {};
        normalized.memoLocations = currentMapMemoLocations || normalized.memoLocations || {};
        normalized.__layoutRenderReason = showedCached ? "layoutVersionChanged" : "cacheMissing";
        return normalized;
      });
  }).then(function(res) {
    if (!res || requestSeq !== inventoryMapOpenRequestSeq_ || currentMapFloor !== requestFloor) return null;
    if (!res.ok) throw new Error(res.message || "マップを取得できませんでした。");
    endSearchLoading_();
    const normalized = normalizeInventoryMapResponse_(res);
    normalized.floor = requestFloor;
    currentMapData = normalized;
    renderInventoryMap(normalized, normalized.__layoutRenderReason || (showedCached ? "layoutVersionChanged" : "cacheMissing"));
    applyInventoryMapStateOnly_(currentMapState);
    applyInventoryMapMemoMarkers_();
    showMapMessage("info", requestFloor === "2F" ? "2階を表示中です。" : "1階を表示中です。");
    return normalized;
  });

  return Promise.allSettled([statesPromise, metaPromise, layoutPromise]).then(function(results) {
    if (requestSeq !== inventoryMapOpenRequestSeq_ || currentMapFloor !== requestFloor) return currentMapData;
    const rejected = results.find(function(x) { return x.status === "rejected"; });
    if (rejected) {
      if (!showedCached) {
        endSearchLoading_();
        throw rejected.reason;
      }
      showMapMessage("error", rejected.reason && rejected.reason.message ? rejected.reason.message : String(rejected.reason));
    }
    startInventoryMapAutoRefresh_();
    return currentMapData || { ok: true, floor: requestFloor };
  }).catch(function(err) {
    if (requestSeq !== inventoryMapOpenRequestSeq_ || currentMapFloor !== requestFloor) return currentMapData;
    endSearchLoading_();
    if (!showedCached) showMapMessage("error", err && err.message ? err.message : String(err));
    throw err;
  });
}





/****************************************************
 * 棚卸しマップ 実表示反映 最終補正
 * ・取得済み書式をDOM/CSSへ必ず反映
 * ・transform縮小時の右/下余白を抑えるため、ラッパー寸法も倍率に同期
 * ・既存の検索/JAN/ロケ変更処理は変更しない
 ****************************************************/











function getMapCssBorderStyle_(sheetStyle) {
  const s = String(sheetStyle || "").toUpperCase();
  if (s === "DASHED") return "dashed";
  if (s === "DOTTED") return "dotted";
  if (s === "DOUBLE") return "double";
  return "solid";
}



function autoFitMapCellText_(div) {
  if (!div || !String(div.textContent || "").trim()) return;

  // 固定文字（シャッター・リフト等の非ロケ文字）は、初回描画時の文字サイズ/行高さを維持する。
  // 状態更新や遅延処理で font-size / line-height を再計算しない。
  if (div.dataset && div.dataset.fixedTextCell === "1") {
    div.dataset.autoFitDone = "1";
    return;
  }

  // 文字自動縮小は初回DOM生成直後だけ行う。
  // 一度縮小された現在値を次回基準にしないよう、必ずシート由来の元サイズから計算する。
  if (div.dataset && div.dataset.autoFitDone === "1") return;

  let size = parseFloat((div.dataset && div.dataset.originalFontSizePx) || div.style.fontSize || "16") || 16;
  const minSize = 7;
  let guard = 0;

  div.style.setProperty("font-size", size + "px", "important");

  while (size > minSize && guard < 40 && (div.scrollWidth > div.clientWidth + 1 || div.scrollHeight > div.clientHeight + 1)) {
    size -= 1;
    div.style.setProperty("font-size", size + "px", "important");
    guard++;
  }

  if (div.dataset) div.dataset.autoFitDone = "1";
}


function getInventoryMapBaseSize_() {
  if (currentInventoryMapOriginalLayoutMetrics_ &&
      currentInventoryMapOriginalLayoutMetrics_.baseWidth > 0 &&
      currentInventoryMapOriginalLayoutMetrics_.baseHeight > 0) {
    return {
      width: currentInventoryMapOriginalLayoutMetrics_.baseWidth,
      height: currentInventoryMapOriginalLayoutMetrics_.baseHeight
    };
  }

  const scale = document.getElementById("mapScale");
  const grid = document.getElementById("mapGrid");
  const w = Number((scale && scale.dataset && scale.dataset.baseWidth) || (grid && grid.dataset && grid.dataset.baseWidth) || 0);
  const h = Number((scale && scale.dataset && scale.dataset.baseHeight) || (grid && grid.dataset && grid.dataset.baseHeight) || 0);
  if (w > 0 && h > 0) return { width: w, height: h };

  // 現在表示サイズ・getBoundingClientRect・offsetWidth/clientWidth は元サイズとして使わない。
  // 元サイズが無い場合は、キャッシュなし/初回描画で renderInventoryMapGrid_ が確定するまで倍率変更しない。
  return null;
}

function setInventoryMapBaseSize_(baseWidth, baseHeight, gridTemplateColumns, gridTemplateRows, cellWidths, cellHeights) {
  const scale = document.getElementById("mapScale");
  const grid = document.getElementById("mapGrid");
  const w = Math.max(1, Math.ceil(Number(baseWidth || 1)));
  const h = Math.max(1, Math.ceil(Number(baseHeight || 1)));

  currentInventoryMapOriginalLayoutMetrics_ = {
    originalGridTemplateColumns: String(gridTemplateColumns || (grid && grid.style ? grid.style.gridTemplateColumns : "") || ""),
    originalGridTemplateRows: String(gridTemplateRows || (grid && grid.style ? grid.style.gridTemplateRows : "") || ""),
    originalCellWidths: (cellWidths || []).slice ? (cellWidths || []).slice() : [],
    originalCellHeights: (cellHeights || []).slice ? (cellHeights || []).slice() : [],
    originalGridWidth: w,
    originalGridHeight: h,
    baseWidth: w,
    baseHeight: h
  };

  if (scale && scale.dataset) {
    scale.dataset.baseWidth = String(w);
    scale.dataset.baseHeight = String(h);
  }
  if (grid && grid.dataset) {
    grid.dataset.baseWidth = String(w);
    grid.dataset.baseHeight = String(h);
    grid.dataset.originalGridTemplateColumns = currentInventoryMapOriginalLayoutMetrics_.originalGridTemplateColumns;
    grid.dataset.originalGridTemplateRows = currentInventoryMapOriginalLayoutMetrics_.originalGridTemplateRows;
    grid.dataset.originalGridWidth = String(w);
    grid.dataset.originalGridHeight = String(h);
    grid.dataset.originalCellWidths = JSON.stringify(currentInventoryMapOriginalLayoutMetrics_.originalCellWidths);
    grid.dataset.originalCellHeights = JSON.stringify(currentInventoryMapOriginalLayoutMetrics_.originalCellHeights);
  }

  // 元サイズは初回/許可された再描画時だけ確定。
  // ズーム・全体表示・状態更新・resizeでは mapScale/mapGrid の width/height を書き換えない。
  if (scale) {
    scale.style.width = w + "px";
    scale.style.height = h + "px";
    scale.style.minWidth = w + "px";
    scale.style.minHeight = h + "px";
    scale.style.setProperty("transform-origin", "0 0", "important");
  }
  if (grid) {
    grid.style.width = w + "px";
    grid.style.height = h + "px";
    grid.style.minWidth = w + "px";
    grid.style.minHeight = h + "px";
    grid.style.setProperty("transform", "none", "important");
    grid.style.setProperty("transform-origin", "0 0", "important");
  }
}

function clampInventoryMapScroll_() {
  const outer = document.getElementById("mapOuter");
  if (!outer) return;

  const base = getInventoryMapBaseSize_();
  const viewport = getInventoryMapOuterViewportSize_();
  if (!base || !viewport) return;

  const s = Math.max(0.01, Number(mapScaleValue || 1));
  const scaledW = Math.max(1, Math.ceil(Number(base.width || 1) * s));
  const scaledH = Math.max(1, Math.ceil(Number(base.height || 1) * s));
  const wrapperW = inventoryMapFitMode_ ? Math.max(scaledW, Math.floor(viewport.width)) : scaledW;
  const wrapperH = inventoryMapFitMode_ ? Math.max(scaledH, Math.floor(viewport.height)) : scaledH;
  const maxLeft = Math.max(0, wrapperW - viewport.width);
  const maxTop = Math.max(0, wrapperH - viewport.height);

  if (outer.scrollLeft > maxLeft) outer.scrollLeft = maxLeft;
  if (outer.scrollTop > maxTop) outer.scrollTop = maxTop;
  if (outer.scrollLeft < 0) outer.scrollLeft = 0;
  if (outer.scrollTop < 0) outer.scrollTop = 0;
}


function getInventoryMapOuterViewportSize_() {
  const outer = document.getElementById("mapOuter");
  if (!outer || !window.getComputedStyle) return null;

  // 全体表示・全画面表示の倍率計算に使う表示領域。
  // 禁止された getBoundingClientRect / offsetWidth / clientWidth / scrollWidth / scale後サイズは使わず、
  // CSSで確定済みの実表示サイズ（computed style の width/height）だけを使う。
  // この値は元レイアウトサイズとして保存せず、倍率算出用の一時値としてのみ使用する。
  const style = window.getComputedStyle(outer);
  const outerW = parseCssPixelValue_(style.width);
  const outerH = parseCssPixelValue_(style.height);
  if (!(outerW > 0) || !(outerH > 0)) return null;

  const padL = parseCssPixelValue_(style.paddingLeft);
  const padR = parseCssPixelValue_(style.paddingRight);
  const padT = parseCssPixelValue_(style.paddingTop);
  const padB = parseCssPixelValue_(style.paddingBottom);

  return {
    width: Math.max(1, outerW - padL - padR),
    height: Math.max(1, outerH - padT - padB),
    paddingLeft: padL,
    paddingTop: padT
  };
}

function parseCssPixelValue_(value) {
  const n = parseFloat(String(value || "0"));
  return Number.isFinite(n) ? n : 0;
}

function getInventoryMapCurrentGridTranslate_() {
  const grid = document.getElementById("mapGrid");
  if (!grid || !grid.dataset) return { x: 0, y: 0 };
  return {
    x: Number(grid.dataset.mapTranslateX || 0) || 0,
    y: Number(grid.dataset.mapTranslateY || 0) || 0
  };
}

function applyInventoryMapScaleTransform_() {
  const scale = document.getElementById("mapScale");
  const grid = document.getElementById("mapGrid");
  if (!scale || !grid) return;

  const base = getInventoryMapBaseSize_();
  if (!base) return;

  const s = Math.max(0.01, Number(mapScaleValue || 1));
  const baseWidth = Math.max(1, Math.ceil(base.width));
  const baseHeight = Math.max(1, Math.ceil(base.height));
  const scaledWidth = Math.max(1, Math.ceil(baseWidth * s));
  const scaledHeight = Math.max(1, Math.ceil(baseHeight * s));

  var wrapperWidth = scaledWidth;
  var wrapperHeight = scaledHeight;
  var tx = 0;
  var ty = 0;

  if (inventoryMapFitMode_) {
    var viewport = getInventoryMapOuterViewportSize_();
    if (viewport) {
      wrapperWidth = Math.max(scaledWidth, Math.floor(viewport.width));
      wrapperHeight = Math.max(scaledHeight, Math.floor(viewport.height));
      tx = Math.max(0, Math.round((wrapperWidth - scaledWidth) / 2));
      ty = Math.max(0, Math.round((wrapperHeight - scaledHeight) / 2));
    }
  }

  // mapScale はスクロール領域だけを担当し、transform を掛けない。
  // mapScale のサイズと transform translate/scale を二重に効かせると、初期表示・全体表示で右寄りに見える。
  scale.style.width = wrapperWidth + "px";
  scale.style.height = wrapperHeight + "px";
  scale.style.minWidth = wrapperWidth + "px";
  scale.style.minHeight = wrapperHeight + "px";
  scale.style.setProperty("transform", "none", "important");
  scale.style.setProperty("transform-origin", "0 0", "important");

  // mapGrid の元レイアウト幅・高さ・列幅・行高さは変更しない。
  // 見た目の拡大縮小と、全体表示時の中央配置だけを transform で行う。
  grid.style.setProperty("transform", "translate(" + tx + "px, " + ty + "px) scale(" + s + ")", "important");
  grid.style.setProperty("transform-origin", "0 0", "important");
  if (grid.dataset) {
    grid.dataset.mapTranslateX = String(tx);
    grid.dataset.mapTranslateY = String(ty);
  }
}

function updateInventoryMapScaleBoxSize_() {
  applyInventoryMapScaleTransform_();
  clampInventoryMapScroll_();
}


function fitInventoryMapToScreen_() {
  const outer = document.getElementById("mapOuter");
  if (!outer) return;

  const base = getInventoryMapBaseSize_();
  if (!base) return;

  // 全体表示は保存済み元サイズと表示領域サイズだけから倍率を計算する。
  // getBoundingClientRect / offsetWidth / clientWidth を元サイズとして保存しない。
  const rawW = Math.max(1, Number(base.width || 1));
  const rawH = Math.max(1, Number(base.height || 1));
  const viewport = getInventoryMapOuterViewportSize_();
  if (!viewport) return;
  const availableW = viewport.width;
  const availableH = viewport.height;
  const nextScale = Math.round(Math.min(1, availableW / rawW, availableH / rawH) * 10000) / 10000;

  mapMinScaleValue = Math.max(0.03, nextScale);
  mapScaleValue = mapMinScaleValue;
  inventoryMapFitMode_ = true;
  outer.style.overflow = "hidden";
  applyInventoryMapScaleTransform_();
  outer.scrollLeft = 0;
  outer.scrollTop = 0;
  updateMapZoomLabel_();
}

function setInventoryMapScale_(nextScale, centerClientX, centerClientY, options) {
  const outer = document.getElementById("mapOuter");
  const scale = document.getElementById("mapScale");
  if (!outer || !scale) return;

  inventoryMapFitMode_ = false;
  outer.style.overflow = "auto";

  const oldScale = Math.max(0.01, Number(mapScaleValue || 1));
  nextScale = Math.max(mapMinScaleValue || 0.03, Math.min(4, Number(nextScale || oldScale)));
  // 小数点誤差が次回の基準へ蓄積しないよう、倍率だけを丸めて管理する。
  nextScale = Math.round(nextScale * 10000) / 10000;

  const viewport = getInventoryMapOuterViewportSize_();
  const currentTranslate = getInventoryMapCurrentGridTranslate_();
  let centerX = viewport ? viewport.width / 2 : 0;
  let centerY = viewport ? viewport.height / 2 : 0;
  let contentX = (outer.scrollLeft + centerX - currentTranslate.x) / oldScale;
  let contentY = (outer.scrollTop + centerY - currentTranslate.y) / oldScale;

  // ピンチズームだけは、開始時に保存した「指でつまんだマップ上の位置」を基準にする。
  // ＋/－ボタンは従来通り画面中央基準、全体表示は fitInventoryMapToScreen_ の中央寄せを維持する。
  if (options && options.mode === "pinch") {
    const pinchViewportPos = getInventoryMapPointInViewport_(outer, centerClientX, centerClientY);
    centerX = pinchViewportPos.x;
    centerY = pinchViewportPos.y;
    contentX = Number(options.mapX || 0);
    contentY = Number(options.mapY || 0);
  }

  mapScaleValue = nextScale;
  applyInventoryMapScaleTransform_();

  outer.scrollLeft = Math.max(0, Math.round(contentX * mapScaleValue - centerX));
  outer.scrollTop = Math.max(0, Math.round(contentY * mapScaleValue - centerY));
  clampInventoryMapScroll_();
  updateMapZoomLabel_();
}


/****************************************************
 * 棚卸しマップ 書式反映・余白・ロケ状態 正規化 最終補正
 * 既存の検索/JAN/ロケ変更処理には触れない。
 ****************************************************/

function normalizeInventoryLocationKey_(value) {
  var v = String(value || "")
    .normalize("NFKC")
    .trim()
    .replace(/[\u00A0\u3000]/g, " ")
    .replace(/[‐‑‒–—―ー－−﹣－\-]+/g, "-")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .toUpperCase();

  var compact = v.replace(/\s+/g, "");
  var m = compact.match(/^([A-Z]+)-?(\d+)$/);
  if (m) return m[1] + "-" + m[2];
  return v;
}

function getInventoryMapStateForLocation_(stateMap, value) {
  stateMap = stateMap || {};
  var raw = String(value || "");
  var normalized = normalizeInventoryLocationKey_(raw);
  return stateMap[raw] || stateMap[normalized] || stateMap[raw.trim()] || "";
}

function getInventoryMapCacheKey_(floor, version) {
  return "inventoryMapLayout:v" + INVENTORY_MAP_CACHE_SCHEMA_VERSION + ":" + String(floor || "1F") + ":" + String(version || "");
}

function normalizeLegacyInventoryMapCoordinate_(value, start) {
  var n = Number(value || 1);
  var s = Number(start || 1);
  if (!isFinite(n) || n < 1) n = 1;
  if (!isFinite(s) || s < 1) s = 1;
  return n + s - 1;
}

function normalizeInventoryMapResponse_(res) {
  if (!res || !res.ok) return res;

  if (!res.compact) {
    var sr0 = Number(res.startRow || 1);
    var sc0 = Number(res.startCol || 1);
    res.layoutVersion = res.layoutVersion || res.v || "";

    // 旧キャッシュでは、セルrow/colが有効範囲内の相対座標で保存されていた。
    // そのまま描画すると下側の「シャッター」「ドア」や線だけセルが上へ詰まるため、
    // キャッシュ復元時点で元スプレッドシートの絶対row/colへ戻す。
    if ((sr0 > 1 || sc0 > 1) && !res.__absoluteCoordinateNormalized) {
      (res.cells || []).forEach(function(cell) {
        if (!cell) return;
        cell.row = normalizeLegacyInventoryMapCoordinate_(cell.row, sr0);
        cell.col = normalizeLegacyInventoryMapCoordinate_(cell.col, sc0);
      });
      res.rowHeights = new Array(Math.max(0, sr0 - 1)).fill(36).concat(res.rowHeights || []);
      res.colWidths = new Array(Math.max(0, sc0 - 1)).fill(64).concat(res.colWidths || []);
      res.rows = Math.max(Number(res.rows || 1), sr0 + Number(res.rows || 1) - 1);
      res.cols = Math.max(Number(res.cols || 1), sc0 + Number(res.cols || 1) - 1);
      res.startRow = 1;
      res.startCol = 1;
      res.__absoluteCoordinateNormalized = true;
    }
    return res;
  }

  var compactStartRow = Number(res.sr || res.startRow || 1);
  var compactStartCol = Number(res.sc || res.startCol || 1);

  var styles = (res.st || []).map(function(s) {
    var b = s && s[6] ? s[6] : null;
    var expandedBorders = expandInventoryMapBorders_(b);
    return {
      background: s && s[0] ? s[0] : "",
      fontColor: s && s[1] ? s[1] : "",
      fontWeight: s && s[2] ? s[2] : "",
      fontSize: s && s[3] ? s[3] : "",
      hasBorder: !!(s && s[4]) || hasAnyVisibleMapBorder_(expandedBorders),
      borderColor: s && s[5] ? s[5] : "",
      borders: expandedBorders
    };
  });

  var compactRowHeights = new Array(Math.max(0, compactStartRow - 1)).fill(36).concat(res.rh || res.rowHeights || []);
  var compactColWidths = new Array(Math.max(0, compactStartCol - 1)).fill(64).concat(res.cw || res.colWidths || []);

  var cells = (res.ce || []).map(function(c) {
    var styleIndex = Number(c[6] || 0);
    return {
      row: normalizeLegacyInventoryMapCoordinate_(c[0], compactStartRow),
      col: normalizeLegacyInventoryMapCoordinate_(c[1], compactStartCol),
      rowspan: Number(c[2] || 1),
      colspan: Number(c[3] || 1),
      value: c[4] || "",
      isLocation: !!c[5],
      style: styles[styleIndex] || {}
    };
  });

  return {
    ok: true,
    status: res.status || "ok",
    floor: res.f || res.floor || currentMapFloor || "1F",
    sheetName: res.sn || res.sheetName || "",
    layoutVersion: res.v || res.layoutVersion || "",
    rows: Math.max(Number(res.r || res.rows || 1), compactStartRow + Number(res.r || res.rows || 1) - 1),
    cols: Math.max(Number(res.c || res.cols || 1), compactStartCol + Number(res.c || res.cols || 1) - 1),
    originalRows: Number(res.or || res.originalRows || 1),
    originalCols: Number(res.oc || res.originalCols || 1),
    startRow: Number(res.sr || res.startRow || 1),
    startCol: Number(res.sc || res.startCol || 1),
    rowHeights: compactRowHeights,
    colWidths: compactColWidths,
    cells: cells,
    locationStates: res.locationStates || {},
    memoLocations: res.memoLocations || {}
  };
}

function isMapStyleWhite_(color) {
  var c = String(color || "").trim().toLowerCase().replace(/\s+/g, "");
  return !c || c === "#fff" || c === "#ffffff" || c === "white" || c === "rgb(255,255,255)";
}

function getMapCssSizePx_(value, fallback, minValue) {
  var n = Number(value || fallback || 0);
  if (!isFinite(n) || n <= 0) return Math.max(minValue || 1, Number(fallback || minValue || 1));
  return Math.max(minValue || 1, Math.round(n));
}

function getMapCssFontPxFromSheetPt_(pt) {
  var n = Number(pt || 12);
  if (!isFinite(n) || n <= 0) return 16;
  // Google SheetsのptをブラウザCSS pxへ変換。20ptなら約27pxで表示される。
  return Math.max(8, Math.min(96, Math.round(n * 1.333)));
}

function hasAnyVisibleMapBorder_(borders) {
  if (!borders) return false;
  return ["top", "right", "bottom", "left"].some(function(side) {
    var b = borders[side] || {};
    var borderStyle = String(b.style || "").trim().toUpperCase();
    return !!(
      b.visible ||
      Number(b.width || 0) > 0 ||
      String(b.color || "").trim() ||
      (borderStyle && borderStyle !== "NONE")
    );
  });
}

function renderInventoryMapGrid_(grid, data, readOnly) {
  if (!grid) return;

  data = normalizeInventoryMapResponse_(data);
  var stateMap = (data && data.locationStates) || currentMapState || {};
  var rows = Number(data.rows || 1);
  var cols = Number(data.cols || 1);
  var rowHeights = data.rowHeights || [];
  var colWidths = data.colWidths || [];
  var portraitMap = shouldUsePortraitMapLayout_();
  var cells = data.cells || [];

  grid.innerHTML = "";
  currentInventoryMapOriginalLayoutMetrics_ = null;
  grid.style.gap = "0px";
  grid.style.alignItems = "stretch";
  grid.style.justifyContent = "start";
  grid.style.boxSizing = "border-box";
  grid.style.padding = INVENTORY_MAP_VIEW_PADDING_PX + "px";

  function mappedCellInfo_(cell) {
    var value = cell.value || "";
    var row = Number(cell.row || 1);
    var col = Number(cell.col || 1);
    var rowspan = Number(cell.rowspan || 1);
    var colspan = Number(cell.colspan || 1);
    var style = cell.style || {};
    var hasSpreadsheetBorder = !!(style && (style.hasBorder || hasAnyVisibleMapBorder_(style.borders)));
    var hasVisibleBackground = !!(style && style.background && !isMapStyleWhite_(style.background));
    var meaningful = !!(
      String(value || "").trim() ||
      hasSpreadsheetBorder ||
      hasVisibleBackground ||
      rowspan > 1 ||
      colspan > 1 ||
      cell.isLocation ||
      isInventoryLocationText_(value)
    );

    if (portraitMap) {
      return {
        cell: cell,
        value: value,
        rowStart: cols - col - colspan + 2,
        rowSpan: colspan,
        colStart: row,
        colSpan: rowspan,
        meaningful: meaningful
      };
    }

    return {
      cell: cell,
      value: value,
      rowStart: row,
      rowSpan: rowspan,
      colStart: col,
      colSpan: colspan,
      meaningful: meaningful
    };
  }

  var mapped = cells.map(mappedCellInfo_);
  var displayRows = portraitMap ? cols : rows;
  var displayCols = portraitMap ? rows : cols;

  // 元スプレッドシート上の row / col / rowSpan / colSpan を詰めずに CSS grid へ反映する。
  // 線だけセル・枠線だけセルの追加で、固定文字セルやロケセルの基準行/列がズレないようにする。
  var minRow = 1;
  var minCol = 1;
  var maxRow = displayRows;
  var maxCol = displayCols;

  var colTrackSizes;
  var rowTrackSizes;

  if (portraitMap) {
    colTrackSizes = rowHeights.slice(0, rows).map(function(h) {
      return getMapCssSizePx_(h, 36, 8) + "px";
    });
    rowTrackSizes = colWidths.slice(0, cols).reverse().map(function(w) {
      return getMapCssSizePx_(w, 64, 8) + "px";
    });
  } else {
    colTrackSizes = colWidths.slice(0, cols).map(function(w) {
      return getMapCssSizePx_(w, 64, 8) + "px";
    });
    rowTrackSizes = rowHeights.slice(0, rows).map(function(h) {
      return getMapCssSizePx_(h, 36, 8) + "px";
    });
  }

  var visibleColTracks = colTrackSizes.slice(minCol - 1, maxCol);
  var visibleRowTracks = rowTrackSizes.slice(minRow - 1, maxRow);

  grid.style.gridTemplateColumns = visibleColTracks.join(" ") || ("repeat(" + (maxCol - minCol + 1) + ", 64px)");
  grid.style.gridTemplateRows = visibleRowTracks.join(" ") || ("repeat(" + (maxRow - minRow + 1) + ", 36px)");

  var baseGridWidth = visibleColTracks.reduce(function(sum, v) { return sum + (parseFloat(v) || 0); }, 0) + INVENTORY_MAP_VIEW_PADDING_PX * 2;
  var baseGridHeight = visibleRowTracks.reduce(function(sum, v) { return sum + (parseFloat(v) || 0); }, 0) + INVENTORY_MAP_VIEW_PADDING_PX * 2;
  if (!baseGridWidth || baseGridWidth < 1) baseGridWidth = (maxCol - minCol + 1) * 64 + INVENTORY_MAP_VIEW_PADDING_PX * 2;
  if (!baseGridHeight || baseGridHeight < 1) baseGridHeight = (maxRow - minRow + 1) * 36 + INVENTORY_MAP_VIEW_PADDING_PX * 2;
  setInventoryMapBaseSize_(
    baseGridWidth,
    baseGridHeight,
    grid.style.gridTemplateColumns,
    grid.style.gridTemplateRows,
    visibleColTracks.map(function(v) { return parseFloat(v) || 0; }),
    visibleRowTracks.map(function(v) { return parseFloat(v) || 0; })
  );

  mapped.forEach(function(info) {
    var cell = info.cell;
    var value = info.value;
    var rowEnd = info.rowStart + info.rowSpan - 1;
    var colEnd = info.colStart + info.colSpan - 1;

    if (rowEnd < minRow || info.rowStart > maxRow || colEnd < minCol || info.colStart > maxCol) return;

    var div = document.createElement("div");
    var isLocation = !!cell.isLocation || isInventoryLocationText_(value);
    var state = isLocation ? getInventoryMapStateForLocation_(stateMap, value) : "";
    var row = Number(cell.row || 1);
    var col = Number(cell.col || 1);
    var rowspan = Number(cell.rowspan || 1);
    var colspan = Number(cell.colspan || 1);
    var style = cell.style || {};
    var hasSpreadsheetBorder = !!(style && (style.hasBorder || hasAnyVisibleMapBorder_(style.borders)));
    var hasVisibleBackground = !!(style && style.background && !isMapStyleWhite_(style.background));

    div.className = "mapCell " + getMapStateClass_(state);
    div.textContent = value;
    div.title = value;
    if (isLocation) {
      div.dataset.mapLocation = value;
      div.dataset.mapLocationKey = normalizeInventoryLocationKey_(value);
    }

    div.style.gridColumn = String(info.colStart - minCol + 1) + " / span " + String(info.colSpan);
    div.style.gridRow = String(info.rowStart - minRow + 1) + " / span " + String(info.rowSpan);

    applyMapCellSpreadsheetStyle_(div, style, isLocation, state, value);

    if (!readOnly && value && isLocation) {
      div.onclick = function() { openMapActionSheet(value); };
    } else {
      div.classList.add("mapCellBlank");
      if (!String(value || "").trim() && !hasSpreadsheetBorder && !hasVisibleBackground && !(rowspan > 1 || colspan > 1)) {
        div.classList.add("mapCellEmpty");
      } else if (hasSpreadsheetBorder) {
        div.classList.add("mapCellHasBorder");
        div.classList.remove("mapCellEmpty", "mapCellNoBorder");
      }
    }

    grid.appendChild(div);
  });

  const gridRenderSeq = inventoryMapLayoutRenderSeq_;
  requestAnimationFrame(function() {
    if (gridRenderSeq !== inventoryMapLayoutRenderSeq_) return;
    // 固定文字セルは初回描画後も文字サイズ・行高・paddingを再計算しない。
    // 自動縮小対象はロケ状態セルだけに限定する。
    Array.prototype.forEach.call(grid.querySelectorAll(".mapCell[data-map-location-key]"), autoFitMapCellText_);
    updateInventoryMapScaleBoxSize_();
  });

  setupMapPinch_();
}

function applyMapCellSpreadsheetStyle_(div, style, isLocation, state, value) {
  style = style || {};

  // ロケセルは状態色を優先。その他のセルはスプレッドシート背景色を実反映。
  if (!isLocation && style.background) {
    div.style.setProperty("background-color", style.background, "important");
  }

  var color = style.fontColor || "#000000";
  if (isLocation) color = "#000000";
  div.style.setProperty("color", color, "important");

  var weight = String(style.fontWeight || "").toLowerCase() === "bold" ? "950" : "900";
  div.style.setProperty("font-weight", weight, "important");

  var fontPx = getMapCssFontPxFromSheetPt_(style.fontSize || 12);
  var hasText = !!String(value || "").trim();
  var isFixedTextCell = !isLocation && hasText;
  if (div.dataset) {
    div.dataset.originalFontSizePx = String(fontPx);
    div.dataset.fixedTextCell = isFixedTextCell ? "1" : "0";
  }
  div.style.setProperty("font-size", fontPx + "px", "important");
  // 固定文字セルはズーム・全体表示・状態更新で再計算しない前提で、px固定の行高にする。
  // line-height: 1.xx の相対値にすると端末/倍率で丸め差が出て文字が重なって見える場合がある。
  div.style.setProperty("line-height", isFixedTextCell ? Math.ceil(fontPx * 1.28) + "px" : "1.12", "important");
  div.style.setProperty("min-width", "0", "important");
  div.style.setProperty("min-height", "0", "important");
  div.style.setProperty("border-radius", "0", "important");
  div.style.setProperty("padding", isFixedTextCell ? "0px" : "1px", "important");
  if (isFixedTextCell) {
    div.classList.add("mapCellFixedText");
  }

  applyMapCellBorderStyle_(div, style);
}

function isVisibleMapBorderSide_(border) {
  if (!border) return false;
  var borderStyle = String(border.style || "").trim().toUpperCase();
  return !!(
    border.visible ||
    Number(border.width || 0) > 0 ||
    String(border.color || "").trim() ||
    (borderStyle && borderStyle !== "NONE")
  );
}

function applyMapCellBorderStyle_(div, style) {
  style = style || {};
  var borders = style && style.borders ? style.borders : null;
  var hasVisibleSideBorder = hasAnyVisibleMapBorder_(borders);
  var useFallbackFullBorder = !!(style.hasBorder && !hasVisibleSideBorder);

  ["top", "right", "bottom", "left"].forEach(function(side) {
    var border = borders ? (borders[side] || {}) : null;

    if (isVisibleMapBorderSide_(border)) {
      div.style.setProperty("border-" + side + "-style", getMapCssBorderStyle_(border.style), "important");
      div.style.setProperty("border-" + side + "-width", String(border.width || 1) + "px", "important");
      div.style.setProperty("border-" + side + "-color", border.color || style.borderColor || "#4b5563", "important");
    } else if (useFallbackFullBorder) {
      // Apps Script 側/古いキャッシュで hasBorder=true だが辺別 borders が欠けている場合も、
      // 線だけセル・枠線だけセルを空白セルとして消さずに表示する。
      div.style.setProperty("border-" + side + "-style", "solid", "important");
      div.style.setProperty("border-" + side + "-width", "1px", "important");
      div.style.setProperty("border-" + side + "-color", style.borderColor || "#4b5563", "important");
    } else {
      div.style.setProperty("border-" + side + "-style", "solid", "important");
      div.style.setProperty("border-" + side + "-width", "0px", "important");
      div.style.setProperty("border-" + side + "-color", "transparent", "important");
    }
  });

  var hasAnyBorder = !!(style.hasBorder || hasAnyVisibleMapBorder_(style.borders));
  div.classList.toggle("mapCellHasBorder", hasAnyBorder);
  div.classList.toggle("mapCellNoBorder", !hasAnyBorder);
}
