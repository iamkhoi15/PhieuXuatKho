const form = document.forms['PXK'];
let productData = [];

// Fetch the product data
fetch('dssp.json')
  .then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json();
  })
  .then(data => {
    productData = data;
    console.log('Loaded products:', productData.length);

    // Start with an empty table; user can add rows using the "+" button on hover
    getNextPXKNumber();

    const dateInput = document.querySelector('.date');
    if (dateInput) {
      dateInput.value = new Date().toLocaleDateString('vi-VN');
    }
  })
  .catch(err => {
    console.error("Failed to load dssp.json:", err);
    getNextPXKNumber();
  });

// Function to format PXK number with leading zeros
function formatPXKNumber(num) {
  return num.toString().padStart(7, '0');
}

// Function to get the next PXK number
function getNextPXKNumber() {
  const lastNumber = localStorage.getItem('lastPXKNumber');
  if (lastNumber) {
    currentPXKNumber = parseInt(lastNumber) + 1;
  }

  const pxkInput = document.querySelector('input[name="Số PXK"]');
  if (pxkInput) {
    pxkInput.value = 'PXK-' + formatPXKNumber(currentPXKNumber);
  }
  return currentPXKNumber;
}

// Function to save ONLY the PXK number
function savePXKNumber() {
  localStorage.setItem('lastPXKNumber', currentPXKNumber.toString());
}

// Function to generate rows
function generateRows(numRows) {
  const tableBody = document.getElementById('table-body');
  if (!tableBody) return;

  tableBody.innerHTML = "";

  for (let i = 0; i < numRows; i++) {
    createRow();
  }
}

function createRow(rowIndex) {
  const tableBody = document.getElementById('table-body');
  if (!tableBody) return;

  const currentRows = tableBody.querySelectorAll('tr').length;
  const effectiveIndex = (typeof rowIndex === 'number') ? rowIndex : (currentRows + 1);

  const row = document.createElement("tr");

  let productOptions = '<option value=""></option>';
  if (productData && productData.length > 0) {
    productOptions += productData.map((item, index) =>
      `<option value="${index}">${item.productName}</option>`
    ).join("");
  }

  // STT cell starts empty - will be filled when product is selected
  row.innerHTML = `
        <td class="stt"></td>
        <td class="product-cell">
            <textarea class="product-input" name="Tên sản phẩm" rows="1"></textarea>
            <div class="suggestions" aria-hidden="true"></div>
        </td>
        <td><input type="text" class="code" name="Mã hàng" ></td>
        <td><input type="text" class="unity" name="Đơn vị tính" ></td>
        <td><input type="text" class="quantity" name="Số lượng" min="1"}></td>
    `;

  tableBody.appendChild(row);

  // Show the row index in the STT column immediately when the row is created
  const sttCell = row.querySelector('.stt');
  if (sttCell) sttCell.textContent = effectiveIndex;

  attachRowEvents(row, effectiveIndex);

  // Make sure the previous row (if any) height fits its product-input content
  const allRows = tableBody.querySelectorAll('tr');
  const prevRow = allRows[effectiveIndex - 2];
  if (prevRow) {
    if (typeof prevRow._autoResize === 'function') {
      prevRow._autoResize();
    } else {
      // Fallback: try to compute height directly
      const prevInput = prevRow.querySelector('.product-input');
      if (prevInput) {
        prevInput.style.height = 'auto';
        prevInput.style.height = prevInput.scrollHeight + 'px';
      }
    }
  }
}

