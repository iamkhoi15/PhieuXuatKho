const form = document.forms['PXK'];
let productData = [];
let currentPXKNumber = 1;

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

// Fetch the product data
fetch('dssp.json')
  .then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json();
  })
  .then(data => {
    productData = data;
    console.log('Loaded products:', productData.length);

    generateRows(12);
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

// Function to generate rows
function generateRows(numRows) {
  const tableBody = document.getElementById('table-body');
  if (!tableBody) return;

  tableBody.innerHTML = "";

  for (let i = 0; i < numRows; i++) {
    createRow(i + 1);
  }
}

function createRow(rowIndex) {
  if (rowIndex > 12) return;

  const tableBody = document.getElementById('table-body');
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
        <td>
            <select class="product-select" name="Tên sản phẩm" ${rowIndex > 1 ? 'disabled' : ''}>
                ${productOptions}
            </select>
        </td>
        <td><input type="text" class="code" name="Mã hàng" readonly></td>
        <td><input type="text" class="unity" name="Đơn vị tính" readonly></td>
        <td><input type="text" class="quantity" name="Số lượng" min="1" ${rowIndex > 1 ? 'disabled' : ''}></td>
    `;

  tableBody.appendChild(row);
  attachRowEvents(row, rowIndex);
}

// Add behavior to product select
function attachRowEvents(row, rowIndex) {
  const sttCell = row.querySelector('.stt');
  const select = row.querySelector('.product-select');
  const code = row.querySelector('.code');
  const unity = row.querySelector('.unity');
  const quantity = row.querySelector('.quantity');

  select.addEventListener('change', () => {
    const selectedIndex = select.value;

    if (selectedIndex === "") {
      // Clear row and hide STT
      sttCell.textContent = "";
      code.value = "";
      unity.value = "";
      quantity.value = "";

      // If clearing the current row, disable next rows
      disableRowsAfter(rowIndex);
    } else if (productData && productData[selectedIndex]) {
      const product = productData[selectedIndex];
      // Show STT only when product is selected
      sttCell.textContent = rowIndex;
      code.value = product.productCode || "";
      unity.value = product.unit || "";
      quantity.value = "";

      // Enable quantity input for this row
      if (quantity) quantity.disabled = false;

      // Create new row if this is the last one
      const tableRows = document.querySelectorAll('#table-body tr');
      if (rowIndex === tableRows.length) {
        createRow(rowIndex + 1);
      }

      // Enable the NEXT row's select if it exists
      enableNextRow(rowIndex);
    }

    // Update visibility of all dropdowns
    updateProductDropdowns();
  });

  quantity.addEventListener('input', () => {
    const qtyValue = quantity.value.trim();

    if (qtyValue) {
      // Create new row if this is the last one AND has quantity
      const tableRows = document.querySelectorAll('#table-body tr');
      if (rowIndex === tableRows.length) {
        createRow(rowIndex + 1);
      }
    }
  });
}

// Function to enable the next row after current row
function enableNextRow(currentRowIndex) {
  const tableRows = document.querySelectorAll('#table-body tr');

  if (currentRowIndex < tableRows.length) {
    const nextRow = tableRows[currentRowIndex]; // 0-indexed
    const nextSelect = nextRow.querySelector('.product-select');
    const nextQuantity = nextRow.querySelector('.quantity');

    if (nextSelect) {
      nextSelect.disabled = false;
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
    const select = row.querySelector('.product-select');
    const quantity = row.querySelector('.quantity');
    const sttCell = row.querySelector('.stt');

    if (select) {
      select.disabled = true;
      if (select.value === "") {
        select.value = "";
      }
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
    createRow(i + 1);
  }
}

// Modified updateProductDropdowns to consider disabled state
function updateProductDropdowns() {
  const allSelects = document.querySelectorAll('.product-select:not([disabled])');
  const selectedIndices = new Set();

  // Collect all selected product indices from ENABLED selects
  document.querySelectorAll('.product-select').forEach(select => {
    if (select.value !== "") {
      selectedIndices.add(select.value);
    }
  });

  // Update visibility for each ENABLED dropdown
  allSelects.forEach(select => {
    const currentValue = select.value;
    Array.from(select.options).forEach(option => {
      if (option.value === "") return; // Keep empty option visible
      // Hide option if it's selected in another dropdown, but show it if it's the current one
      option.hidden = selectedIndices.has(option.value) && option.value !== currentValue;
    });
  });
}

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxuW5MCct2gTdNBvKQjgg7fHblkEHjBxtpldOeIIxhyiUxy6ZWcpvYIhisY3dPrywFA/exec'; // replace

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

  // Collect product rows
  const rows = [];
  const tableRows = document.querySelectorAll('#table-body tr');

  tableRows.forEach((tr, index) => {
    // Get elements by name within each row
    const nameSelect = tr.querySelector('select[name="Tên sản phẩm"]');
    const codeInput = tr.querySelector('input[name="Mã hàng"]');
    const unitInput = tr.querySelector('input[name="Đơn vị tính"]');
    const qtyInput = tr.querySelector('input[name="Số lượng"]');

    if (nameSelect && qtyInput) {
      const productName = nameSelect.selectedIndex > 0 ? nameSelect.options[nameSelect.selectedIndex].text : '';
      const qtyValue = qtyInput.value.trim();

      if (productName && qtyValue) {
        rows.push({
          STT: index + 1,
          Tên: productName,
          Mã: codeInput?.value || '',
          Đvị: unitInput?.value || '',
          SL: qtyValue
        });
      }
    }
  });

  payload.rows = rows;
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
  const idsToClear = ['customer-name', 'customer-company', 'customer-address', 'customer-tax', 'invoice-number', 'invoice-date-2', 'warehouse', 'batch', 'delivery-info', 'truck-number', 'driver-name'];
  idsToClear.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  // Clear product table rows but keep STT numbers
  const tableBody = document.getElementById('table-body');
  if (tableBody) {
    tableBody.innerHTML = '';
    // Regenerate rows with only first row enabled
    generateRows(12);
  }

  // set invoice date to today
  const dateInput = document.getElementById('invoice-date');
  if (dateInput) dateInput.value = new Date().toLocaleDateString('vi-VN');

  // DO NOT reset PXK number here - it's already updated in saveThenPrint
  // The PXK number should stay as the new incremented value
}

async function sendPayload(payload) {
  // Try normal CORS fetch first so we can read the response
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res && res.ok) {
      const json = await res.json().catch(() => null);
      return { ok: true, json };
    }
    // If response exists but not ok, throw to go to fallback
    throw new Error(res ? `HTTP ${res.status}` : 'No response');
  } catch (err) {
    // Fallback: fire a no-cors request (opaque) and optimistically assume success
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });
      // Wait a short moment to allow server to process
      await new Promise(r => setTimeout(r, 1000));
      return { ok: true, json: null, optimistic: true };
    } catch (err2) {
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