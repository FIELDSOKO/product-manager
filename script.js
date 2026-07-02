const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzN6ULmcDYUWLTmft67k_Wrra1WazV_aHroJPE63kQnFyLo9LW4_8Rb43qo9hxyTn9krw/exec";

let selectedItem = null;
let codeReader = null;
let scannerRunning = false;
let scannerLocked = false;
let lastScanJan = "";
let sameScanCount = 0;

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

window.addEventListener("load", function() {
  loadMasterUpdatedAt();
});

function callGas(action, params) {
  return new Promise(function(resolve, reject) {
    const callbackName = "__gasCallback_" + Date.now() + "_" + Math.floor(Math.random() * 100000);

    const query = new URLSearchParams();
    query.set("action", action);
    query.set("callback", callbackName);

    Object.keys(params || {}).forEach(function(key) {
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
    }, 30000);

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
    })
    .catch(function() {
      document.getElementById("updatedAt").textContent =
        "商品マスタ更新日時：取得失敗";
      setLoading(false);
    });
}

function setLoading(v) {
  document.getElementById("app").classList.toggle("loading", v);
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

  setLoading(true);

  callGas("search", payload)
    .then(function(res) {
      setLoading(false);

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
      setLoading(false);
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
      selectItem(item);
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

function selectItem(item) {
  selectedItem = item;
  document.getElementById("vHinban").textContent = item.hinban || "";
  document.getElementById("vName").textContent = item.name || "";
  document.getElementById("vJan").textContent = item.jan || "";
  document.getElementById("vColor").textContent = item.color || "";
  document.getElementById("vSize").textContent = item.size || "";
  document.getElementById("vLocation").textContent = item.location || "未設定";
  document.getElementById("productCard").classList.remove("hidden");
  document.getElementById("multiCard").classList.add("hidden");
  // document.getElementById("newLocationInput").focus();
}

function hideProduct() {
  selectedItem = null;
  document.getElementById("productCard").classList.add("hidden");
  document.getElementById("multiCard").classList.add("hidden");
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
  document.getElementById("resultList").innerHTML = "";
  lastScanJan = "";
  sameScanCount = 0;
  currentSearchPayload = null;
  currentOffset = 0;
  hideMessage();
  document.getElementById("textInput").focus();
}

async function toggleScanner() {
  if (scannerRunning) {
    await closeScannerManual();
    return;
  }

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
    video.srcObject = null;

    await waitForScannerViewReady_();

    const hints = new Map();
    hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.EAN_13]);

    codeReader = new ZXing.BrowserMultiFormatReader(hints, 50);

    scannerRunning = true;
    scannerLocked = false;
    lastScanJan = "";
      sameScanCount = 0;

    setupScannerTouchEvents_();

    const deviceId = await getPreferredVideoDeviceId_();

    codeReader.decodeFromVideoDevice(deviceId || null, video, function(result, err) {
      if (result && !scannerLocked) {
        scannerLocked = true;
        onScanSuccess(result.getText());
      }
    }).catch(function(err) {
      if (!scannerRunning) return;
      stopScanner().then(function() {
        closeScannerView_();
        showMessage("error", "JAN読取の開始に失敗しました。\n\n原因：" + (err && err.message ? err.message : String(err)));
      });
    });

    await waitForVideoReady_(video);

    currentStream = video.srcObject || null;
    currentVideoTrack = currentStream && currentStream.getVideoTracks ?
      (currentStream.getVideoTracks()[0] || null) : null;
    setupCameraCapabilities_();

  } catch (err) {
    await stopScanner();
    closeScannerView_();
    showMessage("error", "カメラを起動できませんでした。\n\n原因：" + (err && err.message ? err.message : String(err)));
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
      return video &&
        video.readyState >= 2 &&
        video.videoWidth > 0 &&
        video.videoHeight > 0 &&
        !video.paused;
    }

    function finish() {
      cleanup();
      sleep_(120).then(resolve);
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
      setTimeout(check, 50);
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

  updateZoomButtons_();
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

async function onScanSuccess(decodedText) {
  const text = String(decodedText || "").trim();
  const jan = text.replace(/[^\d]/g, "");

  if (!isValidJan13(jan)) {
    scannerLocked = false;
    return;
  }

  if (jan === lastScanJan) {
    sameScanCount += 1;
  } else {
    lastScanJan = jan;
    sameScanCount = 1;
  }

  if (sameScanCount < 2) {
    scannerLocked = false;
    return;
  }

  document.getElementById("janInput").value = jan;
  document.getElementById("textInput").value = "";

  lastScanJan = "";
  sameScanCount = 0;

  await stopScanner();
  closeScannerView_();

  searchProduct();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
