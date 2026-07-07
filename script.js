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
const SCAN_START_SUSPICIOUS_MS = 450;
const SUSPICIOUS_CONFIRM_COUNT = 3;
const GUIDE_ROI_X_MARGIN_RATIO = 0.12;
const GUIDE_ROI_Y_MARGIN_RATIO = 0.34;
const GUIDE_ROI_SOFT_MARGIN_RATIO = 0.08;
const CAMERA_IDEAL_WIDTH_PRIMARY = 1920;
const CAMERA_IDEAL_HEIGHT_PRIMARY = 1080;
const CAMERA_IDEAL_WIDTH_FALLBACK = 1280;
const CAMERA_IDEAL_HEIGHT_FALLBACK = 720;
const CAMERA_IDEAL_FPS_PRIMARY = 60;
const CAMERA_IDEAL_FPS_FALLBACK = 30;

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
let mapScaleValue = 1;
let mapPinchStartDistance = 0;
let mapPinchStartScale = 1;
let currentMapData = null;
let currentInventoryMarkedListActive = false;
let currentInventoryMarkedListLocation = "";
let currentInventoryMarkedListTitle = "";
let currentInventoryBackButtonLabel = "記入済商品一覧へ戻る";

function initApp_() {
  setAppVersion();
  checkAppVersionUpdate_();
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


function showMainSection(section) {
  activeSection = section || "menu";

  const menu = document.getElementById("mainMenu");
  const search = document.getElementById("searchView");
  const inv = document.getElementById("inventoryView");
  const map = document.getElementById("mapView");

  if (menu) menu.classList.toggle("hidden", activeSection !== "menu");
  if (search) search.classList.toggle("hidden", activeSection !== "search");
  if (inv) inv.classList.toggle("hidden", activeSection !== "inventory");
  if (map) map.classList.toggle("hidden", activeSection !== "map");
  if (document.body) document.body.classList.toggle("map-active", activeSection === "map");

  if (activeSection === "search") {
    scannerMode = "search";
    setTimeout(function() {
      const textInput = document.getElementById("textInput");
      if (textInput) textInput.focus();
    }, 0);
  }

  if (activeSection === "map") {
    loadInventoryMap(currentMapFloor || "1F");
  }
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

function checkAppVersionUpdate_() {
  fetch("version.json?ts=" + Date.now(), { cache: "no-store" })
    .then(function(res) {
      if (!res.ok) return null;
      return res.json();
    })
    .then(function(data) {
      const latestVersion = data && data.version ? String(data.version) : "";
      if (latestVersion && latestVersion !== String(APP_VERSION)) {
        forceReloadWithLatestVersion_(latestVersion);
      }
    })
    .catch(function() {});
}

function forceReloadWithLatestVersion_(latestVersion) {
  try {
    var safeLatestVersion = String(latestVersion || "").replace(/[^0-9A-Za-z._-]/g, "");
    if (!safeLatestVersion) {
      window.location.reload();
      return;
    }

    try {
      localStorage.setItem("stockAppLatestVersion", safeLatestVersion);
    } catch (e) {}

    var url = new URL(window.location.href);
    url.searchParams.set("appVersion", safeLatestVersion);
    url.searchParams.set("cacheBust", Date.now());
    window.location.replace(url.toString());
  } catch (e) {
    window.location.reload();
  }
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

  setTimeout(function() {
    window.scrollTo(0, resultListReturnScrollY || 0);
  }, 0);
}

function goTopHome() {
  showMainSection("menu");
  clearAll();

  const confirmModal = document.getElementById("confirmModal");
  if (confirmModal) confirmModal.classList.remove("show");

  const completeModal = document.getElementById("completeModal");
  if (completeModal) completeModal.classList.remove("show");

  setTimeout(function() {
    window.scrollTo(0, 0);
    const textInput = document.getElementById("textInput");
    if (textInput) textInput.focus();
  }, 0);
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
  const clearFocusTextInput = document.getElementById("textInput");
  if (clearFocusTextInput && activeSection === "search") clearFocusTextInput.focus();
}


async function toggleScanner() {
  if (scannerRunning) {
    await closeScannerManual();
    return;
  }

  scannerMode = activeSection === "inventory" ? "inventory" : "search";

  if (typeof ZXing === "undefined") {
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

    currentStream = video.srcObject || null;
    currentVideoTrack = currentStream && currentStream.getVideoTracks ?
      (currentStream.getVideoTracks()[0] || null) : null;
    setupCameraCapabilities_();
    requestCenterFocus_();

  } catch (err) {
    await stopScanner();
    closeScannerView_();
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

function openScannerView_() {
  const box = document.getElementById("scannerBox");
  document.body.classList.add("scanner-open");
  if (box) {
    box.classList.add("show");
    box.setAttribute("aria-hidden", "false");
  }
}

function closeScannerView_() {
  const box = document.getElementById("scannerBox");
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

function getTouchDistance_(a, b) {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.sqrt(dx * dx + dy * dy);
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
  if (!currentVideoTrack || !currentVideoTrack.applyConstraints) return;

  try {
    currentVideoTrack.applyConstraints({
      advanced: [
        { focusMode: "continuous" },
        { pointsOfInterest: [{ x: 0.5, y: 0.5 }] }
      ]
    }).catch(function() {});
  } catch (e) {}
}

async function stopScanner() {
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
    .replace(/[－ー―]/g, "-")
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
  if (text) text.value = "";
  if (jan) jan.value = "";
  if (hinban) hinban.value = "";
  if (name) name.value = "";
  if (color) color.value = "";
  if (size) size.value = "";
  if (location) location.value = "";
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

function inventoryBackToEntry() {
  selectedInventoryItem = null;
  currentInventoryMarkedListActive = false;
  currentInventoryMarkedListLocation = "";
  currentInventoryMarkedListTitle = "";
  currentInventoryBackButtonLabel = "記入済商品一覧へ戻る";

  const productCard = document.getElementById("inventoryProductCard");
  const listCard = document.getElementById("inventoryListCard");
  if (productCard) productCard.classList.add("hidden");
  if (listCard) listCard.classList.add("hidden");

  updateInventoryBackToMarkedListButton_();
  hideInventoryMessage();
}

function inventorySearch() {
  inventoryClearDisplayOnly_();

  const payload = {
    text: (document.getElementById("invTextInput") || {}).value || "",
    jan: (document.getElementById("invJanInput") || {}).value || "",
    hinban: (document.getElementById("invHinbanInput") || {}).value || "",
    name: (document.getElementById("invNameInput") || {}).value || "",
    color: (document.getElementById("invColorInput") || {}).value || "",
    size: (document.getElementById("invSizeInput") || {}).value || "",
    location: (document.getElementById("invLocationInput") || {}).value || ""
  };

  if (!String(payload.text || "").trim() && !String(payload.jan || "").trim() && !String(payload.hinban || "").trim() && !String(payload.name || "").trim() && !String(payload.color || "").trim() && !String(payload.size || "").trim() && !String(payload.location || "").trim()) {
    showInventoryMessage("error", "検索条件を入力してください。");
    return;
  }

  beginSearchLoading_();
  callGas("inventorySearch", payload)
    .then(function(res) {
      endSearchLoading_();
      if (!res || !res.ok) {
        showInventoryMessage("error", res && res.message ? res.message : "商品が見つかりませんでした。");
        return;
      }

      const items = res.items || [];
      if (items.length === 1) {
        inventorySelectItem(items[0]);
        showInventoryMessage("success", "商品を見つけました。");
        return;
      }

      inventoryRenderList(items, "検索結果");
      showInventoryMessage("info", items.length + "件見つかりました。商品を選んでください。");
    })
    .catch(function(err) {
      endSearchLoading_();
      showInventoryMessage("error", err && err.message ? err.message : String(err));
    });
}

function updateInventoryBackToMarkedListButton_() {
  const btn = document.getElementById("inventoryBackToMarkedListBtn");
  if (!btn) return;
  btn.textContent = currentInventoryBackButtonLabel || "一覧へ戻る";
  btn.classList.toggle("hidden", !currentInventoryMarkedListActive);
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
  inventorySetCurrentStatus_("記入済");
}

function inventoryUnmarkCurrent() {
  inventorySetCurrentStatus_("");
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
    inventorySelectItem(selectedInventoryItem);

    if (status !== "記入済" && currentInventoryMarkedListActive) {
      inventoryReloadMarkedList_();
      return;
    }

    showInventoryMessage("success", status === "記入済" ? "記入済にしました。" : "記入済を解除しました。");
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

function inventoryRenderList(items, title, keepReturnState) {
  if (!keepReturnState) {
    currentInventoryMarkedListActive = false;
    currentInventoryMarkedListLocation = "";
    currentInventoryMarkedListTitle = "";
    currentInventoryBackButtonLabel = "記入済商品一覧へ戻る";
  }
  const card = document.getElementById("inventoryListCard");
  const titleEl = document.getElementById("inventoryListTitle");
  const list = document.getElementById("inventoryList");
  if (!card || !list) return;

  currentInventoryMarkedListTitle = title || "一覧";
  if (titleEl) titleEl.textContent = currentInventoryMarkedListTitle;
  updateInventoryBackToMarkedListButton_();
  list.innerHTML = "";

  (items || []).forEach(function(item) {
    const div = document.createElement("div");
    div.className = "resultItem";
    div.innerHTML =
      "<div><strong>" + escapeHtml(item.hinban) + "</strong> / " + escapeHtml(item.name) + "</div>" +
      "<div class=\"small\">JAN：" + escapeHtml(item.jan) + "</div>" +
      "<div class=\"small\">色：" + escapeHtml(item.color) + " / サイズ：" + escapeHtml(item.size) + "</div>" +
      "<div class=\"small\">現在ロケ：" + escapeHtml(item.location || "未設定") + " / 状態：" + escapeHtml(item.inventoryStatus || "未記入") + "</div>";
    div.onclick = function() {
      inventorySelectItem(item);
      card.classList.add("hidden");
    };
    list.appendChild(div);
  });

  if (!(items || []).length) {
    list.innerHTML = "<div class=\"small\">該当商品はありません。</div>";
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

function loadInventoryMap(floor) {
  currentMapFloor = floor || currentMapFloor || "1F";
  hideMapMessage();

  beginSearchLoading_();
  callGas("inventoryGetMap", { floor: currentMapFloor })
    .then(function(res) {
      endSearchLoading_();
      if (!res || !res.ok) {
        showMapMessage("error", res && res.message ? res.message : "マップを取得できませんでした。");
        return;
      }
      currentMapState = res.locationStates || {};
      currentMapData = res;
      renderInventoryMap(res);
      showMapMessage("info", currentMapFloor === "2F" ? "2階を表示中です。" : "1階を表示中です。");
    })
    .catch(function(err) {
      endSearchLoading_();
      showMapMessage("error", err && err.message ? err.message : String(err));
    });
}

function renderInventoryMap(data) {
  const grid = document.getElementById("mapGrid");
  renderInventoryMapGrid_(grid, data, false);
}

function renderInventoryMapGrid_(grid, data, readOnly) {
  if (!grid) return;

  const stateMap = (data && data.locationStates) || currentMapState || {};
  const rows = Number(data.rows || 1);
  const cols = Number(data.cols || 1);
  const portraitMap = shouldUsePortraitMapLayout_();
  grid.innerHTML = "";
  grid.style.gridTemplateColumns = "repeat(" + (portraitMap ? rows : cols) + ", minmax(64px, 88px))";
  grid.style.gridTemplateRows = "repeat(" + (portraitMap ? cols : rows) + ", minmax(36px, 44px))";

  const cells = data.cells || [];
  cells.forEach(function(cell) {
    const div = document.createElement("div");
    const value = cell.value || "";
    const isLocation = !!cell.isLocation || isInventoryLocationText_(value);
    const state = isLocation ? (stateMap[value] || "") : "";
    const row = Number(cell.row || 1);
    const col = Number(cell.col || 1);
    const rowspan = Number(cell.rowspan || 1);
    const colspan = Number(cell.colspan || 1);
    const style = cell.style || {};

    div.className = "mapCell " + getMapStateClass_(state);
    div.textContent = value;
    const rotatedRow = cols - col - colspan + 2;
    div.style.gridColumn = portraitMap ? String(row) + " / span " + String(rowspan) : String(col) + " / span " + String(colspan);
    div.style.gridRow = portraitMap ? String(rotatedRow) + " / span " + String(colspan) : String(row) + " / span " + String(rowspan);
    div.title = value;

    applyMapCellSpreadsheetStyle_(div, style, isLocation, state, value);

    if (!readOnly && value && isLocation) {
      div.onclick = function() {
        openMapActionSheet(value);
      };
    } else {
      div.classList.add("mapCellBlank");
      if (!String(value || "").trim()) div.classList.add("mapCellEmpty");
    }

    grid.appendChild(div);
  });

  setupMapPinch_();
}

function applyMapCellSpreadsheetStyle_(div, style, isLocation, state, value) {
  style = style || {};

  if (!isLocation && style.background) {
    div.style.backgroundColor = style.background;
  }

  if (style.fontColor) {
    div.style.color = style.fontColor;
  }

  if (isLocation || !style.fontColor) {
    div.style.color = "#000000";
  }

  if (style.fontWeight) {
    div.style.fontWeight = String(style.fontWeight).toLowerCase() === "bold" ? "950" : "900";
  } else {
    div.style.fontWeight = "950";
  }

  const fontSize = Number(style.fontSize || 12);
  if (fontSize) {
    const textLen = String(value || "").length;
    const maxSize = textLen >= 8 ? 11 : textLen >= 5 ? 12 : 14;
    div.style.fontSize = Math.max(9, Math.min(fontSize, maxSize)) + "px";
  }

  if (style.borderColor && String(value || "").trim()) {
    div.style.borderColor = style.borderColor;
  }

  if (isLocation) {
    div.classList.add("mapCellAutoFit");
  }
}

function shouldUsePortraitMapLayout_() {
  return window.innerHeight > window.innerWidth;
}

function getMapStateClass_(state) {
  if (state === "途中") return "mapStateProgress";
  if (state === "完了") return "mapStateDone";
  return "mapStateBlank";
}

function openMapActionSheet(location) {
  if (!isInventoryLocationText_(location)) return;
  selectedMapLocation = location || "";
  const state = currentMapState[selectedMapLocation] || "";
  const back = document.getElementById("mapActionSheet");
  const loc = document.getElementById("mapSheetLocation");
  const st = document.getElementById("mapSheetState");
  if (loc) loc.textContent = "📍 ロケ：" + selectedMapLocation;
  if (st) st.textContent = "現在：" + (state === "途中" ? "🟨途中" : state === "完了" ? "🟩完了" : "⬜空欄");
  if (back) back.classList.add("show");
}

function closeMapActionSheet() {
  const back = document.getElementById("mapActionSheet");
  if (back) back.classList.remove("show");
}

function mapSetSelectedLocationState(state) {
  if (!selectedMapLocation || !isInventoryLocationText_(selectedMapLocation)) return;

  beginSearchLoading_();
  callGas("inventorySetLocationState", {
    location: selectedMapLocation,
    status: state || ""
  }).then(function(res) {
    endSearchLoading_();
    if (!res || !res.ok) {
      showMapMessage("error", res && res.message ? res.message : "ロケ状態の保存に失敗しました。");
      return;
    }
    closeMapActionSheet();
    loadInventoryMap(currentMapFloor);
  }).catch(function(err) {
    endSearchLoading_();
    showMapMessage("error", err && err.message ? err.message : String(err));
  });
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
      loadInventoryMap(currentMapFloor);
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

function openMapOverview() {
  const back = document.getElementById("mapOverviewBack");
  if (back) back.classList.add("show");
  loadMapOverview(currentMapFloor || "1F");
}

function closeMapOverview() {
  const back = document.getElementById("mapOverviewBack");
  if (back) back.classList.remove("show");
}

function loadMapOverview(floor) {
  const targetFloor = floor || currentMapFloor || "1F";
  const title = document.getElementById("mapOverviewTitle");
  if (title) title.textContent = "棚卸しマップ 全体図：" + (targetFloor === "2F" ? "2階" : "1階");

  if (currentMapData && currentMapData.floor === targetFloor) {
    renderMapOverview_(currentMapData);
    return;
  }

  beginSearchLoading_();
  callGas("inventoryGetMap", { floor: targetFloor, overview: "1" })
    .then(function(res) {
      endSearchLoading_();
      if (!res || !res.ok) {
        showMapMessage("error", res && res.message ? res.message : "全体図を取得できませんでした。");
        return;
      }
      renderMapOverview_(res);
    })
    .catch(function(err) {
      endSearchLoading_();
      showMapMessage("error", err && err.message ? err.message : String(err));
    });
}

function renderMapOverview_(data) {
  const grid = document.getElementById("mapOverviewGrid");
  const outer = grid ? grid.closest(".mapOverviewOuter") : null;
  if (!grid) return;

  grid.style.transform = "scale(1)";
  renderInventoryMapGrid_(grid, data, true);

  requestAnimationFrame(function() {
    fitMapOverviewToScreen_(grid, outer);
  });
}

function fitMapOverviewToScreen_(grid, outer) {
  if (!grid || !outer) return;

  grid.style.transformOrigin = "0 0";
  grid.style.transform = "scale(1)";

  const availableW = Math.max(1, outer.clientWidth - 6);
  const availableH = Math.max(1, outer.clientHeight - 6);
  const rawW = Math.max(1, grid.scrollWidth);
  const rawH = Math.max(1, grid.scrollHeight);
  const scale = Math.min(1, availableW / rawW, availableH / rawH);

  grid.style.transform = "scale(" + scale + ")";
  grid.style.width = rawW + "px";
  grid.style.height = rawH + "px";
  outer.scrollLeft = 0;
  outer.scrollTop = 0;
}

function setupMapPinch_() {
  const outer = document.getElementById("mapOuter");
  const scale = document.getElementById("mapScale");
  if (!outer || !scale || outer.dataset.pinchReady === "1") return;

  outer.dataset.pinchReady = "1";

  outer.addEventListener("touchstart", function(e) {
    if (e.touches && e.touches.length === 2) {
      mapPinchStartDistance = getTouchDistance_(e.touches[0], e.touches[1]);
      mapPinchStartScale = mapScaleValue || 1;
    }
  }, { passive: true });

  outer.addEventListener("touchmove", function(e) {
    if (e.touches && e.touches.length === 2 && mapPinchStartDistance) {
      e.preventDefault();
      const d = getTouchDistance_(e.touches[0], e.touches[1]);
      mapScaleValue = Math.max(0.6, Math.min(3, mapPinchStartScale * (d / mapPinchStartDistance)));
      scale.style.transform = "scale(" + mapScaleValue + ")";
    }
  }, { passive: false });

  window.addEventListener("orientationchange", function() {
    setTimeout(function() {
      if (currentMapData) renderInventoryMap(currentMapData);
      const scaleEl = document.getElementById("mapScale");
      if (scaleEl) scaleEl.style.transform = "scale(" + (mapScaleValue || 1) + ")";
    }, 300);
  });
}

function getTouchDistance_(a, b) {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

document.addEventListener("DOMContentLoaded", function() {
  showMainSection("menu");
});

window.addEventListener("resize", function() {
  if (activeSection === "map" && currentMapData) {
    renderInventoryMap(currentMapData);
  }
  const overviewBack = document.getElementById("mapOverviewBack");
  const overviewGrid = document.getElementById("mapOverviewGrid");
  if (overviewBack && overviewBack.classList.contains("show") && overviewGrid) {
    fitMapOverviewToScreen_(overviewGrid, overviewGrid.closest(".mapOverviewOuter"));
  }
});
