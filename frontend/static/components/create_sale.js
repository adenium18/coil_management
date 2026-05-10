export default {
  name: "CreateSaleOrder",
  template: `
  <div class="page-wrapper" style="max-width:960px;">

    <div class="page-header">
      <div>
        <h1 class="page-title">New Sale Order</h1>
        <p class="page-sub">Fill in customer details and add coil groups below.</p>
      </div>
      <button class="btn btn-outline-secondary" @click="$router.push('/view_all_orders')">
        <i class="bi bi-arrow-left me-1"></i>Back
      </button>
    </div>

    <!-- Customer section -->
    <div class="card mb-4">
      <div class="card-header">
        <h5 class="mb-0"><i class="bi bi-person me-2 text-primary"></i>Customer</h5>
      </div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-8">
            <label class="form-label">Customer Name <span class="text-danger">*</span></label>
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-search"></i></span>
              <input class="form-control" v-model="partyName" @input="onPartyInput"
                     placeholder="Type name to search or create new customer…" autocomplete="off" />
              <button v-if="partyName" type="button" class="btn btn-outline-secondary"
                      @click="clearCustomer" title="Clear">
                <i class="bi bi-x"></i>
              </button>
            </div>
            <!-- Suggestion dropdown -->
            <div v-if="customerSuggestions.length" class="customer-suggestions">
              <div v-for="c in customerSuggestions" :key="c.id"
                   class="customer-suggestion-item" @click="selectCustomer(c)">
                <div class="fw-semibold">{{ c.name }}</div>
                <div class="text-muted small">{{ c.phone || 'No phone' }}</div>
              </div>
              <div class="customer-suggestion-item customer-suggestion-item--new"
                   @click="confirmNewCustomer">
                <i class="bi bi-plus-circle me-1"></i>
                Create "<strong>{{ partyName }}</strong>" as new customer
              </div>
            </div>
          </div>
          <div class="col-md-4" v-if="selectedCustomer">
            <div class="customer-chip">
              <div class="customer-chip__avatar">{{ (selectedCustomer.name||'?')[0].toUpperCase() }}</div>
              <div>
                <div class="fw-semibold">{{ selectedCustomer.name }}</div>
                <div class="text-muted small">{{ selectedCustomer.phone || 'No phone' }}</div>
              </div>
              <span class="badge bg-success ms-auto">Selected</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Coil Groups -->
    <div v-for="(group, gIdx) in coilGroups" :key="gIdx" class="card mb-4">
      <div class="card-header d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center gap-2">
          <span class="fw-semibold">Coil Group #{{ gIdx + 1 }}</span>
          <!-- Stock status badge -->
          <span v-if="group.selectedCoilId && group.stockInfo" class="stock-badge"
                :class="groupStockClass(gIdx)">
            <i class="bi" :class="groupStockIcon(gIdx)"></i>
            {{ group.stockInfo.remaining_length }} m available
          </span>
          <span v-if="group.selectedCoilId && group.loadingStock" class="text-muted small">
            <span class="spinner-border spinner-border-sm me-1"></span>Loading stock…
          </span>
        </div>
        <button v-if="coilGroups.length > 1" class="btn btn-outline-danger btn-sm"
                @click="removeCoilGroup(gIdx)">
          <i class="bi bi-x-lg me-1"></i>Remove
        </button>
      </div>

      <div class="card-body">
        <!-- Coil & product selectors -->
        <div class="row g-3 mb-3">
          <div class="col-md-6">
            <label class="form-label">Coil <span class="text-danger">*</span></label>
            <select class="form-select" v-model="group.selectedCoilId"
                    @change="onCoilChange(gIdx)">
              <option disabled value="">— Select Coil —</option>
              <option v-for="c in coils" :key="c.id" :value="c.id">
                {{ c.coil_number }} — {{ c.make }} {{ c.color ? '(' + c.color + ')' : '' }}
              </option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label">Product <span class="text-danger">*</span></label>
            <select class="form-select" v-model="group.selectedProductId"
                    @change="onProductChange(gIdx)"
                    :disabled="!group.selectedCoilId">
              <option disabled value="">— Select Product —</option>
              <option v-for="p in group.filteredProducts" :key="p.id" :value="p.id">
                {{ p.make }} – {{ p.type }} – {{ p.color }}
              </option>
            </select>
            <div class="form-text text-warning" v-if="group.selectedCoilId && !group.filteredProducts.length && !group.loadingStock">
              <i class="bi bi-exclamation-triangle me-1"></i>No products linked to this coil.
            </div>
          </div>
        </div>

        <!-- Live stock panel -->
        <div v-if="group.stockInfo" class="stock-panel mb-3"
             :class="groupStockClass(gIdx) + '-panel'">
          <div class="stock-panel__row">
            <div class="stock-panel__stat">
              <div class="stock-panel__val">{{ group.stockInfo.original_length }} m</div>
              <div class="stock-panel__lbl">Original</div>
            </div>
            <div class="stock-panel__stat">
              <div class="stock-panel__val text-warning">{{ group.stockInfo.used_length }} m</div>
              <div class="stock-panel__lbl">Already Used</div>
            </div>
            <div class="stock-panel__stat">
              <div class="stock-panel__val" :class="stockValClass(group.stockInfo.remaining_length)">
                {{ group.stockInfo.remaining_length }} m
              </div>
              <div class="stock-panel__lbl">Available</div>
            </div>
            <div class="stock-panel__stat">
              <div class="stock-panel__val" :class="orderedExceedsStock(gIdx) ? 'text-danger fw-bold' : 'text-primary fw-bold'">
                {{ groupOrderedLength(gIdx).toFixed(2) }} m
              </div>
              <div class="stock-panel__lbl">This Order</div>
            </div>
          </div>

          <!-- Progress bar -->
          <div class="stock-bar mt-2">
            <div class="stock-bar__used"
                 :style="{ width: usedPct(group.stockInfo) + '%' }"></div>
            <div class="stock-bar__ordered"
                 :class="orderedExceedsStock(gIdx) ? 'stock-bar__ordered--over' : ''"
                 :style="{ width: Math.min(orderedPct(gIdx, group.stockInfo), 100 - usedPct(group.stockInfo)) + '%' }">
            </div>
          </div>
          <div class="d-flex justify-content-between mt-1" style="font-size:11px; color:var(--text-muted);">
            <span>0 m</span><span>{{ group.stockInfo.original_length }} m</span>
          </div>

          <!-- Stock warning -->
          <div v-if="orderedExceedsStock(gIdx)" class="stock-error mt-2">
            <i class="bi bi-exclamation-triangle-fill me-1"></i>
            <strong>Stock exceeded!</strong> Ordered {{ groupOrderedLength(gIdx).toFixed(2) }} m but only
            {{ group.stockInfo.remaining_length }} m available.
            Reduce quantities before confirming.
          </div>
          <div v-else-if="group.stockInfo.remaining_length <= 50 && group.stockInfo.remaining_length > 0" class="stock-warning mt-2">
            <i class="bi bi-exclamation-circle me-1"></i>
            Low stock — only {{ group.stockInfo.remaining_length }} m remaining after this order.
          </div>
        </div>

        <!-- Items table -->
        <div class="table-responsive">
          <table class="table table-bordered align-middle mb-0">
            <thead class="table-head-accent">
              <tr>
                <th style="width:28%">Length (m) <span class="text-danger">*</span></th>
                <th style="width:18%">Qty <span class="text-danger">*</span></th>
                <th style="width:22%">Rate (₹/m) <span class="text-danger">*</span></th>
                <th style="width:22%">Amount (₹)</th>
                <th style="width:10%"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in group.items" :key="idx">
                <td>
                  <input type="number" class="form-control form-control-sm"
                         v-model.number="item.length"
                         @input="onItemChange(gIdx, idx)"
                         :class="item.length > 0 && orderedExceedsStock(gIdx) ? 'is-invalid' : ''"
                         placeholder="e.g. 10.5" step="0.01" min="0.01" />
                </td>
                <td>
                  <input type="number" class="form-control form-control-sm"
                         v-model.number="item.quantity"
                         @input="onItemChange(gIdx, idx)"
                         placeholder="pcs" min="1" />
                </td>
                <td>
                  <input type="number" class="form-control form-control-sm"
                         v-model.number="item.rate"
                         @input="onItemChange(gIdx, idx)"
                         :placeholder="group.selectedProduct ? group.selectedProduct.rate : '0'"
                         min="0" step="0.01" />
                </td>
                <td class="fw-semibold text-success">
                  ₹ {{ fmt(item.amount) }}
                </td>
                <td class="text-center">
                  <button class="btn btn-sm btn-outline-danger" @click="removeItem(gIdx, idx)"
                          :disabled="group.items.length === 1" title="Remove row">
                    <i class="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="d-flex justify-content-between align-items-center mt-3">
          <button class="btn btn-outline-secondary btn-sm" @click="addBlankItem(gIdx)">
            <i class="bi bi-plus me-1"></i>Add Row
          </button>
          <div class="text-end">
            <span class="text-muted small me-2">Group subtotal:</span>
            <span class="fw-bold text-primary">₹ {{ fmt(groupSubtotal(gIdx)) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Add coil group -->
    <div class="mb-4">
      <button class="btn btn-outline-primary" @click="addCoilGroup">
        <i class="bi bi-plus-circle me-1"></i>Add Another Coil Group
      </button>
    </div>

    <!-- Order summary & submit -->
    <div class="card">
      <div class="card-body">
        <div class="row g-3 align-items-center">
          <div class="col-md-8">
            <div class="d-flex gap-4 flex-wrap">
              <div>
                <div class="text-muted small">Grand Total</div>
                <div class="fs-4 fw-bold text-success">₹ {{ fmt(totalAmount) }}</div>
              </div>
              <div v-if="hasStockErrors" class="d-flex align-items-center text-danger">
                <i class="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
                <span class="small fw-semibold">Fix stock errors before confirming</span>
              </div>
            </div>
          </div>
          <div class="col-md-4 text-md-end">
            <button class="btn btn-primary btn-lg px-5" @click="createSale"
                    :disabled="isSubmitting || hasStockErrors">
              <span v-if="isSubmitting">
                <span class="spinner-border spinner-border-sm me-2"></span>Placing Order…
              </span>
              <span v-else>
                <i class="bi bi-check-lg me-1"></i>Confirm Order
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
  `,

  data() {
    return {
      // Customer
      partyName:            "",
      selectedCustomerId:   null,
      selectedCustomer:     null,
      customerSuggestions:  [],
      searchTimer:          null,

      // Coil groups
      coilGroups: [this.blankGroup()],

      // Catalog
      products: [],
      coils:    [],

      // UI state
      isSubmitting: false,
    };
  },

  computed: {
    totalAmount() {
      return this.coilGroups.reduce((sum, g) => sum + this.groupSubtotalByGroup(g), 0);
    },
    hasStockErrors() {
      return this.coilGroups.some((g, i) => this.orderedExceedsStock(i));
    },
  },

  methods: {
    token() { return localStorage.getItem("auth-token"); },

    blankGroup() {
      return {
        selectedCoilId:   "",
        selectedProductId:"",
        selectedProduct:  null,
        filteredProducts: [],
        stockInfo:        null,
        loadingStock:     false,
        items: [{ length: null, quantity: null, rate: null, amount: 0 }],
      };
    },

    // ── Customer ──────────────────────────────────────────────────────────────

    onPartyInput() {
      this.selectedCustomerId = null;
      this.selectedCustomer   = null;
      clearTimeout(this.searchTimer);
      if (!this.partyName.trim()) { this.customerSuggestions = []; return; }
      this.searchTimer = setTimeout(this.searchCustomers, 300);
    },

    async searchCustomers() {
      const name = this.partyName.trim();
      if (!name) return;
      try {
        const res = await fetch(
          `/api/customer/search?name=${encodeURIComponent(name)}`,
          { headers: { "Authentication-Token": this.token() } }
        );
        if (res.ok) this.customerSuggestions = await res.json();
      } catch {}
    },

    selectCustomer(c) {
      this.selectedCustomerId  = c.id;
      this.selectedCustomer    = c;
      this.partyName           = c.name;
      this.customerSuggestions = [];
    },

    confirmNewCustomer() {
      this.selectedCustomerId  = null;
      this.selectedCustomer    = { name: this.partyName, phone: "" };
      this.customerSuggestions = [];
    },

    clearCustomer() {
      this.partyName           = "";
      this.selectedCustomerId  = null;
      this.selectedCustomer    = null;
      this.customerSuggestions = [];
    },

    // ── Coil groups ───────────────────────────────────────────────────────────

    async onCoilChange(gIdx) {
      const group = this.coilGroups[gIdx];
      group.filteredProducts  = this.products.filter(p => p.coil_id === group.selectedCoilId);
      group.selectedProductId = "";
      group.selectedProduct   = null;
      group.stockInfo         = null;

      if (!group.selectedCoilId) return;

      // Fetch remaining stock for this coil
      group.loadingStock = true;
      try {
        const res = await fetch(
          `/api/coils/${group.selectedCoilId}/remaining`,
          { headers: { "Authentication-Token": this.token() } }
        );
        if (res.ok) group.stockInfo = await res.json();
      } catch {}
      finally { group.loadingStock = false; }
    },

    onProductChange(gIdx) {
      const group = this.coilGroups[gIdx];
      group.selectedProduct = group.filteredProducts.find(p => p.id === group.selectedProductId) || null;
      // Pre-fill rate from product
      if (group.selectedProduct) {
        group.items.forEach(item => {
          if (!item.rate) {
            item.rate = group.selectedProduct.rate;
            this.recalcItem(item);
          }
        });
      }
    },

    onItemChange(gIdx, idx) {
      const item = this.coilGroups[gIdx].items[idx];
      this.recalcItem(item);
      this.$set(this.coilGroups[gIdx].items, idx, { ...item });
    },

    recalcItem(item) {
      item.amount = (Number(item.length) || 0) * (Number(item.quantity) || 0) * (Number(item.rate) || 0);
    },

    addBlankItem(gIdx) {
      const group = this.coilGroups[gIdx];
      const rate  = group.selectedProduct ? group.selectedProduct.rate : null;
      group.items.push({ length: null, quantity: null, rate, amount: 0 });
    },

    removeItem(gIdx, idx) {
      this.coilGroups[gIdx].items.splice(idx, 1);
      if (!this.coilGroups[gIdx].items.length) this.addBlankItem(gIdx);
    },

    addCoilGroup() { this.coilGroups.push(this.blankGroup()); },

    removeCoilGroup(gIdx) { this.coilGroups.splice(gIdx, 1); },

    // ── Stock helpers ─────────────────────────────────────────────────────────

    groupOrderedLength(gIdx) {
      return this.coilGroups[gIdx].items.reduce(
        (s, it) => s + (Number(it.length) || 0) * (Number(it.quantity) || 0), 0
      );
    },

    orderedExceedsStock(gIdx) {
      const group = this.coilGroups[gIdx];
      if (!group.stockInfo) return false;
      return this.groupOrderedLength(gIdx) > group.stockInfo.remaining_length + 1e-6;
    },

    usedPct(info) {
      if (!info || !info.original_length) return 0;
      return Math.min((info.used_length / info.original_length) * 100, 100);
    },

    orderedPct(gIdx, info) {
      if (!info || !info.original_length) return 0;
      return (this.groupOrderedLength(gIdx) / info.original_length) * 100;
    },

    groupStockClass(gIdx) {
      const group = this.coilGroups[gIdx];
      if (!group.stockInfo) return "";
      if (this.orderedExceedsStock(gIdx))            return "stock-badge--error";
      if (group.stockInfo.remaining_length <= 0)     return "stock-badge--critical";
      if (group.stockInfo.remaining_length <= 50)    return "stock-badge--low";
      return "stock-badge--ok";
    },

    groupStockIcon(gIdx) {
      const cls = this.groupStockClass(gIdx);
      if (cls.includes("error") || cls.includes("critical")) return "bi-x-circle-fill";
      if (cls.includes("low"))                               return "bi-exclamation-triangle-fill";
      return "bi-check-circle-fill";
    },

    stockValClass(remaining) {
      if (remaining <= 0)   return "text-danger fw-bold";
      if (remaining <= 50)  return "text-warning fw-bold";
      return "text-success fw-bold";
    },

    // ── Totals ────────────────────────────────────────────────────────────────

    groupSubtotal(gIdx) { return this.groupSubtotalByGroup(this.coilGroups[gIdx]); },
    groupSubtotalByGroup(group) {
      return group.items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
    },

    fmt(v) { return Number(v || 0).toFixed(2); },

    // ── Submit ────────────────────────────────────────────────────────────────

    async createSale() {
      if (!this.partyName.trim()) {
        this.$toast.warning("Please enter a customer name.");
        return;
      }

      // Frontend stock re-check
      if (this.hasStockErrors) {
        this.$toast.error("One or more coil groups exceed available stock. Please fix before submitting.");
        return;
      }

      const validGroups = this.coilGroups.map(g => ({
        coil_id:    g.selectedCoilId,
        product_id: g.selectedProductId,
        items: g.items.filter(i => i.length > 0 && i.quantity > 0 && i.rate > 0),
      })).filter(g => g.items.length && g.coil_id && g.product_id);

      if (!validGroups.length) {
        this.$toast.warning("Add at least one coil group with valid length, quantity and rate.");
        return;
      }

      this.isSubmitting = true;
      try {
        const res = await fetch("/api/sales", {
          method: "POST",
          headers: {
            "Content-Type":       "application/json",
            "Authentication-Token": this.token(),
          },
          body: JSON.stringify({
            party_name:   this.partyName.trim(),
            customer_id:  this.selectedCustomerId,
            coils:        validGroups,
            total_amount: Number(this.totalAmount),
          }),
        });

        const data = await res.json();

        if (res.ok) {
          this.$toast.success(`Order ${data.invoice_number || ''} placed successfully!`);
          this.$router.push("/view_all_orders");
        } else if (res.status === 422 && data.stock_error) {
          // Backend stock validation failed — show detailed error
          this.$toast.error(data.error, "Stock Validation Failed");
          // Refresh stock info for all groups
          await Promise.all(this.coilGroups.map((g, i) => g.selectedCoilId ? this.onCoilChange(i) : null));
        } else {
          this.$toast.error(data.error || "Failed to create sale.");
        }
      } catch {
        this.$toast.error("Network error. Please try again.");
      } finally {
        this.isSubmitting = false;
      }
    },

    // ── Load ──────────────────────────────────────────────────────────────────

    async fetchData() {
      try {
        const [prodRes, coilRes] = await Promise.all([
          fetch("/api/products", { headers: { "Authentication-Token": this.token() } }),
          fetch("/api/coils",    { headers: { "Authentication-Token": this.token() } }),
        ]);
        if (prodRes.ok) this.products = await prodRes.json();
        if (coilRes.ok) this.coils    = await coilRes.json();
      } catch {}
    },
  },

  mounted() { this.fetchData(); },
};
