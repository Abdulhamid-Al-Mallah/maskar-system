/* pg-orders.js */
let _ordPage = 1,
   _ordSearch = "",
   _ordStatus = "ALL",
   _ordSortBy = "date_desc";

window.toggleOrdSort = function(col) {
  if (col === 'no') {
     _ordSortBy = (_ordSortBy === 'no_asc') ? 'no_desc' : 'no_asc';
  } else if (col === 'date') {
     _ordSortBy = (_ordSortBy === 'date_asc') ? 'date_desc' : 'date_asc';
  } else if (col === 'total') {
     _ordSortBy = (_ordSortBy === 'total_asc') ? 'total_desc' : 'total_asc';
  }
  _ordPage = 1;
  render_orders();
};
let _cart = [];

window.render_orders = async function () {
   await loadAllData();
   const pg = document.getElementById("page-orders");
   const modals = document.getElementById("modalContainer");
   const cur = APP.settings.defaultCurrency || "USD";

   let filtered = APP.orders.filter((o) => {
      if (_ordStatus !== "ALL" && o.status !== _ordStatus) return false;
      if (_ordSearch) {
         const q = _ordSearch.toLowerCase();
         const cust = APP.customers.find((c) => c.id === o.customerId);
         return (o.orderNumber || "").toLowerCase().includes(q) || (cust?.name || "").toLowerCase().includes(q);
      }
      return true;
   });

   // Sorting
   if (_ordSortBy === 'date_desc') {
      filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
   } else if (_ordSortBy === 'date_asc') {
      filtered.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
   } else if (_ordSortBy === 'no_desc') {
      filtered.sort((a, b) => (b.orderNumber || '').localeCompare(a.orderNumber || ''));
   } else if (_ordSortBy === 'no_asc') {
      filtered.sort((a, b) => (a.orderNumber || '').localeCompare(b.orderNumber || ''));
   } else if (_ordSortBy === 'total_desc') {
      filtered.sort((a, b) => (parseFloat(b.total) || 0) - (parseFloat(a.total) || 0));
   } else if (_ordSortBy === 'total_asc') {
      filtered.sort((a, b) => (parseFloat(a.total) || 0) - (parseFloat(b.total) || 0));
   }

   const pgData = paginate(filtered, _ordPage);
   _ordPage = pgData.page;

   pg.innerHTML = `
    <div class="page-header">
      <h1>${t("orders", "nav")}</h1>
      <button class="btn btn-gold" onclick="openOrderModal()">${ICONS.plus} ${t("New Order", "order")}</button>
    </div>
    <div class="card">
      <div class="filter-bar">
        <div class="form-group search-wrap" style="flex:2">${ICONS.search}
          <input type="text" id="ordSearch" placeholder="${t("search")}" value="${_ordSearch}">
        </div>
        <div class="form-group">
          <label>${t("status")}</label>
          <select id="ordStatusFilter">
            <option value="ALL">All</option>
            <option value="pending" ${_ordStatus === "pending" ? "selected" : ""}>Pending</option>
            <option value="processing" ${_ordStatus === "processing" ? "selected" : ""}>Processing</option>
            <option value="shipped" ${_ordStatus === "shipped" ? "selected" : ""}>Shipped</option>
            <option value="delivered" ${_ordStatus === "delivered" ? "selected" : ""}>Delivered</option>
            <option value="cancelled" ${_ordStatus === "cancelled" ? "selected" : ""}>Cancelled</option>
          </select>
      </div>
      <div class="table-container">
        <table class="data-table"><thead><tr>
          <th style="cursor:pointer; user-select:none;" onclick="window.toggleOrdSort('no')">${t("orderNo", "order")}${getHeaderArrow(_ordSortBy, 'no_asc', 'no_desc')}</th>
          <th style="cursor:pointer; user-select:none;" onclick="window.toggleOrdSort('date')">${t("date")}${getHeaderArrow(_ordSortBy, 'date_asc', 'date_desc')}</th>
          <th>${t("customer")}</th>
          <th style="cursor:pointer; user-select:none;" onclick="window.toggleOrdSort('total')">${t("total")}${getHeaderArrow(_ordSortBy, 'total_asc', 'total_desc')}</th>
          <th>${t("payment", "order")}</th>
          <th>${t("status")}</th>
          <th class="text-right">${t("actions")}</th>
        </tr></thead><tbody>
        ${
           pgData.items.length
              ? pgData.items
                   .map((o) => {
                      const cust = APP.customers.find((c) => c.id === o.customerId);
                      return `<tr>
            <td class="fw-700">${o.orderNumber || "-"}</td>
            <td class="text-muted">${fmtDate(o.createdAt)}</td>
            <td>${cust?.name || "-"}</td>
            <td class="text-gold fw-700">${fmt(o.total, "USD")}</td>
            <td><span class="badge badge-${o.paymentMethod || "cash"}">${t(o.paymentMethod || "cash", "order")}</span></td>
            <td><span class="badge badge-${o.status}">${t(o.status, "order")}</span></td>
            <td><div class="table-actions">
              <button class="btn-icon-only edit" onclick="openOrderModal('${o.id}')" title="Edit Order">${ICONS.edit}</button>
              <button class="btn-icon-only" onclick="printOrder('${o.id}')" title="Print">${ICONS.printer}</button>
              <button class="btn-icon-only delete" onclick="deleteOrder('${o.id}')">${ICONS.trash}</button>
            </div></td>
          </tr>`;
                   })
                   .join("")
              : `<tr><td colspan="7" class="empty-state">${t("noData")}</td></tr>`
        }
        </tbody></table>
      </div>
      ${renderPagination(pgData)}
    </div>`;

   const searchInput = document.getElementById("ordSearch");
   if (searchInput) {
      searchInput.addEventListener("input", async (e) => {
         _ordSearch = e.target.value;
         _ordPage = 1;
         await render_orders();
         const input = document.getElementById("ordSearch");
         if (input) {
            input.focus();
            const len = input.value.length;
            input.setSelectionRange(len, len);
         }
      });
   }
   document.getElementById("ordStatusFilter")?.addEventListener("change", (e) => {
      _ordStatus = e.target.value;
      _ordPage = 1;
      render_orders();
   });
   pg.querySelectorAll(".page-btn[data-p]").forEach((b) =>
      b.addEventListener("click", () => {
         _ordPage = parseInt(b.dataset.p);
         render_orders();
      }),
   );

   // Ensure modals
   if (!document.getElementById("orderModal")) {
      modals.insertAdjacentHTML(
         "beforeend",
         renderModal(
            "orderModal",
            t("newOrder", "order"),
            `
      <input type="hidden" id="omId">
      <div class="form-grid">
        <div class="form-group search-select-container" style="position: relative;">
          <label>${t("customer")}</label>
          <input type="text" id="omCustSearch" placeholder="Search by name or phone..." autocomplete="off">
          <input type="hidden" id="omCust">
          <div id="omCustDropdown" class="search-select-dropdown" style="display: none;"></div>
        </div>
        <div class="form-group"><label>${t("payment", "order")} Method</label>
          <select id="omPayment"><option value="cash">${t("cash", "order")}</option><option value="credit_card">${t("card", "order")}</option><option value="transfer">${t("transfer", "order")}</option></select>
        </div>
        <div class="form-group"><label>Payment Status</label>
          <select id="omPaymentStatus">
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div class="form-group"><label>${t("status")}</label>
          <select id="omStatus"><option value="pending">Pending</option><option value="processing" selected>Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option></select>
        </div>
        <div class="form-group"><label>Order Date & Time</label>
          <input id="omDate" type="datetime-local">
        </div>
        <div class="form-group"><label>${t("shipping", "order")} ($)</label><input id="omShipping" type="number" step="0.01" value="${APP.settings.shippingFee || 0}"></div>
        <div class="form-group"><label>${t("discount", "order")} ($)</label><input id="omDiscount" type="number" step="0.01" value="0"></div>
        <div class="form-group full-width"><label>${t("notes")}</label><textarea id="omNotes" rows="2"></textarea></div>
      </div>
      <h3 style="margin:16px 0 10px;font-size:0.9rem;color:var(--gold)">Cart Items</h3>
      <div id="omCart"></div>
      <button class="btn btn-outline btn-sm mt-16" onclick="addCartItem()">${ICONS.plus} Add Item</button>
      <div class="totals-block" id="omTotals"></div>`,
            `<button class="btn btn-outline" onclick="closeModal('orderModal')">${t("cancel")}</button>
       <button class="btn btn-gold" onclick="saveOrder()">${t("save")}</button>`,
            "lg",
         ),
      );
   }

   if (!document.getElementById("statusModal")) {
      modals.insertAdjacentHTML(
         "beforeend",
         renderModal(
            "statusModal",
            "Update Status",
            `
      <input type="hidden" id="smId">
      <div class="form-group"><label>${t("status")}</label>
        <select id="smStatus"><option value="pending">Pending</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select>
      </div>`,
            `<button class="btn btn-outline" onclick="closeModal('statusModal')">${t("cancel")}</button>
       <button class="btn btn-gold" onclick="saveOrderStatus()">${t("save")}</button>`,
            "sm",
         ),
      );
   }
};

