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

// Function to create a new row
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

  row.innerHTML = `
        <td class="stt">${rowIndex}</td>
        <td>
            <select class="product-select" name="Tên sản phẩm">
                ${productOptions}
            </select>
        </td>
        <td><input type="text" class="code" name="Mã hàng" readonly></td>
        <td><input type="text" class="unity" name="Đơn vị tính" readonly></td>
        <td><input type="text" class="quantity" name="Số lượng" min="1"></td>
    `;

  tableBody.appendChild(row);
  attachRowEvents(row, rowIndex);
}

// Add behavior to product select
function attachRowEvents(row, rowIndex) {
  const select = row.querySelector('.product-select');
  const code = row.querySelector('.code');
  const unity = row.querySelector('.unity');
  const quantity = row.querySelector('.quantity');

  select.addEventListener('change', () => {
    const selectedIndex = select.value;

    if (selectedIndex === "") {
      code.value = "";
      unity.value = "";
      quantity.value = "";
    } else if (productData && productData[selectedIndex]) {
      const product = productData[selectedIndex];
      code.value = product.productCode || "";
      unity.value = product.unit || "";
      quantity.value = "";

      // Create new row if this is the last one
      const tableRows = document.querySelectorAll('#table-body tr');
      if (rowIndex === tableRows.length) {
        createRow(rowIndex + 1);
      }
    }

    // Update visibility of all dropdowns
    updateProductDropdowns();
  });

  quantity.addEventListener('input', () => {
    const tableRows = document.querySelectorAll('#table-body tr');
    if (quantity.value.trim() && rowIndex === tableRows.length) {
      createRow(rowIndex + 1);
    }
  });
}

// Function to hide already-selected products from other dropdowns
function updateProductDropdowns() {
  const allSelects = document.querySelectorAll('.product-select');
  const selectedIndices = new Set();

  // Collect all selected product indices
  allSelects.forEach(select => {
    if (select.value !== "") {
      selectedIndices.add(select.value);
    }
  });

  // Update visibility for each dropdown
  allSelects.forEach(select => {
    const currentValue = select.value;
    Array.from(select.options).forEach(option => {
      if (option.value === "") return; // Keep empty option visible
      // Hide option if it's selected in another dropdown, but show it if it's the current one
      option.hidden = selectedIndices.has(option.value) && option.value !== currentValue;
    });
  });
}


const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_DEPLOY_ID/exec'; // replace

async function gatherFormData() {
  // gather top-level fields by element IDs in your `index.html`
  const data = {
    'Số PXK': document.getElementById('pxk-number').value,
    'Tên khách': document.getElementById('customer-name').value,
    'Đơn vị': document.getElementById('customer-company').value,
    'Địa chỉ': document.getElementById('customer-address').value,
    'MST khách': document.getElementById('customer-tax').value,
    'Ngày lập phiếu': document.getElementById('invoice-date').value,
    'TTGH': document.getElementById('delivery-info').value,
    'Số xe': document.getElementById('truck-number').value,
    'Tài xế': document.getElementById('driver-name').value,
    // rows below
    rows: []
  };

  // gather table rows from table body with id="table-body"
  const tbody = document.getElementById('table-body');
  if (tbody) {
    Array.from(tbody.querySelectorAll('tr')).forEach((tr, index) => {
      const cells = tr.querySelectorAll('input, textarea, select');
      // depends on how rows are structured; adjust indexes
      const rowObj = {
        stt: index + 1,
        name: tr.querySelector('.prodName') ? tr.querySelector('.prodName').value : (cells[0] && cells[0].value) || '',
        code: tr.querySelector('.code') ? tr.querySelector('.code').value : (cells[1] && cells[1].value) || '',
        unit: tr.querySelector('.unit') ? tr.querySelector('.unit').value : (cells[2] && cells[2].value) || '',
        qty: tr.querySelector('.qty') ? tr.querySelector('.qty').value : (cells[3] && cells[3].value) || ''
      };
      data.rows.push(rowObj);
    });
  }

  return data;
}

async function submitToSheet() {
  try {
    const payload = await gatherFormData();
    // optional: add a secret token if your Apps Script checks it
    // payload.secret = 'SOME_SECRET';

    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.result === 'success') {
      alert('Gửi dữ liệu thành công!');
    } else {
      alert('Lỗi gửi dữ liệu: ' + (result.error || JSON.stringify(result)));
    }
  } catch (err) {
    alert('Lỗi kết nối: ' + err.message);
  }
}

// Example: wire up submit button
document.getElementById('select-file-button').addEventListener('click', function () {
  // If this button should upload Excel locally, keep existing behavior.
  // Otherwise, use a dedicated "Send" button. For demonstration:
  submitToSheet();
});