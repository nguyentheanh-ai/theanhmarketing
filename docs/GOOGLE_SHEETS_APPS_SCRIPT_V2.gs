const SPREADSHEET_ID = '16OR43vZDLEtjYTgyOdt3DM46PF0cjE-kyLH1YkqBFX0';

const SCHEMAS = {
  order: {
    sheetName: 'Orders',
    keyColumn: 'orderCode',
    columns: [
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
      ['source', 'Nguồn'],
      ['syncedAt', 'Synced At'],
    ],
  },
  lead: {
    sheetName: 'Leads',
    keyColumn: 'leadId',
    columns: [
      ['leadId', 'Lead ID'],
      ['orderCode', 'Mã đơn'],
      ['date', 'Ngày tạo'],
      ['name', 'Khách hàng'],
      ['email', 'Email'],
      ['phone', 'SĐT'],
      ['courseTitle', 'Khóa/Gói'],
      ['saleStatus', 'Sale status'],
      ['paymentStatus', 'Payment status'],
      ['source', 'Nguồn'],
      ['landingPage', 'Landing page'],
      ['paymentPlan', 'Gói'],
      ['referrer', 'Referrer'],
      ['ipAddress', 'IP'],
      ['webLeadId', 'Web Lead ID'],
      ['note', 'Ghi chú'],
      ['syncedAt', 'Synced At'],
    ],
  },
};