window.openOrderModal = function (id) {
   const o = id ? APP.orders.find((x) => x.id === id) : null;
   _cart = o
      ? o.items.map((it) => ({ id: it.id, productId: it.productId, quantity: it.quantity, price: it.price }))
      : [{ id: uid(), productId: "", quantity: 1, price: 0 }];

   const titleEl = document.querySelector("#orderModal .modal-header h2");
   if (titleEl) {
      titleEl.textContent = o ? "Edit Order" : "New Order";
   }

   document.getElementById("omId").value = o?.id || "";
   const omCust = document.getElementById("omCust");
   const omCustSearch = document.getElementById("omCustSearch");
   const omCustDropdown = document.getElementById("omCustDropdown");

   omCust.value = o?.customerId || "";
   if (o?.customerId) {
      const cust = APP.customers.find((c) => c.id === o.customerId);
      omCustSearch.value = cust ? `${cust.name}${cust.phone ? ` (${cust.phone})` : ""}` : "";
   } else {
      omCustSearch.value = "";
   }

   // Setup Searchable Dropdown events
   omCustSearch.onfocus = () => {
      renderCustDropdown(omCustSearch.value);
      omCustDropdown.style.display = "block";
   };

   omCustSearch.oninput = (e) => {
      if (!e.target.value.trim()) {
         omCust.value = "";
      }
      renderCustDropdown(e.target.value);
   };

   omCustSearch.onchange = (e) => {
      if (!e.target.value.trim()) {
         omCust.value = "";
      }
   };

   function renderCustDropdown(query = "") {
      const q = query.toLowerCase().trim();
      const filtered = APP.customers.filter((c) => {
         const nameMatch = (c.name || "").toLowerCase().includes(q);
         const phoneMatch = (c.phone || "").toLowerCase().includes(q);
         return nameMatch || phoneMatch;
      });

      if (filtered.length === 0) {
         omCustDropdown.innerHTML = `<div class="search-select-item" style="cursor: default; color: var(--text-muted); justify-content: center;">No customers found</div>`;
      } else {
         omCustDropdown.innerHTML = filtered
            .map(
               (c) => `
        <div class="search-select-item" data-id="${c.id}" data-name="${c.name}" data-phone="${c.phone || ""}">
          <span class="name">${c.name}</span>
          ${c.phone ? `<span class="phone">${c.phone}</span>` : ""}
        </div>
      `,
            )
            .join("");
      }

      omCustDropdown.querySelectorAll(".search-select-item").forEach((item) => {
         if (item.dataset.id) {
            item.addEventListener("click", (e) => {
               e.stopPropagation();
               const id = item.dataset.id;
               const name = item.dataset.name;
               const phone = item.dataset.phone;
               omCust.value = id;
               omCustSearch.value = name + (phone ? ` (${phone})` : "");
               omCustDropdown.style.display = "none";
            });
         }
      });
   }

   // Handle click outside to close
   const closeDropdownHandler = (e) => {
      if (!e.target.closest(".search-select-container") && e.target !== omCustSearch && e.target !== omCustDropdown) {
         omCustDropdown.style.display = "none";
         const selectedId = omCust.value;
         if (selectedId) {
            const cust = APP.customers.find((c) => c.id === selectedId);
            omCustSearch.value = cust ? `${cust.name}${cust.phone ? ` (${cust.phone})` : ""}` : "";
         } else {
            omCustSearch.value = "";
         }
         document.removeEventListener("click", closeDropdownHandler);
      }
   };
   document.removeEventListener("click", closeDropdownHandler);
   document.addEventListener("click", closeDropdownHandler);

   document.getElementById("omPayment").value = o?.paymentMethod || "cash";
   const defaultPayStatus = o?.paymentStatus || (o?.status === "delivered" ? "paid" : o?.status === "pending" ? "pending" : "unpaid");
   document.getElementById("omPaymentStatus").value = defaultPayStatus;
   document.getElementById("omStatus").value = o?.status || "processing";
   document.getElementById("omShipping").value = o ? o.shipping : APP.settings.shippingFee || 0;
   document.getElementById("omDiscount").value = o ? o.discount : 0;
   document.getElementById("omNotes").value = o?.notes || "";

   const d = o?.createdAt ? new Date(o.createdAt) : new Date();
   const tzoffset = d.getTimezoneOffset() * 60000;
   const localISOTime = new Date(d - tzoffset).toISOString().slice(0, 16);
   document.getElementById("omDate").value = localISOTime;

   document.getElementById("omShipping")?.addEventListener("input", updateOrderTotals);
   document.getElementById("omDiscount")?.addEventListener("input", updateOrderTotals);

   renderCart();
   openModal("orderModal");
};

