export default {
  name: "OwnerDashboard",
  template: `
  <div class="page-wrapper">

    <!-- Page header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-sub">{{ businessLabel }} — coil inventory &amp; order overview</p>
      </div>
      <button class="btn btn-outline-secondary btn-sm" @click="fetchDashboard" title="Refresh">
        <i class="bi bi-arrow-clockwise"></i> Refresh
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="d-flex justify-content-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="alert alert-danger">
      <i class="bi bi-exclamation-circle me-2"></i>{{ error }}
    </div>

    <template v-else>

      <!-- ── Summary cards ── -->
      <div class="stat-grid">
        <div class="stat-card stat--blue">
          <div class="stat-card__icon"><i class="bi bi-layers-fill"></i></div>
          <div class="stat-card__body">
            <div class="stat-card__value">{{ stats.total_coils }}</div>
            <div class="stat-card__label">Total Coils</div>
          </div>
        </div>
        <div class="stat-card stat--green">
          <div class="stat-card__icon"><i class="bi bi-box-seam-fill"></i></div>
          <div class="stat-card__body">
            <div class="stat-card__value">{{ stats.total_products }}</div>
            <div class="stat-card__label">Products</div>
          </div>
        </div>
        <div class="stat-card stat--amber">
          <div class="stat-card__icon"><i class="bi bi-receipt-cutoff"></i></div>
          <div class="stat-card__body">
            <div class="stat-card__value">{{ stats.active_orders }}</div>
            <div class="stat-card__label">Active Orders</div>
          </div>
        </div>
        <div class="stat-card stat--red">
          <div class="stat-card__icon"><i class="bi bi-check-circle-fill"></i></div>
          <div class="stat-card__body">
            <div class="stat-card__value">{{ stats.finished_coils }}</div>
            <div class="stat-card__label">Finished Coils</div>
          </div>
        </div>
        <div class="stat-card stat--amber">
          <div class="stat-card__icon"><i class="bi bi-hourglass-split"></i></div>
          <div class="stat-card__body">
            <div class="stat-card__value">{{ stats.pending_orders || 0 }}</div>
            <div class="stat-card__label">Pending Orders</div>
          </div>
        </div>
        <div class="stat-card stat--blue">
          <div class="stat-card__icon"><i class="bi bi-gear-fill"></i></div>
          <div class="stat-card__body">
            <div class="stat-card__value">{{ stats.in_progress_orders || 0 }}</div>
            <div class="stat-card__label">In Progress</div>
          </div>
        </div>
        <div class="stat-card stat--green">
          <div class="stat-card__icon"><i class="bi bi-patch-check-fill"></i></div>
          <div class="stat-card__body">
            <div class="stat-card__value">{{ stats.completed_orders || 0 }}</div>
            <div class="stat-card__label">Completed</div>
          </div>
        </div>
      </div>

      <!-- ── Remaining material banner ── -->
      <div class="card mt-4">
        <div class="card-body d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <div class="text-muted" style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;">
              Total Remaining Material
            </div>
            <div class="fw-bold" style="font-size:28px;color:var(--info);">
              {{ (stats.remaining_material || 0).toFixed(2) }} m
            </div>
            <div class="text-muted" style="font-size:13px;">across all active coils</div>
          </div>
          <div class="text-end">
            <div class="text-muted" style="font-size:12px;">Fully exhausted</div>
            <div class="fw-semibold" style="font-size:22px;color:var(--danger);">
              {{ stats.finished_coils }}
            </div>
            <div class="text-muted" style="font-size:12px;">coil{{ stats.finished_coils !== 1 ? 's' : '' }}</div>
          </div>
        </div>
      </div>

      <!-- ── Coil-wise table ── -->
      <div class="card mt-4">
        <div class="card-header d-flex align-items-center justify-content-between gap-3 flex-wrap">
          <h5 class="mb-0"><i class="bi bi-layers me-2 text-primary"></i>Coil-wise Remaining Length</h5>
          <div class="d-flex gap-2 flex-wrap">
            <div class="input-group input-group-sm" style="width:220px;">
              <span class="input-group-text"><i class="bi bi-search"></i></span>
              <input type="text" class="form-control" placeholder="Coil no. or make…" v-model="searchText" />
            </div>
            <input type="number" class="form-control form-control-sm" style="width:160px;"
                   v-model.number="filterLimit" placeholder="Max remaining (m)" min="0" />
            <button class="btn btn-outline-secondary btn-sm" @click="resetFilters">Reset</button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="table-head-accent">
              <tr>
                <th class="sortable" @click="sortBy('coil_number')" style="cursor:pointer;">
                  Coil No <i class="bi" :class="sortIcon('coil_number')"></i>
                </th>
                <th class="sortable" @click="sortBy('make')" style="cursor:pointer;">
                  Make <i class="bi" :class="sortIcon('make')"></i>
                </th>
                <th>Type</th>
                <th>Color</th>
                <th class="text-end sortable" @click="sortBy('original_length')" style="cursor:pointer;">
                  Original (m) <i class="bi" :class="sortIcon('original_length')"></i>
                </th>
                <th class="text-end">Used (m)</th>
                <th class="text-end sortable" @click="sortBy('remaining_length')" style="cursor:pointer;">
                  Remaining (m) <i class="bi" :class="sortIcon('remaining_length')"></i>
                </th>
                <th class="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!filteredCoils.length">
                <td colspan="8" class="text-center text-muted py-4">No coils match your filters.</td>
              </tr>
              <tr v-for="coil in filteredCoils" :key="coil.coil_number"
                  :class="coil.remaining_length <= 0 ? 'table-danger bg-opacity-25' : ''">
                <td class="fw-semibold">{{ coil.coil_number }}</td>
                <td>{{ coil.make }}</td>
                <td>{{ coil.type }}</td>
                <td>{{ coil.color }}</td>
                <td class="text-end">{{ coil.original_length.toFixed(2) }}</td>
                <td class="text-end text-warning fw-semibold">{{ coil.used_length.toFixed(2) }}</td>
                <td class="text-end fw-bold" :class="remainingClass(coil.remaining_length)">
                  {{ coil.remaining_length.toFixed(2) }}
                </td>
                <td class="text-center">
                  <span class="badge" :class="statusBadge(coil.remaining_length)">
                    {{ statusLabel(coil.remaining_length) }}
                  </span>
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
      stats: {
        total_coils: 0,
        total_products: 0,
        active_orders: 0,
        finished_coils: 0,
        remaining_material: 0,
        pending_orders: 0,
        in_progress_orders: 0,
        completed_orders: 0,
        coil_details: [],
      },
      filterLimit: null,
      searchText: "",
      sortKey: "coil_number",
      sortAsc: true,
      loading: true,
      error: null,
    };
  },

  computed: {
    businessLabel() {
      return localStorage.getItem("business_name") || localStorage.getItem("full_name") || "My Business";
    },

    filteredCoils() {
      let list = [...(this.stats.coil_details || [])];

      if (this.searchText.trim()) {
        const q = this.searchText.trim().toLowerCase();
        list = list.filter(c =>
          c.coil_number.toLowerCase().includes(q) || c.make.toLowerCase().includes(q)
        );
      }
      if (this.filterLimit !== null && this.filterLimit !== "") {
        list = list.filter(c => c.remaining_length <= this.filterLimit);
      }

      list.sort((a, b) => {
        const va = a[this.sortKey], vb = b[this.sortKey];
        if (typeof va === "string") return this.sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
        return this.sortAsc ? va - vb : vb - va;
      });

      return list;
    },
  },

  methods: {
    async fetchDashboard() {
      this.loading = true;
      this.error = null;
      try {
        const res = await fetch("/api/dashboard", {
          headers: { "Authentication-Token": localStorage.getItem("auth-token") },
        });
        if (!res.ok) throw new Error("Failed to load dashboard data.");
        this.stats = await res.json();
        if (!this.stats.coil_details) this.stats.coil_details = [];
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },

    sortBy(key) {
      if (this.sortKey === key) { this.sortAsc = !this.sortAsc; }
      else { this.sortKey = key; this.sortAsc = true; }
    },

    sortIcon(key) {
      if (this.sortKey !== key) return "bi-chevron-expand text-muted";
      return this.sortAsc ? "bi-chevron-up" : "bi-chevron-down";
    },

    resetFilters() { this.filterLimit = null; this.searchText = ""; },

    remainingClass(r) {
      if (r <= 0)  return "text-danger";
      if (r < 50)  return "text-warning";
      return "text-success";
    },
    statusBadge(r) {
      if (r <= 0)  return "bg-danger";
      if (r < 50)  return "bg-warning text-dark";
      return "bg-success";
    },
    statusLabel(r) {
      if (r <= 0)  return "Exhausted";
      if (r < 50)  return "Low";
      return "Available";
    },
  },

  mounted() { this.fetchDashboard(); },
};
