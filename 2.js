

// Show store analysis - Compare mean of all nodes in selected date range
function showStoreAnalysis(storeId, storeName) {

  // Get date range text
  let dateRangeText = '';
  if (selectedDate === 'today') {
    dateRangeText = 'Hôm nay';
  } else if (selectedDate === 'yesterday') {
    dateRangeText = 'Hôm qua';
  } else if (selectedDate === '2days') {
    dateRangeText = '2 ngày trước';
  } else if (selectedDate === '3days') {
    dateRangeText = '3 ngày trước';
  } else if (selectedDate === 'custom') {
    dateRangeText = `${formatDateVN(customStartDate)} → ${formatDateVN(customEndDate)}`;
  }
  
  // Get all nodes data
  const nodesData = historicalData[storeId];
  if (!nodesData || Object.keys(nodesData).length === 0) {
    alert(`Không có dữ liệu trong khoảng thời gian ${dateRangeText}`);
    return;
  }
  
  const nodeIds = Object.keys(nodesData).sort((a, b) => a - b);
  
  // Calculate mean for each node
  let nodeStats = [];
  let allTemps = [];
  let allHum = [];
  
  nodeIds.forEach(nodeId => {
    const readings = nodesData[nodeId];
    if (!readings || readings.length === 0) return;
    
    const temps = readings.map(r => r.temperature / 10);
    const hums = readings.map(r => r.humidity / 10);
    
    const avgTemp = temps.reduce((a,b) => a+b, 0) / temps.length;
    const avgHum = hums.reduce((a,b) => a+b, 0) / hums.length;
    const maxTemp = Math.max(...temps);
    const minTemp = Math.min(...temps);
    
    allTemps.push(...temps);
    allHum.push(...hums);
    
    nodeStats.push({
      nodeId: nodeId,
      avgTemp: avgTemp,
      avgHum: avgHum,
      maxTemp: maxTemp,
      minTemp: minTemp,
      readings: readings.length
    });
  });
  
  // Calculate store mean
  const storeAvgTemp = (allTemps.reduce((a,b) => a+b, 0) / allTemps.length).toFixed(1);
  const storeAvgHum = (allHum.reduce((a,b) => a+b, 0) / allHum.length).toFixed(1);
  
  // Find best and worst nodes
  const bestNode = [...nodeStats].sort((a,b) => 
    Math.abs(a.avgTemp - 5) - Math.abs(b.avgTemp - 5)
  )[0];
  
  const worstNode = [...nodeStats].sort((a,b) => 
    Math.abs(b.avgTemp - 5) - Math.abs(a.avgTemp - 5)
  )[0];
  
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100000;
  `;
  
  modal.innerHTML = `
    <div style="background: white; width: 90%; max-width: 800px; border-radius: 20px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px 25px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h2 style="margin: 0;">📊 PHÂN TÍCH TỔNG QUÁT</h2>
            <p style="margin: 5px 0 0; opacity: 0.9;">${storeName}</p>
            <p style="margin: 5px 0 0; opacity: 0.8; font-size: 12px;">📅 ${dateRangeText}</p>
          </div>
          <button onclick="this.closest('.modal-overlay').remove()" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 24px; cursor: pointer; width: 36px; height: 36px; border-radius: 50%;">✕</button>
        </div>
      </div>
      
      <div style="padding: 25px;">
        <!-- Store Mean -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
          <div style="background: #f8fafc; padding: 20px; border-radius: 12px; text-align: center;">
            <div style="font-size: 12px; color: #64748b;">🌡️ NHIỆT ĐỘ TRUNG BÌNH KHO</div>
            <div style="font-size: 36px; font-weight: bold; color: #ef4444;">${storeAvgTemp}°C</div>
            <div style="font-size: 11px; color: #64748b;">Ngưỡng: 2°C - 8°C</div>
          </div>
          <div style="background: #f8fafc; padding: 20px; border-radius: 12px; text-align: center;">
            <div style="font-size: 12px; color: #64748b;">💧 ĐỘ ẨM TRUNG BÌNH KHO</div>
            <div style="font-size: 36px; font-weight: bold; color: #3b82f6;">${storeAvgHum}%</div>
            <div style="font-size: 11px; color: #64748b;">Ngưỡng: 40% - 70%</div>
          </div>
        </div>
        
        <!-- Node Comparison Table -->
        <h3 style="margin: 0 0 15px 0;">📋 SO SÁNH TRUNG BÌNH CÁC NODE</h3>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 12px; text-align: left;">Node</th>
                <th style="padding: 12px; text-align: center;">🌡️ Nhiệt độ TB</th>
                <th style="padding: 12px; text-align: center;">💧 Độ ẩm TB</th>
                <th style="padding: 12px; text-align: center;">📊 So với TB kho</th>
                <th style="padding: 12px; text-align: center;">📝 Số bản ghi</th>
              </tr>
            </thead>
            <tbody>
              ${nodeStats.map(node => {
                const tempDiff = (node.avgTemp - storeAvgTemp).toFixed(1);
                const diffColor = tempDiff > 0 ? '#ef4444' : tempDiff < 0 ? '#3b82f6' : '#64748b';
                const diffIcon = tempDiff > 0 ? '▲' : tempDiff < 0 ? '▼' : '●';
                
                return `
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 12px;"><strong>Node ${node.nodeId}</strong></td>
                    <td style="padding: 12px; text-align: center; font-weight: bold; color: #ef4444;">${node.avgTemp.toFixed(1)}°C</td>
                    <td style="padding: 12px; text-align: center; font-weight: bold; color: #3b82f6;">${node.avgHum.toFixed(1)}%</td>
                    <td style="padding: 12px; text-align: center; color: ${diffColor};">
                      ${diffIcon} ${Math.abs(tempDiff)}°C
                    </td>
                    <td style="padding: 12px; text-align: center;">${node.readings}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        
        <!-- Insights -->
        <div style="margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 12px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 20px;">💡</span>
            <div style="flex: 1;">
              <strong>Nhận xét:</strong><br>
              • ${storeAvgTemp > 8 ? '⚠️ Nhiệt độ kho cao hơn ngưỡng khuyến nghị' : storeAvgTemp < 2 ? '❄️ Nhiệt độ kho thấp hơn ngưỡng khuyến nghị' : '✅ Nhiệt độ kho trong ngưỡng an toàn'}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.addEventListener('click', function(e) {
    if (e.target === modal) modal.remove();
  });
}

function showAbnormalDetection(storeId, storeName) {
   const nodesData = historicalData[storeId];
  if (!nodesData || Object.keys(nodesData).length === 0) {
    alert('Không có dữ liệu để phân tích');
    return;
  }
  
  // Lấy date range
  let dateRangeText = '';
  if (selectedDate === 'today') dateRangeText = 'Hôm nay';
  else if (selectedDate === 'yesterday') dateRangeText = 'Hôm qua';
  else if (selectedDate === '2days') dateRangeText = '2 ngày trước';
  else if (selectedDate === '3days') dateRangeText = '3 ngày trước';
  else if (selectedDate === 'custom') dateRangeText = `${formatDateVN(customStartDate)} → ${formatDateVN(customEndDate)}`;
  
  const nodeIds = Object.keys(nodesData).sort((a, b) => a - b);
  
  // Lưu trữ dữ liệu cho từng node
  let nodeStats = {};
  
  nodeIds.forEach(nodeId => {
    const readings = nodesData[nodeId];
    if (!readings || readings.length === 0) return;
    
    const sortedReadings = [...readings].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    // Khởi tạo stats cho node
    nodeStats[nodeId] = {
      // Nhiệt độ
      tempOutOfRange: [],
      tempOutCount: 0,
      tempSuddenChange: [],
      tempSuddenCount: 0,
      tempSuddenLowCount: 0,      // 1-2°C/10p
      tempSuddenMediumCount: 0,   // 2-3°C/10p
      tempSuddenHighCount: 0,     // 3-5°C/10p
      tempSuddenSevereCount: 0,   // >5°C/10p
      // Độ ẩm
      humOutOfRange: [],
      humOutCount: 0,
      humSuddenChange: [],
      humSuddenCount: 0,
      humSuddenLowCount: 0,       // 5-10%/2p
      humSuddenMediumCount: 0,    // 10-15%/2p
      humSuddenHighCount: 0,      // 15-20%/2p
      humSuddenSevereCount: 0,    // >20%/2p
      // Kết nối
      disconnections: [],
      disconnectionCount: 0,
      disconnectionFrequency: 0,
      // Pin
      batteryFrom: null,
      batteryTo: null,
      batteryTotalChange: null,
      batteryAbsChange: null,
      batteryHours: 0,
      batteryDays: 0,
      batteryFromTime: null,
      batteryToTime: null,
      batteryAnomaly: null
    };
    
    // === 1. NHIỆT ĐỘ NGOÀI NGƯỠNG (2-8°C) ===
    sortedReadings.forEach(reading => {
      const temp = reading.temperature / 10;
      if (temp > 8) {
        nodeStats[nodeId].tempOutCount++;
        nodeStats[nodeId].tempOutOfRange.push({
          time: formatDateTimeVN(reading.timestamp),
          value: temp.toFixed(1),
          type: 'high',
          message: `Nhiệt độ cao: ${temp.toFixed(1)}°C > 8°C`
        });
      } else if (temp < 2) {
        nodeStats[nodeId].tempOutCount++;
        nodeStats[nodeId].tempOutOfRange.push({
          time: formatDateTimeVN(reading.timestamp),
          value: temp.toFixed(1),
          type: 'low',
          message: `Nhiệt độ thấp: ${temp.toFixed(1)}°C < 2°C`
        });
      }
    });
    
    // === 2. NHIỆT ĐỘ THAY ĐỔI ĐỘT NGỘT (Phân loại theo mức độ) ===
    for (let i = 1; i < sortedReadings.length; i++) {
      const current = sortedReadings[i];
      const previous = sortedReadings[i - 1];
      
      const currentTemp = current.temperature / 10;
      const previousTemp = previous.temperature / 10;
      const tempChange = Math.abs(currentTemp - previousTemp);
      
      const currentTime = new Date(current.timestamp);
      const previousTime = new Date(previous.timestamp);
      const timeDiffMinutes = (currentTime - previousTime) / (1000 * 60);
      
      if (timeDiffMinutes <= 10) {
        let changeLevel = '';
        let changeColor = '';
        
        if (tempChange >= 5) {
          changeLevel = 'NGHIÊM TRỌNG';
          changeColor = '#7f1a1a';
          nodeStats[nodeId].tempSuddenSevereCount++;
        } else if (tempChange >= 3) {
          changeLevel = 'CAO';
          changeColor = '#dc2626';
          nodeStats[nodeId].tempSuddenHighCount++;
        } else if (tempChange >= 2) {
          changeLevel = 'TRUNG BÌNH';
          changeColor = '#f59e0b';
          nodeStats[nodeId].tempSuddenMediumCount++;
        } else if (tempChange >= 1) {
          changeLevel = 'NHẸ';
          changeColor = '#eab308';
          nodeStats[nodeId].tempSuddenLowCount++;
        }
        
        if (tempChange >= 1) {
          nodeStats[nodeId].tempSuddenCount++;
          nodeStats[nodeId].tempSuddenChange.push({
            time: formatDateTimeVN(current.timestamp),
            change: tempChange.toFixed(1),
            from: previousTemp.toFixed(1),
            to: currentTemp.toFixed(1),
            duration: Math.round(timeDiffMinutes),
            level: changeLevel,
            color: changeColor
          });
        }
      }
    }
    
    // === 3. ĐỘ ẨM NGOÀI NGƯỠNG (40-70%) ===
    sortedReadings.forEach(reading => {
      const hum = reading.humidity / 10;
      if (hum > 70) {
        nodeStats[nodeId].humOutCount++;
        nodeStats[nodeId].humOutOfRange.push({
          time: formatDateTimeVN(reading.timestamp),
          value: hum.toFixed(1),
          type: 'high',
          message: `Độ ẩm cao: ${hum.toFixed(1)}% > 70%`
        });
      } else if (hum < 40) {
        nodeStats[nodeId].humOutCount++;
        nodeStats[nodeId].humOutOfRange.push({
          time: formatDateTimeVN(reading.timestamp),
          value: hum.toFixed(1),
          type: 'low',
          message: `Độ ẩm thấp: ${hum.toFixed(1)}% < 40%`
        });
      }
    });
    
    // === 4. ĐỘ ẨM THAY ĐỔI ĐỘT NGỘT (Phân loại theo mức độ) ===
    for (let i = 1; i < sortedReadings.length; i++) {
      const current = sortedReadings[i];
      const previous = sortedReadings[i - 1];
      
      const currentHum = current.humidity / 10;
      const previousHum = previous.humidity / 10;
      const humChange = Math.abs(currentHum - previousHum);
      
      const currentTime = new Date(current.timestamp);
      const previousTime = new Date(previous.timestamp);
      const timeDiffMinutes = (currentTime - previousTime) / (1000 * 60);
      
      if (timeDiffMinutes <= 2) {
        let changeLevel = '';
        let changeColor = '';
        
        if (humChange >= 20) {
          changeLevel = 'NGHIÊM TRỌNG';
          changeColor = '#7f1a1a';
          nodeStats[nodeId].humSuddenSevereCount++;
        } else if (humChange >= 15) {
          changeLevel = 'CAO';
          changeColor = '#dc2626';
          nodeStats[nodeId].humSuddenHighCount++;
        } else if (humChange >= 10) {
          changeLevel = 'TRUNG BÌNH';
          changeColor = '#f59e0b';
          nodeStats[nodeId].humSuddenMediumCount++;
        } else if (humChange >= 5) {
          changeLevel = 'NHẸ';
          changeColor = '#eab308';
          nodeStats[nodeId].humSuddenLowCount++;
        }
        
        if (humChange >= 5) {
          nodeStats[nodeId].humSuddenCount++;
          nodeStats[nodeId].humSuddenChange.push({
            time: formatDateTimeVN(current.timestamp),
            change: humChange.toFixed(1),
            from: previousHum.toFixed(1),
            to: currentHum.toFixed(1),
            duration: Math.round(timeDiffMinutes),
            level: changeLevel,
            color: changeColor
          });
        }
      }
    }
    
    // === 5. MẤT KẾT NỐI (Trên 20p, tần suất >= 2 lần/ngày) ===
    const disconnections = analyzeDisconnections(sortedReadings, 20);
    if (disconnections.length > 0) {
      const firstTime = new Date(sortedReadings[0].timestamp);
      const lastTime = new Date(sortedReadings[sortedReadings.length - 1].timestamp);
      const daysDiff = Math.max(1, (lastTime - firstTime) / (1000 * 60 * 60 * 24));
      const frequencyPerDay = disconnections.length / daysDiff;
      
      if (frequencyPerDay >= 2) {
        nodeStats[nodeId].disconnectionCount = disconnections.length;
        nodeStats[nodeId].disconnectionFrequency = frequencyPerDay.toFixed(1);
        nodeStats[nodeId].disconnections = disconnections.map(dis => ({
          startTime: dis.startTime,
          endTime: dis.endTime,
          duration: dis.durationText,
          date: dis.startDate
        }));
      }
    }
    
// === 6. PIN THAY ĐỔI BẤT THƯỜNG ===
const readingsWithVbat = sortedReadings.filter(r => r.vbat_percent !== null && r.vbat_percent !== undefined);
if (readingsWithVbat.length >= 2) {
  const firstVbat = readingsWithVbat[0];
  const lastVbat = readingsWithVbat[readingsWithVbat.length - 1];
  
  const firstTime = new Date(firstVbat.timestamp);
  const lastTime = new Date(lastVbat.timestamp);
  const hoursDiff = (lastTime - firstTime) / (1000 * 60 * 60);
  const daysDiff = hoursDiff / 24;
  
  const totalChange = lastVbat.vbat_percent - firstVbat.vbat_percent;
  const absTotalChange = Math.abs(totalChange);
  
  // Lưu thông tin cơ bản
  nodeStats[nodeId].batteryFrom = firstVbat.vbat_percent;
  nodeStats[nodeId].batteryTo = lastVbat.vbat_percent;
  nodeStats[nodeId].batteryTotalChange = totalChange.toFixed(1);
  nodeStats[nodeId].batteryAbsChange = absTotalChange.toFixed(1);
  nodeStats[nodeId].batteryHours = hoursDiff.toFixed(1);
  nodeStats[nodeId].batteryDays = daysDiff.toFixed(1);
  nodeStats[nodeId].batteryFromTime = formatDateTimeVN(firstVbat.timestamp);
  nodeStats[nodeId].batteryToTime = formatDateTimeVN(lastVbat.timestamp);
  
  // 🔥 CÁC MỨC CẢNH BÁO DỰA TRÊN TỔNG THAY ĐỔI
  let warningLevel = null;
  let warningMessage = '';
  let warningColor = '';
  
  if (absTotalChange > 15) {
    warningLevel = 'critical';
    warningMessage = `⚠️ NGHIÊM TRỌNG: Thay đổi ${absTotalChange.toFixed(1)}%`;
    warningColor = '#7f1a1a';
  } else if (absTotalChange > 10) {
    warningLevel = 'high';
    warningMessage = `⚠️ CAO: Thay đổi ${absTotalChange.toFixed(1)}%`;
    warningColor = '#dc2626';
  } else if (absTotalChange > 5) {
    warningLevel = 'medium';
    warningMessage = `⚠️ TRUNG BÌNH: Thay đổi ${absTotalChange.toFixed(1)}%`;
    warningColor = '#f59e0b';
  } else if (absTotalChange > 2) {
    warningLevel = 'low';
    warningMessage = `⚠️ NHẸ: Thay đổi ${absTotalChange.toFixed(1)}%`;
    warningColor = '#eab308';
  }
  
  if (warningLevel) {
    nodeStats[nodeId].batteryAnomaly = {
      from: firstVbat.vbat_percent,
      to: lastVbat.vbat_percent,
      totalChange: totalChange.toFixed(1),
      absTotalChange: absTotalChange.toFixed(1),
      period: daysDiff.toFixed(1),
      hours: hoursDiff.toFixed(1),
      fromTime: formatDateTimeVN(firstVbat.timestamp),
      toTime: formatDateTimeVN(lastVbat.timestamp),
      direction: totalChange > 0 ? 'tăng' : 'giảm',
      level: warningLevel,
      message: warningMessage,
      color: warningColor
    };
  }
} else if (readingsWithVbat.length === 1) {
  nodeStats[nodeId].batteryFrom = readingsWithVbat[0].vbat_percent;
  nodeStats[nodeId].batteryTo = 'N/A';
  nodeStats[nodeId].batteryTotalChange = null;
  nodeStats[nodeId].batteryNote = 'Chỉ có 1 lần đo pin';
} else {
  nodeStats[nodeId].batteryFrom = 'N/A';
  nodeStats[nodeId].batteryTo = 'N/A';
  nodeStats[nodeId].batteryTotalChange = null;
  nodeStats[nodeId].batteryNote = 'Không có dữ liệu pin';
}

  });
  
  // Tạo modal với tabs
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100000;
  `;
  
  modal.innerHTML = `
    <div style="background: white; width: 95%; max-width: 1300px; max-height: 90vh; border-radius: 20px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px 25px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h2 style="margin: 0;">⚠️ PHÁT HIỆN BẤT THƯỜNG</h2>
            <p style="margin: 5px 0 0; opacity: 0.9;">${storeName}</p>
            <p style="margin: 5px 0 0; opacity: 0.8; font-size: 12px;">📅 ${dateRangeText}</p>
          </div>
          <button onclick="this.closest('.modal-overlay').remove()" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 24px; cursor: pointer; width: 36px; height: 36px; border-radius: 50%;">✕</button>
        </div>
      </div>
      
      <!-- Tabs -->
      <div style="display: flex; border-bottom: 1px solid #e2e8f0; background: white; padding: 0 20px; overflow-x: auto;">
        <div class="tab-btn active" data-tab="temp" style="padding: 12px 20px; cursor: pointer; font-weight: 500; border-bottom: 2px solid #f59e0b; color: #f59e0b; white-space: nowrap;">
          🌡️ NHIỆT ĐỘ
        </div>
        <div class="tab-btn" data-tab="hum" style="padding: 12px 20px; cursor: pointer; font-weight: 500; color: #64748b; white-space: nowrap;">
          💧 ĐỘ ẨM
        </div>
        <div class="tab-btn" data-tab="connection" style="padding: 12px 20px; cursor: pointer; font-weight: 500; color: #64748b; white-space: nowrap;">
          📡 MẤT KẾT NỐI
        </div>
        <div class="tab-btn" data-tab="battery" style="padding: 12px 20px; cursor: pointer; font-weight: 500; color: #64748b; white-space: nowrap;">
          🔋 PIN
        </div>
      </div>
      
<!-- Tab 1: Nhiệt độ -->
<div id="tab-temp" class="tab-content" style="display: block; padding: 20px; max-height: calc(90vh - 280px); overflow-y: auto;">
  
  <!-- Bảng tổng hợp nhiệt độ các node -->
  <div style="margin-bottom: 25px; overflow-x: auto;">
    <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0;">
      <thead>
        <tr style="background: #f1f5f9;">
          <th style="padding: 10px; text-align: left;">Node</th>
          <th style="padding: 10px; text-align: center;">🌡️ Ngoài ngưỡng (2-8°C)</th>
          <th style="padding: 10px; text-align: center;">⚡ Đột ngột (≥2°C/10p)</th>
          <th style="padding: 10px; text-align: center;">📊 Mức độ</th>
          <th style="padding: 10px; text-align: center;">⚠️ Cảnh báo & Khuyến nghị</th>
         </tr>
      </thead>
      <tbody>
        ${Object.keys(nodeStats).sort((a,b) => a-b).map(nodeId => {
          const stats = nodeStats[nodeId];
          const tempOutCount = stats.tempOutCount;
          const tempSuddenCount = stats.tempSuddenCount;
          
          // Kết hợp cả 2 yếu tố để phân loại
          let level = '';
          let levelColor = '';
          let levelBg = '';
          let warningMessage = '';
          let recommendation = '';
          
          // Mức NGHIÊM TRỌNG: >15 lần ngoài ngưỡng HOẶC >10 lần đột ngột
          if (tempOutCount > 15 || tempSuddenCount > 10) {
            level = 'NGHIÊM TRỌNG';
            levelColor = '#7f1a1a';
            levelBg = '#7f1a1a20';
            warningMessage = '⚠️ HỆ THỐNG LẠNH CÓ VẤN ĐỀ NGHIÊM TRỌNG';
            recommendation = '📌 CẤP CỨU: Kiểm tra máy nén, gas, cảm biến nhiệt độ ngay!';
          
          // Mức CAO: 10-15 lần ngoài ngưỡng HOẶC 5-10 lần đột ngột
          } else if ((tempOutCount >= 10 && tempOutCount <= 15) || (tempSuddenCount >= 5 && tempSuddenCount <= 10)) {
            level = 'CAO';
            levelColor = '#dc2626';
            levelBg = '#dc262620';
            warningMessage = '⚠️ HỆ THỐNG LẠNH HOẠT ĐỘNG KHÔNG ỔN ĐỊNH';
            recommendation = '🔧 Kiểm tra quạt dàn lạnh, vệ sinh bảo trì, kiểm tra cài đặt nhiệt độ';
          
          // Mức TRUNG BÌNH: 5-9 lần ngoài ngưỡng HOẶC 2-4 lần đột ngột
          } else if ((tempOutCount >= 5 && tempOutCount <= 9) || (tempSuddenCount >= 2 && tempSuddenCount <= 4)) {
            level = 'TRUNG BÌNH';
            levelColor = '#f59e0b';
            levelBg = '#f59e0b20';
            warningMessage = '⚠️ MÁY LẠNH HOẠT ĐỘNG KHÔNG ỔN ĐỊNH';
            recommendation = '📊 Theo dõi sát, kiểm tra nhiệt độ cài đặt, hạn chế mở cửa';
          
          // Mức NHẸ: 2-4 lần ngoài ngưỡng HOẶC 1 lần đột ngột
          } else if ((tempOutCount >= 2 && tempOutCount <= 4) || tempSuddenCount === 1) {
            level = 'NHẸ';
            levelColor = '#eab308';
            levelBg = '#eab30820';
            warningMessage = '⚠️ CÓ THỂ DO MỞ CỬA HOẶC XẾP HÀNG';
            recommendation = '👀 Theo dõi thêm, hạn chế mở cửa kho lạnh';
          
          // BÌNH THƯỜNG
          } else {
            level = 'BÌNH THƯỜNG';
            levelColor = '#22c55e';
            levelBg = '#22c55e20';
            warningMessage = '✅ HỆ THỐNG HOẠT ĐỘNG TỐT';
            recommendation = '👍 Tiếp tục duy trì';
          }
          
          // Màu sắc cho số lần
          let outCountColor = '#64748b';
          if (tempOutCount > 15) outCountColor = '#7f1a1a';
          else if (tempOutCount >= 10) outCountColor = '#dc2626';
          else if (tempOutCount >= 5) outCountColor = '#f59e0b';
          else if (tempOutCount >= 2) outCountColor = '#eab308';
          
          let suddenCountColor = '#64748b';
          if (tempSuddenCount > 10) suddenCountColor = '#7f1a1a';
          else if (tempSuddenCount >= 5) suddenCountColor = '#dc2626';
          else if (tempSuddenCount >= 2) suddenCountColor = '#f59e0b';
          else if (tempSuddenCount >= 1) suddenCountColor = '#eab308';
          
          return `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; font-weight: 500;">Node ${nodeId}</td>
              <td style="padding: 10px; text-align: center;">
                <span style="color: ${outCountColor}; font-weight: bold; font-size: 16px;">${tempOutCount}</span>
                <div style="font-size: 10px; color: #94a3b8;">lần</div>
              </td>
              <td style="padding: 10px; text-align: center;">
                <span style="color: ${suddenCountColor}; font-weight: bold; font-size: 16px;">${tempSuddenCount}</span>
                <div style="font-size: 10px; color: #94a3b8;">lần</div>
              </td>
              <td style="padding: 10px; text-align: center;">
                <span style="background: ${levelBg}; color: ${levelColor}; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                  ${level}
                </span>
              </td>
              <td style="padding: 10px;">
                <div style="font-weight: 600; color: ${levelColor};">${warningMessage}</div>
                <div style="font-size: 11px; color: #475569; margin-top: 4px;">${recommendation}</div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>
  
  <!-- Bảng phân loại mức độ -->
  <div style="margin-top: 15px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
    <div style="background: #eab30820; padding: 10px; border-radius: 8px; border-left: 3px solid #eab308;">
      <div style="font-size: 12px; color: #854d0e; font-weight: bold;">⚠️ NHẸ</div>
      <div style="font-size: 11px;">📊 Ngoài ngưỡng: 2-4 lần</div>
      <div style="font-size: 11px;">⚡ Đột ngột: 1 lần</div>
      <div style="font-size: 10px; margin-top: 5px;">👉 Có thể do mở cửa, xếp hàng</div>
    </div>
    <div style="background: #f59e0b20; padding: 10px; border-radius: 8px; border-left: 3px solid #f59e0b;">
      <div style="font-size: 12px; color: #c2410c; font-weight: bold;">⚠️ TRUNG BÌNH</div>
      <div style="font-size: 11px;">📊 Ngoài ngưỡng: 5-9 lần</div>
      <div style="font-size: 11px;">⚡ Đột ngột: 2-4 lần</div>
      <div style="font-size: 10px; margin-top: 5px;">👉 Máy lạnh không ổn định</div>
    </div>
    <div style="background: #dc262620; padding: 10px; border-radius: 8px; border-left: 3px solid #dc2626;">
      <div style="font-size: 12px; color: #991b1b; font-weight: bold;">⚠️ CAO</div>
      <div style="font-size: 11px;">📊 Ngoài ngưỡng: 10-15 lần</div>
      <div style="font-size: 11px;">⚡ Đột ngột: 5-10 lần</div>
      <div style="font-size: 10px; margin-top: 5px;">👉 Hệ thống lạnh có vấn đề</div>
    </div>
    <div style="background: #7f1a1a20; padding: 10px; border-radius: 8px; border-left: 3px solid #7f1a1a;">
      <div style="font-size: 12px; color: #7f1a1a; font-weight: bold;">⚠️ NGHIÊM TRỌNG</div>
      <div style="font-size: 11px;">📊 Ngoài ngưỡng: >15 lần</div>
      <div style="font-size: 11px;">⚡ Đột ngột: >10 lần</div>
      <div style="font-size: 10px; margin-top: 5px;">👉 Hỏng hệ thống, cần sửa ngay!</div>
    </div>
  </div>
  
</div>
      
<!-- Tab 2: Độ ẩm -->
<div id="tab-hum" class="tab-content" style="display: none; padding: 20px; max-height: calc(90vh - 280px); overflow-y: auto;">
  
  <!-- Bảng tổng hợp độ ẩm các node -->
  <div style="margin-bottom: 25px; overflow-x: auto;">
    <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0;">
      <thead>
        <tr style="background: #f1f5f9;">
          <th style="padding: 10px; text-align: left;">Node</th>
          <th style="padding: 10px; text-align: center;">💧 Ngoài ngưỡng (40-70%)</th>
          <th style="padding: 10px; text-align: center;">💨 Đột ngột (≥10%/2p)</th>
          <th style="padding: 10px; text-align: center;">📊 Mức độ</th>
          <th style="padding: 10px; text-align: center;">⚠️ Cảnh báo & Khuyến nghị</th>
         </tr>
      </thead>
      <tbody>
        ${Object.keys(nodeStats).sort((a,b) => a-b).map(nodeId => {
          const stats = nodeStats[nodeId];
          const humOutCount = stats.humOutCount;
          const humSuddenCount = stats.humSuddenCount;
          
          // Kết hợp cả 2 yếu tố để phân loại
          let level = '';
          let levelColor = '';
          let levelBg = '';
          let warningMessage = '';
          let recommendation = '';
          
          // Mức NGHIÊM TRỌNG: >15 lần ngoài ngưỡng HOẶC >10 lần đột ngột
          if (humOutCount > 15 || humSuddenCount > 10) {
            level = 'NGHIÊM TRỌNG';
            levelColor = '#7f1a1a';
            levelBg = '#7f1a1a20';
            warningMessage = '⚠️ HỆ THỐNG ĐIỀU HÒA ẨM HỎNG NGHIÊM TRỌNG';
            recommendation = '📌 CẤP CỨU: Kiểm tra máy tạo ẩm, hút ẩm, cảm biến độ ẩm ngay!';
          
          // Mức CAO: 10-15 lần ngoài ngưỡng HOẶC 5-10 lần đột ngột
          } else if ((humOutCount >= 10 && humOutCount <= 15) || (humSuddenCount >= 5 && humSuddenCount <= 10)) {
            level = 'CAO';
            levelColor = '#dc2626';
            levelBg = '#dc262620';
            warningMessage = '⚠️ MÁY TẠO ẨM/HÚT ẨM KHÔNG ỔN ĐỊNH';
            recommendation = '🔧 Kiểm tra thiết bị, vệ sinh, kiểm tra cài đặt độ ẩm';
          
          // Mức TRUNG BÌNH: 5-9 lần ngoài ngưỡng HOẶC 2-4 lần đột ngột
          } else if ((humOutCount >= 5 && humOutCount <= 9) || (humSuddenCount >= 2 && humSuddenCount <= 4)) {
            level = 'TRUNG BÌNH';
            levelColor = '#f59e0b';
            levelBg = '#f59e0b20';
            warningMessage = '⚠️ ĐỘ ẨM DAO ĐỘNG BẤT THƯỜNG';
            recommendation = '📊 Theo dõi sát, kiểm tra cửa kho, hạn chế mở cửa';
          
          // Mức NHẸ: 2-4 lần ngoài ngưỡng HOẶC 1 lần đột ngột
          } else if ((humOutCount >= 2 && humOutCount <= 4) || humSuddenCount === 1) {
            level = 'NHẸ';
            levelColor = '#eab308';
            levelBg = '#eab30820';
            warningMessage = '⚠️ CÓ THỂ DO MỞ CỬA HOẶC XẾP HÀNG';
            recommendation = '👀 Theo dõi thêm, hạn chế mở cửa kho lạnh';
          
          // BÌNH THƯỜNG
          } else {
            level = 'BÌNH THƯỜNG';
            levelColor = '#22c55e';
            levelBg = '#22c55e20';
            warningMessage = '✅ ĐỘ ẨM ỔN ĐỊNH';
            recommendation = '👍 Tiếp tục duy trì';
          }
          
          // Màu sắc cho số lần
          let outCountColor = '#64748b';
          if (humOutCount > 15) outCountColor = '#7f1a1a';
          else if (humOutCount >= 10) outCountColor = '#dc2626';
          else if (humOutCount >= 5) outCountColor = '#f59e0b';
          else if (humOutCount >= 2) outCountColor = '#eab308';
          
          let suddenCountColor = '#64748b';
          if (humSuddenCount > 10) suddenCountColor = '#7f1a1a';
          else if (humSuddenCount >= 5) suddenCountColor = '#dc2626';
          else if (humSuddenCount >= 2) suddenCountColor = '#f59e0b';
          else if (humSuddenCount >= 1) suddenCountColor = '#eab308';
          
          return `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; font-weight: 500;">Node ${nodeId}</td>
              <td style="padding: 10px; text-align: center;">
                <span style="color: ${outCountColor}; font-weight: bold; font-size: 16px;">${humOutCount}</span>
                <div style="font-size: 10px; color: #94a3b8;">lần</div>
              </td>
              <td style="padding: 10px; text-align: center;">
                <span style="color: ${suddenCountColor}; font-weight: bold; font-size: 16px;">${humSuddenCount}</span>
                <div style="font-size: 10px; color: #94a3b8;">lần</div>
              </td>
              <td style="padding: 10px; text-align: center;">
                <span style="background: ${levelBg}; color: ${levelColor}; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                  ${level}
                </span>
              </td>
              <td style="padding: 10px;">
                <div style="font-weight: 600; color: ${levelColor};">${warningMessage}</div>
                <div style="font-size: 11px; color: #475569; margin-top: 4px;">${recommendation}</div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>
  
  <!-- Bảng phân loại mức độ -->
  <div style="margin-top: 15px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
    <div style="background: #eab30820; padding: 10px; border-radius: 8px; border-left: 3px solid #eab308;">
      <div style="font-size: 12px; color: #854d0e; font-weight: bold;">⚠️ NHẸ</div>
      <div style="font-size: 11px;">📊 Ngoài ngưỡng: 2-4 lần</div>
      <div style="font-size: 11px;">💨 Đột ngột: 1 lần</div>
      <div style="font-size: 10px; margin-top: 5px;">👉 Có thể do mở cửa, xếp hàng</div>
    </div>
    <div style="background: #f59e0b20; padding: 10px; border-radius: 8px; border-left: 3px solid #f59e0b;">
      <div style="font-size: 12px; color: #c2410c; font-weight: bold;">⚠️ TRUNG BÌNH</div>
      <div style="font-size: 11px;">📊 Ngoài ngưỡng: 5-9 lần</div>
      <div style="font-size: 11px;">💨 Đột ngột: 2-4 lần</div>
      <div style="font-size: 10px; margin-top: 5px;">👉 Độ ẩm dao động bất thường</div>
    </div>
    <div style="background: #dc262620; padding: 10px; border-radius: 8px; border-left: 3px solid #dc2626;">
      <div style="font-size: 12px; color: #991b1b; font-weight: bold;">⚠️ CAO</div>
      <div style="font-size: 11px;">📊 Ngoài ngưỡng: 10-15 lần</div>
      <div style="font-size: 11px;">💨 Đột ngột: 5-10 lần</div>
      <div style="font-size: 10px; margin-top: 5px;">👉 Máy tạo ẩm/hút ẩm có vấn đề</div>
    </div>
    <div style="background: #7f1a1a20; padding: 10px; border-radius: 8px; border-left: 3px solid #7f1a1a;">
      <div style="font-size: 12px; color: #7f1a1a; font-weight: bold;">⚠️ NGHIÊM TRỌNG</div>
      <div style="font-size: 11px;">📊 Ngoài ngưỡng: >15 lần</div>
      <div style="font-size: 11px;">💨 Đột ngột: >10 lần</div>
      <div style="font-size: 10px; margin-top: 5px;">👉 Hỏng hệ thống, cần sửa ngay!</div>
    </div>
  </div>
</div>


      
      <!-- Tab 3: Mất kết nối -->
      <div id="tab-connection" class="tab-content" style="display: none; padding: 20px; max-height: calc(90vh - 280px); overflow-y: auto;">
        <!-- Bảng tổng hợp mất kết nối -->
        <div style="margin-bottom: 25px; overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 10px; text-align: left;">Node</th>
                <th style="padding: 10px; text-align: center;">📡 Số lần mất kết nối</th>
                <th style="padding: 10px; text-align: center;">⚠️ Cảnh báo</th>
               </tr>
            </thead>
            <tbody>
              ${Object.keys(nodeStats).sort((a,b) => a-b).map(nodeId => {
                const stats = nodeStats[nodeId];
                const hasIssue = stats.disconnectionCount > 0;
                return `
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 10px; font-weight: 500;">Node ${nodeId}</td>
                    <td style="padding: 10px; text-align: center; color: ${hasIssue ? '#f59e0b' : '#64748b'};">${stats.disconnectionCount}</td>
                    <td style="padding: 10px; text-align: center;">
                      ${hasIssue ? '<span style="background: #f59e0b; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">⚠️ MẤT KẾT NỐI THƯỜNG XUYÊN</span>' : '<span style="color: #22c55e;">✅ Ổn định</span>'}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
           </table>
        </div>
      </div>
      
<!-- Tab 4: Pin -->
<div id="tab-battery" class="tab-content" style="display: none; padding: 20px; max-height: calc(90vh - 280px); overflow-y: auto;">
  <div style="margin-bottom: 25px; overflow-x: auto;">
    <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0;">
      <thead>
        <tr style="background: #f1f5f9;">
          <th style="padding: 10px; text-align: left;">Node</th>
          <th style="padding: 10px; text-align: center;">🔋 Đầu kỳ → Cuối kỳ</th>
          <th style="padding: 10px; text-align: center;">📊 Tổng thay đổi</th>
          <th style="padding: 10px; text-align: center;">⏱️ Thời gian</th>
          <th style="padding: 10px; text-align: center;">⚠️ Cảnh báo</th>
         </tr>
      </thead>
      <tbody>
        ${Object.keys(nodeStats).sort((a,b) => a-b).map(nodeId => {
          const stats = nodeStats[nodeId];
          const totalChange = stats.batteryTotalChange ? parseFloat(stats.batteryTotalChange) : null;
          const absChange = stats.batteryAbsChange ? parseFloat(stats.batteryAbsChange) : null;
          const fromVbat = stats.batteryFrom !== undefined ? stats.batteryFrom : 'N/A';
          const toVbat = stats.batteryTo !== undefined ? stats.batteryTo : 'N/A';
          const hours = stats.batteryHours || '0';
          const days = stats.batteryDays || '0';
          const anomaly = stats.batteryAnomaly;
          
          let changeColor = '#64748b';
          let changeIcon = '●';
          let changeText = '';
          
          if (totalChange !== null) {
            if (totalChange > 0) {
              changeColor = '#22c55e';
              changeIcon = '▲';
              changeText = `${changeIcon} ${Math.abs(totalChange).toFixed(1)}% (tăng)`;
            } else if (totalChange < 0) {
              changeColor = '#ef4444';
              changeIcon = '▼';
              changeText = `${changeIcon} ${Math.abs(totalChange).toFixed(1)}% (giảm)`;
            } else {
              changeText = `● 0% (không đổi)`;
            }
          } else {
            changeText = `<span style="color: #94a3b8;">${stats.batteryNote || '---'}</span>`;
          }
          
          // Hiển thị cảnh báo theo mức độ
          let warningHtml = '';
          if (anomaly) {
            const bgColor = anomaly.level === 'critical' ? '#7f1a1a' : 
                           (anomaly.level === 'high' ? '#dc2626' : 
                           (anomaly.level === 'medium' ? '#f59e0b' : '#eab308'));
            warningHtml = `
              <span style="background: ${bgColor}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px; display: inline-block;">
                ${anomaly.message}
              </span>
            `;
          } else if (totalChange !== null) {
            warningHtml = '<span style="color: #22c55e;">✅ Bình thường</span>';
          } else {
            warningHtml = `<span style="color: #94a3b8; font-size: 11px;">${stats.batteryNote || '---'}</span>`;
          }
          
          return `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; font-weight: 500;">Node ${nodeId}</td>
              <td style="padding: 10px; text-align: center; font-size: 12px;">
                ${fromVbat}% → ${toVbat}%
              </td>
              <td style="padding: 10px; text-align: center; color: ${changeColor}; font-weight: 500;">
                ${changeText}
              </td>
              <td style="padding: 10px; text-align: center; font-size: 11px;">
                ${parseFloat(days).toFixed(1)} ngày (${parseFloat(hours).toFixed(1)} giờ)
              </td>
              <td style="padding: 10px; text-align: center;">
                ${warningHtml}
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>
  
  <!-- Bảng phân loại mức cảnh báo -->
  <div style="margin-top: 15px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
    <div style="background: #eab30820; padding: 8px; border-radius: 8px; text-align: center; border-left: 3px solid #eab308;">
      <div style="font-size: 11px; color: #854d0e;">⚠️ NHẸ</div>
      <div style="font-size: 13px; font-weight: bold;">2% - 5%</div>
      <div style="font-size: 10px;">Thay đổi nhỏ</div>
    </div>
    <div style="background: #f59e0b20; padding: 8px; border-radius: 8px; text-align: center; border-left: 3px solid #f59e0b;">
      <div style="font-size: 11px; color: #c2410c;">⚠️ TRUNG BÌNH</div>
      <div style="font-size: 13px; font-weight: bold;">5% - 10%</div>
      <div style="font-size: 10px;">Cần theo dõi</div>
    </div>
    <div style="background: #dc262620; padding: 8px; border-radius: 8px; text-align: center; border-left: 3px solid #dc2626;">
      <div style="font-size: 11px; color: #991b1b;">⚠️ CAO</div>
      <div style="font-size: 13px; font-weight: bold;">10% - 15%</div>
      <div style="font-size: 10px;">Kiểm tra ngay</div>
    </div>
    <div style="background: #7f1a1a20; padding: 8px; border-radius: 8px; text-align: center; border-left: 3px solid #7f1a1a;">
      <div style="font-size: 11px; color: #7f1a1a;">⚠️ NGHIÊM TRỌNG</div>
      <div style="font-size: 13px; font-weight: bold;">> 15%</div>
      <div style="font-size: 10px;">Thay pin ngay</div>
    </div>
  </div>
</div>


    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Tab switching logic
  const tabs = modal.querySelectorAll('.tab-btn');
  const contents = modal.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.getAttribute('data-tab');
      
      tabs.forEach(t => {
        t.classList.remove('active');
        t.style.borderBottom = 'none';
        t.style.color = '#64748b';
      });
      tab.classList.add('active');
      tab.style.borderBottom = '2px solid #f59e0b';
      tab.style.color = '#f59e0b';
      
      contents.forEach(content => {
        content.style.display = 'none';
      });
      const activeContent = modal.querySelector(`#tab-${tabId}`);
      if (activeContent) activeContent.style.display = 'block';
    });
  });
  
  modal.addEventListener('click', function(e) {
    if (e.target === modal) modal.remove();
  });
}

// Phân tích so sánh các ngày trong 7 ngày
function showDayComparisonAnalysis(storeId, storeName) {
  const nodesData = historicalData[storeId];
  if (!nodesData || Object.keys(nodesData).length === 0) {
    alert('Không có dữ liệu để phân tích');
    return;
  }
  
  // Lấy date range
  let dateRangeText = '';
  if (selectedDate === 'today') {
    alert('Phân tích so sánh ngày cần ít nhất 2 ngày dữ liệu');
    return;
  } else if (selectedDate === 'yesterday') {
    alert('Phân tích so sánh ngày cần ít nhất 2 ngày dữ liệu');
    return;
  } else if (selectedDate === '2days') {
    dateRangeText = '2 ngày';
  } else if (selectedDate === '3days') {
    dateRangeText = '3 ngày';
  } else if (selectedDate === 'custom') {
    dateRangeText = `${formatDateVN(customStartDate)} → ${formatDateVN(customEndDate)}`;
  }
  
  const nodeIds = Object.keys(nodesData).sort((a, b) => a - b);
  
  // Gom dữ liệu theo ngày
  let dailyStats = {};
  
  nodeIds.forEach(nodeId => {
    const readings = nodesData[nodeId];
    if (!readings || readings.length === 0) return;
    
    const sortedReadings = [...readings].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    // Gom theo ngày
    sortedReadings.forEach(reading => {
      const date = formatDateVN(reading.timestamp);
      const temp = reading.temperature / 10;
      const hum = reading.humidity / 10;
      const vbat = reading.vbat_percent;
      
      if (!dailyStats[date]) {
        dailyStats[date] = {
          date: date,
          temps: [],
          hums: [],
          vbatReadings: [],
          disconnections: [],
          nodeData: {}
        };
      }
      
      dailyStats[date].temps.push(temp);
      dailyStats[date].hums.push(hum);
      if (vbat !== null && vbat !== undefined) {
        dailyStats[date].vbatReadings.push(vbat);
      }
      
      // Lưu theo node để tính mất kết nối
      if (!dailyStats[date].nodeData[nodeId]) {
        dailyStats[date].nodeData[nodeId] = {
          temps: [],
          hums: [],
          timestamps: []
        };
      }
      dailyStats[date].nodeData[nodeId].temps.push(temp);
      dailyStats[date].nodeData[nodeId].hums.push(hum);
      dailyStats[date].nodeData[nodeId].timestamps.push(new Date(reading.timestamp));
    });
  });
  
  // Tính toán chỉ số cho từng ngày
  let dailySummary = [];
  let maxTempDay = { date: '', value: 0 };
  let minTempDay = { date: '', value: 100 };
  let maxHumDay = { date: '', value: 0 };
  let minHumDay = { date: '', value: 100 };
  let maxBatteryDropDay = { date: '', value: 0, drop: 0 };
  let maxDisconnectDay = { date: '', value: 0, count: 0 };
  
  Object.keys(dailyStats).sort().forEach(date => {
    const stats = dailyStats[date];
    
    // Nhiệt độ
    const avgTemp = stats.temps.reduce((a,b) => a+b, 0) / stats.temps.length;
    const maxTemp = Math.max(...stats.temps);
    const minTemp = Math.min(...stats.temps);
    const tempOutOfRange = stats.temps.filter(t => t > 8 || t < 2).length;
    const tempSuddenCount = countTempSuddenChanges(stats.nodeData);
    
    // Độ ẩm
    const avgHum = stats.hums.reduce((a,b) => a+b, 0) / stats.hums.length;
    const maxHum = Math.max(...stats.hums);
    const minHum = Math.min(...stats.hums);
    const humOutOfRange = stats.hums.filter(h => h > 70 || h < 40).length;
    const humSuddenCount = countHumSuddenChanges(stats.nodeData);
    
    // Pin - tính độ giảm pin trong ngày
    let batteryDrop = 0;
    let batteryStart = null;
    let batteryEnd = null;
    if (stats.vbatReadings.length >= 2) {
      batteryStart = stats.vbatReadings[0];
      batteryEnd = stats.vbatReadings[stats.vbatReadings.length - 1];
      batteryDrop = batteryStart - batteryEnd;
    }
    
    // Mất kết nối
    let disconnectCount = 0;
    Object.keys(stats.nodeData).forEach(nodeId => {
      const timestamps = stats.nodeData[nodeId].timestamps;
      const disconnects = analyzeDisconnectionsForDay(timestamps);
      disconnectCount += disconnects.length;
    });
    
    const score = calculateDayScore({
      tempOutOfRange,
      tempSuddenCount,
      humOutOfRange,
      humSuddenCount,
      batteryDrop,
      disconnectCount
    });
    
    dailySummary.push({
      date: date,
      avgTemp: avgTemp,
      maxTemp: maxTemp,
      minTemp: minTemp,
      tempOutOfRange: tempOutOfRange,
      tempSuddenCount: tempSuddenCount,
      avgHum: avgHum,
      maxHum: maxHum,
      minHum: minHum,
      humOutOfRange: humOutOfRange,
      humSuddenCount: humSuddenCount,
      batteryDrop: batteryDrop > 0 ? batteryDrop : 0,
      batteryStart: batteryStart,
      batteryEnd: batteryEnd,
      disconnectCount: disconnectCount,
      score: score,
      readings: stats.temps.length
    });
    
    // Tìm ngày có vấn đề nhất
    if (maxTemp > maxTempDay.value) {
      maxTempDay = { date: date, value: maxTemp };
    }
    if (minTemp < minTempDay.value) {
      minTempDay = { date: date, value: minTemp };
    }
    if (maxHum > maxHumDay.value) {
      maxHumDay = { date: date, value: maxHum };
    }
    if (minHum < minHumDay.value) {
      minHumDay = { date: date, value: minHum };
    }
    if (batteryDrop > maxBatteryDropDay.drop) {
      maxBatteryDropDay = { date: date, drop: batteryDrop, value: batteryStart };
    }
    if (disconnectCount > maxDisconnectDay.count) {
      maxDisconnectDay = { date: date, count: disconnectCount, value: disconnectCount };
    }
  });
  
  // Sắp xếp theo điểm số để tìm ngày tệ nhất
  const sortedByScore = [...dailySummary].sort((a, b) => b.score - a.score);
  const worstDay = sortedByScore[0];
  
  // Tạo modal
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100000;
  `;
  
  modal.innerHTML = `
    <div style="background: white; width: 95%; max-width: 1400px; max-height: 90vh; border-radius: 20px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: white; padding: 20px 25px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h2 style="margin: 0;">📊 PHÂN TÍCH SO SÁNH NGÀY</h2>
            <p style="margin: 5px 0 0; opacity: 0.9;">${storeName}</p>
            <p style="margin: 5px 0 0; opacity: 0.8; font-size: 12px;">📅 ${dateRangeText}</p>
          </div>
          <button onclick="this.closest('.modal-overlay').remove()" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 24px; cursor: pointer; width: 36px; height: 36px; border-radius: 50%;">✕</button>
        </div>
      </div>
      
      <div style="padding: 25px; max-height: calc(90vh - 100px); overflow-y: auto;">
        <!-- Top Issues Cards -->
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 25px;">
          <div style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 12px; border-radius: 12px; text-align: center;">
            <div style="font-size: 11px;">🔥 Nhiệt độ cao nhất</div>
            <div style="font-size: 20px; font-weight: bold;">${maxTempDay.value.toFixed(1)}°C</div>
            <div style="font-size: 10px;">${maxTempDay.date}</div>
          </div>
          <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 12px; border-radius: 12px; text-align: center;">
            <div style="font-size: 11px;">❄️ Nhiệt độ thấp nhất</div>
            <div style="font-size: 20px; font-weight: bold;">${minTempDay.value.toFixed(1)}°C</div>
            <div style="font-size: 10px;">${minTempDay.date}</div>
          </div>
          <div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 12px; border-radius: 12px; text-align: center;">
            <div style="font-size: 11px;">💧 Độ ẩm cao nhất</div>
            <div style="font-size: 20px; font-weight: bold;">${maxHumDay.value.toFixed(1)}%</div>
            <div style="font-size: 10px;">${maxHumDay.date}</div>
          </div>
          <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 12px; border-radius: 12px; text-align: center;">
            <div style="font-size: 11px;">🔋 Pin giảm nhiều nhất</div>
            <div style="font-size: 20px; font-weight: bold;">${maxBatteryDropDay.drop.toFixed(1)}%</div>
            <div style="font-size: 10px;">${maxBatteryDropDay.date}</div>
          </div>
          <div style="background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: white; padding: 12px; border-radius: 12px; text-align: center;">
            <div style="font-size: 11px;">📡 Mất kết nối nhiều nhất</div>
            <div style="font-size: 20px; font-weight: bold;">${maxDisconnectDay.count} lần</div>
            <div style="font-size: 10px;">${maxDisconnectDay.date}</div>
          </div>
        </div>
        
        <!-- Ngày tệ nhất -->
        <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); padding: 20px; border-radius: 16px; margin-bottom: 25px;">
          <div style="display: flex; align-items: center; gap: 15px;">
            <span style="font-size: 48px;">⚠️</span>
            <div style="flex: 1;">
              <h3 style="margin: 0; color: #92400e;">NGÀY CÓ VẤN ĐỀ NHIỀU NHẤT</h3>
              <p style="margin: 5px 0 0; font-size: 20px; font-weight: bold; color: #b45309;">📅 ${worstDay.date}</p>
              <p style="margin: 5px 0 0; color: #78350f;">Điểm bất thường: ${worstDay.score} điểm</p>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 15px;">
            <div><span style="font-size: 11px;">🌡️ Nhiệt độ ngoài ngưỡng</span><br><strong>${worstDay.tempOutOfRange} lần</strong></div>
            <div><span style="font-size: 11px;">⚡ Nhiệt độ đột ngột</span><br><strong>${worstDay.tempSuddenCount} lần</strong></div>
            <div><span style="font-size: 11px;">💧 Độ ẩm ngoài ngưỡng</span><br><strong>${worstDay.humOutOfRange} lần</strong></div>
            <div><span style="font-size: 11px;">💨 Độ ẩm đột ngột</span><br><strong>${worstDay.humSuddenCount} lần</strong></div>
            <div><span style="font-size: 11px;">🔋 Pin giảm</span><br><strong>${worstDay.batteryDrop.toFixed(1)}%</strong></div>
            <div><span style="font-size: 11px;">📡 Mất kết nối</span><br><strong>${worstDay.disconnectCount} lần</strong></div>
          </div>
        </div>
        
        <!-- Bảng so sánh chi tiết -->
        <h3 style="margin: 0 0 15px 0;">📋 SO SÁNH CHI TIẾT CÁC NGÀY</h3>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; font-size: 13px;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 10px; text-align: left;">Ngày</th>
                <th style="padding: 10px; text-align: center;">🌡️ Nhiệt độ TB</th>
                <th style="padding: 10px; text-align: center;">📈 Max/Min</th>
                <th style="padding: 10px; text-align: center;">⚠️ Ngoài ngưỡng</th>
                <th style="padding: 10px; text-align: center;">💧 Độ ẩm TB</th>
                <th style="padding: 10px; text-align: center;">⚠️ Ngoài ngưỡng</th>
                <th style="padding: 10px; text-align: center;">🔋 Pin giảm</th>
                <th style="padding: 10px; text-align: center;">📡 Mất KN</th>
                <th style="padding: 10px; text-align: center;">🏆 Điểm</th>
              </tr>
            </thead>
            <tbody>
              ${dailySummary.map(day => {
                const isWorst = day.date === worstDay.date;
                const tempStatus = day.tempOutOfRange >= 10 ? '🔴' : (day.tempOutOfRange >= 5 ? '🟡' : '🟢');
                const humStatus = day.humOutOfRange >= 10 ? '🔴' : (day.humOutOfRange >= 5 ? '🟡' : '🟢');
                const batteryStatus = day.batteryDrop >= 5 ? '🔴' : (day.batteryDrop >= 3 ? '🟡' : '🟢');
                const disconnectStatus = day.disconnectCount >= 5 ? '🔴' : (day.disconnectCount >= 2 ? '🟡' : '🟢');
                
                return `
                  <tr style="border-bottom: 1px solid #e2e8f0; background: ${isWorst ? '#fef3c7' : 'white'};">
                    <td style="padding: 10px; font-weight: ${isWorst ? 'bold' : 'normal'};">${day.date}</td>
                    <td style="padding: 10px; text-align: center;">${day.avgTemp.toFixed(1)}°C</td>
                    <td style="padding: 10px; text-align: center; font-size: 11px;">${day.maxTemp.toFixed(1)}° / ${day.minTemp.toFixed(1)}°</td>
                    <td style="padding: 10px; text-align: center;">${tempStatus} ${day.tempOutOfRange}</td>
                    <td style="padding: 10px; text-align: center;">${day.avgHum.toFixed(1)}%</td>
                    <td style="padding: 10px; text-align: center;">${humStatus} ${day.humOutOfRange}</td>
                    <td style="padding: 10px; text-align: center;">${batteryStatus} ${day.batteryDrop.toFixed(1)}%</td>
                    <td style="padding: 10px; text-align: center;">${disconnectStatus} ${day.disconnectCount}</td>
                    <td style="padding: 10px; text-align: center; font-weight: bold; color: ${day.score >= 50 ? '#ef4444' : (day.score >= 30 ? '#f59e0b' : '#22c55e')};">${day.score}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        
        <!-- Bảng xếp hạng vấn đề -->
        <div style="margin-top: 25px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
          <div style="background: #f8fafc; border-radius: 12px; padding: 15px;">
            <h4 style="margin: 0 0 10px 0;">🔥 Nhiệt độ</h4>
            <div><strong>Ngày cao nhất:</strong> ${maxTempDay.date} (${maxTempDay.value.toFixed(1)}°C)</div>
            <div><strong>Ngày thấp nhất:</strong> ${minTempDay.date} (${minTempDay.value.toFixed(1)}°C)</div>
            <div><strong>Chênh lệch:</strong> ${(maxTempDay.value - minTempDay.value).toFixed(1)}°C</div>
          </div>
          <div style="background: #f8fafc; border-radius: 12px; padding: 15px;">
            <h4 style="margin: 0 0 10px 0;">💧 Độ ẩm</h4>
            <div><strong>Ngày cao nhất:</strong> ${maxHumDay.date} (${maxHumDay.value.toFixed(1)}%)</div>
            <div><strong>Ngày thấp nhất:</strong> ${minHumDay.date} (${minHumDay.value.toFixed(1)}%)</div>
            <div><strong>Chênh lệch:</strong> ${(maxHumDay.value - minHumDay.value).toFixed(1)}%</div>
          </div>
          <div style="background: #f8fafc; border-radius: 12px; padding: 15px;">
            <h4 style="margin: 0 0 10px 0;">🔋 Pin</h4>
            <div><strong>Ngày giảm nhiều:</strong> ${maxBatteryDropDay.date} (${maxBatteryDropDay.drop.toFixed(1)}%)</div>
            <div><strong>Mất kết nối nhiều:</strong> ${maxDisconnectDay.date} (${maxDisconnectDay.count} lần)</div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.addEventListener('click', function(e) {
    if (e.target === modal) modal.remove();
  });
}

// Hàm hỗ trợ
function countTempSuddenChanges(nodeData) {
  let count = 0;
  Object.keys(nodeData).forEach(nodeId => {
    const temps = nodeData[nodeId].temps;
    const timestamps = nodeData[nodeId].timestamps;
    for (let i = 1; i < temps.length; i++) {
      const change = Math.abs(temps[i] - temps[i-1]);
      const timeDiff = (timestamps[i] - timestamps[i-1]) / (1000 * 60);
      if (change >= 2 && timeDiff <= 10) count++;
    }
  });
  return count;
}

function countHumSuddenChanges(nodeData) {
  let count = 0;
  Object.keys(nodeData).forEach(nodeId => {
    const hums = nodeData[nodeId].hums;
    const timestamps = nodeData[nodeId].timestamps;
    for (let i = 1; i < hums.length; i++) {
      const change = Math.abs(hums[i] - hums[i-1]);
      const timeDiff = (timestamps[i] - timestamps[i-1]) / (1000 * 60);
      if (change >= 10 && timeDiff <= 2) count++;
    }
  });
  return count;
}

function analyzeDisconnectionsForDay(timestamps) {
  if (timestamps.length < 2) return [];
  const disconnections = [];
  for (let i = 0; i < timestamps.length - 1; i++) {
    const gap = (timestamps[i+1] - timestamps[i]) / (1000 * 60);
    if (gap > 20) {
      disconnections.push({ gap });
    }
  }
  return disconnections;
}

function calculateDayScore(metrics) {
  let score = 0;
  score += Math.min(metrics.tempOutOfRange, 30) * 2;
  score += Math.min(metrics.tempSuddenCount, 20) * 1.5;
  score += Math.min(metrics.humOutOfRange, 30) * 2;
  score += Math.min(metrics.humSuddenCount, 20) * 1.5;
  score += Math.min(metrics.batteryDrop * 2, 30);
  score += Math.min(metrics.disconnectCount * 3, 30);
  return Math.min(Math.round(score), 100);
}

// Update testAction to call showStoreAnalysis
function testAction(storeId, actionType) {
  const dropdown = document.getElementById(`dropdown-${storeId}`);
  if (dropdown) dropdown.classList.remove('show');
  
  const storeName = stores[storeId];

  switch(actionType) {
    case 'analysis':
      showStoreAnalysis(storeId, storeName);
      break;
    case 'abnormal':
      showAbnormalDetection(storeId, storeName);
      break;
    case 'trend':
      showDayComparisonAnalysis(storeId, storeName);
      break;
  }
}