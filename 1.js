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
const OFFLINE_THRESHOLD_MINUTES = 10;


// Hàm phân tích khoảng thời gian mất kết nối
function analyzeDisconnections(readings, maxGapMinutes = OFFLINE_THRESHOLD_MINUTES) {
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
        durationText = mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
      } else {
        durationText = `${mins}m`;
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
  
  const disconnections = analyzeDisconnections(sortedReadings, OFFLINE_THRESHOLD_MINUTES);
  
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
          <span style="font-size: 32px;">📡</span>
          <div>
            <h2 style="margin: 0; font-size: 22px;">PHÂN TÍCH KẾT NỐI - NODE ${nodeId}</h2>
          </div>
        </div>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      
      <div class="modal-body">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">⏱️ Thời gian phân tích</div>
            <div class="stat-label">
				  ${formatDateTimeVN(sortedReadings[0].timestamp)} ${formatDateTimeVN(sortedReadings[sortedReadings.length-1].timestamp)}
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-label">🔴 Số lần mất kết nối</div>
            <div class="stat-value" style="color: #ef4444;">${disconnections.length}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">⏱️ Tổng thời gian</div>
            <div class="stat-value" style="color: #f97316;">${totalHours}h${totalMins > 0 ? totalMins + 'm' : ''}</div>
          </div>
        </div>
        
        <div style="background: white; border-radius: 16px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin: 0; color: #1e293b; display: flex; align-items: center; gap: 8px;">
              <span>📋 CHI TIẾT</span>
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
            <p style="color: #64748b; margin: 0;">Node hoạt động liên tục trong suốt thời gian này</p>
          </div>
          `}
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
};


let batteryModalChart = null;
let currentBatteryNode = null;

function renderBatteryModalChart() {
  const modal = document.querySelector('.battery-modal');
  if (!modal) return;

  const statusEl = modal.querySelector('#battery-last-status');
  const canvas = modal.querySelector('#battery-chart-modal');

  if (!canvas) {
    console.warn('❌ Canvas not found');
    return;
  }

  if (!globalSensorData || globalSensorData.length === 0) {
    statusEl.innerText = 'Chưa có dữ liệu';
    return;
  }

  const data = globalSensorData.filter(d => 
    Number(d.node_id) === Number(currentBatteryNode) &&
    d.vbat_percent !== null
  );

  if (data.length === 0) {
    statusEl.innerText = 'Không có dữ liệu pin';
    return;
  }

  const sorted = [...data].sort((a, b) =>
    new Date(a.timestamp) - new Date(b.timestamp)
  );

  const last = sorted[sorted.length - 1];

  const color = last.vbat_percent < 20 ? '#ef4444' : '#22c55e';

  statusEl.innerHTML =
    `🔋 <b style="color:${color}">${last.vbat_percent}%</b> — 🕐 ${formatDateTimeVN(last.timestamp)}`;

  const labels = sorted.map(r =>
    selectedDate === 'today'
      ? formatTimeVN(r.timestamp)
      : formatDateTimeVN(r.timestamp)
  );

  const values = sorted.map(r => r.vbat_percent);

  if (batteryModalChart) {
    batteryModalChart.destroy();
  }

  canvas.height = 300; // 🔥 đảm bảo render

  const ctx = canvas.getContext('2d');

  batteryModalChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Pin (%)',
        data: values,
        borderColor: color,
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 3,
        fill: true,
        backgroundColor: color + '20' // adds transparency (20 = 12% opacity)
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 20,
            callback: function(value) {
              return value + '%';
            }
          },
          title: {
            display: true,
            text: 'Mức pin (%)',
            font: {
              size: 12
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        },
        x: {
          title: {
            display: true,
            text: selectedDate === 'today' ? 'Thời gian' : 'Ngày giờ',
            font: {
              size: 12
            }
          },
          ticks: {
            maxRotation: 45,
            minRotation: 45
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Pin: ${context.parsed.y}%`;
            }
          }
        },
        legend: {
          display: true,
          position: 'top'
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      }
    }
  });

  console.log('✅ Chart rendered with y-axis 0-100%');
}