function renderCart() {
   const cur = APP.settings.defaultCurrency || "USD";
   const el = document.getElementById("omCart");
   el.innerHTML = _cart
      .map(
         (item, i) => `
    <div class="cart-item">
      <select class="cart-prod" data-i="${i}">
        <option value="">-- Product --</option>
        ${APP.products
           .filter((p) => p.published !== false)
           .map((p) => `<option value="${p.id}" ${p.id === item.productId ? "selected" : ""}>${getProductName(p)} (${p.stock || 0})</option>`)
           .join("")}
      </select>
      <input type="number" class="cart-qty" data-i="${i}" value="${item.quantity}" min="1" placeholder="Qty">
      <input type="number" class="cart-price" data-i="${i}" value="${item.price}" step="0.01" placeholder="Price">
      <button class="btn-icon-only delete" onclick="_cart.splice(${i},1);renderCart()">${ICONS.trash}</button>
    </div>`,
      )
      .join("");

   el.querySelectorAll(".cart-prod").forEach((s) =>
      s.addEventListener("change", (e) => {
         const i = parseInt(e.target.dataset.i);
         const prod = APP.products.find((p) => p.id === e.target.value);
         _cart[i].productId = e.target.value;
         _cart[i].price = prod?.price || 0;
         renderCart();
      }),
   );
   el.querySelectorAll(".cart-qty").forEach((inp) =>
      inp.addEventListener("input", (e) => {
         _cart[parseInt(e.target.dataset.i)].quantity = parseInt(e.target.value) || 1;
         updateOrderTotals();
      }),
   );
   el.querySelectorAll(".cart-price").forEach((inp) =>
      inp.addEventListener("input", (e) => {
         _cart[parseInt(e.target.dataset.i)].price = parseFloat(e.target.value) || 0;
         updateOrderTotals();
      }),
   );
   updateOrderTotals();
}