// Add behavior to product input (textarea autocomplete)
function attachRowEvents(row, rowIndex) {
  const sttCell = row.querySelector('.stt');
  const input = row.querySelector('.product-input');
  const suggestions = row.querySelector('.suggestions');
  const code = row.querySelector('.code');
  const unity = row.querySelector('.unity');
  const quantity = row.querySelector('.quantity');

  // Auto-resize textarea to fit content
  function autoResize() {
    if (!input) return;
    input.style.height = 'auto';
    // Use scrollHeight to set a natural height; capped by CSS max-height
    const h = input.scrollHeight;
    input.style.height = h + 'px';
  }

  // Call once to initialize height
  autoResize();
  // Expose as a method on the row so other code can trigger resize when needed
  row._autoResize = autoResize;

  function hideSuggestions() {
    suggestions.style.display = 'none';
    suggestions.innerHTML = '';
    suggestions.setAttribute('aria-hidden', 'true');
  }

  function showSuggestions(items) {
    if (!items || items.length === 0) {
      hideSuggestions();
      return;
    }
    suggestions.innerHTML = items.map(i => {
      const p = productData[i.index] || {};
      const code = p.productCode || '';
      const unit = p.unit || '';
      return `<div class="suggestion-item" data-index="${i.index}"><div class="s-main">${escapeHtml(p.productName || '')}</div><div class="s-sub">${escapeHtml((code ? code : ''))}${code && unit ? ' • ' : ''}${escapeHtml(unit || '')}</div></div>`;
    }).join('');
    suggestions.style.display = 'block';
    suggestions.setAttribute('aria-hidden', 'false');
  }

  // Input typing: filter matches and show suggestions
  input.addEventListener('input', () => {
    autoResize();
    const q = input.value.trim().toLowerCase();

    // Build set of already selected indices (exclude current row)
    const selectedIndices = new Set();
    document.querySelectorAll('#table-body tr').forEach(tr => {
      if (tr === row) return;
      if (tr.dataset.productIndex) selectedIndices.add(tr.dataset.productIndex);
    });

    if (!q) {
      // If cleared, remove current selection if exists
      if (row.dataset.productIndex) {
        delete row.dataset.productIndex;
        sttCell.textContent = '';
        code.value = '';
        unity.value = '';
        quantity.value = '';
        disableRowsAfter(rowIndex);
        updateProductDropdowns();
      }
      // reset height
      input.style.height = '';
      hideSuggestions();
      return;
    }

    const matches = [];
    productData.forEach((p, idx) => {
      if (selectedIndices.has(String(idx))) return; // already used
      if (p.productName && p.productName.toLowerCase().includes(q)) matches.push({ productName: p.productName, index: idx });
    });

    showSuggestions(matches.slice(0, 12));
  });

  // Click on suggestion
  suggestions.addEventListener('click', (e) => {
    const item = e.target.closest('.suggestion-item');
    if (!item) return;
    const idx = item.dataset.index;
    const product = productData[idx];
    if (!product) return;

    input.value = product.productName;
    row.dataset.productIndex = idx;
    sttCell.textContent = rowIndex;
    code.value = product.productCode || '';
    unity.value = product.unit || '';
    if (quantity) quantity.disabled = false;

    // Resize input to match selected product name
    autoResize();

    hideSuggestions();

    enableNextRow(rowIndex);
    updateProductDropdowns();
  });

  // Hide suggestions shortly after blur to allow click
  input.addEventListener('blur', () => {
    setTimeout(hideSuggestions, 150);
  });

  // Keyboard navigation in suggestions
  input.addEventListener('keydown', (e) => {
    const items = suggestions.querySelectorAll('.suggestion-item');
    if (!items.length) return;
    const active = suggestions.querySelector('.suggestion-item.active');
    let idx = Array.prototype.indexOf.call(items, active);

    if (e.key === 'ArrowDown') {
      idx = (idx + 1) % items.length;
      if (active) active.classList.remove('active');
      items[idx].classList.add('active');
      items[idx].scrollIntoView({ block: 'nearest' });
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      idx = (idx - 1 + items.length) % items.length;
      if (active) active.classList.remove('active');
      items[idx].classList.add('active');
      items[idx].scrollIntoView({ block: 'nearest' });
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (active) {
        active.click();
        e.preventDefault();
      }
    }
  });

  // quantity.addEventListener('input', () => {
  //   const qtyValue = quantity.value.trim();

  //   if (qtyValue) {
  //     const tableRows = document.querySelectorAll('#table-body tr');
  //     if (rowIndex === tableRows.length) {
  //       createRow();
  //     }
  //   }
  // });
}

