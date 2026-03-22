const client = window.supabase.createClient(
  "https://jlbuvtzwhqjqpubooids.supabase.co",
  "sb_publishable_QHDS_B0lP5fnugQryKPUNw_H3PIj290"
);

let stores = {};
let historicalData = {};
let selectedStore = null;
let selectedDate = 'today';
let customStartDate = null;
let customEndDate = null;
let currentUser = null;
let isUpdating = false;

// ✅ AUTO-REFRESH: interval handle
let autoRefreshInterval = null;
const AUTO_REFRESH_SECONDS = 30;

// ✅ OFFLINE threshold: 8 minutes
const OFFLINE_THRESHOLD_MINUTES = 8;

// Hàm phân tích khoảng thời gian mất kết nối
function analyzeDisconnections(readings, maxGapMinutes = 2) {
  if (!readings || readings.length < 2) return [];
  
  const disconnections = [];
  const sortedReadings = [...readings].sort((a, b) => 
    new Date(a.timestamp) - new Date(b.timestamp)
  );
  
  for (let i = 0; i < sortedReadings.length - 1; i++) {
    const current = new Date(sortedReadings[i].timestamp);
    const next = new Date(sortedReadings[i + 1].timestamp);
    
    const gapMinutes = (next - current) / (1000 * 60);
    
    if (gapMinutes > maxGapMinutes) {
      const hours = Math.floor(gapMinutes / 60);
      const mins = Math.floor(gapMinutes % 60);
      
      let durationText = '';
      if (hours > 0) {
        durationText = mins > 0 ? `${hours} giờ ${mins} phút` : `${hours} giờ`;
      } else {
        durationText = `${mins} phút`;
      }
      
      disconnections.push({
        start: formatDateTimeVN(sortedReadings[i].timestamp),
        end: formatDateTimeVN(sortedReadings[i + 1].timestamp),
        startTime: formatTimeVN(sortedReadings[i].timestamp),
        endTime: formatTimeVN(sortedReadings[i + 1].timestamp),
        startDate: formatDateVN(sortedReadings[i].timestamp),
        gapMinutes: Math.round(gapMinutes * 10) / 10,
        durationText
      });
    }
  }
  
  return disconnections;
}

// Hàm hiển thị modal phân tích kết nối
window.showConnectionAnalysis = function(nodeId) {
  const readings = window[`readings_${nodeId}`];
  if (!readings || readings.length === 0) {
    alert('Không có dữ liệu để phân tích');
    return;
  }
  
  const sortedReadings = [...readings].sort((a, b) => 
    new Date(a.timestamp) - new Date(b.timestamp)
  );
  
  const disconnections = analyzeDisconnections(sortedReadings, 2);
  
  const totalDowntime = disconnections.reduce((sum, d) => sum + d.gapMinutes, 0);
  const totalHours = Math.floor(totalDowntime / 60);
  const totalMins = Math.floor(totalDowntime % 60);
  
  const firstReading = new Date(sortedReadings[0].timestamp);
  const lastReading = new Date(sortedReadings[sortedReadings.length-1].timestamp);
  const totalPeriod = (lastReading - firstReading) / (1000 * 60 * 60);
  
  const reliability = totalPeriod > 0 
    ? ((totalPeriod * 60 - totalDowntime) / (totalPeriod * 60) * 100).toFixed(1)
    : 0;
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = function(e) {
    if (e.target === modal) modal.remove();
  };
  
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 15px;">
          <span style="font-size: 32px;">🔌</span>
          <div>
            <h2 style="margin: 0; font-size: 22px;">PHÂN TÍCH KẾT NỐI - NODE ${nodeId}</h2>
            <p style="margin: 5px 0 0; opacity: 0.8; font-size: 14px;">
              ${formatDateTimeVN(sortedReadings[0].timestamp)} → ${formatDateTimeVN(sortedReadings[sortedReadings.length-1].timestamp)}
            </p>
          </div>
        </div>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      
      <div class="modal-body">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">📊 TỔNG BẢN GHI</div>
            <div class="stat-value">${sortedReadings.length}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">🔴 SỐ LẦN Mất kết nối</div>
            <div class="stat-value" style="color: #ef4444;">${disconnections.length}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">⏱️ TỔNG THỜI GIAN</div>
            <div class="stat-value" style="color: #f97316;">${totalHours}h${totalMins > 0 ? totalMins + 'm' : ''}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">🎯 ĐỘ TIN CẬY</div>
            <div class="stat-value" style="color: ${reliability > 95 ? '#16a34a' : '#ea580c'};">${reliability}%</div>
          </div>
        </div>
        
        <div style="background: white; border-radius: 16px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin: 0; color: #1e293b; display: flex; align-items: center; gap: 8px;">
              <span>📋 CHI TIẾT</span>
              <span class="badge">${disconnections.length} lần</span>
            </h3>
          </div>
          
          ${disconnections.length > 0 ? `
          <div class="table-container">
             <table>
              <thead>
                 <tr>
                  <th>STT</th>
                  <th>NGÀY</th>
                  <th>BẮT ĐẦU</th>
                  <th>KẾT THÚC</th>
                  <th style="text-align: right;">THỜI GIAN</th>
                 </tr>
              </thead>
              <tbody>
                ${disconnections.map((d, index) => `
                   <tr>
                    <td>${index + 1}</td>
                    <td>${d.startDate}</td>
                    <td><strong>${d.startTime}</strong></td>
                    <td><strong>${d.endTime}</strong></td>
                    <td style="text-align: right; color: #ef4444; font-weight: 600;">${d.durationText}</td>
                   </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : `
          <div style="text-align: center; padding: 60px 20px; background: #f8fafc; border-radius: 12px;">
            <span style="font-size: 48px;">✅</span>
            <h4 style="margin: 15px 0 5px; color: #166534;">Không có mất kết nối</h4>
            <p style="color: #64748b; margin: 0;">Node hoạt động liên tục trong suốt thời gian này</p>
          </div>
          `}
        </div>
        
        <div style="margin-top: 20px; background: #f1f5f9; border-radius: 12px; padding: 15px; font-size: 13px; color: #475569; display: flex; align-items: center; gap: 10px;">
          <span>ℹ️</span>
          <span>Mất kết nối được tính khi khoảng cách giữa 2 bản ghi > 2 phút. Tổng thời gian: ${totalPeriod.toFixed(1)} giờ.</span>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
};

