var SPREADSHEET_ID = '16OR43vZDLEtjYTgyOdt3DM46PF0cjE-kyLH1YkqBFX0';
var MONTH_SHEET_NAME_RE = /^\d{2}-\d{4}$/;

var ORDER_COLUMNS = [
  ['orderCode', 'Ma don'],
  ['date', 'Ngay tao'],
  ['name', 'Khach hang'],
  ['email', 'Email'],
  ['phone', 'SDT'],
  ['courseTitle', 'Khoa/Goi'],
  ['amount', 'So tien'],
  ['status', 'Trang thai'],
  ['paymentMethod', 'Phuong thuc'],
  ['paidAt', 'Ngay thanh toan'],
  ['expiresAt', 'Han thanh toan'],
  ['sepayReferenceCode', 'Ma GD SePay'],
  ['courseSlug', 'Course slug'],
  ['paymentUrl', 'Link thanh toan']
];

function doGet() {
  return jsonResponse({
    ok: true,
    version: 'google-sheets-monthly-orders-v1-safe',
    sheetNamePattern: 'MM-yyyy',
    insertMode: 'new orders at row 2, existing orders updated in place'
  });
}

function doPost(e) {
  var lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    var body = parseRequestBody(e);
    assertWebhookSecret(body, e);

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (body.action === 'reset') {
      var resetResult = resetMonthlyOrders(ss, body.records || [], body.clearLegacyOrders !== false);
      return jsonResponse({
        ok: true,
        action: 'reset',
        months: resetResult.months,
        orders: resetResult.orders,
        skipped: resetResult.skipped
      });
    }

    var source = unwrapRecord(body);
    var entityType = String(firstValue(source.entityType, source.type, '')).toLowerCase();

    if (entityType && entityType !== 'order') {
      return jsonResponse({
        ok: true,
        skipped: true,
        reason: 'NON_ORDER_PAYLOAD_IGNORED',
        entityType: entityType
      });
    }

    var order = normalizeOrder(source);
    var result = upsertMonthlyOrder(ss, order);

    return jsonResponse({
      ok: true,
      action: result.action,
      sheet: result.sheetName,
      row: result.row,
      orderCode: order.orderCode
    });
  } catch (err) {
    return jsonResponse({
      ok: false,
      error: sanitizeError(err)
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (releaseErr) {
      // Ignore release errors after timeout or early Apps Script failures.
    }
  }
}

function parseRequestBody(e) {
  if (!e) {
    throw new Error('EMPTY_EVENT');
  }

  if (e.postData && e.postData.contents) {
    var rawBody = trimText(e.postData.contents);

    if (!rawBody) {
      throw new Error('EMPTY_BODY');
    }

    return JSON.parse(rawBody);
  }

  return e.parameter || {};
}

function assertWebhookSecret(body, e) {
  var expected = trimText(PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET') || '');

  if (!expected) {
    return;
  }

  var provided = trimText(firstValue(
    body && body.webhookSecret,
    body && body.secret,
    e && e.parameter && e.parameter.webhookSecret,
    e && e.parameter && e.parameter.secret,
    ''
  ));

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
  var orderCode = cleanText(firstValue(
    record.orderCode,
    record.dedupeKey,
    record['Ma don'],
    record['Order Code'],
    record.id,
    ''
  ));

  if (!orderCode) {
    throw new Error('MISSING_ORDER_CODE');
  }

  var rawDate = firstValue(record.date, record.createdAt, record['Ngay tao'], record['Created At'], '');
  var date = formatDisplayDate(rawDate || new Date());

  return {
    orderCode: orderCode,
    date: date,
    name: cleanText(firstValue(record.name, record.studentName, record.customerName, record['Khach hang'], '')),
    email: cleanText(firstValue(record.email, record.Email, record['Email'], '')),
    phone: cleanText(firstValue(record.phone, record.Phone, record['SDT'], '')),
    courseTitle: cleanText(firstValue(record.courseTitle, record.productName, record['Khoa/Goi'], record['Course Title'], '')),
    amount: normalizeAmount(firstValue(record.amount, record.Amount, record['So tien'], '')),
    status: cleanText(firstValue(record.status, record.paymentStatus, record['Trang thai'], record.Status, 'pending')),
    paymentMethod: cleanText(firstValue(record.paymentMethod, record['Phuong thuc'], record['Payment Method'], 'sepay')),
    paidAt: formatOptionalDisplayDate(firstValue(record.paidAt, record['Ngay thanh toan'], record['Paid At'], '')),
    expiresAt: formatOptionalDisplayDate(firstValue(record.expiresAt, record['Han thanh toan'], '')),
    sepayReferenceCode: cleanText(firstValue(record.sepayReferenceCode, record['Ma GD SePay'], '')),
    courseSlug: cleanText(firstValue(record.courseSlug, record['Course slug'], record['Course Slug'], '')),
    paymentUrl: cleanText(firstValue(record.paymentUrl, record['Link thanh toan'], record['Payment URL'], ''))
  };
}

function upsertMonthlyOrder(ss, order) {
  var existing = findExistingOrder(ss, order.orderCode);
  var values = buildOrderRow(order);

  if (existing) {
    existing.sheet.getRange(existing.row, 1, 1, ORDER_COLUMNS.length).setValues([values]);
    return {
      action: 'updated',
      sheetName: existing.sheet.getName(),
      row: existing.row
    };
  }

  var sheetName = getMonthSheetName(order.date);
  var sheet = ensureMonthSheet(ss, sheetName);
  sheet.insertRowBefore(2);
  sheet.getRange(2, 1, 1, ORDER_COLUMNS.length).setValues([values]);
  formatOrderSheet(sheet);

  return {
    action: 'inserted',
    sheetName: sheetName,
    row: 2
  };
}

function resetMonthlyOrders(ss, records, clearLegacyOrders) {
  var normalized = [];
  var skipped = 0;
  var i;

  for (i = 0; i < records.length; i += 1) {
    try {
      var source = unwrapRecord(records[i]);
      var entityType = String(firstValue(source.entityType, source.type, '')).toLowerCase();

      if (entityType && entityType !== 'order') {
        skipped += 1;
      } else {
        normalized.push(normalizeOrder(source));
      }
    } catch (err) {
      skipped += 1;
    }
  }

  var sheets = ss.getSheets();
  for (i = 0; i < sheets.length; i += 1) {
    if (MONTH_SHEET_NAME_RE.test(sheets[i].getName())) {
      sheets[i].clear();
      ensureHeader(sheets[i]);
    }
  }

  if (clearLegacyOrders) {
    markLegacyOrdersSheet(ss);
  }

  normalized.sort(function (a, b) {
    return parseOrderDate(b.date).getTime() - parseOrderDate(a.date).getTime();
  });

  var grouped = {};
  for (i = 0; i < normalized.length; i += 1) {
    var groupSheetName = getMonthSheetName(normalized[i].date);
    if (!grouped[groupSheetName]) {
      grouped[groupSheetName] = [];
    }
    grouped[groupSheetName].push(normalized[i]);
  }

  var sheetNames = Object.keys(grouped).sort(compareMonthSheetNamesDesc);
  for (i = 0; i < sheetNames.length; i += 1) {
    var currentSheetName = sheetNames[i];
    var sheet = ensureMonthSheet(ss, currentSheetName);
    var rows = [];
    var orders = grouped[currentSheetName];

    for (var rowIndex = 0; rowIndex < orders.length; rowIndex += 1) {
      rows.push(buildOrderRow(orders[rowIndex]));
    }

    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, ORDER_COLUMNS.length).setValues(rows);
    }

    formatOrderSheet(sheet);
  }

  return {
    months: sheetNames.length,
    orders: normalized.length,
    skipped: skipped
  };
}

function ensureMonthSheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  ensureHeader(sheet);
  return sheet;
}

function ensureHeader(sheet) {
  var headers = [];
  var i;

  for (i = 0; i < ORDER_COLUMNS.length; i += 1) {
    headers.push(ORDER_COLUMNS[i][1]);
  }

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
  var sheet = ss.getSheetByName('Orders');

  if (!sheet) {
    return;
  }

  sheet.clear();
  sheet.getRange(1, 1, 1, 2).setValues([['Trang thai', 'Da chuyen sang cac tab thang dang MM-yyyy']]);
  sheet.setFrozenRows(1);
}

function findExistingOrder(ss, orderCode) {
  var target = trimText(orderCode).toUpperCase();

  if (!target) {
    return null;
  }

  var sheets = ss.getSheets();

  for (var i = 0; i < sheets.length; i += 1) {
    var sheet = sheets[i];

    if (!MONTH_SHEET_NAME_RE.test(sheet.getName())) {
      continue;
    }

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      continue;
    }

    var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
      if (trimText(values[rowIndex][0]).toUpperCase() === target) {
        return {
          sheet: sheet,
          row: rowIndex + 2
        };
      }
    }
  }

  return null;
}

function buildOrderRow(order) {
  var row = [];

  for (var i = 0; i < ORDER_COLUMNS.length; i += 1) {
    row.push(order[ORDER_COLUMNS[i][0]] || '');
  }

  return row;
}