window.addCartItem = function () {
   _cart.push({ id: uid(), productId: "", quantity: 1, price: 0 });
   renderCart();
};

function updateOrderTotals() {
   const sub = _cart.reduce((s, it) => s + (it.quantity || 0) * (it.price || 0), 0);
   const ship = parseFloat(document.getElementById("omShipping")?.value) || 0;
   const disc = parseFloat(document.getElementById("omDiscount")?.value) || 0;
   const total = sub + ship - disc;
   document.getElementById("omTotals").innerHTML = `
    <div class="total-row"><span>${t("subtotal", "order")}</span><span>${fmt(sub, "USD")}</span></div>
    <div class="total-row"><span>${t("shipping", "order")}</span><span>${fmt(ship, "USD")}</span></div>
    <div class="total-row"><span>${t("discount", "order")}</span><span>-${fmt(disc, "USD")}</span></div>
    <div class="total-row grand"><span>${t("grandTotal", "order")}</span><span>${fmt(total, "USD")}</span></div>`;
}

window.saveOrder = async function () {
   const id = document.getElementById("omId").value;
   const validItems = _cart.filter((it) => it.productId);
   if (!validItems.length) return showToast("Add at least one product", "error");
   const sub = validItems.reduce((s, it) => s + (it.quantity || 0) * (it.price || 0), 0);
   const ship = parseFloat(document.getElementById("omShipping")?.value) || 0;
   const disc = parseFloat(document.getElementById("omDiscount")?.value) || 0;

   if (ship < 0) return showToast("Shipping fee cannot be negative", "error");
   if (disc < 0) return showToast("Discount cannot be negative", "error");

   const oldOrder = id ? APP.orders.find((o) => o.id === id) : null;

   for (const it of validItems) {
      if (it.quantity <= 0) return showToast("Quantity must be greater than 0", "error");
      if (it.price < 0) return showToast("Price cannot be negative", "error");

      const prod = APP.products.find((p) => p.id === it.productId);
      if (prod) {
         const oldItem = oldOrder ? oldOrder.items.find((oi) => oi.productId === it.productId) : null;
         const allocatedQty = oldItem ? oldItem.quantity : 0;
         const totalAvailable = (prod.stock || 0) + allocatedQty;
         if (it.quantity > totalAvailable) {
            return showToast(`Insufficient stock for ${getProductName(prod)}. Available: ${totalAvailable}, Requested: ${it.quantity}.`, "error");
         }
      }
   }

   const dateVal = document.getElementById("omDate").value;
   const createdAt = dateVal ? new Date(dateVal).toISOString() : new Date().toISOString();

   const order = {
      customerId: document.getElementById("omCust").value,
      status: document.getElementById("omStatus").value,
      paymentMethod: document.getElementById("omPayment").value,
      paymentStatus: document.getElementById("omPaymentStatus").value,
      items: validItems.map((it) => ({
         id: it.id || uid(),
         productId: it.productId,
         quantity: it.quantity,
         price: it.price,
         total: it.quantity * it.price,
      })),
      subtotal: sub,
      shipping: ship,
      discount: disc,
      total: sub + ship - disc,
      notes: document.getElementById("omNotes").value.trim(),
      createdAt: createdAt,
   };

   let res;
   if (id) {
      const oldOrder = APP.orders.find((o) => o.id === id);
      order.id = id;
      order.orderNumber = oldOrder?.orderNumber;
      res = await window.api.updateOrder(order);
   } else {
      res = await window.api.createOrder(order);
   }

   if (res.success) {
      closeModal("orderModal");
      showToast(id ? "Order updated" : "Order created");
      render_orders();
   } else {
      showToast(res.error || "Error", "error");
   }
};

