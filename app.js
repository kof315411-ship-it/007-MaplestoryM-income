/* ==========================================================================
   楓之谷M 掛機收益分析與全圖/局部截圖自動辨識工具 - JavaScript 邏輯引擎 (v11.0)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // --- 註冊 Service Worker 實現跨裝置 PWA 離線支援 ---
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('[Service Worker v11] Registered successfully:', reg.scope))
      .catch(err => console.log('[Service Worker v11] Registration skipped:', err));
  }

  // --- DOM 元素引用 ---
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const btnSelectFile = document.getElementById('btnSelectFile');
  
  const previewContainer = document.getElementById('previewContainer');
  const previewImage = document.getElementById('previewImage');
  const ocrProgressBox = document.getElementById('ocrProgressBox');
  const ocrStatusText = document.getElementById('ocrStatusText');
  const ocrPercentText = document.getElementById('ocrPercentText');
  const ocrProgressBar = document.getElementById('ocrProgressBar');

  const inputMapName = document.getElementById('inputMapName');
  const inputTime = document.getElementById('inputTime');
  const inputKills = document.getElementById('inputKills');
  const inputMeso = document.getElementById('inputMeso');
  const inputExp = document.getElementById('inputExp');

  // 特別掉落道具 Input
  const inputItemCore = document.getElementById('inputItemCore');
  const inputItemSolFragment = document.getElementById('inputItemSolFragment');
  const inputItemSolEnergy = document.getElementById('inputItemSolEnergy');
  const inputItemWeakEnergy = document.getElementById('inputItemWeakEnergy');

  const selectTargetHours = document.getElementById('selectTargetHours');
  const inputCustomHours = document.getElementById('inputCustomHours');

  // 表格儲存格
  const cellRawTime = document.getElementById('cellRawTime');
  const cellTargetTime = document.getElementById('cellTargetTime');
  
  const cellRawKills = document.getElementById('cellRawKills');
  const cellHourlyKills = document.getElementById('cellHourlyKills');
  const cellTargetKills = document.getElementById('cellTargetKills');
  const cellDailyKills = document.getElementById('cellDailyKills');

  const cellRawMeso = document.getElementById('cellRawMeso');
  const cellHourlyMeso = document.getElementById('cellHourlyMeso');
  const cellTargetMeso = document.getElementById('cellTargetMeso');
  const cellDailyMeso = document.getElementById('cellDailyMeso');

  const cellRawExp = document.getElementById('cellRawExp');
  const cellHourlyExp = document.getElementById('cellHourlyExp');
  const cellTargetExp = document.getElementById('cellTargetExp');
  const cellDailyExp = document.getElementById('cellDailyExp');

  // 特別掉落道具表格
  const cellRawCore = document.getElementById('cellRawCore');
  const cellHourlyCore = document.getElementById('cellHourlyCore');
  const cellTargetCore = document.getElementById('cellTargetCore');
  const cellDailyCore = document.getElementById('cellDailyCore');

  const cellRawSolFragment = document.getElementById('cellRawSolFragment');
  const cellHourlySolFragment = document.getElementById('cellHourlySolFragment');
  const cellTargetSolFragment = document.getElementById('cellTargetSolFragment');
  const cellDailySolFragment = document.getElementById('cellDailySolFragment');

  const cellRawSolEnergy = document.getElementById('cellRawSolEnergy');
  const cellHourlySolEnergy = document.getElementById('cellHourlySolEnergy');
  const cellTargetSolEnergy = document.getElementById('cellTargetSolEnergy');
  const cellDailySolEnergy = document.getElementById('cellDailySolEnergy');

  const cellRawWeakEnergy = document.getElementById('cellRawWeakEnergy');
  const cellHourlyWeakEnergy = document.getElementById('cellHourlyWeakEnergy');
  const cellTargetWeakEnergy = document.getElementById('cellTargetWeakEnergy');
  const cellDailyWeakEnergy = document.getElementById('cellDailyWeakEnergy');

  // 效益統計卡片
  const statMesoPer10k = document.getElementById('statMesoPer10k');
  const statExpPer10k = document.getElementById('statExpPer10k');
  const statKillsPerMin = document.getElementById('statKillsPerMin');
  const statMonthlyMeso = document.getElementById('statMonthlyMeso');

  // 按鈕與歷史紀錄
  const btnSaveRecord = document.getElementById('btnSaveRecord');
  const btnExportCSV = document.getElementById('btnExportCSV');
  const btnClearHistory = document.getElementById('btnClearHistory');
  const historyTableBody = document.getElementById('historyTableBody');

  // Modal 彈窗與強制刷新按鈕
  const btnShowMobileGuide = document.getElementById('btnShowMobileGuide');
  const btnForceReload = document.getElementById('btnForceReload');
  const guideModal = document.getElementById('guideModal');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnModalCloseOk = document.getElementById('btnModalCloseOk');

  // --- 全域變數 ---
  let incomeChart = null;
  let historyRecords = JSON.parse(localStorage.getItem('mapleM_income_records') || '[]');

  // --- Modal 控制 ---
  btnShowMobileGuide.addEventListener('click', () => guideModal.style.display = 'flex');
  btnCloseModal.addEventListener('click', () => guideModal.style.display = 'none');
  btnModalCloseOk.addEventListener('click', () => guideModal.style.display = 'none');
  guideModal.addEventListener('click', (e) => {
    if (e.target === guideModal) guideModal.style.display = 'none';
  });

  // 強制清除瀏覽器 Service Worker 舊快取並重新載入最新 app.js
  btnForceReload.addEventListener('click', async () => {
    if (confirm('確定要更新並重新載入最新版的辨識核心嗎？')) {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          await registration.unregister();
        }
      }
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      window.location.reload(true);
    }
  });

  // --- 初始化 Chart.js 圖表 ---
  initChart();
  
  // --- 初始化歷史紀錄 ---
  renderHistoryTable();

  // --- 即時觸發計算事件監聽 ---
  [inputTime, inputKills, inputMeso, inputExp, inputItemCore, inputItemSolFragment, inputItemSolEnergy, inputItemWeakEnergy, inputCustomHours].forEach(el => {
    if (el) el.addEventListener('input', updateCalculations);
  });

  selectTargetHours.addEventListener('change', () => {
    if (selectTargetHours.value === 'custom') {
      inputCustomHours.style.display = 'inline-block';
      inputCustomHours.focus();
    } else {
      inputCustomHours.style.display = 'none';
    }
    updateCalculations();
  });

  // --- 檔案上傳與拖曳事件 ---
  btnSelectFile.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImageUpload(e.target.files[0]);
    }
  });

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  });

  // 剪貼簿貼上 (Ctrl+V) 支援
  document.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let item of items) {
      if (item.kind === 'file' && item.type.indexOf('image/') !== -1) {
        const blob = item.getAsFile();
        handleImageUpload(blob);
        break;
      }
    }
  });

  // 儲存紀錄按鈕
  btnSaveRecord.addEventListener('click', saveRecord);
  btnExportCSV.addEventListener('click', exportCSV);
  btnClearHistory.addEventListener('click', clearHistory);

  // 初始計算一次
  updateCalculations();

  // ==========================================================================
  // 核心邏輯 1: 數值解析與即時計算
  // ==========================================================================

  function getTargetHoursValue() {
    if (selectTargetHours.value === 'custom') {
      const val = parseFloat(inputCustomHours.value);
      return (isNaN(val) || val <= 0) ? 1 : val;
    }
    return parseFloat(selectTargetHours.value);
  }

  function parseTimeToSeconds(str) {
    if (!str) return 0;
    const parts = str.trim().split(/[:：.]/).map(p => parseInt(p, 10) || 0);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 1) {
      return parts[0] * 60;
    }
    return 0;
  }

  function parseNumber(str) {
    if (typeof str === 'number') return str;
    if (!str) return 0;
    const cleanStr = str.toString().replace(/,/g, '').replace(/[^\d.]/g, '');
    return parseFloat(cleanStr) || 0;
  }

  function formatNum(num, decimals = 0) {
    if (isNaN(num) || num === null) return '0';
    return num.toLocaleString('zh-TW', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function formatCompact(num) {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + ' 兆';
    if (num >= 1e8) return (num / 1e8).toFixed(2) + ' 億';
    if (num >= 1e4) return (num / 1e4).toFixed(2) + ' 萬';
    return formatNum(num);
  }

  function updateCalculations() {
    const rawTimeStr = inputTime.value || '00:00:00';
    const rawKills = parseNumber(inputKills.value);
    const rawMeso = parseNumber(inputMeso.value);
    const rawExp = parseNumber(inputExp.value);

    // 特別道具數量
    const rawCore = parseNumber(inputItemCore.value);
    const rawSolFragment = parseNumber(inputItemSolFragment.value);
    const rawSolEnergy = parseNumber(inputItemSolEnergy.value);
    const rawWeakEnergy = parseNumber(inputItemWeakEnergy.value);

    const seconds = parseTimeToSeconds(rawTimeStr);
    const elapsedHours = seconds > 0 ? (seconds / 3600) : 0;
    const targetHours = getTargetHoursValue();

    // 更新目標時數 Header
    const targetLabel = `${targetHours} 小時`;
    document.querySelectorAll('.headerTargetHours').forEach(el => {
      el.textContent = targetLabel;
    });

    // 基礎原始欄位顯示
    cellRawTime.textContent = `${rawTimeStr} (${(seconds / 60).toFixed(1)}分)`;
    cellRawKills.textContent = `${formatNum(rawKills)} 隻`;
    cellRawMeso.textContent = formatNum(rawMeso);
    cellRawExp.textContent = formatNum(rawExp);

    // 特別道具原始欄位顯示
    cellRawCore.textContent = `${formatNum(rawCore)} 個`;
    cellRawSolFragment.textContent = `${formatNum(rawSolFragment)} 個`;
    cellRawSolEnergy.textContent = `${formatNum(rawSolEnergy)} 個`;
    cellRawWeakEnergy.textContent = `${formatNum(rawWeakEnergy)} 個`;

    // 每小時平均
    let hourlyKills = 0, hourlyMeso = 0, hourlyExp = 0;
    let hourlyCore = 0, hourlySolFragment = 0, hourlySolEnergy = 0, hourlyWeakEnergy = 0;

    if (elapsedHours > 0) {
      hourlyKills = rawKills / elapsedHours;
      hourlyMeso = rawMeso / elapsedHours;
      hourlyExp = rawExp / elapsedHours;

      hourlyCore = rawCore / elapsedHours;
      hourlySolFragment = rawSolFragment / elapsedHours;
      hourlySolEnergy = rawSolEnergy / elapsedHours;
      hourlyWeakEnergy = rawWeakEnergy / elapsedHours;
    }

    cellHourlyKills.textContent = `${formatNum(hourlyKills)} 隻`;
    cellHourlyMeso.textContent = formatNum(hourlyMeso);
    cellHourlyExp.textContent = `${formatNum(hourlyExp)} (${formatCompact(hourlyExp)})`;

    cellHourlyCore.textContent = `${formatNum(hourlyCore, 2)} 個`;
    cellHourlySolFragment.textContent = `${formatNum(hourlySolFragment, 2)} 個`;
    cellHourlySolEnergy.textContent = `${formatNum(hourlySolEnergy, 2)} 個`;
    cellHourlyWeakEnergy.textContent = `${formatNum(hourlyWeakEnergy, 2)} 個`;

    // 目標時數累積
    cellTargetTime.textContent = `${targetHours.toFixed(1)} 小時`;
    cellTargetKills.textContent = `${formatNum(hourlyKills * targetHours)} 隻`;
    cellTargetMeso.textContent = formatNum(hourlyMeso * targetHours);
    cellTargetExp.textContent = `${formatNum(hourlyExp * targetHours)} (${formatCompact(hourlyExp * targetHours)})`;

    cellTargetCore.textContent = `${formatNum(hourlyCore * targetHours, 1)} 個`;
    cellTargetSolFragment.textContent = `${formatNum(hourlySolFragment * targetHours, 1)} 個`;
    cellTargetSolEnergy.textContent = `${formatNum(hourlySolEnergy * targetHours, 1)} 個`;
    cellTargetWeakEnergy.textContent = `${formatNum(hourlyWeakEnergy * targetHours, 1)} 個`;

    // 24小時預估 (日收益)
    cellDailyKills.textContent = `${formatNum(hourlyKills * 24)} 隻`;
    cellDailyMeso.textContent = formatNum(hourlyMeso * 24);
    cellDailyExp.textContent = `${formatNum(hourlyExp * 24)} (${formatCompact(hourlyExp * 24)})`;

    cellDailyCore.textContent = `${formatNum(hourlyCore * 24, 1)} 個`;
    cellDailySolFragment.textContent = `${formatNum(hourlySolFragment * 24, 1)} 個`;
    cellDailySolEnergy.textContent = `${formatNum(hourlySolEnergy * 24, 1)} 個`;
    cellDailyWeakEnergy.textContent = `${formatNum(hourlyWeakEnergy * 24, 1)} 個`;

    // 效益指標
    const mesoPer10k = rawKills > 0 ? (rawMeso / rawKills) * 10000 : 0;
    const expPer10k = rawKills > 0 ? (rawExp / rawKills) * 10000 : 0;
    const killsPerMin = seconds > 0 ? (rawKills / (seconds / 60)) : 0;
    const monthlyMeso = hourlyMeso * 24 * 30;

    statMesoPer10k.textContent = formatNum(mesoPer10k);
    statExpPer10k.textContent = formatCompact(expPer10k);
    statKillsPerMin.textContent = formatNum(killsPerMin, 1);
    statMonthlyMeso.textContent = formatCompact(monthlyMeso);

    // 更新圖表
    updateChartData(hourlyMeso, hourlyExp);
  }

  // ==========================================================================
  // 核心邏輯 2: 全圖截圖 (圖1) 與 彈窗特寫截圖 (圖2) 雙模式自動辨識 (v14.0)
  // ==========================================================================

  async function handleImageUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImage.src = e.target.result;
      previewContainer.classList.add('active');
      runMultiEngineOCR(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  async function runMultiEngineOCR(imageSource) {
    ocrProgressBox.style.display = 'block';
    ocrStatusText.textContent = '🚀 啟動辨識核心...';
    ocrPercentText.textContent = '0%';
    ocrProgressBar.style.width = '0%';

    let worker = null;

    try {
      const img = await loadImage(imageSource);
      // 依長寬比判斷截圖類型：圖1全螢幕(寬高比>1.45)，圖2局部彈窗(寬高比<=1.45)
      const isFullScreen = (img.width / img.height) > 1.45;
      
      const whiteNumCanvas = createAdaptiveWhiteNumbersCanvas(img, isFullScreen);
      const mapResult = isFullScreen ? createFilteredMapCanvas(img) : null;
      const itemsCanvas = createItemsCanvas(img, isFullScreen);

      ocrStatusText.textContent = isFullScreen
        ? '⏳ 分析全螢幕截圖數據與戰場... (20%)'
        : '⏳ 分析彈窗特寫數據與道具... (20%)';
      ocrPercentText.textContent = '20%';
      ocrProgressBar.style.width = '20%';

      // 建立單一穩定 Worker (支援中文與數字)
      worker = await Tesseract.createWorker('chi_tra+eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            const progress = 20 + Math.round(m.progress * 70);
            ocrStatusText.textContent = `🔍 正在分析截圖數據... (${progress}%)`;
            ocrPercentText.textContent = `${progress}%`;
            ocrProgressBar.style.width = `${progress}%`;
          }
        }
      });

      // 1. 辨識 4 行主要數據 (進行時間、消滅怪物、獲得楓幣、獲得經驗值)
      const numRes = await worker.recognize(whiteNumCanvas);
      const numText = numRes.data.text;
      console.log('=== Stats Window OCR ===\n', numText);

      // 2. 如果是全螢幕截圖 (圖1)，辨識右上角戰場名稱；如果是彈窗特寫 (圖2)，不辨識戰場名稱
      if (isFullScreen && mapResult && mapResult.mapCanvas) {
        const mapRes = await worker.recognize(mapResult.mapCanvas);
        const mapText = mapRes.data.text;
        console.log('=== Map Panel OCR ===\n', mapText);

        const mapName = parseMapName(mapText, mapResult.mapColorType);
        if (mapName) {
          inputMapName.value = mapName;
        }
      }

      // 解析時間、殺怪、楓幣、經驗
      parseStrictStatsWindowText(numText);

      // 3. 卡片級圖像與數量辨識 (支援圖1與圖2)
      await detectCardLevelItemDrops(itemsCanvas, worker);

      await worker.terminate();

      ocrStatusText.textContent = '✅ 辨識全部完成！';
      ocrPercentText.textContent = '100%';
      ocrProgressBar.style.width = '100%';

    } catch (err) {
      console.error('OCR Error:', err);
      if (worker) {
        try { await worker.terminate(); } catch (_) {}
      }
      ocrStatusText.textContent = '⚠️ 請確認手動修正數據';
    }
  }

  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = src;
    });
  }

  // 精確裁切數據視窗 (支援圖1全螢幕與圖2彈窗特寫)
  function createAdaptiveWhiteNumbersCanvas(img, isFullScreen) {
    let x, y, w, h;
    if (isFullScreen) {
      // 圖1: 全螢幕截圖左側數據視窗
      x = Math.floor(img.width * 0.01);
      y = Math.floor(img.height * 0.24);
      w = Math.floor(img.width * 0.22);
      h = Math.floor(img.height * 0.23);
    } else {
      // 圖2: 局部彈窗特寫數據視窗 (上半部)
      x = Math.floor(img.width * 0.01);
      y = Math.floor(img.height * 0.01);
      w = Math.floor(img.width * 0.98);
      h = Math.floor(img.height * 0.54);
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const scale = 3.0;

    canvas.width = Math.floor(w * scale);
    canvas.height = Math.floor(h * scale);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const v = (avg > 115) ? 0 : 255;
      data[i] = v; data[i + 1] = v; data[i + 2] = v;
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  // 生成右上角戰場名稱 Canvas (僅用於圖1全螢幕)
  function createFilteredMapCanvas(img) {
    const x = Math.floor(img.width * 0.70);
    const y = Math.floor(img.height * 0.07);
    const w = Math.floor(img.width * 0.29);
    const h = Math.floor(img.height * 0.14);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const scale = 3.0;

    canvas.width = Math.floor(w * scale);
    canvas.height = Math.floor(h * scale);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    let autHexPixels = 0;
    let sfStarPixels = 0;
    let arcCrossPixels = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];

      if (b > 190 && g > 140 && r > 110 && b > r + 25) autHexPixels++;
      else if (r > 190 && g < 90 && b < 90) sfStarPixels++;
      else if (b > 190 && g < 160 && r < 120) arcCrossPixels++;

      const isText = (r > 140 && g > 140 && b > 140) || (b > 150 && r > 130);
      const v = isText ? 0 : 255;
      data[i] = v; data[i + 1] = v; data[i + 2] = v;
    }
    ctx.putImageData(imgData, 0, 0);

    let mapColorType = 'AUT';
    if (sfStarPixels > 80 && sfStarPixels > autHexPixels) mapColorType = 'SF';
    else if (arcCrossPixels > 80 && arcCrossPixels > autHexPixels) mapColorType = 'ARC';

    return { mapCanvas: canvas, mapColorType };
  }

  // 裁切主要獲得獎勵道具欄 (支援圖1全螢幕與圖2彈窗特寫)
  function createItemsCanvas(img, isFullScreen) {
    let x, y, w, h;
    if (isFullScreen) {
      // 圖1: 全螢幕截圖道具欄
      x = Math.floor(img.width * 0.015);
      y = Math.floor(img.height * 0.46);
      w = Math.floor(img.width * 0.185);
      h = Math.floor(img.height * 0.10);
    } else {
      // 圖2: 局部彈窗特寫截圖道具欄 (精確鎖定 5 個卡片方塊)
      x = Math.floor(img.width * 0.06);
      y = Math.floor(img.height * 0.70);
      w = Math.floor(img.width * 0.86);
      h = Math.floor(img.height * 0.26);
    }

    const itemsCanvas = document.createElement('canvas');
    const ctx = itemsCanvas.getContext('2d');
    const scale = 4.0;

    itemsCanvas.width = Math.floor(w * scale);
    itemsCanvas.height = Math.floor(h * scale);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, x, y, w, h, 0, 0, itemsCanvas.width, itemsCanvas.height);

    return itemsCanvas;
  }

  // 三大戰場名稱解析
  function parseMapName(text, mapColorType) {
    if (!text) return '';
    const cleanText = text.replace(/\n/g, ' ').trim();

    // 1. 判定【真實之力戰場】 (藍紫色六角形 ⬡)
    const isAuthentic = mapColorType === 'AUT' ||
                        /真實|AUT|Aut|圖書館|王立|賽爾尼溫|阿爾克斯|奧狄溫|桃源鄉|卡爾西安|⬡|⬢/.test(cleanText) ||
                        /\d+\s*\/\s*(?:60|30|50|70|90|100|120|150)/.test(cleanText);
    if (isAuthentic) {
      const reqMatch = cleanText.match(/<\s*[\D]*?(\d{2,3})\s*>|\d+\s*\/\s*(\d{2,3})/);
      const reqVal = reqMatch ? (reqMatch[1] || reqMatch[2]) : '60';

      const mapMatch = cleanText.match(/([王立賽爾阿爾奧狄桃源卡爾][^\s<>]{2,14}(?:區域|街道|海岸|城鎮|地帶|\d)?)/);
      const mapName = mapMatch ? mapMatch[1] : '王立圖書館第3區域';
      return `真實之力 ${reqVal} - ${mapName}`;
    }

    // 2. 判定【神秘之力戰場】 (藍色圓形十字 🔵)
    const isArcane = mapColorType === 'ARC' ||
                     /神秘|ARC|◆|◇|✦|850|400|360|200|160|80|大哥|無名村|啾啾|拉契爾因|阿爾卡娜|莫拉斯|艾斯佩拉/.test(cleanText);
    if (isArcane) {
      const reqMatch = cleanText.match(/<\s*[\D]*?(\d{2,4})\s*>|(\d{3,4})/);
      const reqVal = reqMatch ? (reqMatch[1] || reqMatch[2]) : '400';

      const mapMatch = cleanText.match(/([大哥無名啾啾拉契阿爾莫拉艾斯][^\s<>]{2,14}(?:地盤|村|島|街|深處|\d)?)/);
      const mapName = mapMatch ? mapMatch[1] : '大哥的地盤2';
      return `神秘之力 ${reqVal} - ${mapName}`;
    }

    // 3. 判定【星力戰場】 (紅色圓形星星 🔴)
    const isStarForce = mapColorType === 'SF' ||
                        /星力|SF|★|168|174|144|130|120|80|試煉|洞穴/.test(cleanText);
    if (isStarForce) {
      const reqMatch = cleanText.match(/<\s*[\D]*?(\d{2,3})\s*>|(\d{2,3})/);
      const reqVal = reqMatch ? (reqMatch[1] || reqMatch[2]) : '168';

      const mapMatch = cleanText.match(/([試煉星力][^\s<>]{2,14}(?:洞穴|戰場|\d)?)/);
      const mapName = mapMatch ? mapMatch[1] : '試煉洞穴1';
      return `星力 ${reqVal} - ${mapName}`;
    }

    const generalMatch = cleanText.match(/<\s*[\D]*?(\d+)\s*>\s*([^\s<>]{2,14})/);
    if (generalMatch) {
      return `戰場 ${generalMatch[1]} - ${generalMatch[2]}`;
    }

    return '';
  }

  // 專精數據視窗解析 (雙重關鍵字綁定 + 數值大小備援)
  function parseStrictStatsWindowText(engText) {
    if (!engText) return;

    // 1. 時間解析
    const timeMatch = engText.match(/(\d{1,2})[:：.](\d{2})[:：.](\d{2})/) || engText.match(/(\d{1,2})[:：.](\d{2})/);
    if (timeMatch) {
      if (timeMatch.length === 4) {
        inputTime.value = `${timeMatch[1].padStart(2,'0')}:${timeMatch[2].padStart(2,'0')}:${timeMatch[3].padStart(2,'0')}`;
      } else if (timeMatch.length === 3) {
        inputTime.value = `00:${timeMatch[1].padStart(2,'0')}:${timeMatch[2].padStart(2,'0')}`;
      }
    }

    // 2. 關鍵字優先匹配
    const killsKeyMatch = engText.match(/(?:消滅|怪物|隻)[\D]*?([\d,]{3,9})/);
    const mesoKeyMatch = engText.match(/(?:楓幣|金幣)[\D]*?([\d,]{4,13})/);
    const expKeyMatch = engText.match(/(?:經驗|EXP)[\D]*?([\d,]{6,17})/);

    let foundKills = killsKeyMatch ? parseInt(killsKeyMatch[1].replace(/,/g, ''), 10) : null;
    let foundMeso = mesoKeyMatch ? parseInt(mesoKeyMatch[1].replace(/,/g, ''), 10) : null;
    let foundExp = expKeyMatch ? parseInt(expKeyMatch[1].replace(/,/g, ''), 10) : null;

    // 3. 備援：逐行數字提取與量級分類
    if (!foundKills || !foundMeso || !foundExp) {
      const lines = engText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const windowNums = [];

      lines.forEach(line => {
        if (line.includes(':')) return;
        const cleanDigits = line.replace(/[^\d]/g, '');
        if (cleanDigits.length > 0) {
          const val = parseInt(cleanDigits, 10);
          if (!isNaN(val) && val > 0 && val < 1e15) {
            if (val <= 50 && windowNums.length === 0) return;
            windowNums.push(val);
          }
        }
      });

      foundKills = foundKills || windowNums.find(n => n >= 50 && n < 500000);
      foundMeso = foundMeso || windowNums.find(n => n >= 500000 && n < 500000000);
      foundExp = foundExp || windowNums.find(n => n >= 500000000);

      if (!foundKills || !foundMeso || !foundExp) {
        if (windowNums.length >= 3) {
          foundKills = foundKills || windowNums[0];
          foundMeso = foundMeso || windowNums[1];
          foundExp = foundExp || windowNums[2];
        }
      }
    }

    if (foundKills) inputKills.value = formatNum(foundKills);
    if (foundMeso) inputMeso.value = formatNum(foundMeso);
    if (foundExp) inputExp.value = formatNum(foundExp);

    updateCalculations();
  }

  // 量測二值化影像中最後一個文字 blob 的寬度，窄 blob = "1"，寬 blob = 其他數字
  function estimateDigitByBlobWidth(imgData, canvasW, canvasH, thresh) {
    const data = imgData.data;
    const topSkip = Math.floor(canvasH * 0.15);
    const botSkip = Math.floor(canvasH * 0.85);

    // 掃描每欄是否有亮像素
    const colHasBright = [];
    for (let col = 0; col < canvasW; col++) {
      let hasBright = false;
      for (let row = topSkip; row < botSkip; row++) {
        const idx = (row * canvasW + col) * 4;
        const avg = (data[idx] + data[idx+1] + data[idx+2]) / 3;
        if (avg > thresh) { hasBright = true; break; }
      }
      colHasBright.push(hasBright);
    }

    // 找連通段 blobs
    const blobs = [];
    let blobStart = -1;
    for (let col = 0; col < canvasW; col++) {
      if (colHasBright[col] && blobStart === -1) blobStart = col;
      else if (!colHasBright[col] && blobStart !== -1) {
        blobs.push(col - blobStart);
        blobStart = -1;
      }
    }
    if (blobStart !== -1) blobs.push(canvasW - blobStart);

    // 濾掉太小雜點
    const sigBlobs = blobs.filter(w => w >= 3);
    if (sigBlobs.length === 0) return -1;

    // 取最後一個 blob（數字部分）
    const digitW = sigBlobs[sigBlobs.length - 1];
    const relW = digitW / canvasW;
    console.log(`[BlobWidth] blobs=${JSON.stringify(sigBlobs)}, digitW=${digitW}, relW=${relW.toFixed(3)}`);

    // 在 8x 放大下，"1" 的 relW < 0.15，其他數字 > 0.20
    if (relW < 0.16) return 1;
    return -1; // 需要 OCR 決定
  }

  // ==========================================================================
  // 核心邏輯 2.6: 卡片級獨立對應【純圖像辨識 Engine】
  // ==========================================================================
  async function detectCardLevelItemDrops(itemsCanvas, worker) {
    const ctx = itemsCanvas.getContext('2d');
    const canvasW = itemsCanvas.width;
    const canvasH = itemsCanvas.height;

    let detectedCounts = { core: 0, solFragment: 0, solEnergy: 0, weakEnergy: 0 };

    const numCards = 5;
    const effectiveW = canvasW * 0.92;
    const cardW = effectiveW / numCards;
    const iconH = Math.floor(canvasH * 0.55);
    // 從 60% 開始取，確保包含完整的 x數字 標籤
    const quantTop = Math.floor(canvasH * 0.60);
    const quantH = canvasH - quantTop;

    for (let c = 0; c < numCards; c++) {
      const startX = Math.floor(c * cardW);
      const currentCardW = Math.floor(cardW);

      // 1. 色彩分析判斷道具種類
      const iconImgData = ctx.getImageData(startX, 0, currentCardW, iconH);
      const pixels = iconImgData.data;

      let cyanCount = 0, pinkCount = 0, purpleCount = 0, whiteDiamondCount = 0;
      for (let p = 0; p < pixels.length; p += 4) {
        const r = pixels[p], g = pixels[p+1], b = pixels[p+2];
        if (g > 170 && b > 170 && r < 200) cyanCount++;
        else if (r > 170 && b > 170 && g < 210 && r > g) pinkCount++;
        else if (b > 120 && r > 60 && r < 160 && g < 150) purpleCount++;
        else if (r > 210 && g > 210 && b > 210) whiteDiamondCount++;
      }

      let cardItemType = null;
      if (purpleCount > cyanCount && purpleCount > pinkCount && purpleCount > 150) cardItemType = 'solFragment';
      else if (cyanCount > pinkCount && cyanCount > purpleCount && cyanCount > 150) cardItemType = 'solEnergy';
      else if (pinkCount > cyanCount && pinkCount > purpleCount && pinkCount > 120) cardItemType = 'weakEnergy';
      else if (whiteDiamondCount > 300 && pinkCount < 80) cardItemType = 'core';

      console.log(`[Card ${c+1}] cyan=${cyanCount} pink=${pinkCount} purple=${purpleCount} white=${whiteDiamondCount} => ${cardItemType || 'SKIP'}`);
      if (!cardItemType) continue;

      // 2. 建立 8x 放大量數 canvas（白底）
      const quantScale = 8;
      const pad = 30;
      const scW = currentCardW * quantScale + pad * 2;
      const scH = quantH * quantScale + pad * 2;

      const baseCanvas = document.createElement('canvas');
      baseCanvas.width = scW;
      baseCanvas.height = scH;
      const scCtx = baseCanvas.getContext('2d');
      scCtx.fillStyle = '#FFFFFF';
      scCtx.fillRect(0, 0, scW, scH);
      scCtx.imageSmoothingEnabled = false;
      scCtx.drawImage(itemsCanvas, startX, quantTop, currentCardW, quantH, pad, pad, currentCardW * quantScale, quantH * quantScale);

      // 3. 多閾值策略 (100, 115, 130)
      let bestQuant = null;
      let bestConf = -1;

      for (const thresh of [100, 115, 130]) {
        const bwCanvas = document.createElement('canvas');
        bwCanvas.width = scW; bwCanvas.height = scH;
        const bwCtx = bwCanvas.getContext('2d');
        bwCtx.drawImage(baseCanvas, 0, 0);
        const bwData = bwCtx.getImageData(0, 0, scW, scH);
        const d = bwData.data;
        for (let i = 0; i < d.length; i += 4) {
          const avg = (d[i] + d[i+1] + d[i+2]) / 3;
          const v = avg > thresh ? 0 : 255;
          d[i] = v; d[i+1] = v; d[i+2] = v;
        }
        bwCtx.putImageData(bwData, 0, 0);

        // Blob 寬度分析（識別 "1" vs 其他）
        const rawData = bwCtx.getImageData(0, 0, scW, scH);
        const blobResult = estimateDigitByBlobWidth(rawData, scW, scH, thresh);
        if (blobResult === 1) {
          bestQuant = 1; bestConf = 95;
          console.log(`[Card ${c+1}] thresh=${thresh} BlobWidth => 1`);
          break;
        }

        // PSM 7 (single line)
        await worker.setParameters({ tessedit_char_whitelist: '0123456789xX', tessedit_pageseg_mode: '7' });
        const res7 = await worker.recognize(bwCanvas);
        const text7 = (res7.data.text || '').trim();
        const conf7 = (res7.data.words && res7.data.words.length > 0) ? res7.data.words[0].confidence : 0;

        // PSM 8 (single word)
        await worker.setParameters({ tessedit_char_whitelist: '0123456789xX', tessedit_pageseg_mode: '8' });
        const res8 = await worker.recognize(bwCanvas);
        const text8 = (res8.data.text || '').trim();
        const conf8 = (res8.data.words && res8.data.words.length > 0) ? res8.data.words[0].confidence : 0;

        console.log(`[Card ${c+1}] thresh=${thresh} PSM7="${text7}"(${conf7.toFixed(0)}) PSM8="${text8}"(${conf8.toFixed(0)})`);

        const useText = conf7 >= conf8 ? text7 : text8;
        const useConf = Math.max(conf7, conf8);

        if (useConf > bestConf) {
          const mX = useText.match(/[xX]\s*(\d{1,4})/);
          const mD = useText.match(/(\d{1,4})/);
          const parsed = mX ? parseInt(mX[1], 10) : (mD ? parseInt(mD[1], 10) : null);
          if (parsed !== null) { bestConf = useConf; bestQuant = parsed; }
        }
      }

      const cardQuant = (bestQuant !== null && bestQuant > 0) ? bestQuant : 1;
      console.log(`[Card ${c+1}] FINAL => ${cardItemType} x${cardQuant}`);
      detectedCounts[cardItemType] += cardQuant;
    }

    console.log('[Final Item Counts]', detectedCounts);

    if (inputItemCore) inputItemCore.value = detectedCounts.core;
    if (inputItemSolFragment) inputItemSolFragment.value = detectedCounts.solFragment;
    if (inputItemSolEnergy) inputItemSolEnergy.value = detectedCounts.solEnergy;
    if (inputItemWeakEnergy) inputItemWeakEnergy.value = detectedCounts.weakEnergy;

    await worker.setParameters({ tessedit_pageseg_mode: '6' });
    updateCalculations();
  }

  // ==========================================================================
  // 核心邏輯 3: Chart.js 趨勢圖表
  // ==========================================================================

  function initChart() {
    const ctx = document.getElementById('incomeChart').getContext('2d');
    
    incomeChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['1 小時', '2 小時', '4 小時', '6 小時', '8 小時', '12 小時', '18 小時', '24 小時'],
        datasets: [
          {
            label: '預估楓幣收益 (Meso)',
            data: [0, 0, 0, 0, 0, 0, 0, 0],
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            borderWidth: 3,
            fill: true,
            tension: 0.3,
            yAxisID: 'yMeso'
          },
          {
            label: '預估經驗值 (EXP)',
            data: [0, 0, 0, 0, 0, 0, 0, 0],
            borderColor: '#a855f7',
            backgroundColor: 'rgba(168, 85, 247, 0.15)',
            borderWidth: 3,
            fill: true,
            tension: 0.3,
            yAxisID: 'yExp'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            labels: {
              color: '#f8fafc',
              font: { family: 'Outfit', size: 13, weight: 'bold' }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) label += ': ';
                if (context.parsed.y !== null) {
                  label += formatNum(context.parsed.y) + ' (' + formatCompact(context.parsed.y) + ')';
                }
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#94a3b8' }
          },
          yMeso: {
            type: 'linear',
            display: true,
            position: 'left',
            grid: { color: 'rgba(245, 158, 11, 0.1)' },
            ticks: {
              color: '#f59e0b',
              callback: value => formatCompact(value)
            }
          },
          yExp: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: {
              color: '#a855f7',
              callback: value => formatCompact(value)
            }
          }
        }
      }
    });
  }

  function updateChartData(hourlyMeso, hourlyExp) {
    if (!incomeChart) return;
    const hours = [1, 2, 4, 6, 8, 12, 18, 24];
    
    incomeChart.data.datasets[0].data = hours.map(h => hourlyMeso * h);
    incomeChart.data.datasets[1].data = hours.map(h => hourlyExp * h);
    incomeChart.update();
  }

  // ==========================================================================
  // 核心邏輯 4: 歷史紀錄與比較
  // ==========================================================================

  function saveRecord() {
    const rawTimeStr = inputTime.value || '00:00:00';
    const rawKills = parseNumber(inputKills.value);
    const rawMeso = parseNumber(inputMeso.value);
    const rawExp = parseNumber(inputExp.value);

    const rawCore = parseNumber(inputItemCore.value);
    const rawSolFragment = parseNumber(inputItemSolFragment.value);
    const rawSolEnergy = parseNumber(inputItemSolEnergy.value);
    const rawWeakEnergy = parseNumber(inputItemWeakEnergy.value);

    const seconds = parseTimeToSeconds(rawTimeStr);
    const elapsedHours = seconds > 0 ? (seconds / 3600) : 0;

    if (elapsedHours <= 0) {
      alert('請先上傳截圖或輸入有效的進行時間！');
      return;
    }

    const hourlyKills = rawKills / elapsedHours;
    const hourlyMeso = rawMeso / elapsedHours;
    const hourlyExp = rawExp / elapsedHours;

    const hourlyCore = rawCore / elapsedHours;
    const hourlySol = (rawSolFragment + rawSolEnergy + rawWeakEnergy) / elapsedHours;
    const mesoPer10k = rawKills > 0 ? (rawMeso / rawKills) * 10000 : 0;

    const record = {
      id: Date.now(),
      mapName: inputMapName.value.trim() || '未命名地圖',
      timeStr: rawTimeStr,
      hourlyKills,
      hourlyMeso,
      hourlyExp,
      hourlyCore,
      hourlySol,
      mesoPer10k,
      createdAt: new Date().toLocaleString('zh-TW', { hour12: false })
    };

    historyRecords.unshift(record);
    localStorage.setItem('mapleM_income_records', JSON.stringify(historyRecords));
    renderHistoryTable();

    // 回饋提示
    btnSaveRecord.innerHTML = '<i class="fa-solid fa-check"></i> 已儲存紀錄！';
    setTimeout(() => {
      btnSaveRecord.innerHTML = '<i class="fa-solid fa-bookmark"></i> 儲存至歷史紀錄比較';
    }, 2000);
  }

  function renderHistoryTable() {
    if (historyRecords.length === 0) {
      historyTableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 24px;">
            尚未儲存任何歷史紀錄。上傳截圖辨識並確認數據後，點擊「儲存至歷史紀錄比較」即可對比效益！
          </td>
        </tr>
      `;
      return;
    }

    historyTableBody.innerHTML = historyRecords.map(rec => `
      <tr>
        <td style="font-weight: 700; color: #fff;">${escapeHtml(rec.mapName)}</td>
        <td>${rec.timeStr}</td>
        <td class="text-cyan">${formatNum(rec.hourlyKills)} 隻/h</td>
        <td class="text-gold" style="font-weight: 700;">${formatNum(rec.hourlyMeso)}</td>
        <td class="text-purple">${formatCompact(rec.hourlyExp)}</td>
        <td style="color: #38bdf8; font-weight: 700;">${formatNum(rec.hourlyCore || 0, 1)} 個/h</td>
        <td style="color: #c084fc; font-weight: 700;">${formatNum(rec.hourlySol || 0, 1)} 個/h</td>
        <td style="font-size: 0.8rem; color: var(--text-muted);">${rec.createdAt}</td>
        <td>
          <button class="btn btn-secondary btn-del-rec" data-id="${rec.id}" style="padding: 4px 8px; font-size: 0.75rem; color: #ef4444;">
            <i class="fa-solid fa-xmark"></i> 刪除
          </button>
        </td>
      </tr>
    `).join('');

    // 綁定刪除事件
    document.querySelectorAll('.btn-del-rec').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.getAttribute('data-id'), 10);
        historyRecords = historyRecords.filter(r => r.id !== id);
        localStorage.setItem('mapleM_income_records', JSON.stringify(historyRecords));
        renderHistoryTable();
      });
    });
  }

  function clearHistory() {
    if (confirm('確定要清空所有歷史掛機紀錄嗎？')) {
      historyRecords = [];
      localStorage.removeItem('mapleM_income_records');
      renderHistoryTable();
    }
  }

  function exportCSV() {
    if (historyRecords.length === 0) {
      alert('目前沒有歷史紀錄可供匯出！');
      return;
    }

    let csvContent = "\uFEFF地圖/備註,掛機時間,每小時殺怪(隻),每小時楓幣,每小時經驗值,核心寶石/h,艾爾達斯/h,萬怪楓幣效率,記錄時間\n";
    historyRecords.forEach(r => {
      csvContent += `"${r.mapName}","${r.timeStr}",${Math.round(r.hourlyKills)},${Math.round(r.hourlyMeso)},${Math.round(r.hourlyExp)},${(r.hourlyCore || 0).toFixed(1)},${(r.hourlySol || 0).toFixed(1)},${Math.round(r.mesoPer10k)},"${r.createdAt}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `楓之谷M_掛機收益比較_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

});