window.showBatteryAnalysis = function(nodeId) {
  currentBatteryNode = nodeId;

  // 🔥 tránh mở nhiều modal
  const old = document.querySelector('.battery-modal');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.className = 'battery-modal';

  modal.style.position = 'fixed';
  modal.style.top = 0;
  modal.style.left = 0;
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.background = 'rgba(0,0,0,0.5)';
  modal.style.zIndex = 9999;

  modal.onclick = function(e) {
    if (e.target === modal) modal.remove();
  };

  modal.innerHTML = `
  <div class="modal-content" style="background:white; width:90%; max-width:700px; margin:50px auto; border-radius:12px; padding:20px; position:relative;">
    
    <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
      
      <div style="display: flex; align-items: center; gap: 15px;">
        <span style="font-size: 32px;">🔋</span>
        <div>
          <h2 style="margin: 0; font-size: 20px;">THỐNG KÊ PIN - NODE ${nodeId}</h2>
        </div>
      </div>

      <button class="modal-close"
        style="border:none; background:none; font-size:20px; cursor:pointer;">
        ✕
      </button>

    </div>

    <div class="modal-body">

      <div id="battery-last-status" style="margin-bottom:10px;"></div>

      <div style="height:300px;">
        <canvas id="battery-chart-modal"></canvas>
      </div>

    </div>

  </div>
`;

  document.body.appendChild(modal);

  // ✅ close button
  modal.querySelector('.modal-close').onclick = () => modal.remove();

  // ✅ render chart sau khi DOM ready
  setTimeout(() => {
    renderBatteryModalChart();
  }, 50);
};

function closeBatteryModal() {
  document.getElementById('battery-modal').style.display = 'none';
}

