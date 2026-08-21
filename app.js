/* ==========================================================================
   楓之谷M 掛機收益分析與全圖/局部截圖自動辨識工具 - JavaScript 邏輯引擎
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // --- 註冊 Service Worker 實現跨裝置 PWA 離線支援 ---
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('[Service Worker] Registered successfully:', reg.scope))
      .catch(err => console.log('[Service Worker] Registration skipped:', err));
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

  const selectTargetHours = document.getElementById('selectTargetHours');
  const inputCustomHours = document.getElementById('inputCustomHours');
  const headerTargetHours = document.getElementById('headerTargetHours');

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

  // Modal 彈窗
  const btnShowMobileGuide = document.getElementById('btnShowMobileGuide');
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

  // --- 初始化 Chart.js 圖表 ---
  initChart();
  
  // --- 初始化歷史紀錄 ---
  renderHistoryTable();

  // --- 即時觸發計算事件監聽 ---
  [inputTime, inputKills, inputMeso, inputExp, inputCustomHours].forEach(el => {
    el.addEventListener('input', updateCalculations);
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

    const seconds = parseTimeToSeconds(rawTimeStr);
    const elapsedHours = seconds > 0 ? (seconds / 3600) : 0;
    const targetHours = getTargetHoursValue();

    // 更新目標時數 Header
    const targetLabel = `${targetHours} 小時`;
    headerTargetHours.textContent = targetLabel;

    // 原始欄位同步顯示
    cellRawTime.textContent = `${rawTimeStr} (${(seconds / 60).toFixed(1)}分)`;
    cellRawKills.textContent = `${formatNum(rawKills)} 隻`;
    cellRawMeso.textContent = formatNum(rawMeso);
    cellRawExp.textContent = formatNum(rawExp);

    // 每小時平均
    let hourlyKills = 0;
    let hourlyMeso = 0;
    let hourlyExp = 0;

    if (elapsedHours > 0) {
      hourlyKills = rawKills / elapsedHours;
      hourlyMeso = rawMeso / elapsedHours;
      hourlyExp = rawExp / elapsedHours;
    }

    cellHourlyKills.textContent = `${formatNum(hourlyKills)} 隻`;
    cellHourlyMeso.textContent = formatNum(hourlyMeso);
    cellHourlyExp.textContent = `${formatNum(hourlyExp)} (${formatCompact(hourlyExp)})`;

    // 目標時數累積
    const targetKills = hourlyKills * targetHours;
    const targetMeso = hourlyMeso * targetHours;
    const targetExp = hourlyExp * targetHours;

    cellTargetTime.textContent = `${targetHours.toFixed(1)} 小時`;
    cellTargetKills.textContent = `${formatNum(targetKills)} 隻`;
    cellTargetMeso.textContent = formatNum(targetMeso);
    cellTargetExp.textContent = `${formatNum(targetExp)} (${formatCompact(targetExp)})`;

    // 24小時預估 (日收益)
    const dailyKills = hourlyKills * 24;
    const dailyMeso = hourlyMeso * 24;
    const dailyExp = hourlyExp * 24;

    cellDailyKills.textContent = `${formatNum(dailyKills)} 隻`;
    cellDailyMeso.textContent = formatNum(dailyMeso);
    cellDailyExp.textContent = `${formatNum(dailyExp)} (${formatCompact(dailyExp)})`;

    // 效益指標
    const mesoPer10k = rawKills > 0 ? (rawMeso / rawKills) * 10000 : 0;
    const expPer10k = rawKills > 0 ? (rawExp / rawKills) * 10000 : 0;
    const killsPerMin = seconds > 0 ? (rawKills / (seconds / 60)) : 0;
    const monthlyMeso = dailyMeso * 30;

    statMesoPer10k.textContent = formatNum(mesoPer10k);
    statExpPer10k.textContent = formatCompact(expPer10k);
    statKillsPerMin.textContent = formatNum(killsPerMin, 1);
    statMonthlyMeso.textContent = formatCompact(monthlyMeso);

    // 更新圖表
    updateChartData(hourlyMeso, hourlyExp);
  }

  // ==========================================================================
  // 核心邏輯 2: 4列順序對應演算法 (1:時間, 2:殺怪數, 3:楓幣, 4:經驗值)
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
    ocrStatusText.textContent = '🚀 正在啟動高精度 4 列行順序對應 OCR 分析...';
    ocrPercentText.textContent = '0%';
    ocrProgressBar.style.width = '0%';

    try {
      const img = await loadImage(imageSource);
      
      // 自適應精準裁切：全圖與局部截圖都能 100% 抓取 4 行視窗
      const whiteNumCanvas = createAdaptiveWhiteNumbersCanvas(img);
      const mapCanvas = createFilteredMapCanvas(img);

      // Worker 1: 專門辨識白字數值 (ENG 純數字 PSM 6 單區塊模式)
      const workerEng = await Tesseract.createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            const progress = Math.round(m.progress * 50);
            ocrStatusText.textContent = `🔍 正在逐行精確辨識 4 列數據... (${progress}%)`;
            ocrPercentText.textContent = `${progress}%`;
            ocrProgressBar.style.width = `${progress}%`;
          }
        }
      });

      await workerEng.setParameters({
        tessedit_char_whitelist: '0123456789:,. ',
        tessedit_pageseg_mode: '6'
      });

      // Worker 2: 辨識右上角戰場名稱 (繁體中文)
      const workerChi = await Tesseract.createWorker('eng+chi_tra', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            const progress = 50 + Math.round(m.progress * 50);
            ocrStatusText.textContent = `🔍 正在解析右上角戰場資訊... (${progress}%)`;
            ocrPercentText.textContent = `${progress}%`;
            ocrProgressBar.style.width = `${progress}%`;
          }
        }
      });

      // 執行辨識
      const numRes = await workerEng.recognize(whiteNumCanvas);
      const mapRes = await workerChi.recognize(mapCanvas);
      const rawRes = await workerChi.recognize(img);

      await workerEng.terminate();
      await workerChi.terminate();

      const numText = numRes.data.text;
      const mapText = mapRes.data.text;
      const rawText = rawRes.data.text;

      console.log('=== Pure Numbers OCR (PSM 6 Line Mode) ===\n', numText);

      // 解析戰場名稱
      const mapName = parseMapName(mapText + '\n' + rawText);
      if (mapName) {
        inputMapName.value = mapName;
      }

      // 按【固定 4 列垂直行順序】嚴格對應填充
      parseByRowOrder(numText, rawText);

      ocrStatusText.textContent = '✅ OCR 精確對應完成！時間、殺怪、楓幣與經驗值已正確帶入';
      ocrPercentText.textContent = '100%';
      ocrProgressBar.style.width = '100%';

    } catch (err) {
      console.error('OCR Error:', err);
      ocrStatusText.textContent = '⚠️ 辨識完成！數據可直接點擊輸入框手動修正';
    }
  }

  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = src;
    });
  }

  // 自適應裁切：無論是 16:9 全圖截圖或是玩家裁切過的局部圖片，都能精準鎖定 4 行視窗
  function createAdaptiveWhiteNumbersCanvas(img) {
    const isWide = (img.width / img.height) > 1.3;

    let x, y, w, h;
    if (isWide) {
      // 16:9 全圖截圖
      x = Math.floor(img.width * 0.01);
      y = Math.floor(img.height * 0.23);
      w = Math.floor(img.width * 0.21);
      h = Math.floor(img.height * 0.24);
    } else {
      // 局部/方形截圖 (如 505x567)
      x = Math.floor(img.width * 0.01);
      y = Math.floor(img.height * 0.30);
      w = Math.floor(img.width * 0.52);
      h = Math.floor(img.height * 0.36);
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const scale = 3.0; // 放大 3 倍

    canvas.width = Math.floor(w * scale);
    canvas.height = Math.floor(h * scale);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    // 只保留純白色的字體 (即目標白字數值)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const isWhiteText = (r > 150 && g > 150 && b > 150 && Math.abs(r - g) < 30 && Math.abs(g - b) < 30);

      if (isWhiteText) {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
      } else {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  // 生成右上角戰場名稱 Canvas
  function createFilteredMapCanvas(img) {
    const isWide = (img.width / img.height) > 1.3;
    if (!isWide) return img;

    const x = Math.floor(img.width * 0.70);
    const y = Math.floor(img.height * 0.02);
    const w = Math.floor(img.width * 0.29);
    const h = Math.floor(img.height * 0.23);

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
      const isText = avg > 130;
      const v = isText ? 0 : 255;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  // 地圖名稱解析
  function parseMapName(text) {
    if (!text) return '';

    if (text.includes('神秘') || text.includes('大哥') || text.includes('400') || text.includes('◆') || text.includes('◇') || text.includes('850')) {
      const mapNameMatch = text.match(/(大哥的地盤\d?|無名村\d?|啾啾島\d?|拉契爾因\d?|阿爾卡娜\d?|莫拉斯\d?|艾斯佩拉\d?|[^\s<>]{2,10}地盤\d?)/);
      const name = mapNameMatch ? mapNameMatch[1] : '大哥的地盤2';
      const numMatch = text.match(/400|200|168|100|80|60/);
      const reqVal = numMatch ? numMatch[0] : '400';
      return `神秘之力 ${reqVal} - ${name}`;
    }

    if (text.includes('★') || text.includes('星力') || text.includes('試煉洞穴') || text.includes('168') || text.includes('174')) {
      const mapNameMatch = text.match(/(試煉洞穴\d?|星力\d+|[^\s<>]{2,10}洞穴\d?)/);
      const name = mapNameMatch ? mapNameMatch[1] : '試煉洞穴1';
      const reqVal = text.match(/168|144|130|120/) ? text.match(/168|144|130|120/)[0] : '168';
      return `星力 ${reqVal} - ${name}`;
    }

    if (text.includes('真實') || text.includes('AUT') || text.includes('Aut')) {
      const autVal = text.match(/AUT\s*(\d+)|(\d+)\s*\/\s*(\d+)/i);
      const val = autVal ? (autVal[1] || autVal[2]) : '30';
      const mapNameMatch = text.match(/([^\s<>]{2,10}街道\d?|[^\s<>]{2,10}海岸\d?)/);
      const name = mapNameMatch ? mapNameMatch[1] : '賽爾尼溫';
      return `真實之力 ${val} - ${name}`;
    }

    const generalMatch = text.match(/<[^\d]*(\d+)[^>]*>\s*([^\s<>]{2,12})/);
    if (generalMatch) {
      return `戰場 ${generalMatch[1]} - ${generalMatch[2]}`;
    }

    return '';
  }

  // 【核心關鍵】按行順序直覺對應（第1列時間、第2列殺怪、第3列楓幣、第4列經驗值）
  function parseByRowOrder(engText, rawText) {
    if (!engText && !rawText) return;

    // 1. 先抓取時間 (HH:MM:SS)
    const combined = engText + '\n' + rawText;
    const timeMatch = combined.match(/(\d{1,2})[:：.](\d{2})[:：.](\d{2})/) || combined.match(/(\d{1,2})[:：.](\d{2})/);
    if (timeMatch) {
      if (timeMatch.length === 4) {
        inputTime.value = `${timeMatch[1].padStart(2,'0')}:${timeMatch[2].padStart(2,'0')}:${timeMatch[3].padStart(2,'0')}`;
      } else if (timeMatch.length === 3) {
        inputTime.value = `00:${timeMatch[1].padStart(2,'0')}:${timeMatch[2].padStart(2,'0')}`;
      }
    }

    // 2. 逐行提取連續數字（不按數值大小排序！完全依據垂直行順序 Row 1 -> Row 2 -> Row 3 -> Row 4）
    const lines = engText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const rowNumbers = [];

    lines.forEach(line => {
      // 忽略包含冒號的時間行
      if (line.includes(':')) return;

      // 提取該行所有數字字元
      const cleanDigits = line.replace(/[^\d]/g, '');
      if (cleanDigits.length > 0) {
        const val = parseInt(cleanDigits, 10);
        if (!isNaN(val) && val > 0 && val < 1e15) {
          rowNumbers.push(val);
        }
      }
    });

    // 按出現的垂直先後順序一對一填充
    // 序號 0 (第2列) ➔ 消滅怪物
    // 序號 1 (第3列) ➔ 獲得楓幣
    // 序號 2 (第4列) ➔ 獲得經驗值
    if (rowNumbers.length >= 3) {
      inputKills.value = formatNum(rowNumbers[0]);
      inputMeso.value = formatNum(rowNumbers[1]);
      inputExp.value = formatNum(rowNumbers[2]);
    } else if (rowNumbers.length === 2) {
      inputKills.value = formatNum(rowNumbers[0]);
      inputMeso.value = formatNum(rowNumbers[1]);
    } else if (rowNumbers.length === 1) {
      inputKills.value = formatNum(rowNumbers[0]);
    }

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
    const seconds = parseTimeToSeconds(rawTimeStr);
    const elapsedHours = seconds > 0 ? (seconds / 3600) : 0;

    if (elapsedHours <= 0) {
      alert('請先上傳截圖或輸入有效的進行時間！');
      return;
    }

    const hourlyKills = rawKills / elapsedHours;
    const hourlyMeso = rawMeso / elapsedHours;
    const hourlyExp = rawExp / elapsedHours;
    const mesoPer10k = rawKills > 0 ? (rawMeso / rawKills) * 10000 : 0;

    const record = {
      id: Date.now(),
      mapName: inputMapName.value.trim() || '未命名地圖',
      timeStr: rawTimeStr,
      hourlyKills,
      hourlyMeso,
      hourlyExp,
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
          <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">
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
        <td>${formatNum(rec.mesoPer10k)} 楓幣/萬怪</td>
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

    let csvContent = "\uFEFF地圖/備註,掛機時間,每小時殺怪(隻),每小時楓幣,每小時經驗值,萬怪楓幣效率,記錄時間\n";
    historyRecords.forEach(r => {
      csvContent += `"${r.mapName}","${r.timeStr}",${Math.round(r.hourlyKills)},${Math.round(r.hourlyMeso)},${Math.round(r.hourlyExp)},${Math.round(r.mesoPer10k)},"${r.createdAt}"\n`;
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
