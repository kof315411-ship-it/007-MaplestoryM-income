/* ==========================================================================
   楓之谷M 掛機收益分析與全圖截圖自動辨識工具 - JavaScript 邏輯引擎
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
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

  // --- 全域變數 ---
  let incomeChart = null;
  let historyRecords = JSON.parse(localStorage.getItem('mapleM_income_records') || '[]');

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
    const parts = str.trim().split(/[:：]/).map(p => parseInt(p, 10) || 0);
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
  // 核心邏輯 2: Tesseract.js 全圖與分區 OCR (包含右上角地圖判定)
  // ==========================================================================

  async function handleImageUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImage.src = e.target.result;
      previewContainer.classList.add('active');
      runMultiRegionOCR(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  async function runMultiRegionOCR(imageSource) {
    ocrProgressBox.style.display = 'block';
    ocrStatusText.textContent = '🚀 正在啟動 OCR 辨識引擎...';
    ocrPercentText.textContent = '0%';
    ocrProgressBar.style.width = '0%';

    try {
      const img = await loadImage(imageSource);
      
      // 1. 建立區域 Canvas: 全圖/左側面板 (掛機數據) 與 右上角 (地圖名稱)
      const leftPanelCanvas = cropRegionCanvas(img, 0, 0.15, 0.45, 0.55); // 左側 ROI
      const topRightCanvas = cropRegionCanvas(img, 0.55, 0, 0.45, 0.35);  // 右上角 ROI

      const worker = await Tesseract.createWorker('eng+chi_tra', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            const progress = Math.round(m.progress * 100);
            ocrStatusText.textContent = `🔍 正在分析遊戲全圖與戰場資訊... (${progress}%)`;
            ocrPercentText.textContent = `${progress}%`;
            ocrProgressBar.style.width = `${progress}%`;
          }
        }
      });

      // 辨識左側掛機數據面板
      const leftRes = await worker.recognize(leftPanelCanvas || img);
      const leftText = leftRes.data.text;

      // 辨識右上角地圖區域
      const topRes = await worker.recognize(topRightCanvas || img);
      const topText = topRes.data.text;

      // 辨識全圖備用
      const fullRes = await worker.recognize(img);
      const fullText = fullRes.data.text;

      await worker.terminate();

      console.log('--- Left Panel OCR ---', leftText);
      console.log('--- Top Right OCR ---', topText);
      console.log('--- Full Screen OCR ---', fullText);

      // 解析戰場地圖名稱 (右上角)
      const mapNameResult = parseMapNameFromOCR(topText + '\n' + fullText);
      if (mapNameResult) {
        inputMapName.value = mapNameResult;
      }

      // 解析掛機數據 (進行時間、殺怪數、楓幣、經驗)
      parseStatsFromOCR(leftText + '\n' + fullText);

      ocrStatusText.textContent = '✅ 全圖 OCR 辨識完成！數據與戰場地圖已填入';
      ocrPercentText.textContent = '100%';
      ocrProgressBar.style.width = '100%';

    } catch (err) {
      console.error('OCR Error:', err);
      ocrStatusText.textContent = '⚠️ 辨識完成或部分欄位未自動讀取，請手動確認填寫數值';
    }
  }

  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = src;
    });
  }

  function cropRegionCanvas(img, relX, relY, relW, relH) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const x = Math.floor(img.width * relX);
    const y = Math.floor(img.height * relY);
    const w = Math.floor(img.width * relW);
    const h = Math.floor(img.height * relH);

    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(img, x, y, w, h, 0, 0, w, h);

    // 增強對比二值化
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      const isBright = avg > 130;
      const val = isBright ? 255 : 0;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  // 解析右上角戰場名稱 (神秘之力戰場、真實之力戰場、星力戰場)
  function parseMapNameFromOCR(text) {
    if (!text) return '';

    // 1. 神秘之力戰場 (Arcane Power: <◆400> 大哥的地盤2 或 850/400)
    const arcaneMatch = text.match(/(?:[<〔]?[◆◇◆]?\s*(\d{2,4})[>\]〕]?\s*([^\s<>]+)|(\d{2,4})\s*\/\s*(\d{2,4}))/);
    if (text.includes('神秘') || text.includes('大哥') || text.includes('400') || text.includes('◆') || text.includes('◇')) {
      const mapNameMatch = text.match(/(大哥的地盤\d?|無名村\d?|啾啾島\d?|拉契爾因\d?|阿爾卡娜\d?|莫拉斯\d?|艾斯佩拉\d?|[^\s<>]{3,10}地盤\d?)/);
      const name = mapNameMatch ? mapNameMatch[1] : '大哥的地盤2';
      const numMatch = text.match(/400|200|168|100|80|60/);
      const reqVal = numMatch ? numMatch[0] : '400';
      return `神秘之力 ${reqVal} - ${name}`;
    }

    // 2. 星力戰場 (Star Force: <★168> 試煉洞穴1 或 ★168)
    const starMatch = text.match(/(?:[<〔]?[★*]?\s*(\d{2,3})[>\]〕]?\s*([^\s<>]+)|174\/168)/);
    if (text.includes('★') || text.includes('星力') || text.includes('試煉洞穴') || text.includes('168')) {
      const mapNameMatch = text.match(/(試煉洞穴\d?|星力\d+|[^\s<>]{3,10}洞穴\d?)/);
      const name = mapNameMatch ? mapNameMatch[1] : '試煉洞穴1';
      const reqVal = text.match(/168|144|130|120/) ? text.match(/168|144|130|120/)[0] : '168';
      return `星力 ${reqVal} - ${name}`;
    }

    // 3. 真實之力戰場 (Authentic Power)
    if (text.includes('真實') || text.includes('AUT') || text.includes('Aut')) {
      const autVal = text.match(/AUT\s*(\d+)|(\d+)\s*\/\s*(\d+)/i);
      const val = autVal ? (autVal[1] || autVal[2]) : '30';
      const mapNameMatch = text.match(/([^\s<>]{3,10}街道\d?|[^\s<>]{3,10}海岸\d?)/);
      const name = mapNameMatch ? mapNameMatch[1] : '賽爾尼溫';
      return `真實之力 ${val} - ${name}`;
    }

    // 通用抓取 <數字> 地圖名 格式
    const generalMatch = text.match(/<[^\d]*(\d+)[^>]*>\s*([^\s<>]{2,12})/);
    if (generalMatch) {
      return `戰場 ${generalMatch[1]} - ${generalMatch[2]}`;
    }

    return '';
  }

  function parseStatsFromOCR(text) {
    if (!text) return;

    // 1. 進行時間 (尋找 00:56:51 或 56:51)
    const timeMatch = text.match(/(\d{1,2})[:：](\d{2})[:：](\d{2})/);
    if (timeMatch) {
      inputTime.value = `${timeMatch[1].padStart(2,'0')}:${timeMatch[2]}:${timeMatch[3]}`;
    }

    // 2. 提取大數字
    const numberMatches = text.match(/[\d,]{4,}/g) || [];
    const cleanNumbers = numberMatches.map(n => n.replace(/,/g, '')).map(n => parseInt(n, 10)).filter(n => !isNaN(n));

    if (cleanNumbers.length >= 3) {
      cleanNumbers.sort((a, b) => a - b);
      inputKills.value = formatNum(cleanNumbers[0]);
      inputMeso.value = formatNum(cleanNumbers[1]);
      inputExp.value = formatNum(cleanNumbers[2]);
    } else {
      const killsMatch = text.match(/(?:消滅怪物|怪物|消滅)?\s*([\d,]+)/i);
      const mesoMatch = text.match(/(?:獲得楓幣|楓幣)?\s*([\d,]+)/i);
      const expMatch = text.match(/(?:獲得經驗值|經驗值)?\s*([\d,]+)/i);

      if (killsMatch && killsMatch[1]) inputKills.value = killsMatch[1];
      if (mesoMatch && mesoMatch[1]) inputMeso.value = mesoMatch[1];
      if (expMatch && expMatch[1]) inputExp.value = expMatch[1];
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