// Định nghĩa hàm toggleNodeMenu
// Định nghĩa hàm toggleNodeMenu - FIXED with unique classes
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
  
  // Close all node dropdowns
  document.querySelectorAll('.node-dropdown').forEach(el => {
    if (el.cleanup) el.cleanup();
    el.remove();
  });
  
  // Also close store dropdowns to avoid conflict
  document.querySelectorAll('.store-dropdown.show').forEach(dropdown => {
    dropdown.classList.remove('show');
  });
  
  const readings = window[`readings_${nodeId}`];
  if (!readings) {
    console.log('❌ Không có readings cho node', nodeId);
    alert('Node này chưa có dữ liệu');
    return;
  }
  
  let disconnectCount = 0;
  try {
    const disconnections = analyzeDisconnections(readings, OFFLINE_THRESHOLD_MINUTES);
    disconnectCount = disconnections.length;
  } catch (err) {
    console.log('Lỗi đếm Mất kết nối:', err);
  }
  
  const dropdown = document.createElement('div');
  dropdown.className = 'node-dropdown';
  
  // Get button position
  const rect = menuBtn.getBoundingClientRect();
  
  // Apply base styles
  dropdown.style.position = 'fixed';
  dropdown.style.background = 'white';
  dropdown.style.borderRadius = '12px';
  dropdown.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
  dropdown.style.minWidth = '250px';
  dropdown.style.zIndex = '999999';
  dropdown.style.border = '1px solid #e2e8f0';
  dropdown.style.overflow = 'hidden';
  dropdown.style.animation = 'dropdownFadeIn 0.2s ease';
  
  dropdown.innerHTML = `
    <div class="node-dropdown-item" onclick="window.showConnectionAnalysis(${nodeId}); this.closest('.node-dropdown').remove(); event.stopPropagation();">
      <span style="font-size: 20px; width: 32px; text-align: center;">📡</span>
      <span style="flex: 1;">Thống kê kết nối</span>
      <span style="background: #ef4444; color: white; padding: 2px 8px; border-radius: 20px; font-size: 12px; font-weight: bold;">${disconnectCount}</span>
    </div>
    <div class="node-dropdown-item" onclick="window.showBatteryAnalysis(${nodeId}); this.closest('.node-dropdown').remove(); event.stopPropagation();">
      <span style="font-size: 20px; width: 32px; text-align: center;">🔋</span>
      <span>Thống kê pin</span>
    </div>
  `;
  
  document.body.appendChild(dropdown);
  
  // Get dropdown dimensions after adding to DOM
  const dropdownRect = dropdown.getBoundingClientRect();
  const dropdownWidth = dropdownRect.width;
  const dropdownHeight = dropdownRect.height;
  
  // FIXED: Calculate position based on button position
  // Default: show below and align to the right of button (for desktop)
  let top = rect.bottom + 5;
  let left = rect.right - dropdownWidth; // Align right edge with button's right edge
  
  // MOBILE FIX: Adjust position for mobile viewport
  // Check right edge - if dropdown goes off screen to the right
  if (left + dropdownWidth > window.innerWidth) {
    left = window.innerWidth - dropdownWidth - 16;
  }
  
  // Check left edge - if dropdown goes off screen to the left
  if (left < 16) {
    left = 16;
  }
  
  // Check bottom edge - if not enough space below, show above the button
  if (top + dropdownHeight > window.innerHeight) {
    top = rect.top - dropdownHeight - 5;
  }
  
  // Check top edge - if not enough space above either
  if (top < 16) {
    top = 16;
  }
  
  // Apply final position
  dropdown.style.top = `${top}px`;
  dropdown.style.left = `${left}px`;
  dropdown.style.right = 'auto';
  dropdown.style.bottom = 'auto';
  
  // For mobile, ensure dropdown doesn't exceed viewport width
  if (window.innerWidth <= 768) {
    dropdown.style.maxWidth = `${window.innerWidth - 32}px`;
    dropdown.style.minWidth = '200px';
    
    // On mobile, reposition to avoid covering the button if needed
    // Check if dropdown covers the button
    const buttonCenter = rect.left + (rect.width / 2);
    const dropdownCenter = left + (dropdownWidth / 2);
    
    // If dropdown is too far from button on mobile, adjust
    if (Math.abs(buttonCenter - dropdownCenter) > 100) {
      left = Math.max(16, Math.min(rect.right - dropdownWidth, window.innerWidth - dropdownWidth - 16));
      dropdown.style.left = `${left}px`;
    }
  }
  
  // Prevent body scrolling on mobile
  const originalOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  
  // Close dropdown handlers
  let isClosing = false;
  
  function closeDropdown() {
    if (isClosing) return;
    isClosing = true;
    if (dropdown && dropdown.remove) {
      dropdown.remove();
    }
    document.body.style.overflow = originalOverflow;
    document.removeEventListener('click', handleClickOutside);
    document.removeEventListener('keydown', handleEscapeKey);
    window.removeEventListener('scroll', handleScroll, true);
    window.removeEventListener('resize', handleResize);
  }
  
  function handleClickOutside(e) {
    // Don't close if clicking on the dropdown or the menu button
    if (!dropdown.contains(e.target) && !menuBtn.contains(e.target)) {
      closeDropdown();
    }
  }
  
  function handleEscapeKey(e) {
    if (e.key === 'Escape') {
      closeDropdown();
    }
  }
  
  function handleScroll(e) {
    // Close dropdown on scroll (common on mobile)
    closeDropdown();
  }
  
  function handleResize() {
    closeDropdown();
  }
  
  // Add event listeners with delay to avoid immediate closing
  setTimeout(() => {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    // Close on scroll for mobile
    if (window.innerWidth <= 768) {
      window.addEventListener('scroll', handleScroll, true);
    }
    window.addEventListener('resize', handleResize);
  }, 10);
  
  // Store cleanup function on dropdown for garbage collection
  dropdown.cleanup = function() {
    window.removeEventListener('resize', handleResize);
    if (window.innerWidth <= 768) {
      window.removeEventListener('scroll', handleScroll, true);
    }
  };
  
  console.log('✅ Dropdown positioned for node', nodeId, 'at:', { top, left, buttonPos: { x: rect.left, y: rect.top } });
};

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
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let start, end;

  function startOfDay(d) {
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function endOfDay(d) {
    d.setHours(23, 59, 59, 999);
    return d;
  }

  switch (dateType) {
    case 'today':
      start = startOfDay(new Date());
      end = new Date(); // now
      break;

    case 'yesterday':
      start = new Date(today);
      start.setDate(start.getDate() - 1);
      start = startOfDay(start);

      end = endOfDay(new Date(start));
      break;

    case '2days':
      start = new Date(today);
      start.setDate(start.getDate() - 2);
      start = startOfDay(start);

      end = endOfDay(new Date(start));
      break;

    case '3days':
      start = new Date(today);
      start.setDate(start.getDate() - 3);
      start = startOfDay(start);

      end = endOfDay(new Date(start));
      break;

    case 'custom':
      if (customStartDate && customEndDate) {
        start = startOfDay(new Date(customStartDate));
        end = endOfDay(new Date(customEndDate));
      }
      break;

    default:
      start = startOfDay(new Date());
      end = new Date();
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

    stores = {}; // reset

    if (error || !data || data.length === 0) {
      console.warn('Using fallback stores');
      stores = {
        1: 'Kho 1',
        2: 'Kho 2',
        3: 'Kho 3',
        4: 'Kho 4'
      };
    } else {
      data.forEach(store => {
        stores[store.id] = store.name;
      });
    }

    await loadUserPreferences();
  } catch (err) {
    console.error('Error loading stores:', err);

    stores = {
      1: 'Kho 1',
      2: 'Kho 2',
      3: 'Kho 3',
      4: 'Kho 4'
    };

    await loadUserPreferences();
  }
}

