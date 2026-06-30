const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzN6ULmcDYUWLTmft67k_Wrra1WazV_aHroJPE63kQnFyLo9LW4_8Rb43qo9hxyTn9krw/exec";

let selectedItem = null;
let html5QrCode = null;
let scannerRunning = false;

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

    const tag = document.createElement("script");
    tag.src = GAS_API_URL + "?" + query.toString();
    tag.async = true;

    const timer = setTimeout(function() {
      cleanup();
      reject(new Error("通信がタイムアウトしました。"));
    }, 30000);

    function cleanup() {
      clearTimeout(timer);
      if (tag.parentNode) tag.parentNode.removeChild(tag);
      try { delete window[callbackName]; } catch (e) { window[callbackName] = undefined; }
    }

    window[callbackName] = function(data) {
      cleanup();
      resolve(data);
    };

    tag.onerror = function() {
      cleanup();
      reject(new Error("Apps Scriptとの通信に失敗しました。"));
    };

    document.body.appendChild(tag);
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
    color: document.getElementById("colorInput").value.trim(),
    size: document.getElementById("sizeInput").value.trim()
  };
}

function searchProduct() {
  hideMessage();
  hideProduct();
  setLoading(true);

  callGas("search", getPayload())
    .then(function(res) {
      setLoading(false);

      if (!res || !res.ok) {
        showMessage("error", res && res.message ? res.message : "検索に失敗しました。");
        if (res && res.items && res.items.length) showMultiResults(res.items);
        return;
      }

      if (res.items.length === 1) {
        selectItem(res.items[0]);
        showMessage("success", "商品を見つけました。");
      } else {
        showMessage("info", res.items.length + "件見つかりました。商品を選んでください。");
        showMultiResults(res.items);
      }
    })
    .catch(function(err) {
      setLoading(false);
      showMessage("error", err && err.message ? err.message : String(err));
    });
}

function showMultiResults(items) {
  const card = document.getElementById("multiCard");
  const list = document.getElementById("resultList");
  list.innerHTML = "";

  items.forEach(function(item) {
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
  document.getElementById("newLocationInput").focus();
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
  document.getElementById("colorInput").value = "";
  document.getElementById("sizeInput").value = "";
  document.getElementById("newLocationInput").value = "";
  document.getElementById("productCard").classList.add("hidden");
  document.getElementById("multiCard").classList.add("hidden");
  document.getElementById("resultList").innerHTML = "";
  hideMessage();
  document.getElementById("textInput").focus();
}

async function toggleScanner() {
  showMessage("info", "カメラを起動しています...");
  const box = document.getElementById("scannerBox");

  if (scannerRunning) {
    await stopScanner();
    box.style.display = "none";
    hideMessage();
    return;
  }

  if (typeof Html5Qrcode === "undefined") {
    showMessage("error", "バーコード読取ライブラリを読み込めませんでした。ページを再読み込みしてください。");
    return;
  }

  box.style.display = "block";

  try {
    const cameras = await Html5Qrcode.getCameras();
    if (!cameras || cameras.length === 0) {
      showMessage("error", "使用できるカメラが見つかりませんでした。ブラウザのカメラ許可を確認してください。");
      box.style.display = "none";
      return;
    }

    let cameraId = cameras[0].id;
    for (let i = 0; i < cameras.length; i++) {
      const label = String(cameras[i].label || "").toLowerCase();
      if (label.includes("back") || label.includes("rear") || label.includes("environment") || label.includes("背面")) {
        cameraId = cameras[i].id;
        break;
      }
    }

    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode("reader");
    }

    scannerRunning = true;

    await html5QrCode.start(
      cameraId,
      {
        fps: 10,
        qrbox: function(w, h) {
          const size = Math.floor(Math.min(w, h) * 0.75);
          return { width: size, height: size };
        }
      },
      function(decodedText) {
        onScanSuccess(decodedText);
      },
      function(errorMessage) {}
    );

    showMessage("success", "カメラ起動中です。JANコードを映してください。");

  } catch (err) {
    scannerRunning = false;
    box.style.display = "none";
    showMessage("error", "カメラを起動できませんでした。\n\n原因：" + (err && err.message ? err.message : String(err)));
  }
}

async function stopScanner() {
  if (html5QrCode && scannerRunning) {
    try {
      await html5QrCode.stop();
    } catch (e) {}
  }
  scannerRunning = false;
}

async function onScanSuccess(decodedText) {
  const text = String(decodedText || "").trim();
  const jan = text.replace(/[^\d]/g, "");

  if (jan && jan.length >= 8 && jan.length <= 14) {
    document.getElementById("janInput").value = jan;
    document.getElementById("textInput").value = "";
  } else {
    document.getElementById("textInput").value = text;
  }

  await stopScanner();
  document.getElementById("scannerBox").style.display = "none";
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
