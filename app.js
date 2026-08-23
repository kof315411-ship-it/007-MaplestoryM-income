/* ==========================================================================
   楓之谷M 掛機收益分析與全圖/局部截圖自動辨識工具 - JavaScript 邏輯引擎 (v9.0)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // --- 註冊 Service Worker 實現跨裝置 PWA 離線支援 ---
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('[Service Worker v9] Registered successfully:', reg.scope))
      .catch(err => console.log('[Service Worker v9] Registration skipped:', err));
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
  // 核心邏輯 2: 全圖截圖與特別道具圖像辨識 (卡片精確分割 + 雙通道分析)
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
    ocrStatusText.textContent = '🚀 啟動圖像與數據分析...';
    ocrPercentText.textContent = '0%';
    ocrProgressBar.style.width = '0%';

    try {
      const img = await loadImage(imageSource);
      
      const whiteNumCanvas = createAdaptiveWhiteNumbersCanvas(img);
      const mapCanvas = createFilteredMapCanvas(img);

      // 精確裁切主要獲得獎勵道具欄 (含彩色圖示與數量)
      const { itemsCanvas, itemQuantBwCanvas } = createItemsCanvas(img);

      // Worker 1: 專門辨識數據視窗 (ENG 純數字)
      const workerEng = await Tesseract.createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            const progress = Math.round(m.progress * 35);
            ocrStatusText.textContent = `🔍 辨識數據中... (${progress}%)`;
            ocrPercentText.textContent = `${progress}%`;
            ocrProgressBar.style.width = `${progress}%`;
          }
        }
      });

      await workerEng.setParameters({
        tessedit_char_whitelist: '0123456789:,. ',
        tessedit_pageseg_mode: '6'
      });

      // Worker 2: 辨識戰場名稱
      const workerChi = await Tesseract.createWorker('eng+chi_tra', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            const progress = 35 + Math.round(m.progress * 35);
            ocrStatusText.textContent = `🔍 解析戰場資訊... (${progress}%)`;
            ocrPercentText.textContent = `${progress}%`;
            ocrProgressBar.style.width = `${progress}%`;
          }
        }
      });

      // Worker 3: 專門辨識道具方塊下方的 x [數字] 數量
      const workerQuant = await Tesseract.createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            const progress = 70 + Math.round(m.progress * 30);
            ocrStatusText.textContent = `🔍 讀取道具數量... (${progress}%)`;
            ocrPercentText.textContent = `${progress}%`;
            ocrProgressBar.style.width = `${progress}%`;
          }
        }
      });

      await workerQuant.setParameters({
        tessedit_char_whitelist: '0123456789xX ',
        tessedit_pageseg_mode: '6'
      });

      // 執行辨識
      const numRes = await workerEng.recognize(whiteNumCanvas);
      const mapRes = await workerChi.recognize(mapCanvas);
      const quantRes = await workerQuant.recognize(itemQuantBwCanvas);
      const rawRes = await workerChi.recognize(img);

      await workerEng.terminate();
      await workerChi.terminate();
      await workerQuant.terminate();

      const numText = numRes.data.text;
      const mapText = mapRes.data.text;
      const quantText = quantRes.data.text;
      const rawText = rawRes.data.text;

      console.log('=== Pure Numbers OCR ===\n', numText);
      console.log('=== Item Quantities OCR ===\n', quantText);

      // 1. 解析戰場名稱
      const mapName = parseMapName(mapText + '\n' + rawText);
      if (mapName) {
        inputMapName.value = mapName;
      }

      // 2. 帶入基礎 4 行數據
      parseStrictStatsWindowText(numText, rawText);

      // 3. 卡片雙通道辨識：圖示特徵辨識 + x 數量獨立對應
      detectCardLevelItemDrops(itemsCanvas, quantText);

      ocrStatusText.textContent = '✅ 數據、戰場與道具辨識完成';
      ocrPercentText.textContent = '100%';
      ocrProgressBar.style.width = '100%';

    } catch (err) {
      console.error('OCR Error:', err);
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

  // 精確裁切數據視窗
  function createAdaptiveWhiteNumbersCanvas(img) {
    const isWide = (img.width / img.height) > 1.3;

    let x, y, w, h;
    if (isWide) {
      x = Math.floor(img.width * 0.01);
      y = Math.floor(img.height * 0.24);
      w = Math.floor(img.width * 0.22);
      h = Math.floor(img.height * 0.23);
    } else {
      x = Math.floor(img.width * 0.01);
      y = Math.floor(img.height * 0.36);
      w = Math.floor(img.width * 0.58);
      h = Math.floor(img.height * 0.35);
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
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const isWhiteText = (r > 150 && g > 150 && b > 150 && Math.abs(r - g) < 30 && Math.abs(g - b) < 30);
      const v = isWhiteText ? 0 : 255;
      data[i] = v; data[i + 1] = v; data[i + 2] = v;
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  // 生成右上角戰場名稱 Canvas
  function createFilteredMapCanvas(img) {
    const isWide = (img.width / img.height) > 1.3;
    if (!isWide) return img;

    const x = Math.floor(img.width * 0.68);
    const y = Math.floor(img.height * 0.01);
    const w = Math.floor(img.width * 0.31);
    const h = Math.floor(img.height * 0.24);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const scale = 2.5;

    canvas.width = Math.floor(w * scale);
    canvas.height = Math.floor(h * scale);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      const v = (avg > 130) ? 0 : 255;
      data[i] = v; data[i + 1] = v; data[i + 2] = v;
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  // 裁切主要獲得獎勵道具欄 (同時輸出彩色圖示 Canvas 與 高對比純白字數量 Canvas)
  function createItemsCanvas(img) {
    const isWide = (img.width / img.height) > 1.3;

    let x, y, w, h;
    if (isWide) {
      x = Math.floor(img.width * 0.015);
      y = Math.floor(img.height * 0.45);
      w = Math.floor(img.width * 0.185);
      h = Math.floor(img.height * 0.10);
    } else {
      x = Math.floor(img.width * 0.01);
      y = Math.floor(img.height * 0.48);
      w = Math.floor(img.width * 0.65);
      h = Math.floor(img.height * 0.15);
    }

    // 1. 彩色圖示 Canvas
    const itemsCanvas = document.createElement('canvas');
    const ctx = itemsCanvas.getContext('2d');
    const scale = 3.0;

    itemsCanvas.width = Math.floor(w * scale);
    itemsCanvas.height = Math.floor(h * scale);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, x, y, w, h, 0, 0, itemsCanvas.width, itemsCanvas.height);

    // 2. 高對比黑底白字數量 Canvas (專門給 Tesseract 讀取 x 數字)
    const quantH = Math.floor(itemsCanvas.height * 0.45);
    const itemQuantBwCanvas = document.createElement('canvas');
    itemQuantBwCanvas.width = itemsCanvas.width;
    itemQuantBwCanvas.height = quantH;

    const qCtx = itemQuantBwCanvas.getContext('2d');
    qCtx.drawImage(itemsCanvas, 0, itemsCanvas.height - quantH, itemsCanvas.width, quantH, 0, 0, itemsCanvas.width, quantH);

    const qImgData = qCtx.getImageData(0, 0, itemsCanvas.width, quantH);
    const qData = qImgData.data;

    for (let i = 0; i < qData.length; i += 4) {
      const r = qData[i], g = qData[i + 1], b = qData[i + 2];
      const isWhiteText = (r > 150 && g > 150 && b > 150);
      const v = isWhiteText ? 0 : 255; // 白字轉純黑背景上的黑字 (Tesseract 相容)
      qData[i] = v; qData[i + 1] = v; qData[i + 2] = v;
    }
    qCtx.putImageData(qImgData, 0, 0);

    return { itemsCanvas, itemQuantBwCanvas };
  }

  // 三大戰場名稱解析
  function parseMapName(text) {
    if (!text) return '';
    const cleanText = text.replace(/\n/g, ' ').trim();

    // 1. 判定【真實之力戰場】 (藍紫色六角形 Icon)
    const isAuthentic = /真實|AUT|Aut|圖書館|王立|賽爾尼溫|阿爾克斯|奧狄溫|桃源鄉|卡爾西安|⬡|⬢/.test(cleanText) ||
                        /\d+\s*\/\s*(?:60|30|50|70|90|100|120|150)/.test(cleanText);
    if (isAuthentic) {
      const reqMatch = cleanText.match(/<\s*[\D]*?(\d{2,3})\s*>|\d+\s*\/\s*(\d{2,3})/);
      const reqVal = reqMatch ? (reqMatch[1] || reqMatch[2]) : '60';

      const mapMatch = cleanText.match(/([王立賽爾阿爾奧狄桃源卡爾][^\s<>]{2,12}(?:區域|街道|海岸|城鎮|地帶|\d)?)/);
      const mapName = mapMatch ? mapMatch[1] : '王立圖書館第3區域';
      return `真實之力 ${reqVal} - ${mapName}`;
    }

    // 2. 判定【神秘之力戰場】 (藍色圓形中間有十字 Icon)
    const isArcane = /神秘|◆|◇|✦|850|400|360|200|160|80|大哥|無名村|啾啾|拉契爾因|阿爾卡娜|莫拉斯|艾斯佩拉/.test(cleanText);
    if (isArcane) {
      const reqMatch = cleanText.match(/<\s*[\D]*?(\d{2,4})\s*>|(\d{3,4})/);
      const reqVal = reqMatch ? (reqMatch[1] || reqMatch[2]) : '400';

      const mapMatch = cleanText.match(/([大哥無名啾啾拉契阿爾莫拉艾斯][^\s<>]{2,12}(?:地盤|村|島|街|深處|\d)?)/);
      const mapName = mapMatch ? mapMatch[1] : '大哥的地盤2';
      return `神秘之力 ${reqVal} - ${mapName}`;
    }

    // 3. 判定【星力戰場】 (紅色圓形中間白色星星 Icon)
    const isStarForce = /星力|★|168|174|144|130|120|80|試煉|洞穴/.test(cleanText);
    if (isStarForce) {
      const reqMatch = cleanText.match(/<\s*[\D]*?(\d{2,3})\s*>|(\d{2,3})/);
      const reqVal = reqMatch ? (reqMatch[1] || reqMatch[2]) : '168';

      const mapMatch = cleanText.match(/([試煉星力][^\s<>]{2,12}(?:洞穴|戰場|\d)?)/);
      const mapName = mapMatch ? mapMatch[1] : '試煉洞穴1';
      return `星力 ${reqVal} - ${mapName}`;
    }

    const generalMatch = cleanText.match(/<\s*[\D]*?(\d+)\s*>\s*([^\s<>]{2,12})/);
    if (generalMatch) {
      return `戰場 ${generalMatch[1]} - ${generalMatch[2]}`;
    }

    return '';
  }

  // 專精數據視窗解析
  function parseStrictStatsWindowText(engText, rawText) {
    if (!engText && !rawText) return;

    const combined = engText + '\n' + rawText;
    const timeMatch = combined.match(/(\d{1,2})[:：.](\d{2})[:：.](\d{2})/) || combined.match(/(\d{1,2})[:：.](\d{2})/);
    if (timeMatch) {
      if (timeMatch.length === 4) {
        inputTime.value = `${timeMatch[1].padStart(2,'0')}:${timeMatch[2].padStart(2,'0')}:${timeMatch[3].padStart(2,'0')}`;
      } else if (timeMatch.length === 3) {
        inputTime.value = `00:${timeMatch[1].padStart(2,'0')}:${timeMatch[2].padStart(2,'0')}`;
      }
    }

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

    let foundKills = windowNums.find(n => n >= 50 && n < 500000);
    let foundMeso = windowNums.find(n => n >= 500000 && n < 500000000);
    let foundExp = windowNums.find(n => n >= 500000000);

    if (!foundKills || !foundMeso || !foundExp) {
      if (windowNums.length >= 3) {
        foundKills = foundKills || windowNums[0];
        foundMeso = foundMeso || windowNums[1];
        foundExp = foundExp || windowNums[2];
      }
    }

    if (foundKills) inputKills.value = formatNum(foundKills);
    if (foundMeso) inputMeso.value = formatNum(foundMeso);
    if (foundExp) inputExp.value = formatNum(foundExp);

    updateCalculations();
  }

  // ==========================================================================
  // 核心邏輯 2.6: 卡片級獨立對應【純圖像辨識 Engine】
  // (1. 靈魂艾爾達斯碎片  2. 靈魂艾爾達斯氣息  3. 微弱靈魂艾爾達斯氣息  4. 核心寶石)
  // ==========================================================================
  function detectCardLevelItemDrops(itemsCanvas, quantText) {
    const ctx = itemsCanvas.getContext('2d');
    const canvasW = itemsCanvas.width;
    const canvasH = itemsCanvas.height;

    // 1. 解析整排所有的 x [數字] 數量
    const matches = Array.from(quantText.matchAll(/[xX✕×\s]*(\d{1,4})/g));
    const extractedQuantities = matches.map(m => parseInt(m[1], 10)).filter(n => !isNaN(n) && n > 0);

    console.log('[Card Quantities Extracted]', extractedQuantities);

    let detectedCounts = {
      core: 0,
      solFragment: 0,
      solEnergy: 0,
      weakEnergy: 0
    };

    // 2. 切分為最多 5 個水平卡片方塊進行卡片級圖像特徵辨識
    const numCards = 5;
    const cardW = canvasW / numCards;
    const iconH = Math.floor(canvasH * 0.58);

    for (let c = 0; c < numCards; c++) {
      const startX = Math.floor(c * cardW);
      const cardCropW = Math.floor(cardW);

      const iconImgData = ctx.getImageData(startX, 0, cardCropW, iconH);
      const pixels = iconImgData.data;

      let cyanCount = 0;        // 靈魂艾爾達斯氣息
      let pinkCount = 0;        // 微弱靈魂艾爾達斯氣息
      let purpleCount = 0;      // 靈魂艾爾達斯碎片
      let whiteDiamondCount = 0; // 核心寶石

      for (let p = 0; p < pixels.length; p += 4) {
        const r = pixels[p], g = pixels[p + 1], b = pixels[p + 2];

        if (g > 170 && b > 170 && r < 200) cyanCount++;
        else if (r > 170 && b > 170 && g < 210 && r > g) pinkCount++;
        else if (b > 120 && r > 60 && r < 160 && g < 150) purpleCount++;
        else if (r > 210 && g > 210 && b > 210) whiteDiamondCount++;
      }

      console.log(`[Card ${c+1} Classifier] Purple:${purpleCount}, Cyan:${cyanCount}, Pink:${pinkCount}, WhiteDiamond:${whiteDiamondCount}`);

      // 取出該位置對應的 x 數量 (若沒抓到則預設為 1)
      const qVal = (c < extractedQuantities.length) ? extractedQuantities[c] : 1;

      // 判斷此卡片屬於哪種道具
      if (purpleCount > cyanCount && purpleCount > pinkCount && purpleCount > 200) {
        detectedCounts.solFragment = qVal;
      } else if (cyanCount > pinkCount && cyanCount > purpleCount && cyanCount > 200) {
        detectedCounts.solEnergy = qVal;
      } else if (pinkCount > cyanCount && pinkCount > purpleCount && pinkCount > 150) {
        detectedCounts.weakEnergy = qVal;
      } else if (whiteDiamondCount > 400 && pinkCount < 100) {
        detectedCounts.core = qVal;
      }
    }

    console.log('[Card Level Final Detected Item Counts]', detectedCounts);

    // 填入左側 Form 輸入框
    if (inputItemCore) inputItemCore.value = detectedCounts.core;
    if (inputItemSolFragment) inputItemSolFragment.value = detectedCounts.solFragment;
    if (inputItemSolEnergy) inputItemSolEnergy.value = detectedCounts.solEnergy;
    if (inputItemWeakEnergy) inputItemWeakEnergy.value = detectedCounts.weakEnergy;

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