// Render store buttons
function initStoreButtons() {

  const container = document.getElementById('storeButtons');
  if (!container) return;
  
  let html = '';

  Object.entries(stores).forEach(([id, name]) => {
    const storeId = parseInt(id);
    const isActive = storeId === Number(selectedStore);
  
    html += `
      <div class="store-item ${isActive ? 'active' : ''}" data-store-id="${storeId}">
        <div class="store-main" onclick="selectStore(${storeId})">
          ${name}
        </div>
        <button class="menu-btn" onclick="toggleMenu(event, ${storeId})">
          ⋮
        </button>
        <div class="store-dropdown" id="dropdown-${storeId}">
          <div class="dropdown-item" onclick="testAction(${storeId}, 'analysis')">
            <span class="dropdown-icon">📊</span>
            <span>Phân tích tổng quát</span>
          </div>
          <div class="dropdown-item" onclick="testAction(${storeId}, 'abnormal')">
            <span class="dropdown-icon">⚠️</span>
            <span>Phát hiện bất thường</span>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Toggle menu - INSTANT
function toggleMenu(event, storeId) {
  event.stopPropagation();
  
  const button = event.currentTarget;
  const dropdown = document.getElementById(`dropdown-${storeId}`);
  
  // Close all other dropdowns
  document.querySelectorAll('.store-dropdown').forEach(d => {
    if (d.id !== `dropdown-${storeId}`) {
      d.classList.remove('show');
    }
  });
  
  // Toggle current dropdown
  if (dropdown.classList.contains('show')) {
    dropdown.classList.remove('show');
  } else {
    // Position instantly
    const rect = button.getBoundingClientRect();
    dropdown.style.top = (rect.bottom + 5) + 'px';
    dropdown.style.left = rect.left + 'px';
    // Show instantly
    dropdown.classList.add('show');
  }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
  if (!event.target.closest('.menu-btn') && !event.target.closest('.store-dropdown')) {
    document.querySelectorAll('.store-dropdown').forEach(dropdown => {
      dropdown.classList.remove('show');
    });
  }
});

// Load user preferences
async function loadUserPreferences() {
  try {
    if (!currentUser || !currentUser.id) {
      console.error("currentUser not initialized");
      return;
    }
  
    const { data } = await client
      .from('user_preferences')
      .select('selected_store')
      .eq('user_id', currentUser.id)
      .maybeSingle();

    const storeId = Number(data?.selected_store);
    const firstStoreId = Number(Object.keys(stores)[0]) || 1;
    
    selectedStore = storeId && stores[storeId] ? storeId : firstStoreId;
    
    initStoreButtons();
    await loadStoreData();
    startAutoRefresh();
    
  } catch (err) {
    console.error('Error loading preferences:', err);
    selectedStore = 1;
    initStoreButtons();
    await loadStoreData();
    startAutoRefresh();
  }
}

function openStoreModal(storeId, type) {
  const modal = document.getElementById('statsModal');

  document.getElementById('modalStoreName').innerText = stores[storeId];

  // You can switch view based on type later
  console.log('Open modal:', storeId, type);

  modal.style.display = 'block';
}

async function saveUserPreference(storeId) {
  try {
    await client
      .from('user_preferences')
      .upsert(
        {
          user_id: currentUser.id,
          selected_store: storeId
        },
        { onConflict: 'user_id' } // ✅ prevent duplicates
      );
  } catch (err) {
    console.error('Failed to save preference:', err);
  }
}

let isLoadingStore = false;

// Select store - updates active color when clicking different stores
async function selectStore(storeId) {
  if (isLoadingStore) return;

  console.log('🔄 Changing to store:', storeId);
  
  selectedStore = storeId;

  // Update active class on all store items
  document.querySelectorAll('.store-item').forEach(el => {
    const itemStoreId = parseInt(el.getAttribute('data-store-id'));
    if (itemStoreId === storeId) {
      el.classList.add('active');
      console.log('✅ Activated store:', storeId);
    } else {
      el.classList.remove('active');
    }
  });

  isLoadingStore = true;
  try {
    await loadStoreData();
    await saveUserPreference(storeId);
  } finally {
    isLoadingStore = false;
  }
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
  .from("sensor_data_1")
  .select('temperature, humidity, timestamp, node_id, store_id, vbat_percent')
  .eq('store_id', selectedStore)
  .not('timestamp', 'is', null)
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
            offlineTimeText = m > 0 ? `${h}h${m}m` : `${h}h`;
          } else {
            offlineTimeText = `${minutesSince}m`;
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
	  vbatEl.textContent = (vbat !== null && vbat !== undefined) ? `🔋 ${vbat}%` : 'N/A';
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
  .from("sensor_data_1")
  .select('temperature, humidity, timestamp, node_id, store_id, vbat_percent')
  .eq('store_id', selectedStore)
  .not('timestamp', 'is', null)
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
    
    globalSensorData = sortedData;

	// 🔥 nếu modal đang mở → render lại
	if (document.querySelector('.battery-modal')) {
	  renderBatteryModalChart();
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
          text: `Node ${nodeId} - ${colors.title}`,
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
      nodeDisconnections = analyzeDisconnections(sortedReadings, OFFLINE_THRESHOLD_MINUTES);
    } catch (err) {}
    
    window[`readings_${nodeId}`] = sortedReadings;
    
    const isRealtime = selectedDate === 'today' || 
                   (selectedDate === 'custom' && 
                    customEndDate && 
                    new Date(customEndDate).toDateString() === new Date().toDateString());

	let statusClass = 'offline';
	let statusText = '';
	let statusIcon = '';
	let offlineTimeText = '';
	let isOnline = false;
	
	const minutesSinceLastUpdate = getMinutesSince(latestReading.timestamp);
	
	function formatLastSeen(ts) {
	  if (!ts) return 'No data';
	
	  const minutes = getMinutesSince(ts);
	
	  // < 1h
	  if (minutes < 60) {
		return `${minutes}m`;
	  }
	  
	  const now = new Date();
	  const d = new Date(ts);
	
	  const toDateStr = (date) =>
		date.getFullYear() + '-' +
		String(date.getMonth() + 1).padStart(2, '0') + '-' +
		String(date.getDate()).padStart(2, '0');
	
	  const todayStr = toDateStr(now);
	
	  const yesterday = new Date(now);
	  yesterday.setDate(now.getDate() - 1);
	  const yesterdayStr = toDateStr(yesterday);
	
	  const targetStr = toDateStr(d);
	  
	  if (minutes >= 1440 || targetStr === yesterdayStr) {
		  if (targetStr === yesterdayStr) {
			return `Hôm qua | ${formatTimeVN(ts)}`;
		  }
		}
		
	  if (minutes < 1440 && targetStr === todayStr) {
		const h = Math.floor(minutes / 60);
		const m = minutes % 60;
		return m > 0 ? `${h}h ${m}m` : `${h}h`;
	  }

	  // ✅ 2+ ngày → show date + time
	  return `${formatDateVN(ts)} | ${formatTimeVN(ts)}`;
	}
	
	offlineTimeText = formatLastSeen(latestReading.timestamp);
	
	if (isRealtime) {
	  isOnline = minutesSinceLastUpdate < OFFLINE_THRESHOLD_MINUTES;
	
	  statusClass = isOnline ? 'online' : 'offline';
	  statusIcon = isOnline ? '🟢' : '🔴';
	
	  if (isOnline) {
		statusText = 'ONLINE';
		offlineTimeText = ''; // không cần show
	  } else {
		statusText = `OFFLINE | ${offlineTimeText}`;
	  }
	
	} else {
	  // ✅ FIX CHÍNH: không dùng "Quá khứ"
	  statusClass = 'offline';
	  statusIcon = '⚫';
	  statusText = `${offlineTimeText}`;
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
			${selectedDate === 'today' ? `
			  <div class="sensor-item">
				<div class="reading-value" id="node-vbat-${nodeId}">
				  🔋 ${latestVbat !== null && latestVbat !== undefined ? latestVbat + '%' : 'N/A'}
				</div>
				<div class="timestamp" id="node-time-${nodeId}" title="Cập nhật lúc ${displayTime}">
				  🕐 ${displayTimeOnly}
				</div>
			  </div>
			` : ''}
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="status-badge ${statusClass}" id="node-status-${nodeId}">
              ${statusIcon} ${statusText}
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