function doGet() {
  return jsonResponse({
    ok: true,
    version: 'google-sheets-schema-v2',
    sheets: Object.keys(SCHEMAS).map(function (key) {
      return SCHEMAS[key].sheetName;
    }),
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const body = parseRequestBody(e);
    assertWebhookSecret(body, e);

    const source = unwrapRecord(body);
    const schemaKey = getSchemaKey(source);
    const schema = SCHEMAS[schemaKey];
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ensureSheet(ss, schema);

    if (body.action === 'reset') {
      const records = Array.isArray(body.records) ? body.records : [];
      const normalizedRecords = records.map(function (record) {
        return normalizeRecord(record, schemaKey);
      });
      resetSheet(sheet, schema, normalizedRecords);

      return jsonResponse({
        ok: true,
        action: 'reset',
        sheet: schema.sheetName,
        rows: normalizedRecords.length,
      });
    }

    const record = normalizeRecord(source, schemaKey);
    const result = upsertRecord(sheet, schema, record);

    return jsonResponse({
      ok: true,
      action: result.action,
      sheet: schema.sheetName,
      row: result.row,
      key: result.key,
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

    try {
      return JSON.parse(rawBody);
    } catch (err) {
      throw new Error('INVALID_JSON_BODY');
    }
  }

  if (e.parameter && Object.keys(e.parameter).length > 0) {
    return e.parameter;
  }

  throw new Error('EMPTY_BODY');
}

function assertWebhookSecret(body, e) {
  const scriptSecret = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');

  if (!scriptSecret) {
    return;
  }

  const receivedSecret = String(
    body.secret ||
      (body.record && body.record.secret) ||
      (body.order && body.order.secret) ||
      (body.lead && body.lead.secret) ||
      (e && e.parameter && e.parameter.secret) ||
      '',
  );

  if (receivedSecret !== scriptSecret) {
    throw new Error('UNAUTHORIZED');
  }

  delete body.secret;
}

function unwrapRecord(body) {
  return body.row || body.record || body.order || body.lead || body.data || body;
}

function getSchemaKey(record) {
  return String(record.entityType || '').toLowerCase() === 'lead' ? 'lead' : 'order';
}

function normalizeRecord(raw, schemaKey) {
  const record = {};
  Object.keys(raw || {}).forEach(function (key) {
    if (raw[key] !== undefined && raw[key] !== null) {
      record[key] = raw[key];
    }
  });

  if (schemaKey === 'lead') {
    record.leadId = pick(record, ['leadId', 'lead_id', 'id', 'dedupeKey', 'webLeadId', 'orderCode', 'email', 'phone']);
    record.orderCode = pick(record, ['orderCode', 'order_id', 'orderId']);
    record.date = pick(record, ['date', 'createdAt', 'created_at']);
    record.name = pick(record, ['name', 'fullName', 'customerName']);
    record.email = normalizeEmail(pick(record, ['email', 'customerEmail']));
    record.phone = normalizePhone(pick(record, ['phone', 'customerPhone', 'phoneNumber']));
    record.courseTitle = pick(record, ['courseTitle', 'course', 'courseName', 'product']);
    record.saleStatus = pick(record, ['saleStatus', 'sale_status', 'status']);
    record.paymentStatus = pick(record, ['paymentStatus', 'payment_status']);
    record.source = pick(record, ['source']) || 'Website';
    record.landingPage = pick(record, ['landingPage']);
    record.paymentPlan = pick(record, ['paymentPlan']);
    record.referrer = pick(record, ['referrer']);
    record.ipAddress = pick(record, ['ipAddress']);
    record.webLeadId = pick(record, ['webLeadId']);
    record.note = pick(record, ['note', 'need', 'message']);
    record.syncedAt = pick(record, ['syncedAt']) || new Date().toISOString();
    return record;
  }

  record.orderCode = pick(record, ['orderCode', 'order_id', 'orderId', 'dedupeKey', 'id']);
  record.date = pick(record, ['date', 'createdAt', 'created_at']);
  record.name = pick(record, ['name', 'studentName', 'customerName']);
  record.email = normalizeEmail(pick(record, ['email', 'customerEmail']));
  record.phone = normalizePhone(pick(record, ['phone', 'customerPhone', 'phoneNumber']));
  record.courseTitle = pick(record, ['courseTitle', 'course', 'courseName', 'product']);
  record.amount = pick(record, ['amount', 'total', 'price', 'paymentAmount']);
  record.status = pick(record, ['status', 'paymentStatus', 'payment_status']);
  record.paymentMethod = pick(record, ['paymentMethod', 'payment_method']);
  record.paidAt = pick(record, ['paidAt', 'paid_at']);
  record.expiresAt = pick(record, ['expiresAt', 'expires_at']);
  record.sepayReferenceCode = pick(record, ['sepayReferenceCode', 'sepay_reference_code']);
  record.courseSlug = pick(record, ['courseSlug', 'course_slug']);
  record.paymentUrl = pick(record, ['paymentUrl', 'payment_url']);
  record.source = pick(record, ['source']) || 'Website';
  record.syncedAt = pick(record, ['syncedAt']) || new Date().toISOString();

  return record;
}

function pick(record, keys) {
  for (let i = 0; i < keys.length; i += 1) {
    const value = record[keys[i]];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }

  return '';
}

function ensureSheet(ss, schema) {
  let sheet = ss.getSheetByName(schema.sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(schema.sheetName);
  }

  ensureFixedHeaders(sheet, schema);
  return sheet;
}

function ensureFixedHeaders(sheet, schema) {
  const headers = schema.columns.map(function (column) {
    return column[1];
  });
  const expectedColumnCount = headers.length;
  const maxColumns = sheet.getMaxColumns();

  if (maxColumns < expectedColumnCount) {
    sheet.insertColumnsAfter(maxColumns, expectedColumnCount - maxColumns);
  } else if (maxColumns > expectedColumnCount) {
    sheet.deleteColumns(expectedColumnCount + 1, maxColumns - expectedColumnCount);
  }

  sheet.getRange(1, 1, 1, expectedColumnCount).setValues([headers]);
  sheet.setFrozenRows(1);
}

function resetSheet(sheet, schema, records) {
  const rows = records.map(function (record) {
    return recordToRow(schema, record);
  });

  sheet.clearContents();
  ensureFixedHeaders(sheet, schema);

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, schema.columns.length).setValues(rows);
  }
}

function upsertRecord(sheet, schema, record) {
  const key = getRecordKey(schema, record);

  if (!key) {
    throw new Error('MISSING_UNIQUE_KEY');
  }

  const rowValues = recordToRow(schema, record);
  const keyColumnIndex = schema.columns.findIndex(function (column) {
    return column[0] === schema.keyColumn;
  }) + 1;
  const existingRow = findRowByValue(sheet, keyColumnIndex, key);

  if (existingRow > 1) {
    sheet.getRange(existingRow, 1, 1, schema.columns.length).setValues([rowValues]);
    return {
      action: 'updated',
      row: existingRow,
      key: key,
    };
  }

  sheet.appendRow(rowValues);

  return {
    action: 'inserted',
    row: sheet.getLastRow(),
    key: key,
  };
}

function getRecordKey(schema, record) {
  return String(record[schema.keyColumn] || record.dedupeKey || record.id || '').trim();
}

function recordToRow(schema, record) {
  return schema.columns.map(function (column) {
    return toCellValue(record[column[0]]);
  });
}

function findRowByValue(sheet, columnIndex, value) {
  if (columnIndex < 1 || sheet.getLastRow() < 2) {
    return -1;
  }

  const values = sheet.getRange(2, columnIndex, sheet.getLastRow() - 1, 1).getValues();
  const target = String(value || '').trim();

  for (let i = 0; i < values.length; i += 1) {
    if (String(values[i][0] || '').trim() === target) {
      return i + 2;
    }
  }

  return -1;
}

function toCellValue(value) {
  if (value === undefined || value === null) {
    return '';
  }

  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value) || typeof value === 'object') {
    return JSON.stringify(value);
  }

  return value;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function sanitizeError(err) {
  return err && err.message ? String(err.message).slice(0, 300) : String(err).slice(0, 300);
}
