export default {
  name: "Reports",
  template: `
  <div class="page-wrapper">
    <div class="page-header">
      <div>
        <h1 class="page-title">Reports</h1>
        <p class="page-sub">Sales, stock &amp; coil utilization reports</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="report-tabs">
      <button class="report-tab" :class="{ active: tab === 'sales' }" @click="tab='sales'; loadSales()">
        <i class="bi bi-receipt me-1"></i>Sales Report
      </button>
      <button class="report-tab" :class="{ active: tab === 'coils' }" @click="tab='coils'; loadCoils()">
        <i class="bi bi-layers me-1"></i>Coil Utilization
      </button>
      <button class="report-tab" :class="{ active: tab === 'stock' }" @click="tab='stock'; loadAlerts()">
        <i class="bi bi-exclamation-triangle me-1"></i>Stock Alerts
      </button>
    </div>

    <!-- ── Sales Report ── -->
    <template v-if="tab === 'sales'">
      <div class="card mt-3">
        <div class="card-header d-flex align-items-center gap-3 flex-wrap">
          <h5 class="mb-0"><i class="bi bi-receipt-cutoff me-2 text-primary"></i>Sales Report</h5>
          <div class="d-flex gap-2 ms-auto flex-wrap">
            <select class="form-select form-select-sm" style="width:140px;" v-model="salesFilter.period" @change="loadSales">
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="custom">Custom</option>
            </select>
            <template v-if="salesFilter.period === 'custom'">
              <input type="date" class="form-control form-control-sm" v-model="salesFilter.start" style="width:140px;" />
              <input type="date" class="form-control form-control-sm" v-model="salesFilter.end" style="width:140px;" />
              <button class="btn btn-primary btn-sm" @click="loadSales">Apply</button>
            </template>
          </div>
        </div>

        <div v-if="salesLoading" class="text-center py-4">
          <div class="spinner-border text-primary"></div>
        </div>

        <template v-else-if="salesData">
          <!-- KPI bar -->
          <div class="report-kpi-bar">
            <div class="report-kpi">
              <div class="report-kpi__value">{{ fmt(salesData.total_revenue) }}</div>
              <div class="report-kpi__label">Total Revenue</div>
            </div>
            <div class="report-kpi">
              <div class="report-kpi__value">{{ salesData.total_orders }}</div>
              <div class="report-kpi__label">Orders</div>
            </div>
            <div class="report-kpi text-success">
              <div class="report-kpi__value">{{ salesData.paid_orders }}</div>
              <div class="report-kpi__label">Paid</div>
            </div>
            <div class="report-kpi text-warning">
              <div class="report-kpi__value">{{ fmt(salesData.pending_amount) }}</div>
              <div class="report-kpi__label">Pending</div>
            </div>
          </div>

          <!-- Table -->
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead class="table-head-accent">
                <tr>
                  <th>Invoice</th><th>Date</th><th>Customer</th>
                  <th class="text-end">Amount</th>
                  <th class="text-end">Net</th>
                  <th class="text-end">Paid</th>
                  <th class="text-center">Order</th>
                  <th class="text-center">Payment</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!salesData.orders.length">
                  <td colspan="8" class="text-center text-muted py-4">No orders in this period.</td>
                </tr>
                <tr v-for="o in salesData.orders" :key="o.id">
                  <td class="fw-semibold text-primary">{{ o.invoice_number }}</td>
                  <td>{{ o.date }}</td>
                  <td>{{ o.party }}</td>
                  <td class="text-end">{{ fmt(o.amount) }}</td>
                  <td class="text-end fw-semibold">{{ fmt(o.net_amount) }}</td>
                  <td class="text-end text-success">{{ fmt(o.paid) }}</td>
                  <td class="text-center">
                    <span class="badge" :class="orderBadge(o.status)">{{ capitalize(o.status) }}</span>
                  </td>
                  <td class="text-center">
                    <span class="badge" :class="payBadge(o.payment_status)">{{ capitalize(o.payment_status) }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </template>

    <!-- ── Coil Utilization ── -->
    <template v-if="tab === 'coils'">
      <div class="card mt-3">
        <div class="card-header d-flex align-items-center justify-content-between">
          <h5 class="mb-0"><i class="bi bi-layers me-2 text-primary"></i>Coil Utilization Report</h5>
          <button class="btn btn-outline-secondary btn-sm" @click="loadCoils">
            <i class="bi bi-arrow-clockwise"></i>
          </button>
        </div>
        <div v-if="coilsLoading" class="text-center py-4">
          <div class="spinner-border text-primary"></div>
        </div>
        <div class="table-responsive" v-else>
          <table class="table table-hover mb-0">
            <thead class="table-head-accent">
              <tr>
                <th>Coil No.</th><th>Make</th><th>Type</th><th>Color</th>
                <th class="text-end">Original (m)</th>
                <th class="text-end">Used (m)</th>
                <th class="text-end">Remaining (m)</th>
                <th class="text-center">Utilization</th>
                <th class="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!coilData.length">
                <td colspan="9" class="text-center text-muted py-4">No coil data.</td>
              </tr>
              <tr v-for="c in coilData" :key="c.coil_id">
                <td class="fw-semibold">{{ c.coil_number }}</td>
                <td>{{ c.make }}</td><td>{{ c.type }}</td><td>{{ c.color }}</td>
                <td class="text-end">{{ c.original_length }}</td>
                <td class="text-end text-warning">{{ c.used_length }}</td>
                <td class="text-end" :class="remainClass(c.remaining_length)">{{ c.remaining_length }}</td>
                <td class="text-center" style="min-width:120px;">
                  <div class="utilization-bar">
                    <div class="utilization-bar__fill" :class="utilClass(c.utilization_pct)"
                         :style="{ width: Math.min(c.utilization_pct, 100) + '%' }"></div>
                  </div>
                  <small>{{ c.utilization_pct }}%</small>
                </td>
                <td class="text-center">
                  <span class="badge" :class="stockBadge(c.status)">{{ capitalize(c.status) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ── Stock Alerts ── -->
    <template v-if="tab === 'stock'">
      <div class="card mt-3">
        <div class="card-header d-flex align-items-center justify-content-between">
          <h5 class="mb-0"><i class="bi bi-exclamation-triangle me-2 text-warning"></i>Stock Alerts</h5>
          <span class="badge bg-danger" v-if="alerts.length">{{ alerts.length }} alert{{ alerts.length !== 1 ? 's' : '' }}</span>
        </div>
        <div v-if="alertsLoading" class="text-center py-4">
          <div class="spinner-border text-primary"></div>
        </div>
        <div v-else-if="!alerts.length" class="text-center py-5 text-muted">
          <i class="bi bi-check-circle display-4 text-success d-block mb-2"></i>
          All coils have healthy stock levels.
        </div>
        <div class="table-responsive" v-else>
          <table class="table mb-0">
            <thead class="table-head-accent">
              <tr>
                <th>Coil No.</th><th>Make</th><th>Type</th><th>Color</th>
                <th class="text-end">Remaining (m)</th>
                <th class="text-center">Severity</th>
                <th class="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in alerts" :key="a.coil_id" :class="a.severity === 'critical' ? 'table-danger' : 'table-warning'">
                <td class="fw-semibold">{{ a.coil_number }}</td>
                <td>{{ a.make }}</td><td>{{ a.type }}</td><td>{{ a.color }}</td>
                <td class="text-end fw-bold">{{ a.remaining }}</td>
                <td class="text-center">
                  <span class="badge" :class="a.severity === 'critical' ? 'bg-danger' : 'bg-warning text-dark'">
                    {{ a.severity === 'critical' ? 'Exhausted' : 'Low Stock' }}
                  </span>
                </td>
                <td class="text-center">
                  <router-link :to="'/coil_info'" class="btn btn-sm btn-outline-primary">
                    View
                  </router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

  </div>
  `,

  data() {
    return {
      tab: "sales",
      salesLoading: false,
      coilsLoading: false,
      alertsLoading: false,
      salesData: null,
      coilData: [],
      alerts: [],
      salesFilter: { period: "month", start: "", end: "" },
    };
  },

  methods: {
    token() { return localStorage.getItem("auth-token"); },

    async loadSales() {
      this.salesLoading = true;
      try {
        const p = this.salesFilter;
        let url = `/api/reports/sales?period=${p.period}`;
        if (p.period === "custom") url += `&start=${p.start}&end=${p.end}`;
        const res = await fetch(url, { headers: { "Authentication-Token": this.token() } });
        if (res.ok) this.salesData = await res.json();
      } finally { this.salesLoading = false; }
    },

    async loadCoils() {
      this.coilsLoading = true;
      try {
        const res = await fetch("/api/reports/coil-utilization", {
          headers: { "Authentication-Token": this.token() },
        });
        if (res.ok) this.coilData = await res.json();
      } finally { this.coilsLoading = false; }
    },

    async loadAlerts() {
      this.alertsLoading = true;
      try {
        const res = await fetch("/api/stock/alerts", {
          headers: { "Authentication-Token": this.token() },
        });
        if (res.ok) this.alerts = await res.json();
      } finally { this.alertsLoading = false; }
    },

    fmt(v) { if (!v && v !== 0) return "—"; return "₹" + Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 }); },
    capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : "—"; },
    remainClass(r) { if (r <= 0) return "text-danger fw-bold"; if (r < 50) return "text-warning fw-bold"; return "text-success"; },
    utilClass(p) { if (p >= 100) return "fill-danger"; if (p >= 80) return "fill-warning"; return "fill-success"; },
    stockBadge(s) { return { exhausted: "bg-danger", low: "bg-warning text-dark", healthy: "bg-success" }[s] || "bg-secondary"; },
    orderBadge(s) { return { confirmed: "bg-primary", draft: "bg-secondary", cancelled: "bg-danger" }[s] || "bg-secondary"; },
    payBadge(s) { return { paid: "bg-success", partial: "bg-warning text-dark", pending: "bg-danger" }[s] || "bg-secondary"; },
  },

  mounted() { this.loadSales(); },
};
