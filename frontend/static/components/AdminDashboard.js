export default {
  name: "AdminDashboard",
  template: `
  <div class="page-wrapper">

    <!-- Page header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Admin Dashboard</h1>
        <p class="page-sub">Platform-wide overview — all businesses</p>
      </div>
      <button class="btn btn-outline-secondary btn-sm" @click="load" title="Refresh">
        <i class="bi bi-arrow-clockwise"></i> Refresh
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="d-flex justify-content-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <template v-else-if="!error">

      <!-- ── Summary cards ── -->
      <div class="stat-grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr));">
        <div class="stat-card stat--blue">
          <div class="stat-card__icon"><i class="bi bi-people-fill"></i></div>
          <div class="stat-card__body">
            <div class="stat-card__value">{{ stats.total_owners }}</div>
            <div class="stat-card__label">Total Owners</div>
          </div>
        </div>
        <div class="stat-card stat--green">
          <div class="stat-card__icon"><i class="bi bi-person-check-fill"></i></div>
          <div class="stat-card__body">
            <div class="stat-card__value">{{ stats.active_owners }}</div>
            <div class="stat-card__label">Active</div>
          </div>
        </div>
        <div class="stat-card stat--red">
          <div class="stat-card__icon"><i class="bi bi-person-dash-fill"></i></div>
          <div class="stat-card__body">
            <div class="stat-card__value">{{ stats.total_owners - stats.active_owners }}</div>
            <div class="stat-card__label">Suspended</div>
          </div>
        </div>
        <div class="stat-card stat--amber">
          <div class="stat-card__icon"><i class="bi bi-layers-fill"></i></div>
          <div class="stat-card__body">
            <div class="stat-card__value">{{ stats.total_coils }}</div>
            <div class="stat-card__label">Total Coils</div>
          </div>
        </div>
        <div class="stat-card stat--blue">
          <div class="stat-card__icon"><i class="bi bi-box-seam-fill"></i></div>
          <div class="stat-card__body">
            <div class="stat-card__value">{{ stats.total_products }}</div>
            <div class="stat-card__label">Products</div>
          </div>
        </div>
        <div class="stat-card stat--green">
          <div class="stat-card__icon"><i class="bi bi-receipt-cutoff"></i></div>
          <div class="stat-card__body">
            <div class="stat-card__value">{{ stats.total_orders }}</div>
            <div class="stat-card__label">Orders</div>
          </div>
        </div>
        <div class="stat-card stat--amber">
          <div class="stat-card__icon"><i class="bi bi-currency-rupee"></i></div>
          <div class="stat-card__body">
            <div class="stat-card__value">{{ fmtCurrency(stats.total_revenue) }}</div>
            <div class="stat-card__label">Revenue</div>
          </div>
        </div>
      </div>

      <!-- ── Owner Activity Table ── -->
      <div class="card mt-4">
        <div class="card-header d-flex align-items-center justify-content-between gap-3 flex-wrap">
          <h5 class="mb-0"><i class="bi bi-building me-2 text-primary"></i>Business Owners</h5>
          <div class="d-flex gap-2 flex-wrap">
            <div class="input-group input-group-sm" style="width:240px;">
              <span class="input-group-text"><i class="bi bi-search"></i></span>
              <input type="text" class="form-control" placeholder="Search owners…" v-model="search" />
            </div>
            <select class="form-select form-select-sm" style="width:140px;" v-model="filterStatus">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
            <button class="btn btn-primary btn-sm" @click="openCreateModal">
              <i class="bi bi-person-plus me-1"></i>Add Owner
            </button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="table-head-accent">
              <tr>
                <th>Owner</th>
                <th>Business</th>
                <th>Email</th>
                <th class="text-center">Coils</th>
                <th class="text-center">Products</th>
                <th class="text-center">Orders</th>
                <th class="text-end">Revenue</th>
                <th>Last Login</th>
                <th class="text-center">Status</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!filteredOwners.length">
                <td colspan="10" class="text-center text-muted py-4">No owners found.</td>
              </tr>
              <tr v-for="o in filteredOwners" :key="o.id">
                <td>
                  <div class="d-flex align-items-center gap-2">
                    <div class="sidebar-user__avatar" style="width:32px;height:32px;font-size:13px;flex-shrink:0;">
                      {{ (o.full_name||'?')[0].toUpperCase() }}
                    </div>
                    <span>{{ o.full_name }}</span>
                  </div>
                </td>
                <td>{{ o.business_name || '—' }}</td>
                <td class="text-muted" style="font-size:13px;">{{ o.email }}</td>
                <td class="text-center">{{ o.coils_count }}</td>
                <td class="text-center">{{ o.products_count }}</td>
                <td class="text-center">{{ o.orders_count }}</td>
                <td class="text-end">{{ fmtCurrency(o.revenue) }}</td>
                <td class="text-muted" style="font-size:12px;">{{ o.last_login || '—' }}</td>
                <td class="text-center">
                  <span class="badge" :class="o.is_active ? 'bg-success' : 'bg-secondary'">
                    {{ o.is_active ? 'Active' : 'Suspended' }}
                  </span>
                </td>
                <td class="text-center">
                  <div class="d-flex gap-1 justify-content-center">
                    <button class="btn btn-sm"
                            :class="o.is_active ? 'btn-outline-warning' : 'btn-outline-success'"
                            @click="toggleOwner(o)"
                            :title="o.is_active ? 'Suspend' : 'Activate'">
                      <i class="bi" :class="o.is_active ? 'bi-pause-circle' : 'bi-play-circle'"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" @click="confirmDelete(o)" title="Delete">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── Top owners by revenue ── -->
      <div class="card mt-4" v-if="stats.owner_revenue && stats.owner_revenue.length">
        <div class="card-header">
          <h5 class="mb-0"><i class="bi bi-trophy me-2 text-warning"></i>Top Businesses by Revenue</h5>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table mb-0">
              <thead class="table-light">
                <tr>
                  <th>#</th><th>Business</th><th>Owner</th>
                  <th class="text-center">Orders</th><th class="text-end">Revenue</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in stats.owner_revenue" :key="i">
                  <td>
                    <span class="badge"
                          :class="i===0?'bg-warning text-dark':i===1?'bg-secondary':i===2?'bg-warning bg-opacity-50 text-dark':'bg-light text-dark'">
                      {{ i + 1 }}
                    </span>
                  </td>
                  <td>{{ r.business_name || r.full_name }}</td>
                  <td class="text-muted">{{ r.full_name }}</td>
                  <td class="text-center">{{ r.orders }}</td>
                  <td class="text-end fw-semibold">{{ fmtCurrency(r.revenue) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </template>

    <!-- Error -->
    <div v-else class="alert alert-danger mt-3">
      <i class="bi bi-exclamation-circle me-2"></i>{{ error }}
    </div>

    <!-- ── Create Owner Modal ── -->
    <div v-if="showCreateModal" class="modal-backdrop-custom" @click.self="showCreateModal=false">
      <div class="modal-card" style="max-width:460px;">
        <div class="modal-card__header">
          <h5 class="mb-0"><i class="bi bi-person-plus me-2"></i>Add Coil Manager</h5>
          <button class="btn-close" @click="showCreateModal=false"></button>
        </div>
        <div class="modal-card__body">
          <div class="alert alert-danger py-2 mb-3" v-if="createError">{{ createError }}</div>
          <div class="mb-3">
            <label class="form-label">Full Name</label>
            <input class="form-control" v-model="newOwner.full_name" placeholder="e.g. Raj Kumar" />
          </div>
          <div class="mb-3">
            <label class="form-label">Business Name</label>
            <input class="form-control" v-model="newOwner.business_name" placeholder="e.g. Kumar Steel Works" />
          </div>
          <div class="mb-3">
            <label class="form-label">Email</label>
            <input type="email" class="form-control" v-model="newOwner.email" placeholder="owner@example.com" />
          </div>
          <div class="mb-3">
            <label class="form-label">Password</label>
            <input type="password" class="form-control" v-model="newOwner.password" placeholder="Min 8 characters" />
          </div>
        </div>
        <div class="modal-card__footer">
          <button class="btn btn-secondary" @click="showCreateModal=false">Cancel</button>
          <button class="btn btn-primary" @click="createOwner" :disabled="creating">
            <span v-if="creating"><span class="spinner-border spinner-border-sm me-1"></span>Creating…</span>
            <span v-else>Create Owner</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ── Delete confirm modal ── -->
    <div v-if="deleteTarget" class="modal-backdrop-custom" @click.self="deleteTarget=null">
      <div class="modal-card" style="max-width:400px;">
        <div class="modal-card__header">
          <h5 class="mb-0 text-danger"><i class="bi bi-exclamation-triangle me-2"></i>Delete Owner</h5>
          <button class="btn-close" @click="deleteTarget=null"></button>
        </div>
        <div class="modal-card__body">
          <p>Delete <strong>{{ deleteTarget.full_name }}</strong> and all their data?
             This action cannot be undone.</p>
        </div>
        <div class="modal-card__footer">
          <button class="btn btn-secondary" @click="deleteTarget=null">Cancel</button>
          <button class="btn btn-danger" @click="deleteOwner" :disabled="deleting">
            <span v-if="deleting"><span class="spinner-border spinner-border-sm me-1"></span>Deleting…</span>
            <span v-else>Delete</span>
          </button>
        </div>
      </div>
    </div>

  </div>
  `,

  data() {
    return {
      loading: true,
      error: null,
      stats: {},
      owners: [],
      search: "",
      filterStatus: "",
      showCreateModal: false,
      newOwner: { full_name: "", business_name: "", email: "", password: "" },
      createError: null,
      creating: false,
      deleteTarget: null,
      deleting: false,
    };
  },

  computed: {
    filteredOwners() {
      let list = this.owners;
      if (this.search.trim()) {
        const q = this.search.toLowerCase();
        list = list.filter(o =>
          (o.full_name || "").toLowerCase().includes(q) ||
          (o.business_name || "").toLowerCase().includes(q) ||
          (o.email || "").toLowerCase().includes(q)
        );
      }
      if (this.filterStatus === "active")    list = list.filter(o => o.is_active);
      if (this.filterStatus === "suspended") list = list.filter(o => !o.is_active);
      return list;
    },
  },

  methods: {
    token() { return localStorage.getItem("auth-token"); },

    async load() {
      this.loading = true;
      this.error = null;
      try {
        const [dashRes, ownersRes] = await Promise.all([
          fetch("/api/admin/dashboard", { headers: { "Authentication-Token": this.token() } }),
          fetch("/api/admin/owners",    { headers: { "Authentication-Token": this.token() } }),
        ]);
        if (!dashRes.ok || !ownersRes.ok) throw new Error("Failed to load admin data.");
        this.stats  = await dashRes.json();
        this.owners = await ownersRes.json();
      } catch (e) {
        this.error = e.message;
      } finally {
        this.loading = false;
      }
    },

    async toggleOwner(owner) {
      try {
        const res = await fetch(`/api/admin/owners/${owner.id}/toggle`, {
          method: "POST",
          headers: { "Authentication-Token": this.token() },
        });
        if (!res.ok) throw new Error("Failed to toggle owner status.");
        const data = await res.json();
        owner.is_active = data.is_active;
      } catch (e) {
        alert(e.message);
      }
    },

    confirmDelete(owner) { this.deleteTarget = owner; },

    async deleteOwner() {
      this.deleting = true;
      try {
        const res = await fetch(`/api/admin/owners/${this.deleteTarget.id}`, {
          method: "DELETE",
          headers: { "Authentication-Token": this.token() },
        });
        if (!res.ok) throw new Error("Delete failed.");
        this.owners = this.owners.filter(o => o.id !== this.deleteTarget.id);
        this.deleteTarget = null;
        this.load();
      } catch (e) {
        alert(e.message);
      } finally {
        this.deleting = false;
      }
    },

    openCreateModal() {
      this.newOwner = { full_name: "", business_name: "", email: "", password: "" };
      this.createError = null;
      this.showCreateModal = true;
    },

    async createOwner() {
      this.createError = null;
      if (!this.newOwner.email || !this.newOwner.password) {
        this.createError = "Email and password are required.";
        return;
      }
      if (this.newOwner.password.length < 8) {
        this.createError = "Password must be at least 8 characters.";
        return;
      }
      this.creating = true;
      try {
        const res = await fetch("/api/admin/owners", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authentication-Token": this.token(),
          },
          body: JSON.stringify(this.newOwner),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create owner.");
        this.showCreateModal = false;
        this.load();
      } catch (e) {
        this.createError = e.message;
      } finally {
        this.creating = false;
      }
    },

    fmtCurrency(val) {
      if (!val && val !== 0) return "—";
      return "₹" + Number(val).toLocaleString("en-IN", { maximumFractionDigits: 0 });
    },
  },

  mounted() { this.load(); },
};
