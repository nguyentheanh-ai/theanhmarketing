const SPREADSHEET_ID = '16OR43vZDLEtjYTgyOdt3DM46PF0cjE-kyLH1YkqBFX0';

const MONTH_SHEET_NAME_RE = /^\d{2}-\d{4}$/;

const ORDER_COLUMNS = [
  ['orderCode', 'Mã đơn'],
  ['date', 'Ngày tạo'],
  ['name', 'Khách hàng'],
  ['email', 'Email'],
  ['phone', 'SĐT'],
  ['courseTitle', 'Khóa/Gói'],
  ['amount', 'Số tiền'],
  ['status', 'Trạng thái'],
  ['paymentMethod', 'Phương thức'],
  ['paidAt', 'Ngày thanh toán'],
  ['expiresAt', 'Hạn thanh toán'],
  ['sepayReferenceCode', 'Mã GD SePay'],
  ['courseSlug', 'Course slug'],
  ['paymentUrl', 'Link thanh toán'],
];

function doGet() {
  return jsonResponse({
    ok: true,
    version: 'google-sheets-monthly-orders-v1',
    sheetNamePattern: 'MM-yyyy',
    insertMode: 'new orders at row 2, existing orders updated in place',
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const body = parseRequestBody(e);
    assertWebhookSecret(body, e);

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (body.action === 'reset') {
      const result = resetMonthlyOrders(ss, body.records || [], body.clearLegacyOrders !== false);
      return jsonResponse({
        ok: true,
        action: 'reset',
        months: result.months,
        orders: result.orders,
        skipped: result.skipped,
      });
    }

    const source = unwrapRecord(body);
    const entityType = String(firstValue(source.entityType, source.type, '')).toLowerCase();

    if (entityType && entityType !== 'order') {
      return jsonResponse({
        ok: true,
        skipped: true,
        reason: 'NON_ORDER_PAYLOAD_IGNORED',
        entityType: entityType,
      });
    }

    const order = normalizeOrder(source);
    const result = upsertMonthlyOrder(ss, order);

    return jsonResponse({
      ok: true,
      action: result.action,
      sheet: result.sheetName,
      row: result.row,
      orderCode: order.orderCode,
    });
  } catch (err) {
    return jsonResponse({
      ok: false,
      error: sanitizeError(err),
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (err) {}
  }
}

function parseRequestBody(e) {
  if (!e) {
    throw new Error('EMPTY_EVENT');
  }

  if (e.postData && e.postData.contents) {
    const rawBody = String(e.postData.contents || '').trim();

    if (!rawBody) {
      throw new Error('EMPTY_BODY');
    }

    return JSON.parse(rawBody);
  }

  return e.parameter || {};
}

function assertWebhookSecret(body, e) {
  const expected = String(PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET') || '').trim();

  if (!expected) {
    return;
  }

  const provided = String(
    firstValue(
      body && body.webhookSecret,
      body && body.secret,
      e && e.parameter && e.parameter.webhookSecret,
      e && e.parameter && e.parameter.secret,
      '',
    ),
  ).trim();

  if (provided !== expected) {
    throw new Error('UNAUTHORIZED');
  }
}

function unwrapRecord(body) {
  if (body && typeof body === 'object' && body.payload && typeof body.payload === 'object') {
    return body.payload;
  }

  if (body && typeof body === 'object' && body.record && typeof body.record === 'object') {
    return body.record;
  }

  return body || {};
}

function normalizeOrder(record) {
  const orderCode = cleanText(
    firstValue(
      record.orderCode,
      record.dedupeKey,
      record['Mã đơn'],
      record['Ma don'],
      record['Order Code'],
      record.id,
      '',
    ),
  );

  if (!orderCode) {
    throw new Error('MISSING_ORDER_CODE');
  }

  const rawDate = firstValue(record.date, record.createdAt, record['Ngày tạo'], record['Ngay tao'], record['Created At'], '');
  const date = formatDisplayDate(rawDate || new Date());

  return {
    orderCode: orderCode,
    date: date,
    name: cleanText(firstValue(record.name, record.studentName, record.customerName, record['Khách hàng'], record['Khach hang'], '')),
    email: cleanText(firstValue(record.email, record.Email, record['Email'], '')),
    phone: cleanText(firstValue(record.phone, record.Phone, record['SĐT'], record['SDT'], '')),
    courseTitle: cleanText(firstValue(record.courseTitle, record.productName, record['Khóa/Gói'], record['Khoa/Goi'], record['Course Title'], '')),
    amount: normalizeAmount(firstValue(record.amount, record.Amount, record['Số tiền'], record['So tien'], '')),
    status: cleanText(firstValue(record.status, record.paymentStatus, record['Trạng thái'], record['Trang thai'], record.Status, 'pending')),
    paymentMethod: cleanText(firstValue(record.paymentMethod, record['Phương thức'], record['Phuong thuc'], record['Payment Method'], 'sepay')),
    paidAt: formatOptionalDisplayDate(firstValue(record.paidAt, record['Ngày thanh toán'], record['Ngay thanh toan'], record['Paid At'], '')),
    expiresAt: formatOptionalDisplayDate(firstValue(record.expiresAt, record['Hạn thanh toán'], record['Han thanh toan'], '')),
    sepayReferenceCode: cleanText(firstValue(record.sepayReferenceCode, record['Mã GD SePay'], record['Ma GD SePay'], '')),
    courseSlug: cleanText(firstValue(record.courseSlug, record['Course slug'], record['Course Slug'], '')),
    paymentUrl: cleanText(firstValue(record.paymentUrl, record['Link thanh toán'], record['Link thanh toan'], record['Payment URL'], '')),
  };
}

function upsertMonthlyOrder(ss, order) {
  const existing = findExistingOrder(ss, order.orderCode);
  const values = buildOrderRow(order);

  if (existing) {
    existing.sheet.getRange(existing.row, 1, 1, ORDER_COLUMNS.length).setValues([values]);
    return {
      action: 'updated',
      sheetName: existing.sheet.getName(),
      row: existing.row,
    };
  }

  const sheetName = getMonthSheetName(order.date);
  const sheet = ensureMonthSheet(ss, sheetName);
  sheet.insertRowBefore(2);
  sheet.getRange(2, 1, 1, ORDER_COLUMNS.length).setValues([values]);
  formatOrderSheet(sheet);

  return {
    action: 'inserted',
    sheetName: sheetName,
    row: 2,
  };
}

function resetMonthlyOrders(ss, records, clearLegacyOrders) {
  const normalized = [];
  let skipped = 0;

  records.forEach(function (item) {
    try {
      const source = unwrapRecord(item);
      const entityType = String(firstValue(source.entityType, source.type, '')).toLowerCase();

      if (entityType && entityType !== 'order') {
        skipped += 1;
        return;
      }

      normalized.push(normalizeOrder(source));
    } catch (err) {
      skipped += 1;
    }
  });

  const monthlySheets = ss.getSheets().filter(function (sheet) {
    return MONTH_SHEET_NAME_RE.test(sheet.getName());
  });

  monthlySheets.forEach(function (sheet) {
    sheet.clear();
    ensureHeader(sheet);
  });

  if (clearLegacyOrders) {
    markLegacyOrdersSheet(ss);
  }

  normalized.sort(function (a, b) {
    return parseOrderDate(b.date).getTime() - parseOrderDate(a.date).getTime();
  });

  const grouped = {};

  normalized.forEach(function (order) {
    const sheetName = getMonthSheetName(order.date);
    grouped[sheetName] = grouped[sheetName] || [];
    grouped[sheetName].push(order);
  });

  Object.keys(grouped)
    .sort(compareMonthSheetNamesDesc)
    .forEach(function (sheetName) {
      const sheet = ensureMonthSheet(ss, sheetName);
      const rows = grouped[sheetName].map(buildOrderRow);
      sheet.getRange(2, 1, rows.length, ORDER_COLUMNS.length).setValues(rows);
      formatOrderSheet(sheet);
    });

  return {
    months: Object.keys(grouped).length,
    orders: normalized.length,
    skipped: skipped,
  };
}

function ensureMonthSheet(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
  ensureHeader(sheet);
  return sheet;
}

function ensureHeader(sheet) {
  const headers = ORDER_COLUMNS.map(function (column) {
    return column[1];
  });

  if (sheet.getMaxColumns() < ORDER_COLUMNS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), ORDER_COLUMNS.length - sheet.getMaxColumns());
  }

  sheet.getRange(1, 1, 1, ORDER_COLUMNS.length).setValues([headers]);
  sheet.setFrozenRows(1);
}

function formatOrderSheet(sheet) {
  ensureHeader(sheet);
  sheet.getRange(1, 1, 1, ORDER_COLUMNS.length).setFontWeight('bold');
  sheet.getRange(1, 1, sheet.getMaxRows(), ORDER_COLUMNS.length).setWrap(false);
  sheet.autoResizeColumns(1, ORDER_COLUMNS.length);
}

function markLegacyOrdersSheet(ss) {
  const sheet = ss.getSheetByName('Orders');

  if (!sheet) {
    return;
  }

  sheet.clear();
  sheet.getRange(1, 1, 1, 2).setValues([['Trạng thái', 'Đã chuyển sang các tab tháng dạng MM-yyyy']]);
  sheet.setFrozenRows(1);
}

function findExistingOrder(ss, orderCode) {
  const target = String(orderCode || '').trim().toUpperCase();

  if (!target) {
    return null;
  }

  const monthlySheets = ss.getSheets().filter(function (sheet) {
    return MONTH_SHEET_NAME_RE.test(sheet.getName());
  });

  for (let i = 0; i < monthlySheets.length; i += 1) {
    const sheet = monthlySheets[i];
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      continue;
    }

    const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

    for (let rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
      if (String(values[rowIndex][0] || '').trim().toUpperCase() === target) {
        return {
          sheet: sheet,
          row: rowIndex + 2,
        };
      }
    }
  }

  return null;
}

function buildOrderRow(order) {
  return ORDER_COLUMNS.map(function (column) {
    return order[column[0]] || '';
  });
}

function getMonthSheetName(value) {
  const date = parseOrderDate(value);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return month + '-' + year;
}

function compareMonthSheetNamesDesc(left, right) {
  const leftParts = left.split('-');
  const rightParts = right.split('-');
  const leftValue = Number(leftParts[1]) * 100 + Number(leftParts[0]);
  const rightValue = Number(rightParts[1]) * 100 + Number(rightParts[0]);
  return rightValue - leftValue;
}

function parseOrderDate(value) {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'number') {
    return new Date(value);
  }

  const text = String(value || '').trim();
  const vnMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/);

  if (vnMatch) {
    return new Date(
      Number(vnMatch[3]),
      Number(vnMatch[2]) - 1,
      Number(vnMatch[1]),
      Number(vnMatch[4] || 0),
      Number(vnMatch[5] || 0),
    );
  }

  const parsed = new Date(text);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  throw new Error('INVALID_ORDER_DATE');
}

function formatDisplayDate(value) {
  const date = parseOrderDate(value);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return day + '/' + month + '/' + year + ' ' + hour + ':' + minute;
}

function formatOptionalDisplayDate(value) {
  const text = String(value || '').trim();

  if (!text) {
    return '';
  }

  return formatDisplayDate(text);
}

function normalizeAmount(value) {
  if (typeof value === 'number') {
    return value;
  }

  const text = String(value || '').replace(/[^\d.-]/g, '');
  const amount = Number(text);
  return Number.isFinite(amount) ? amount : '';
}

function firstValue() {
  for (let i = 0; i < arguments.length; i += 1) {
    const value = arguments[i];

    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }

  return '';
}

function cleanText(value) {
  return String(value || '').trim();
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function sanitizeError(err) {
  const message = err && err.message ? String(err.message) : String(err);
  return message.replace(/https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec/g, '[apps-script-url]');
}