// small helper to escape HTML in suggestion items
function escapeHtml(str) {
  return String(str).replace(/[&"'<>]/g, (s) => ({ '&': '&amp;', '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;' }[s]));
}


// Function to enable the next row after current row
function enableNextRow(currentRowIndex) {
  const tableRows = document.querySelectorAll('#table-body tr');

  if (currentRowIndex < tableRows.length) {
    const nextRow = tableRows[currentRowIndex]; // 0-indexed
    const nextInput = nextRow.querySelector('.product-input');
    const nextQuantity = nextRow.querySelector('.quantity');

    if (nextInput) {
      nextInput.disabled = false;
    }
    if (nextQuantity) {
      nextQuantity.disabled = false;
    }
  }
}

// Function to disable all rows after a specific row
function disableRowsAfter(rowIndex) {
  const tableRows = document.querySelectorAll('#table-body tr');

  for (let i = rowIndex; i < tableRows.length; i++) {
    const row = tableRows[i];
    const input = row.querySelector('.product-input');
    const quantity = row.querySelector('.quantity');
    const sttCell = row.querySelector('.stt');

    if (input) {
      input.disabled = true;
      input.value = "";
      delete row.dataset.productIndex;
    }

    if (quantity) {
      quantity.disabled = true;
      if (quantity.value === "" && i > rowIndex) {
        quantity.value = "";
      }
    }

    if (sttCell && i > rowIndex) {
      sttCell.textContent = "";
    }

    // Clear code and unity for disabled rows (except current if it has product)
    if (i > rowIndex) {
      const code = row.querySelector('.code');
      const unity = row.querySelector('.unity');
      if (code) code.value = "";
      if (unity) unity.value = "";
    }
  }
}

// Modified generateRows to start with only first row enabled
function generateRows(numRows) {
  const tableBody = document.getElementById('table-body');
  if (!tableBody) return;

  tableBody.innerHTML = "";

  for (let i = 0; i < numRows; i++) {
    createRow();
  }
}

// Hook add-row button to create rows (visible on table hover)
const addRowBtn = document.getElementById('add-row-btn');
if (addRowBtn) {
  addRowBtn.addEventListener('click', () => {
    createRow();
  });
}

// Update suggestion lists and avoid showing already-selected products
function updateProductDropdowns() {
  // Collect selected indices
  const selectedIndices = new Set();
  document.querySelectorAll('#table-body tr').forEach(tr => {
    if (tr.dataset.productIndex) selectedIndices.add(tr.dataset.productIndex);
  });

  // Refresh visible suggestion lists (if user has typed in that row)
  document.querySelectorAll('.product-input').forEach(input => {
    const q = input.value.trim().toLowerCase();
    const sug = input.parentElement.querySelector('.suggestions');
    if (!q) {
      if (sug) {
        sug.style.display = 'none';
        sug.innerHTML = '';
      }
      return;
    }

    const matches = [];
    productData.forEach((p, idx) => {
      if (selectedIndices.has(String(idx)) && input.value !== p.productName) return;
      if (p.productName && p.productName.toLowerCase().includes(q)) matches.push({ productName: p.productName, index: idx });
    });

    if (sug) {
      sug.innerHTML = matches.slice(0, 12).map(i => {
        const p = productData[i.index] || {};
        const code = p.productCode || '';
        const unit = p.unit || '';
        return `<div class="suggestion-item" data-index="${i.index}"><div class="s-main">${escapeHtml(p.productName || '')}</div><div class="s-sub">${escapeHtml((code ? code : ''))}${code && unit ? ' • ' : ''}${escapeHtml(unit || '')}</div></div>`;
      }).join('');
      sug.style.display = matches.length ? 'block' : 'none';
    }
  });
}

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwfs4Y-7ql5qvunqdrU8ba4lbWZVF-KPmc0sE-ZtSjvF6_2NCWOlLySCapTclJkMyNo/exec'; // replace

async function gatherFormData() {
  const form = document.forms['PXK'];
  const payload = {};

  // Get all form elements by name
  const elements = form.elements;

  // Collect all named elements except table rows
  for (let element of elements) {
    const name = element.name;
    if (name && !['Tên sản phẩm', 'Mã hàng', 'Đơn vị tính', 'Số lượng'].includes(name)) {
      payload[name] = element.value.trim();
    }
  }

  // Collect product rows - FIXED to match Apps Script expectations
  const rows = [];
  const tableRows = document.querySelectorAll('#table-body tr');

  tableRows.forEach((tr, index) => {
    // Get elements by name within each row
    const nameInput = tr.querySelector('textarea[name="Tên sản phẩm"], input[name="Tên sản phẩm"]');
    const codeInput = tr.querySelector('input[name="Mã hàng"]');
    const unitInput = tr.querySelector('input[name="Đơn vị tính"]');
    const qtyInput = tr.querySelector('input[name="Số lượng"]');

    if (nameInput && qtyInput) {
      const productName = nameInput.value.trim();
      const qtyValue = qtyInput.value.trim();

      if (productName && qtyValue) {
        rows.push({
          'Tên hàng': productName,
          'Mã hàng': codeInput?.value.trim() || '',
          'Đơn vị': unitInput?.value.trim() || '',
          'Số lượng': qtyValue
        });
      }
    }
  });

  payload.rows = rows;

  // Debug log to see what's being sent
  console.log('Payload to send:', payload);
  console.log('Rows count:', rows.length);
  console.log('Rows data:', rows);

  return payload;
}


async function submitToSheet() {
  try {
    const payload = await gatherFormData();

    const body = JSON.stringify(payload);
    // Use no-cors to avoid preflight issues
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain'  // Use text/plain to avoid preflight
      },
      body: body
    });

    // With no-cors, we can't read the response, so assume success if no network error
    alert('✓ Gửi dữ liệu thành công!\n\nKiểm tra Google Sheet của bạn để xác nhận dữ liệu đã được lưu.');
  } catch (err) {
    alert('✗ Lỗi kết nối: ' + err.message);
  }
}