// Định nghĩa hàm toggleNodeMenu
window.toggleNodeMenu = function(nodeId) {
  console.log('✅ Click menu node:', nodeId);
  
  if (window.event) {
    window.event.stopPropagation();
  }
  
  const menuBtn = document.getElementById(`menu-${nodeId}`);
  if (!menuBtn) {
    console.log('❌ Không tìm thấy nút menu');
    return;
  }
  
  document.querySelectorAll('.node-dropdown').forEach(el => el.remove());
  
  const existingDropdown = document.getElementById(`dropdown-${nodeId}`);
  if (existingDropdown) {
    existingDropdown.remove();
    return;
  }
  
  const readings = window[`readings_${nodeId}`];
  if (!readings) {
    console.log('❌ Không có readings cho node', nodeId);
    alert('Node này chưa có dữ liệu');
    return;
  }
  
  let disconnectCount = 0;
  try {
    const disconnections = analyzeDisconnections(readings, 2);
    disconnectCount = disconnections.length;
  } catch (err) {
    console.log('Lỗi đếm Mất kết nối:', err);
  }
  
  const dropdown = document.createElement('div');
  dropdown.id = `dropdown-${nodeId}`;
  dropdown.className = 'node-dropdown';
  dropdown.style.cssText = `
    position: absolute;
    top: 45px;
    right: 10px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    width: 280px;
    z-index: 999999;
    border: 1px solid #e2e8f0;
  `;
  
  dropdown.innerHTML = `
    <div style="padding: 15px; background: #1e293b; color: white; border-radius: 12px 12px 0 0; font-weight: bold;">
      📋 NODE ${nodeId} - PHÂN TÍCH
    </div>
    <div onclick="window.showConnectionAnalysis(${nodeId}); this.closest('.node-dropdown').remove();" 
         style="padding: 15px; display: flex; align-items: center; gap: 12px; cursor: pointer; border-bottom: 1px solid #e2e8f0;"
         onmouseover="this.style.backgroundColor='#f1f5f9'" 
         onmouseout="this.style.backgroundColor='white'">
      <span style="font-size: 24px;">🔌</span>
      <div style="flex: 1;">
        <div style="font-weight: 600;">Phân tích kết nối</div>
        <div style="font-size: 12px; color: #64748b;">Xem lịch sử</div>
      </div>
      <span style="background: #ef4444; color: white; padding: 4px 10px; border-radius: 20px;">${disconnectCount}</span>
    </div>
  `;
  
  setTimeout(() => {
    function closeMenu(e) {
      if (!dropdown.contains(e.target) && !menuBtn.contains(e.target)) {
        dropdown.remove();
        document.removeEventListener('click', closeMenu);
      }
    }
    document.addEventListener('click', closeMenu);
  }, 100);
  
  menuBtn.parentNode.style.position = 'relative';
  menuBtn.parentNode.appendChild(dropdown);
};

