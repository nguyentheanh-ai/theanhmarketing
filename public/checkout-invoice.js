(function () {
  "use strict";

  var fieldNames = [
    "invoiceTaxCode",
    "invoiceCompanyName",
    "invoiceCompanyAddress",
    "invoiceEmail",
  ];

  var style = document.createElement("style");
  style.textContent =
    ".checkout-invoice{width:100%;margin-top:10px;text-align:left}" +
    ".checkout-invoice-toggle{display:flex!important;align-items:center;justify-content:center;gap:7px;margin:0!important;font-size:12px!important;font-weight:500!important;line-height:1.4;cursor:pointer;opacity:.82}" +
    ".checkout-invoice-toggle input{width:14px!important;height:14px!important;min-height:0!important;margin:0!important;padding:0!important;accent-color:currentColor}" +
    ".checkout-invoice-fields{display:grid;gap:10px;margin-top:12px}" +
    ".checkout-invoice-fields[hidden]{display:none!important}" +
    ".checkout-invoice-field{display:grid!important;gap:6px;margin:0!important;font-size:12px!important;font-weight:600!important}" +
    ".checkout-invoice-field input{width:100%;min-height:44px}";
  document.head.appendChild(style);

  function field(label, name, type, autocomplete, placeholder) {
    var wrapper = document.createElement("label");
    wrapper.className = "checkout-invoice-field";
    wrapper.textContent = label;

    var input = document.createElement("input");
    input.name = name;
    input.type = type || "text";
    input.autocomplete = autocomplete || "off";
    input.placeholder = placeholder;
    wrapper.appendChild(input);
    return wrapper;
  }

  function mount(form) {
    if (form.querySelector(".checkout-invoice")) return;

    var submit = form.querySelector('button[type="submit"], input[type="submit"]');
    if (!submit) return;

    var block = document.createElement("div");
    block.className = "checkout-invoice";
    block.innerHTML =
      '<label class="checkout-invoice-toggle">' +
      '<input type="checkbox" name="invoiceRequested" />' +
      '<span>Tôi cần xuất hóa đơn</span>' +
      "</label>";

    var fields = document.createElement("div");
    fields.className = "checkout-invoice-fields";
    fields.hidden = true;
    fields.appendChild(field("Mã số thuế", "invoiceTaxCode", "text", "off", "Ví dụ: 0101234567"));
    fields.appendChild(field("Tên doanh nghiệp", "invoiceCompanyName", "text", "organization", "Tên đầy đủ trên hóa đơn"));
    fields.appendChild(field("Địa chỉ doanh nghiệp", "invoiceCompanyAddress", "text", "street-address", "Địa chỉ trên hóa đơn"));
    fields.appendChild(field("Email nhận hóa đơn", "invoiceEmail", "email", "email", "ketoan@congty.vn"));
    block.appendChild(fields);
    submit.insertAdjacentElement("afterend", block);

    var toggle = block.querySelector('[name="invoiceRequested"]');
    toggle.addEventListener("change", function () {
      fields.hidden = !toggle.checked;
      fieldNames.forEach(function (name) {
        var input = form.elements[name];
        if (input) input.required = toggle.checked;
      });
    });
  }

  window.getInvoiceRequest = function (form) {
    var requested = Boolean(form && form.elements.invoiceRequested && form.elements.invoiceRequested.checked);
    function value(name) {
      return requested && form.elements[name] ? String(form.elements[name].value || "").trim() : "";
    }
    return {
      requested: requested,
      taxCode: value("invoiceTaxCode"),
      companyName: value("invoiceCompanyName"),
      companyAddress: value("invoiceCompanyAddress"),
      email: value("invoiceEmail"),
    };
  };

  function start() {
    document.querySelectorAll("form[data-invoice-checkout]").forEach(mount);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
