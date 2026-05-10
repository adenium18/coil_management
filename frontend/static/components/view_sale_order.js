export default {
  name: "SaleOrders",
  template: `
  <div class="page-wrapper">
    <div class="page-header">
      <div>
        <h1 class="page-title">Sale Orders</h1>
        <p class="page-sub">{{ filteredSales.length }} order{{ filteredSales.length !== 1 ? 's' : '' }} shown</p>
      </div>
      <div class="d-flex gap-2 flex-wrap">
        <button class="btn btn-outline-success btn-sm" @click="exportCSV" :disabled="exporting">
          <i class="bi bi-download me-1"></i>{{ exporting ? 'Exporting…' : 'Export CSV' }}
        </button>
        <button class="btn btn-outline-primary btn-sm" @click="showSummary = !showSummary">
          <i class="bi" :class="showSummary ? 'bi-list-ul' : 'bi-bar-chart-line'"></i>
          {{ showSummary ? 'Show Orders' : 'Summary' }}
        </button>
        <input type="file" accept=".csv" @change="importCSV" ref="fileInput" class="d-none" />
        <button class="btn btn-outline-secondary btn-sm" @click="$refs.fileInput.click()">
          <i class="bi bi-upload me-1"></i>Import CSV
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="card mb-3">
      <div class="card-body py-3">
        <div class="row g-2 align-items-end">
          <div class="col-md-4">
            <div class="input-group input-group-sm">
              <span class="input-group-text"><i class="bi bi-search"></i></span>
              <input v-model="filters.query" class="form-control" placeholder="Party, coil, make, color…" />
            </div>
          </div>
          <div class="col-md-2">
            <input v-model="filters.date" type="date" class="form-control form-control-sm"
                   title="Filter by date" />
          </div>
          <div class="col-md-2">
            <select v-model="filters.month" class="form-select form-select-sm">
              <option value="">All months</option>
              <option v-for="m in 12" :key="m" :value="m">{{ monthName(m) }}</option>
            </select>
          </div>
          <div class="col-md-2">
            <input v-model.number="filters.year" type="number" class="form-control form-control-sm"
                   placeholder="Year" />
          </div>
          <div class="col-md-2">
            <select v-model="filters.payStatus" class="form-select form-select-sm">
              <option value="">All payments</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div class="col-md-2">
            <select v-model="filters.prodStatus" class="form-select form-select-sm">
              <option value="">All production</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
        <div class="d-flex justify-content-end gap-2 mt-2">
          <button @click="fetchSales" class="btn btn-primary btn-sm">
            <i class="bi bi-funnel me-1"></i>Apply
          </button>
          <button @click="clearFilters" class="btn btn-outline-secondary btn-sm">Reset</button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="d-flex justify-content-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>
    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <!-- ── Orders Table ── -->
    <div v-if="!showSummary && !loading && !error" class="card">
      <div class="table-responsive">
        <table class="table table-hover mb-0">
          <thead class="table-head-accent">
            <tr>
              <th>Invoice</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Coil</th>
              <th>Product</th>
              <th class="text-center">Len × Qty</th>
              <th class="text-end">Amount</th>
              <th class="text-end">Total</th>
              <th class="text-center">Payment</th>
              <th class="text-center">Production</th>
              <th class="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!filteredSales.length">
              <td colspan="11" class="text-center text-muted py-5">
                <i class="bi bi-receipt display-4 d-block mb-2"></i>No orders found.
              </td>
            </tr>
            <template v-for="(sale, si) in filteredSales" :key="'s-' + sale.saleId">
              <!-- rows with items -->
              <template v-if="sale.rows.length">
                <tr v-for="(row, ri) in sale.rows" :key="'r-' + ri"
                    :class="{ 'sale-row-cancelled': sale.status === 'cancelled' }">
                  <td v-if="ri === 0" :rowspan="sale.rows.length" class="fw-semibold text-primary align-middle">
                    {{ sale.invoiceNumber || ('INV-' + String(sale.saleId).padStart(4,'0')) }}
                  </td>
                  <td v-if="ri === 0" :rowspan="sale.rows.length" class="align-middle text-muted" style="white-space:nowrap;">
                    {{ formatDate(sale.date) }}
                  </td>
                  <td v-if="ri === 0" :rowspan="sale.rows.length" class="align-middle fw-semibold">
                    {{ sale.partyName }}
                    <div class="text-muted" style="font-size:11px;">{{ sale.partyPhone }}</div>
                  </td>
                  <td>{{ row.coilNumber }}</td>
                  <td><span class="badge bg-light text-dark border">{{ row.make }} {{ row.type }} {{ row.color }}</span></td>
                  <td class="text-center">{{ row.length }} × {{ row.quantity }}</td>
                  <td class="text-end">₹{{ Number(row.amount).toLocaleString('en-IN') }}</td>
                  <td v-if="ri === 0" :rowspan="sale.rows.length"
                      class="text-end fw-bold align-middle text-success">
                    ₹{{ Number(sale.totalAmount).toLocaleString('en-IN') }}
                  </td>
                  <td v-if="ri === 0" :rowspan="sale.rows.length" class="text-center align-middle">
                    <span class="badge d-block mb-1" :class="payBadge(sale.paymentStatus)">
                      {{ capitalize(sale.paymentStatus) }}
                    </span>
                    <span class="badge" :class="statusBadge(sale.status)">
                      {{ capitalize(sale.status) }}
                    </span>
                  </td>
                  <td v-if="ri === 0" :rowspan="sale.rows.length" class="text-center align-middle">
                    <span class="badge d-block mb-1" :class="prodBadge(sale.productionStatus)">
                      {{ prodLabel(sale.productionStatus) }}
                    </span>
                    <select class="form-select form-select-sm mt-1" style="font-size:11px;min-width:110px;"
                            :value="sale.productionStatus"
                            @change="updateProductionStatus(sale.saleId, $event.target.value)">
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </td>
                  <td v-if="ri === 0" :rowspan="sale.rows.length" class="text-center align-middle">
                    <div class="d-flex gap-1 justify-content-center">
                      <router-link :to="'/invoice/' + sale.saleId"
                                   class="btn btn-sm btn-outline-primary" title="View Invoice">
                        <i class="bi bi-receipt"></i>
                      </router-link>
                      <button class="btn btn-sm btn-outline-success" title="Mark Paid"
                              @click="markPaid(sale)" :disabled="sale.paymentStatus === 'paid'">
                        <i class="bi bi-cash-coin"></i>
                      </button>
                      <button class="btn btn-sm btn-outline-danger" title="Delete"
                              @click="deleteSale(sale.saleId)">
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </template>
              <!-- sale with no items -->
              <tr v-else>
                <td class="fw-semibold text-primary">
                  {{ sale.invoiceNumber || ('INV-' + String(sale.saleId).padStart(4,'0')) }}
                </td>
                <td class="text-muted">{{ formatDate(sale.date) }}</td>
                <td class="fw-semibold">{{ sale.partyName }}</td>
                <td colspan="4" class="text-muted fst-italic">No items recorded</td>
                <td class="text-end fw-bold text-success">
                  ₹{{ Number(sale.totalAmount).toLocaleString('en-IN') }}
                </td>
                <td class="text-center">
                  <span class="badge" :class="payBadge(sale.paymentStatus)">
                    {{ capitalize(sale.paymentStatus) }}
                  </span>
                </td>
                <td class="text-center">
                  <span class="badge d-block mb-1" :class="prodBadge(sale.productionStatus)">
                    {{ prodLabel(sale.productionStatus) }}
                  </span>
                </td>
                <td class="text-center">
                  <router-link :to="'/invoice/' + sale.saleId"
                               class="btn btn-sm btn-outline-primary">
                    <i class="bi bi-receipt"></i>
                  </router-link>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Product Summary ── -->
    <div v-if="showSummary && !loading" class="card">
      <div class="card-header">
        <h5 class="mb-0"><i class="bi bi-bar-chart-line me-2 text-primary"></i>Product Summary</h5>
      </div>
      <div class="table-responsive">
        <table class="table mb-0">
          <thead class="table-head-accent">
            <tr>
              <th>Make</th><th>Type</th><th>Color</th>
              <th class="text-center">Total Qty</th>
              <th class="text-end">Total Length</th>
              <th class="text-end">Avg Rate</th>
              <th class="text-end">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!productSummary.length">
              <td colspan="7" class="text-center text-muted py-4">No data for selected filters.</td>
            </tr>
            <tr v-for="(s, i) in productSummary" :key="'ps-' + i">
              <td>{{ s.make }}</td><td>{{ s.type }}</td><td>{{ s.color }}</td>
              <td class="text-center">{{ s.totalQuantity }}</td>
              <td class="text-end">{{ s.totalLength.toFixed(2) }} m</td>
              <td class="text-end">₹{{ s.avgRate.toFixed(2) }}</td>
              <td class="text-end fw-bold text-success">
                ₹{{ Number(s.totalAmount).toLocaleString('en-IN') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Payment modal -->
    <div v-if="paymentModal.show" class="modal-backdrop-custom" @click.self="paymentModal.show=false">
      <div class="modal-card" style="max-width:380px;">
        <div class="modal-card__header">
          <h5 class="mb-0"><i class="bi bi-cash-coin me-2 text-success"></i>Record Payment</h5>
          <button class="btn-close" @click="paymentModal.show=false"></button>
        </div>
        <div class="modal-card__body">
          <p class="text-muted mb-3">
            Invoice {{ paymentModal.invoiceNumber }} — Total:
            <strong>₹{{ Number(paymentModal.total).toLocaleString('en-IN') }}</strong>
          </p>
          <div class="mb-3">
            <label class="form-label">Amount Paid (₹)</label>
            <input type="number" class="form-control" v-model.number="paymentModal.amount"
                   :max="paymentModal.total" min="0" step="0.01" />
          </div>
        </div>
        <div class="modal-card__footer">
          <button class="btn btn-secondary" @click="paymentModal.show=false">Cancel</button>
          <button class="btn btn-success" @click="submitPayment" :disabled="paymentModal.saving">
            <span v-if="paymentModal.saving"><span class="spinner-border spinner-border-sm me-1"></span>Saving…</span>
            <span v-else>Save Payment</span>
          </button>
        </div>
      </div>
    </div>

  </div>
  `,

  data() {
    return {
      sales: [],
      filters: { query: "", date: "", month: "", year: "", payStatus: "", prodStatus: "" },
      loading: true,
      error: null,
      exporting: false,
      showSummary: false,
      paymentModal: { show: false, saleId: null, invoiceNumber: "", total: 0, amount: 0, saving: false },
    };
  },

  computed: {
    mergedSales() {
      if (!Array.isArray(this.sales)) return [];
      return this.sales.map(sale => {
        const rows = [];
        (sale.used_coils || []).forEach(coil => {
          (coil.items || []).forEach(item => {
            rows.push({
              coilNumber: coil.coil_number || "",
              make: coil.make || "", type: coil.type || "", color: coil.color || "",
              length: item.length || 0, quantity: item.quantity || 0,
              rate: item.rate || 0, amount: item.amount || 0,
            });
          });
        });
        return {
          saleId:        sale.sale_id,
          invoiceNumber: sale.invoice_number,
          date:          sale.date,
          partyName:     sale.party?.name || "",
          partyPhone:    sale.party?.phone || "",
          totalAmount:   sale.total_amount || 0,
          netAmount:     sale.net_amount || sale.total_amount || 0,
          status:        sale.status || "confirmed",
          paymentStatus: sale.payment_status || "pending",
          amountPaid:       sale.amount_paid || 0,
          productionStatus: sale.production_status || "pending",
          rows,
        };
      });
    },

    filteredSales() {
      return this.mergedSales.filter(sale => {
        const dateObj = sale.date ? new Date(sale.date) : null;
        if (this.filters.query) {
          const q = this.filters.query.toLowerCase();
          if (!(
            sale.partyName.toLowerCase().includes(q) ||
            (sale.partyPhone || "").toLowerCase().includes(q) ||
            (sale.invoiceNumber || "").toLowerCase().includes(q) ||
            sale.rows.some(r =>
              r.make.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) ||
              r.color.toLowerCase().includes(q) || r.coilNumber.toLowerCase().includes(q)
            )
          )) return false;
        }
        if (this.filters.date && dateObj?.toISOString().slice(0,10) !== this.filters.date) return false;
        if (this.filters.month && dateObj?.getMonth()+1 !== Number(this.filters.month)) return false;
        if (this.filters.year && dateObj?.getFullYear() !== Number(this.filters.year)) return false;
        if (this.filters.payStatus && sale.paymentStatus !== this.filters.payStatus) return false;
        if (this.filters.prodStatus && sale.productionStatus !== this.filters.prodStatus) return false;
        return true;
      });
    },

    productSummary() {
      const map = {};
      this.filteredSales.forEach(sale => {
        sale.rows.forEach(r => {
          const k = `${r.make}|${r.type}|${r.color}`;
          if (!map[k]) map[k] = { make:r.make, type:r.type, color:r.color, totalQuantity:0, totalLength:0, totalRate:0, count:0, totalAmount:0 };
          map[k].totalQuantity += r.quantity || 0;
          map[k].totalLength   += r.length   || 0;
          map[k].totalRate     += r.rate      || 0;
          map[k].totalAmount   += r.amount    || 0;
          map[k].count++;
        });
      });
      return Object.values(map).map(s => ({ ...s, avgRate: s.count ? s.totalRate/s.count : 0 }));
    },
  },

  methods: {
    token() { return localStorage.getItem("auth-token") || ""; },

    async fetchSales() {
      this.loading = true; this.error = null;
      try {
        const res = await fetch("/api/all_orders", { headers: { "Authentication-Token": this.token() } });
        if (!res.ok) throw new Error("Failed to fetch sale orders.");
        this.sales = await res.json();
      } catch (e) { this.error = e.message; }
      finally { this.loading = false; }
    },

    markPaid(sale) {
      this.paymentModal = {
        show: true, saleId: sale.saleId,
        invoiceNumber: sale.invoiceNumber || `INV-${String(sale.saleId).padStart(4,"0")}`,
        total: sale.netAmount || sale.totalAmount,
        amount: sale.netAmount || sale.totalAmount,
        saving: false,
      };
    },

    async submitPayment() {
      this.paymentModal.saving = true;
      try {
        const res = await fetch(`/api/sales/${this.paymentModal.saleId}/payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authentication-Token": this.token() },
          body: JSON.stringify({ amount_paid: this.paymentModal.amount }),
        });
        if (!res.ok) throw new Error("Payment update failed.");
        const data = await res.json();
        const sale = this.mergedSales.find(s => s.saleId === this.paymentModal.saleId);
        if (sale) { sale.paymentStatus = data.payment_status; sale.amountPaid = data.amount_paid; }
        this.paymentModal.show = false;
        await this.fetchSales();
        this.$toast.success("Payment recorded successfully!");
      } catch (e) {
        this.$toast.error(e.message);
      } finally {
        this.paymentModal.saving = false;
      }
    },

    async deleteSale(saleId) {
      if (!confirm("Delete this sale order? This cannot be undone.")) return;
      try {
        const res = await fetch(`/api/sales/${saleId}`, {
          method: "DELETE", headers: { "Authentication-Token": this.token() },
        });
        if (!res.ok) throw new Error("Delete failed.");
        await this.fetchSales();
        this.$toast.success("Sale order deleted.");
      } catch (e) { this.$toast.error(e.message); }
    },

    clearFilters() { this.filters = { query:"", date:"", month:"", year:"", payStatus:"", prodStatus:"" }; },

    monthName(m) {
      return ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m];
    },

    formatDate(d) { if (!d) return "—"; return new Date(d).toLocaleDateString("en-IN"); },

    capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : "—"; },

    payBadge(s) {
      return { paid:"bg-success", partial:"bg-warning text-dark", pending:"bg-danger" }[s] || "bg-secondary";
    },
    statusBadge(s) {
      return { confirmed:"bg-primary", draft:"bg-secondary", cancelled:"bg-danger" }[s] || "bg-secondary";
    },

    prodBadge(s) {
      return { pending:"bg-secondary", in_progress:"bg-primary", completed:"bg-success" }[s] || "bg-secondary";
    },

    prodLabel(s) {
      return { pending:"Pending", in_progress:"In Progress", completed:"Completed" }[s]
        || (s ? s[0].toUpperCase() + s.slice(1) : "—");
    },

    async updateProductionStatus(saleId, newStatus) {
      try {
        const res = await fetch(`/api/sales/${saleId}/production-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authentication-Token": this.token() },
          body: JSON.stringify({ production_status: newStatus }),
        });
        if (!res.ok) throw new Error("Failed to update production status.");
        const d = await res.json();
        const raw = this.sales.find(s => s.sale_id === saleId);
        if (raw) raw.production_status = d.production_status;
        this.$toast.success("Production status updated.");
      } catch (e) { this.$toast.error(e.message); }
    },

    exportCSV() {
      this.exporting = true;
      try {
        const rows = [["Invoice","Date","Party","Phone","Coil","Make","Type","Color","Length","Qty","Rate","Amount","Total"]];
        this.filteredSales.forEach(sale => {
          if (!sale.rows.length) {
            rows.push([sale.invoiceNumber||"", this.formatDate(sale.date), sale.partyName,
                        sale.partyPhone,"","","","","","","","", sale.totalAmount]);
            return;
          }
          sale.rows.forEach((r, i) => {
            rows.push([
              i===0 ? (sale.invoiceNumber||"") : "",
              i===0 ? this.formatDate(sale.date) : "",
              i===0 ? sale.partyName : "",
              i===0 ? (sale.partyPhone||"") : "",
              r.coilNumber, r.make, r.type, r.color,
              r.length, r.quantity, r.rate, r.amount,
              i===0 ? sale.totalAmount : "",
            ]);
          });
        });
        const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
        const url = URL.createObjectURL(new Blob([csv], { type:"text/csv" }));
        Object.assign(document.createElement("a"), { href:url, download:"sale_orders.csv" }).click();
        URL.revokeObjectURL(url);
      } finally { this.exporting = false; }
    },

    importCSV(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async e => {
        const rows = e.target.result.trim().split("\n").map(r =>
          r.split(",").map(v => v.replace(/^"|"$/g,"").trim())
        );
        if (rows.length < 2) { this.$toast.warning("CSV has no data rows."); return; }
        const data = rows.slice(1).map(row => ({
          date: row[1], party: { name: row[2], phone: row[3] },
          used_coils: [{ coil_number: row[4], make: row[5], type: row[6], color: row[7],
            items: [{ length: +row[8]||0, quantity: +row[9]||1, rate: +row[10]||0, amount: +row[11]||0 }] }],
          total_amount: +row[12]||0,
        })).filter(o => o.party.name);
        try {
          const res = await fetch("/api/add_orders", {
            method:"POST",
            headers: { "Content-Type":"application/json", "Authentication-Token": this.token() },
            body: JSON.stringify(data),
          });
          if (!res.ok) throw new Error((await res.json()).error || "Import failed.");
          this.$toast.success(`Imported ${data.length} orders.`);
          await this.fetchSales();
        } catch (e) { this.$toast.error(e.message); }
      };
      reader.readAsText(file);
      event.target.value = "";
    },
  },

  mounted() { this.fetchSales(); },
};