function getMonthSheetName(value) {
  var date = parseOrderDate(value);
  var month = twoDigits(date.getMonth() + 1);
  var year = String(date.getFullYear());
  return month + '-' + year;
}

function compareMonthSheetNamesDesc(left, right) {
  var leftParts = left.split('-');
  var rightParts = right.split('-');
  var leftValue = Number(leftParts[1]) * 100 + Number(leftParts[0]);
  var rightValue = Number(rightParts[1]) * 100 + Number(rightParts[0]);
  return rightValue - leftValue;
}

function parseOrderDate(value) {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'number') {
    return new Date(value);
  }

  var text = trimText(value);
  var vnMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/);

  if (vnMatch) {
    return new Date(
      Number(vnMatch[3]),
      Number(vnMatch[2]) - 1,
      Number(vnMatch[1]),
      Number(vnMatch[4] || 0),
      Number(vnMatch[5] || 0)
    );
  }

  var parsed = new Date(text);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  throw new Error('INVALID_ORDER_DATE');
}

function formatDisplayDate(value) {
  var date = parseOrderDate(value);
  var day = twoDigits(date.getDate());
  var month = twoDigits(date.getMonth() + 1);
  var year = String(date.getFullYear());
  var hour = twoDigits(date.getHours());
  var minute = twoDigits(date.getMinutes());
  return day + '/' + month + '/' + year + ' ' + hour + ':' + minute;
}

function formatOptionalDisplayDate(value) {
  var text = trimText(value);

  if (!text) {
    return '';
  }

  return formatDisplayDate(text);
}

function normalizeAmount(value) {
  if (typeof value === 'number') {
    return value;
  }

  var text = String(value || '').replace(/[^\d.-]/g, '');
  var amount = Number(text);

  if (isFinite(amount)) {
    return amount;
  }

  return '';
}

function firstValue() {
  for (var i = 0; i < arguments.length; i += 1) {
    var value = arguments[i];

    if (value !== undefined && value !== null && trimText(value) !== '') {
      return value;
    }
  }

  return '';
}

function cleanText(value) {
  return trimText(value);
}

function trimText(value) {
  return String(value || '').replace(/^\s+|\s+$/g, '');
}

function twoDigits(value) {
  var text = String(value);
  return text.length < 2 ? '0' + text : text;
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function sanitizeError(err) {
  var message = err && err.message ? String(err.message) : String(err);
  return message.replace(/https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec/g, '[apps-script-url]');
}