// Helper functions
function formatValue(value) {
  if (value === null || value === undefined) return '0.0';
  return (value / 10).toFixed(1);
}

function toLocalTime(utcTimestamp, format = 'datetime') {
  const date = new Date(utcTimestamp);
  if (format === 'time') {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return date.toLocaleString('vi-VN');
}

function getDateRange(dateType) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start, end;
  
  switch(dateType) {
    case 'today':
      start = today;
      end = now;
      break;
    case 'yesterday':
      start = new Date(today);
      start.setDate(start.getDate() - 1);
      end = new Date(today.getTime() - 1);
      break;
    case '3days':
      start = new Date(today);
      start.setDate(start.getDate() - 3);
      end = new Date(today);
      end.setDate(end.getDate() - 2);
      end = new Date(end.getTime() - 1);
      break;
    case '5days':
      start = new Date(today);
      start.setDate(start.getDate() - 5);
      end = new Date(today);
      end.setDate(end.getDate() - 4);
      end = new Date(end.getTime() - 1);
      break;
    default:
      if (customStartDate && customEndDate) {
        start = new Date(customStartDate);
        end = new Date(customEndDate + 'T23:59:59');
      } else {
        start = today;
        end = now;
      }
  }
  
  return { start, end };
}

function selectDateTab(tab) {
  document.querySelectorAll('.date-tab').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  
  selectedDate = tab;
  customStartDate = null;
  customEndDate = null;
  
  document.getElementById('startDate').value = '';
  document.getElementById('endDate').value = '';
  
  loadStoreData();
}

function applyCustomDate() {
  const start = document.getElementById('startDate').value;
  const end = document.getElementById('endDate').value;
  
  if (!start || !end) {
    alert('Vui lòng chọn ngày bắt đầu và kết thúc');
    return;
  }
  
  document.querySelectorAll('.date-tab').forEach(btn => {
    btn.classList.remove('active');
  });
  
  selectedDate = 'custom';
  customStartDate = start;
  customEndDate = end;
  
  loadStoreData();
}

async function checkAuth() {
  const { data: { session } } = await client.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return;
  }
  
  currentUser = session.user;
  document.getElementById('userEmail').textContent = currentUser.email;
  document.getElementById('userAvatar').textContent = currentUser.email.charAt(0).toUpperCase();
  
  await loadStoresFromDB();
}
checkAuth();

async function loadStoresFromDB() {
  try {
    const { data, error } = await client
      .from('stores')
      .select('id, name');
    
    if (error) {
      console.error('Error loading stores:', error);
      stores = { 1: 'Kho 1', 2: 'Kho 2', 3: 'Kho 3', 4: 'Kho 4' };
    } else if (data && data.length > 0) {
      data.forEach(store => {
        stores[store.id] = store.name;
      });
    } else {
      stores = { 1: 'Kho 1', 2: 'Kho 2', 3: 'Kho 3', 4: 'Kho 4' };
    }
    
    await loadUserPreferences();
    
  } catch (err) {
    console.error('Error in loadStoresFromDB:', err);
    stores = { 1: 'Kho 1', 2: 'Kho 2', 3: 'Kho 3', 4: 'Kho 4' };
    await loadUserPreferences();
  }
}

async function loadUserPreferences() {
  try {
    const { data } = await client
      .from('user_preferences')
      .select('selected_store')
      .eq('user_id', currentUser.id)
      .maybeSingle();

    const firstStoreId = parseInt(Object.keys(stores)[0]) || 1;
    selectedStore = data?.selected_store && stores[data.selected_store] ? data.selected_store : firstStoreId;
    
    initStoreButtons();
    await loadStoreData();

    // ✅ Start auto-refresh after first load
    startAutoRefresh();
    
  } catch (err) {
    selectedStore = 1;
    initStoreButtons();
    await loadStoreData();
    startAutoRefresh();
  }
}

function initStoreButtons() {
  const container = document.getElementById('storeButtons');
  let html = '';
  
  Object.entries(stores).forEach(([id, name]) => {
    html += `<button class="store-btn ${parseInt(id) === selectedStore ? 'active' : ''}" onclick="selectStore(${parseInt(id)})">${name}</button>`;
  });
  
  container.innerHTML = html;
}