// --- Combined Save + Print Button ---
// Save first, then print, then clear and increment PXK
function clearFormForNext() {
  // clear top-level customer/transport fields
  const idsToClear = ['customer-name', 'customer-address', 'customer-tax', 'invoice-number', 'invoice-date', 'warehouse', 'batch', 'delivery-info', 'truck-number', 'driver-name'];
  idsToClear.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  // Clear product table rows but keep STT numbers
  const tableBody = document.getElementById('table-body');
  if (tableBody) {
    tableBody.innerHTML = '';
  }

  // set invoice date to today
  const dateInput = document.getElementById('invoice-date');
  if (dateInput) dateInput.value = new Date().toLocaleDateString('vi-VN');

  // DO NOT reset PXK number here - it's already updated in saveThenPrint
  // The PXK number should stay as the new incremented value
}

async function sendPayload(payload) {
  console.log('Sending payload to Apps Script:', payload);

  try {
    // First try with CORS if possible
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'cors', // Try with cors first
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (res && res.ok) {
      const text = await res.text();
      console.log('Response from Apps Script:', text);
      try {
        const json = JSON.parse(text);
        return { ok: true, json };
      } catch (e) {
        // Response is not JSON but might still be OK
        return { ok: true, json: null, text };
      }
    } else {
      throw new Error(res ? `HTTP ${res.status}` : 'No response');
    }
  } catch (err) {
    console.warn('CORS fetch failed, trying no-cors:', err);

    // Fallback: fire a no-cors request
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });
      // Wait a short moment to allow server to process
      await new Promise(r => setTimeout(r, 1500));
      console.log('No-cors request sent (optimistic)');
      return { ok: true, json: null, optimistic: true };
    } catch (err2) {
      console.error('No-cors also failed:', err2);
      return { ok: false, error: err2 };
    }
  }
}

async function saveThenPrint() {
  const payload = await gatherFormData();

  const result = await sendPayload(payload);
  if (!result.ok) {
    throw new Error(result.error ? result.error.toString() : 'Unknown error sending data');
  }

  // Data considered saved (either confirmed or optimistic). Now print and wait for afterprint
  await new Promise((resolve) => {
    let resolved = false;
    function onAfterPrint() {
      if (resolved) return;
      resolved = true;
      window.removeEventListener('afterprint', onAfterPrint);
      resolve();
    }

    // Some browsers may not fire afterprint reliably when invoked programmatically.
    // Use a timeout fallback as well.
    window.addEventListener('afterprint', onAfterPrint);
    window.print();
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        window.removeEventListener('afterprint', onAfterPrint);
        resolve();
      }
    }, 4000);
  });

  // After print is done, clear form and increment PXK
  currentPXKNumber = (typeof currentPXKNumber === 'number') ? currentPXKNumber + 1 : (parseInt(localStorage.getItem('lastPXKNumber') || '1') + 1);
  savePXKNumber();

  // IMPORTANT: Update the PXK input field IMMEDIATELY
  const pxkInput = document.querySelector('input[name="Số PXK"]');
  if (pxkInput) {
    pxkInput.value = 'PXK-' + formatPXKNumber(currentPXKNumber);
  }

  clearFormForNext();
}

// Wire up combined behavior to the print button (override inline onclick)
const printBtn = document.getElementById('print-button');
if (printBtn) {
  // remove inline onclick handler if present
  try { printBtn.onclick = null; } catch (e) { }
  printBtn.addEventListener('click', async (ev) => {
    ev.preventDefault();
    printBtn.disabled = true;
    try {
      await saveThenPrint();
    } catch (err) {
      console.error('Save+Print error:', err);
      alert('Lỗi khi lưu: ' + (err.message || err));
    } finally {
      printBtn.disabled = false;
    }
  });
}