window.editOrderStatus = function (id) {
   const o = APP.orders.find((x) => x.id === id);
   if (!o) return;
   document.getElementById("smId").value = id;
   document.getElementById("smStatus").value = o.status;
   openModal("statusModal");
};

window.saveOrderStatus = async function () {
   const id = document.getElementById("smId").value;
   const status = document.getElementById("smStatus").value;
   const o = APP.orders.find((x) => x.id === id);
   if (!o) return;
   o.status = status;
   if (status === "delivered") o.completedAt = new Date().toISOString();
   const res = await window.api.updateOrder(o);
   if (res.success) {
      closeModal("statusModal");
      showToast("Status updated");
      render_orders();
   } else showToast(res.error, "error");
};

window.deleteOrder = function (id) {
   confirmAction(t("confirm"), async () => {
      const res = await window.api.deleteOrder(id);
      if (res.success) {
         showToast("Order deleted (stock restored)");
         render_orders();
      } else showToast(res.error, "error");
   });
};

window.printOrder = async function (id) {
   const o = APP.orders.find((x) => x.id === id);
   if (!o) return;
   const cust = APP.customers.find((c) => c.id === o.customerId);
   const cur = APP.settings.defaultCurrency || "USD";
   const shopName = APP.settings.shopName || "MASKAR Perfume";
   const shopPhone = APP.settings.shopPhone || "";
   const shopAddr = APP.settings.shopAddress || "";

   const currObj = (APP.settings.currencies || []).find((c) => c.code === cur);
   const rate = currObj ? currObj.rate : 1;

   const formatBillCost = (val) => {
      const amt = (parseFloat(val) || 0) * rate;
      if (cur === "TRY") {
         return amt.toFixed(2).replace(".", ",") + " TL";
      }
      return "$" + amt.toFixed(2);
   };

   const getLocalizedPaymentStatus = () => {
      const statusVal = o.paymentStatus || (o.status === "delivered" ? "paid" : o.status === "pending" ? "pending" : "unpaid");

      const statusLabels = { paid: "Ödendi", unpaid: "Ödenmedi", pending: "Beklemede" };

      const statusStr = statusLabels[statusVal] || statusVal;

      return `${statusStr}`;
   };

   const getLocalizedOrderStatus = () => {
      const statusVal = o.status || "pending";
      const statusLabels = {
         pending: "Beklemede",
         processing: "Hazırlanıyor",
         shipped: "Kargoya Verildi",
         delivered: "Tamamlandı",
         cancelled: "İptal Edildi",
      };
      return statusLabels[statusVal] || statusVal;
   };

   let itemsHtml = o.items
      .map((it) => {
         const prod = APP.products.find((p) => p.id === it.productId);
         const pName = prod ? getProductName(prod, "tr") : "-";
         return `<tr>
      <td style="white-space: nowrap;">${pName}</td>
      <td style="text-align: center; white-space: nowrap;">${it.quantity}</td>
      <td style="text-align: right; white-space: nowrap;">${formatBillCost(it.price)}</td>
    </tr>`;
      })
      .join("");

   const bodyHtml = `
    <div dir="ltr">
      <h1>Maskar Perfume</h1>

      <h3>Sipariş ve Adres Bilgileri</h3>
      <table style="width: 100% !important;">
        <thead>
          <tr>
            <th style="width: fit-content; white-space: nowrap;">Sipariş Bilgileri</th>
            <th style="width: fit-content; white-space: nowrap;">Satıcı</th>
            <th style="width: auto;">Alıcı</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="width: fit-content; white-space: nowrap;">
              <strong>Sipariş No:</strong> ${o.orderNumber || "-"}<br>
              <strong>Sipariş Tarihi:</strong> ${fmtDate(o.createdAt)}<br>
              <strong>Ödeme Durumu:</strong> ${getLocalizedPaymentStatus()}<br>
              <strong>Sipariş Durumu:</strong> ${getLocalizedOrderStatus()}
            </td>
            <td style="width: fit-content; white-space: nowrap;">
              <strong>${shopName}</strong><br>
              ${shopPhone ? `<strong>Tel:</strong>${shopPhone}` : ""}
            </td>
            <td style="width: auto;">
              <div style="white-space: nowrap;"><strong>${cust?.name || "-"}</strong></div>
              ${cust?.address ? `<strong>Adres:</strong> ${cust.address}, ${cust.city || ""} ${cust.country || ""}<br>` : ""}
              ${cust?.phone ? `<div style="white-space: nowrap;"><strong>Tel:</strong> ${cust.phone}</div>` : ""}
            </td>
          </tr>
        </tbody>
      </table>

      <h3>Ürün Detayları</h3>
      <table style="width: 100% !important;">
        <thead>
          <tr>
            <th style="white-space: nowrap;">Ürün / Hizmet</th>
            <th style="text-align: center; width: 15%; white-space: nowrap;">Adet</th>
            <th style="text-align: right; width: 25%; white-space: nowrap;">Birim Fiyat</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <h3>Toplam Tutar</h3>
      <table style="width: 100% !important;">
        <thead>
          <tr>
            <th style="white-space: nowrap;">Açıklama</th>
            <th style="text-align: right; width: 25%; white-space: nowrap;">Tutar</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="white-space: nowrap;"><strong>Ara toplam</strong></td>
            <td style="text-align: right; white-space: nowrap;">${formatBillCost(o.subtotal || 0)}</td>
          </tr>
          <tr>
            <td style="white-space: nowrap;"><strong>Kargo ücreti</strong></td>
            <td style="text-align: right; white-space: nowrap;">${formatBillCost(o.shipping || 0)}</td>
          </tr>
          ${
             o.discount
                ? `
          <tr>
            <td style="white-space: nowrap;"><strong>İndirim</strong></td>
            <td style="text-align: right; white-space: nowrap;">-${formatBillCost(o.discount)}</td>
          </tr>
          `
                : ""
          }
          <tr>
            <td style="white-space: nowrap;"><strong>Genel toplam</strong></td>
            <td style="text-align: right; white-space: nowrap;"><strong>${formatBillCost(o.total || 0)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>`;

   const res = await window.api.printInvoice({ bodyHtml, defaultName: `Makbuz_${o.orderNumber || "order"}.pdf` });
   if (res.success) showToast("Invoice saved!");
   else if (res.reason !== "canceled") showToast(res.error || "Failed", "error");
};