async function selectStore(storeId) {
  selectedStore = storeId;
  
  document.querySelectorAll('.store-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  
  await client.from('user_preferences').upsert({
    user_id: currentUser.id,
    selected_store: storeId,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });
  
  await loadStoreData();
}

function getMinutesSince(utcTimestamp) {
  if (!utcTimestamp) return 999;
  const past = new Date(utcTimestamp);
  const now = new Date();
  const diffMs = now - past;
  return Math.floor(diffMs / (1000 * 60));
}

// ✅ UPDATED: offline if last update > OFFLINE_THRESHOLD_MINUTES (8 min)
function isNodeOnline(utcTimestamp) {
  const minutesSince = getMinutesSince(utcTimestamp);
  return minutesSince < OFFLINE_THRESHOLD_MINUTES;
}

function formatDBTimeToLocal(utcTimestamp, format = 'datetime') {
  if (!utcTimestamp) return '';
  const date = new Date(utcTimestamp);
  
  if (format === 'time') {
    return date.toLocaleTimeString('vi-VN', { 
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
  
  if (format === 'date') {
    return date.toLocaleDateString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
  
  return date.toLocaleString('vi-VN', { 
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

function getCurrentUTCTime() {
  return new Date().toISOString();
}

let tempCharts = {};
let humCharts = {};

function formatTimeVN(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('vi-VN', { 
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function formatDateTimeVN(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleString('vi-VN', { 
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

function formatDateVN(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// ✅ AUTO-REFRESH: start/stop/update countdown
function startAutoRefresh() {
  stopAutoRefresh();

  // Only auto-refresh on "today" or custom range ending today
  const isLiveView = selectedDate === 'today' || 
    (selectedDate === 'custom' && customEndDate && 
     new Date(customEndDate).toDateString() === new Date().toDateString());

  if (!isLiveView) return;

  updateRefreshIndicator(AUTO_REFRESH_SECONDS);
  let secondsLeft = AUTO_REFRESH_SECONDS;

  autoRefreshInterval = setInterval(async () => {
    secondsLeft--;
    updateRefreshIndicator(secondsLeft);

    if (secondsLeft <= 0) {
      secondsLeft = AUTO_REFRESH_SECONDS;
      console.log('🔄 Auto-refresh: fetching new data...');
      await refreshDataOnly(); // ✅ Only update data, not full re-render
    }
  }, 1000);
}

function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
  updateRefreshIndicator(null);
}

function updateRefreshIndicator(secondsLeft) {
  let indicator = document.getElementById('refreshIndicator');
  if (!indicator) return;

  if (secondsLeft === null) {
    indicator.style.display = 'none';
    return;
  }

  indicator.style.display = 'inline-flex';
  indicator.textContent = `🔄 Cập nhật sau ${secondsLeft}s`;
  indicator.style.color = secondsLeft <= 10 ? '#ef4444' : '#64748b';
}

// ✅ SOFT REFRESH: only update sensor values & status badges, no full re-render
async function refreshDataOnly() {
  if (isUpdating) return;
  isUpdating = true;

  try {
    const range = getDateRange(selectedDate);

    const { data, error } = await client
      .from("sensor_data")
      .select('temperature, humidity, timestamp, node_id, store_id, vbat_percent')
      .eq('store_id', selectedStore)
      .gte('timestamp', range.start.toISOString())
      .lte('timestamp', range.end.toISOString())
      .order('timestamp', { ascending: true });

    if (error) throw error;

    let sortedData = data || [];
    if (sortedData.length > 0) {
      sortedData = [...sortedData].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );
    }

    // Group by node
    const nodesData = {};
    sortedData.forEach(reading => {
      const nodeId = parseInt(reading.node_id);
      if (!nodesData[nodeId]) nodesData[nodeId] = [];
      nodesData[nodeId].push(reading);
    });

    historicalData[selectedStore] = nodesData;

    // ✅ Update each node card in place (no full re-render)
    Object.keys(nodesData).forEach(nodeId => {
      const readings = nodesData[nodeId];
      if (!readings || readings.length === 0) return;

      const sortedReadings = [...readings].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );

      window[`readings_${nodeId}`] = sortedReadings;

      const latestReading = sortedReadings[sortedReadings.length - 1];
      const minutesSince = getMinutesSince(latestReading.timestamp);
      const isOnline = minutesSince < OFFLINE_THRESHOLD_MINUTES;

      // Update temperature value
      const tempEl = document.querySelector(`#node-temp-${nodeId}`);
      if (tempEl) tempEl.textContent = `${formatValue(latestReading.temperature)}°C`;

      // Update humidity value
      const humEl = document.querySelector(`#node-hum-${nodeId}`);
      if (humEl) humEl.textContent = `${formatValue(latestReading.humidity)}%`;

      // Update timestamp display
      const timeEls = document.querySelectorAll(`#node-time-${nodeId}`);
      timeEls.forEach(el => el.textContent = `🕐 ${formatTimeVN(latestReading.timestamp)}`);

      // Update status badge
      const statusEl = document.querySelector(`#node-status-${nodeId}`);
      if (statusEl) {
        let offlineTimeText = '';
        if (!isOnline) {
          if (minutesSince >= 60) {
            const h = Math.floor(minutesSince / 60);
            const m = minutesSince % 60;
            offlineTimeText = m > 0 ? `${h} giờ ${m} phút` : `${h} giờ`;
          } else {
            offlineTimeText = `${minutesSince} phút`;
          }
        }
        statusEl.className = `status-badge ${isOnline ? 'online' : 'offline'}`;
        statusEl.textContent = isOnline 
          ? '🟢 ✅ ONLINE' 
          : `🔴 📴 OFFLINE | ${offlineTimeText}`;
      }

      // ✅ Update charts without destroying card HTML
      createTempChart(nodeId, sortedReadings);
      createHumChart(nodeId, sortedReadings);
      
      const vbatEl = document.querySelector(`#node-vbat-${nodeId}`);
	if (vbatEl) {
	  const vbat = latestReading.vbat_percent;
	  vbatEl.textContent = (vbat !== null && vbat !== undefined) ? `${vbat}%` : 'N/A';
	}

      // Update record count
      const countEl = document.querySelector(`#node-count-${nodeId}`);
      if (countEl) countEl.textContent = `📊 ${sortedReadings.length} bản ghi`;
    });

    console.log('✅ Soft refresh done:', new Date().toLocaleTimeString());

  } catch (err) {
    console.error('Error refreshing data:', err);
  } finally {
    isUpdating = false;
  }
}

async function loadStoreData() {
  if (isUpdating) return;
  isUpdating = true;

  // ✅ Restart auto-refresh timer when store/date changes
  stopAutoRefresh();

  try {
    const range = getDateRange(selectedDate);
    
    console.log('📅 Đang tải dữ liệu:');
    console.log('   - Từ:', range.start.toISOString());
    console.log('   - Đến:', range.end.toISOString());
    
    const { data, error } = await client
      .from("sensor_data")
      .select('temperature, humidity, timestamp, node_id, store_id, vbat_percent')
      .eq('store_id', selectedStore)
      .gte('timestamp', range.start.toISOString())
      .lte('timestamp', range.end.toISOString())
      .order('timestamp', { ascending: true });

    if (error) throw error;

    console.log('📊 Đã tải:', data?.length || 0, 'bản ghi');
    
    let sortedData = data || [];
    if (sortedData.length > 0) {
      sortedData = [...sortedData].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );
    }

    const nodesData = {};
    if (sortedData.length > 0) {
      sortedData.forEach(reading => {
        const nodeId = parseInt(reading.node_id);
        if (!nodesData[nodeId]) {
          nodesData[nodeId] = [];
        }
        nodesData[nodeId].push(reading);
      });
    }

    historicalData[selectedStore] = nodesData;
    displayNodesData(nodesData, sortedData);

  } catch (err) {
    console.error('Error loading data:', err);
    document.getElementById('mainContent').innerHTML = '<div class="no-data">Lỗi tải dữ liệu: ' + err.message + '</div>';
  } finally {
    isUpdating = false;
    // ✅ Restart auto-refresh after full load
    startAutoRefresh();
  }
}

let modalChart = null;
let currentModalNodeId = null;
let currentModalType = null;

function showZoomedChart(nodeId, type, readings) {
  const modal = document.createElement('div');
  modal.id = 'chartModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    cursor: pointer;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    width: 90%;
    height: 90%;
    border-radius: 16px;
    padding: 20px;
    position: relative;
    cursor: default;
  `;
  
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: #ef4444;
    color: white;
    font-size: 20px;
    cursor: pointer;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    document.body.removeChild(modal);
  };
  
  const canvas = document.createElement('canvas');
  canvas.id = `zoomed-chart-${type}`;
  canvas.style.cssText = `width: 100%; height: 100%;`;
  
  content.appendChild(closeBtn);
  content.appendChild(canvas);
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  modal.onclick = () => {
    document.body.removeChild(modal);
  };
  
  setTimeout(() => {
    createZoomedChart(nodeId, type, readings);
  }, 100);
}

function createZoomedChart(nodeId, type, readings) {
  const canvasId = `zoomed-chart-${type}`;
  const canvas = document.getElementById(canvasId);
  
  if (!canvas) return;
  
  if (modalChart) {
    modalChart.destroy();
  }
  
  const sortedReadings = [...readings].sort((a, b) => 
    new Date(a.timestamp) - new Date(b.timestamp)
  );
  
  const times = sortedReadings.map(r => formatDateTimeVN(r.timestamp));
  const values = type === 'temp' 
    ? sortedReadings.map(r => r.temperature / 10)
    : sortedReadings.map(r => r.humidity / 10);

  const ctx = canvas.getContext('2d');
  
  const colors = type === 'temp' 
    ? { border: '#ef4444', bg: 'rgba(239,68,68,0.1)', title: 'NHIỆT ĐỘ', unit: '°C' }
    : { border: '#3b82f6', bg: 'rgba(59,130,246,0.1)', title: 'ĐỘ ẨM', unit: '%' };

  modalChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: times,
      datasets: [
        {
          label: `${type === 'temp' ? 'Nhiệt độ' : 'Độ ẩm'}`,
          data: values,
          borderColor: colors.border,
          backgroundColor: colors.bg,
          borderWidth: 3,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 8,
          pointBackgroundColor: colors.border,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: `Node ${nodeId} - ${colors.title} (Phóng to)`,
          color: colors.border,
          font: { size: 20, weight: 'bold' }
        },
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.8)',
          titleColor: 'white',
          bodyColor: 'white',
          callbacks: {
            label: function(context) {
              return [
                context.raw.toFixed(1) + colors.unit,
                `🕐 ${context.label}`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: true, color: 'rgba(0,0,0,0.1)' },
          ticks: { maxRotation: 45, minRotation: 45, font: { size: 12 } }
        },
        y: {
          title: { 
            display: true, 
            text: type === 'temp' ? 'Nhiệt độ (°C)' : 'Độ ẩm (%)',
            color: colors.border,
            font: { size: 14, weight: 'bold' }
          },
          grid: { color: type === 'temp' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)' },
          ticks: { font: { size: 12 } }
        }
      }
    }
  });
}

function createTempChart(nodeId, readings) {
  const canvasId = `temp-chart-${nodeId}`;
  const canvas = document.getElementById(canvasId);
  
  if (!canvas) return null;
  
  canvas.style.cursor = 'pointer';
  canvas.onclick = (e) => {
    e.stopPropagation();
    showZoomedChart(nodeId, 'temp', readings);
  };
  
  if (tempCharts[nodeId]) {
    tempCharts[nodeId].destroy();
  }
  
  const sortedReadings = [...readings].sort((a, b) => 
    new Date(a.timestamp) - new Date(b.timestamp)
  );
  
  const times = sortedReadings.map(r => formatTimeVN(r.timestamp));
  const temps = sortedReadings.map(r => r.temperature / 10);

  const ctx = canvas.getContext('2d');
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: times,
      datasets: [
        {
          label: 'Nhiệt độ (°C)',
          data: temps,
          borderColor: '#ef4444',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: '#ef4444',
          pointBorderColor: '#c0392b',
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: '🌡️ NHIỆT ĐỘ',
          color: '#ef4444',
          font: { size: 14, weight: 'bold' }
        },
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: function(context) {
              return context[0].label;
            },
            label: function(context) {
              const reading = sortedReadings[context.dataIndex];
              const fullTime = formatDateTimeVN(reading.timestamp);
              return [
                context.raw.toFixed(1) + '°C',
                `🕐 ${fullTime}`
              ];
            }
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45, font: { size: 10 } } },
        y: { title: { display: true, text: 'Nhiệt độ (°C)', color: '#ef4444' }, grid: { color: 'rgba(239, 68, 68, 0.1)' } }
      }
    }
  });
  
  tempCharts[nodeId] = chart;
  return chart;
}

function createHumChart(nodeId, readings) {
  const canvasId = `hum-chart-${nodeId}`;
  const canvas = document.getElementById(canvasId);
  
  if (!canvas) return null;
  
  canvas.style.cursor = 'pointer';
  canvas.onclick = (e) => {
    e.stopPropagation();
    showZoomedChart(nodeId, 'hum', readings);
  };
  
  if (humCharts[nodeId]) {
    humCharts[nodeId].destroy();
  }
  
  const sortedReadings = [...readings].sort((a, b) => 
    new Date(a.timestamp) - new Date(b.timestamp)
  );
  
  const times = sortedReadings.map(r => formatTimeVN(r.timestamp));
  const hums = sortedReadings.map(r => r.humidity / 10);

  const ctx = canvas.getContext('2d');
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: times,
      datasets: [
        {
          label: 'Độ ẩm (%)',
          data: hums,
          borderColor: '#3b82f6',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#2980b9',
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: '💧 ĐỘ ẨM',
          color: '#3b82f6',
          font: { size: 14, weight: 'bold' }
        },
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: function(context) {
              return context[0].label;
            },
            label: function(context) {
              const reading = sortedReadings[context.dataIndex];
              const fullTime = formatDateTimeVN(reading.timestamp);
              return [
                context.raw.toFixed(1) + '%',
                `🕐 ${fullTime}`
              ];
            }
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45, font: { size: 10 } } },
        y: { title: { display: true, text: 'Độ ẩm (%)', color: '#3b82f6' }, grid: { color: 'rgba(59, 130, 246, 0.1)' } }
      }
    }
  });
  
  humCharts[nodeId] = chart;
  return chart;
}

function displayNodesData(nodesData, allReadings) {
  if (Object.keys(nodesData).length === 0) {
    document.getElementById('mainContent').innerHTML = '<div class="no-data">Không có dữ liệu trong khoảng thời gian này</div>';
    return;
  }

  let html = '<div class="nodes-grid">';
  const sortedNodes = Object.keys(nodesData).sort((a, b) => a - b);

  sortedNodes.forEach(nodeId => {
    const readings = nodesData[nodeId];
    if (!readings || readings.length === 0) return;
    
    const sortedReadings = [...readings].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
    const latestReading = sortedReadings[sortedReadings.length - 1];
    const latestVbat = latestReading.vbat_percent;

    const temps = sortedReadings.map(r => r.temperature / 10);
    const hums = sortedReadings.map(r => r.humidity / 10);
    
    const maxTemp = Math.max(...temps);
    const minTemp = Math.min(...temps);
    const maxHum = Math.max(...hums);
    const minHum = Math.min(...hums);
    
    const maxTempReading = sortedReadings.find(r => r.temperature / 10 === maxTemp);
    const minTempReading = sortedReadings.find(r => r.temperature / 10 === minTemp);
    const maxHumReading = sortedReadings.find(r => r.humidity / 10 === maxHum);
    const minHumReading = sortedReadings.find(r => r.humidity / 10 === minHum);
    
    let nodeDisconnections = [];
    try {
      nodeDisconnections = analyzeDisconnections(sortedReadings, 2);
    } catch (err) {}
    
    window[`readings_${nodeId}`] = sortedReadings;
    
    const isRealtime = selectedDate === 'today' || 
                   (selectedDate === 'custom' && 
                    customEndDate && 
                    new Date(customEndDate).toDateString() === new Date().toDateString());

    let statusClass = 'offline';
    let statusText = '📴 Quá khứ';
    let statusIcon = '⚫';
    let offlineTimeText = '';
    let isOnline = false;
    
    if (isRealtime) {
      const minutesSinceLastUpdate = getMinutesSince(latestReading.timestamp);
      // ✅ UPDATED: use 8-minute threshold
      isOnline = minutesSinceLastUpdate < OFFLINE_THRESHOLD_MINUTES;
      
      if (!isOnline) {
        if (minutesSinceLastUpdate >= 60) {
          const hours = Math.floor(minutesSinceLastUpdate / 60);
          const mins = minutesSinceLastUpdate % 60;
          offlineTimeText = mins > 0 ? `${hours} giờ ${mins} phút` : `${hours} giờ`;
        } else {
          offlineTimeText = `${minutesSinceLastUpdate} phút`;
        }
      }
      
      statusClass = isOnline ? 'online' : 'offline';
      statusText = isOnline ? '✅ ONLINE' : '📴 OFFLINE';
      statusIcon = isOnline ? '🟢' : '🔴';
    }
    
    const displayTimeOnly = formatTimeVN(latestReading.timestamp);
    const displayDateOnly = formatDateVN(latestReading.timestamp);
    const displayTime = formatDateTimeVN(latestReading.timestamp);
    
    html += `
      <div class="node-card" style="position: relative;">
        <div class="node-header">
          <div class="node-title">
            <div class="node-icon">${nodeId}</div>
            <span class="node-id">Node ${nodeId}</span>
          </div>
			<div class="sensor-item">
			  <div class="reading-value" id="node-vbat-${nodeId}">
				${latestVbat !== null && latestVbat !== undefined ? latestVbat + '%' : 'N/A'}
			  </div>
			  <div class="timestamp">
				🔋 PIN còn lại
			  </div>
			</div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="status-badge ${statusClass}" id="node-status-${nodeId}" title="${offlineTimeText}">
              ${statusIcon} ${statusText} ${offlineTimeText ? '| ' + offlineTimeText : ''}
            </span>
            <button class="node-menu-btn" onclick="window.toggleNodeMenu(${nodeId}); event.stopPropagation();" id="menu-${nodeId}">
              ⋮
            </button>
          </div>
        </div>
    
        <div class="realtime-data">
          <div class="sensor-item">
            <div class="reading-label">🌡️ NHIỆT ĐỘ</div>
            <div class="reading-value temp" id="node-temp-${nodeId}">${formatValue(latestReading.temperature)}°C</div>
            <div class="timestamp" id="node-time-${nodeId}" title="Cập nhật lúc ${displayTime}">
              🕐 ${displayTimeOnly}
            </div>
          </div>
          <div class="sensor-item">
            <div class="reading-label">💧 ĐỘ ẨM</div>
            <div class="reading-value hum" id="node-hum-${nodeId}">${formatValue(latestReading.humidity)}%</div>
            <div class="timestamp" id="node-time-${nodeId}" title="Cập nhật lúc ${displayTime}">
              🕐 ${displayTimeOnly}
            </div>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0;">
          <div style="background: #fff5f5; padding: 10px; border-radius: 8px; text-align: center;">
            <div style="font-size: 11px; color: #e74c3c;">🔥 CAO NHẤT</div>
            <div style="font-size: 20px; font-weight: bold; color: #e74c3c;">${maxTemp.toFixed(1)}°C</div>
            <div style="font-size: 10px; color: #7f8c8d;">${maxTempReading ? formatTimeVN(maxTempReading.timestamp) : ''}</div>
          </div>
          <div style="background: #f0f7ff; padding: 10px; border-radius: 8px; text-align: center;">
            <div style="font-size: 11px; color: #2980b9;">💧 CAO NHẤT</div>
            <div style="font-size: 20px; font-weight: bold; color: #2980b9;">${maxHum.toFixed(1)}%</div>
            <div style="font-size: 10px; color: #7f8c8d;">${maxHumReading ? formatTimeVN(maxHumReading.timestamp) : ''}</div>
          </div>
          <div style="background: #eef8ff; padding: 10px; border-radius: 8px; text-align: center;">
            <div style="font-size: 11px; color: #3498db;">❄️ THẤP NHẤT</div>
            <div style="font-size: 20px; font-weight: bold; color: #3498db;">${minTemp.toFixed(1)}°C</div>
            <div style="font-size: 10px; color: #7f8c8d;">${minTempReading ? formatTimeVN(minTempReading.timestamp) : ''}</div>
          </div>
          <div style="background: #e6f7f7; padding: 10px; border-radius: 8px; text-align: center;">
            <div style="font-size: 11px; color: #06b6d4;">💧 THẤP NHẤT</div>
            <div style="font-size: 20px; font-weight: bold; color: #06b6d4;">${minHum.toFixed(1)}%</div>
            <div style="font-size: 10px; color: #7f8c8d;">${minHumReading ? formatTimeVN(minHumReading.timestamp) : ''}</div>
          </div>
        </div>
        
        <div class="chart-container">
          <canvas id="temp-chart-${nodeId}"></canvas>
        </div>

        <div class="chart-container">
          <canvas id="hum-chart-${nodeId}"></canvas>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 8px; border-top: 1px dashed #e2e8f0;">
          <div class="day-indicator">
            <span class="day-dot today" title="Hôm nay"></span>
            <span class="day-dot yesterday" title="Hôm qua"></span>
            <span class="day-dot day3" title="3 ngày trước"></span>
            <span class="day-dot day5" title="5 ngày trước"></span>
          </div>
          <div id="node-count-${nodeId}" style="font-size: 11px; background: #f1f5f9; padding: 2px 10px; border-radius: 12px; color: #475569;">
            📊 ${sortedReadings.length} bản ghi • ${displayDateOnly}
          </div>
        </div>
      </div>
    `;
  });

  html += '</div>';
  document.getElementById('mainContent').innerHTML = html;
  

  setTimeout(() => {
    sortedNodes.forEach(nodeId => {
      const readings = nodesData[nodeId];
      if (readings && readings.length > 0) {
        createTempChart(nodeId, readings);
        createHumChart(nodeId, readings);
      }
    });
  }, 100);
}

async function logout() {
  stopAutoRefresh();
  await client.auth.signOut();
  window.location.replace("index.html");
}