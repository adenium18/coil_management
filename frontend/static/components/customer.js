export default {
  name: "Customers",
  template: `
  <div class="page-wrapper">
    <div class="page-header">
      <div>
        <h1 class="page-title">Customers</h1>
        <p class="page-sub">{{ customers.length }} customer{{ customers.length !== 1 ? 's' : '' }}</p>
      </div>
      <button class="btn btn-primary" @click="openAddModal">
        <i class="bi bi-person-plus me-1"></i>Add Customer
      </button>
    </div>

    <!-- Search bar -->
    <div class="card mb-3">
      <div class="card-body py-3">
        <div class="input-group">
          <span class="input-group-text"><i class="bi bi-search"></i></span>
          <input class="form-control" v-model="searchQuery" placeholder="Search by name or phone…" />
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="d-flex justify-content-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>
    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <!-- Table -->
    <div v-else class="card">
      <div class="table-responsive">
        <table class="table table-hover mb-0">
          <thead class="table-head-accent">
            <tr>
              <th>Customer</th>
              <th>Phone</th>
              <th class="text-end">Total Purchases</th>
              <th class="text-end">Outstanding</th>
              <th class="text-center">Orders</th>
              <th class="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!filteredCustomers.length">
              <td colspan="6" class="text-center text-muted py-5">
                <i class="bi bi-people display-4 d-block mb-2"></i>No customers found.
              </td>
            </tr>
            <tr v-for="c in filteredCustomers" :key="c.id">
              <td>
                <div class="d-flex align-items-center gap-2">
                  <div class="customer-avatar">{{ (c.name||'?')[0].toUpperCase() }}</div>
                  <div>
                    <div class="fw-semibold">{{ c.name }}</div>
                    <div class="text-muted" style="font-size:12px;">{{ c.email || c.gstin || '' }}</div>
                  </div>
                </div>
              </td>
              <td>{{ c.phone || '—' }}</td>
              <td class="text-end fw-semibold">{{ fmt(c.total_purchases) }}</td>
              <td class="text-end">
                <span :class="(c.balance||0) > 0 ? 'text-danger fw-semibold' : 'text-muted'">
                  {{ fmt(c.balance) }}
                </span>
              </td>
              <td class="text-center">
                <button class="btn btn-link btn-sm p-0" @click="openAnalytics(c)">
                  <span class="badge bg-primary">View</span>
                </button>
              </td>
              <td class="text-center">
                <div class="d-flex gap-1 justify-content-center">
                  <button class="btn btn-sm btn-outline-secondary" @click="openEditModal(c)" title="Edit">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-danger" @click="deleteCustomer(c.id)" title="Delete">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Edit / Add modal ── -->
    <div v-if="editModal.show" class="modal-backdrop-custom" @click.self="editModal.show=false">
      <div class="modal-card" style="max-width:480px;">
        <div class="modal-card__header">
          <h5 class="mb-0">
            <i class="bi me-2" :class="editModal.isNew ? 'bi-person-plus' : 'bi-pencil'"></i>
            {{ editModal.isNew ? 'Add Customer' : 'Edit Customer' }}
          </h5>
          <button class="btn-close" @click="editModal.show=false"></button>
        </div>
        <div class="modal-card__body">
          <div class="row g-3">
            <div class="col-12">
              <label class="form-label">Full Name <span class="text-danger">*</span></label>
              <input class="form-control" v-model="editModal.data.name" placeholder="Customer name" required />
            </div>
            <div class="col-md-6">
              <label class="form-label">Phone</label>
              <input class="form-control" v-model="editModal.data.phone" placeholder="+91 98765 43210" />
            </div>
            <div class="col-md-6">
              <label class="form-label">Email</label>
              <input type="email" class="form-control" v-model="editModal.data.email" placeholder="email@example.com" />
            </div>
            <div class="col-12">
              <label class="form-label">Address</label>
              <textarea class="form-control" rows="2" v-model="editModal.data.address" placeholder="Full address"></textarea>
            </div>
            <div class="col-md-6">
              <label class="form-label">GSTIN</label>
              <input class="form-control" v-model="editModal.data.gstin" placeholder="27AAAAA0000A1Z5" maxlength="15" />
            </div>
            <div class="col-md-6">
              <label class="form-label">Notes</label>
              <input class="form-control" v-model="editModal.data.notes" placeholder="Any notes" />
            </div>
          </div>
        </div>
        <div class="modal-card__footer">
          <button class="btn btn-secondary" @click="editModal.show=false">Cancel</button>
          <button class="btn btn-primary" @click="saveCustomer" :disabled="editModal.saving">
            <span v-if="editModal.saving"><span class="spinner-border spinner-border-sm me-1"></span>Saving…</span>
            <span v-else>{{ editModal.isNew ? 'Add Customer' : 'Save Changes' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ── Analytics / History modal ── -->
    <div v-if="analyticsModal.show" class="modal-backdrop-custom" @click.self="analyticsModal.show=false">
      <div class="modal-card" style="max-width:600px;">
        <div class="modal-card__header">
          <h5 class="mb-0"><i class="bi bi-bar-chart-line me-2 text-primary"></i>{{ analyticsModal.name }}</h5>
          <button class="btn-close" @click="analyticsModal.show=false"></button>
        </div>
        <div class="modal-card__body">
          <div v-if="analyticsModal.loading" class="text-center py-4">
            <div class="spinner-border text-primary"></div>
          </div>
          <template v-else-if="analyticsModal.data">
            <!-- Summary stats -->
            <div class="d-flex gap-3 flex-wrap mb-4">
              <div class="analytics-stat">
                <div class="analytics-stat__val">{{ analyticsModal.data.total_orders }}</div>
                <div class="analytics-stat__lbl">Orders</div>
              </div>
              <div class="analytics-stat">
                <div class="analytics-stat__val">{{ fmt(analyticsModal.data.total_spent) }}</div>
                <div class="analytics-stat__lbl">Total Spent</div>
              </div>
              <div class="analytics-stat text-success">
                <div class="analytics-stat__val">{{ fmt(analyticsModal.data.total_paid) }}</div>
                <div class="analytics-stat__lbl">Paid</div>
              </div>
              <div class="analytics-stat" :class="analyticsModal.data.outstanding > 0 ? 'text-danger' : 'text-muted'">
                <div class="analytics-stat__val">{{ fmt(analyticsModal.data.outstanding) }}</div>
                <div class="analytics-stat__lbl">Outstanding</div>
              </div>
            </div>

            <!-- Recent orders -->
            <h6 class="fw-semibold mb-2">Recent Orders</h6>
            <div class="table-responsive">
              <table class="table table-sm mb-0">
                <thead class="table-light">
                  <tr><th>Date</th><th>Amount</th><th>Status</th><th>Payment</th></tr>
                </thead>
                <tbody>
                  <tr v-for="o in analyticsModal.data.recent_orders" :key="o.id">
                    <td>{{ o.date }}</td>
                    <td>{{ fmt(o.amount) }}</td>
                    <td><span class="badge" :class="orderBadge(o.status)">{{ capitalize(o.status) }}</span></td>
                    <td><span class="badge" :class="payBadge(o.payment_status)">{{ capitalize(o.payment_status) }}</span></td>
                  </tr>
                  <tr v-if="!analyticsModal.data.recent_orders.length">
                    <td colspan="4" class="text-muted text-center">No orders yet.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Top products -->
            <div v-if="analyticsModal.data.top_products.length" class="mt-3">
              <h6 class="fw-semibold mb-2">Most Ordered Products</h6>
              <div class="d-flex flex-wrap gap-2">
                <span v-for="p in analyticsModal.data.top_products" :key="p.name"
                      class="badge bg-light text-dark border">
                  {{ p.name }} — {{ p.total_length.toFixed(1) }} m
                </span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

  </div>
  `,

  data() {
    return {
      customers: [],
      searchQuery: "",
      loading: true,
      error: null,
      editModal: {
        show: false, isNew: false, saving: false,
        data: { id: null, name: "", phone: "", email: "", address: "", gstin: "", notes: "" },
      },
      analyticsModal: {
        show: false, loading: false, name: "", data: null,
      },
    };
  },

  computed: {
    filteredCustomers() {
      if (!this.searchQuery.trim()) return this.customers;
      const q = this.searchQuery.toLowerCase();
      return this.customers.filter(c =>
        (c.name||"").toLowerCase().includes(q) ||
        (c.phone||"").toLowerCase().includes(q) ||
        (c.email||"").toLowerCase().includes(q)
      );
    },
  },

  methods: {
    token() { return localStorage.getItem("auth-token"); },

    async fetchCustomers() {
      this.loading = true; this.error = null;
      try {
        const res = await fetch("/api/customers", { headers: { "Authentication-Token": this.token() } });
        if (res.ok) {
          const data = await res.json();
          this.customers = Array.isArray(data) ? data : [];
        } else if (res.status === 404) {
          this.customers = [];
        } else {
          this.error = "Failed to load customers.";
        }
      } catch { this.error = "Network error."; }
      finally { this.loading = false; }
    },

    openAddModal() {
      this.editModal = {
        show: true, isNew: true, saving: false,
        data: { id: null, name: "", phone: "", email: "", address: "", gstin: "", notes: "" },
      };
    },

    openEditModal(c) {
      this.editModal = {
        show: true, isNew: false, saving: false,
        data: { ...c },
      };
    },

    async saveCustomer() {
      if (!this.editModal.data.name?.trim()) { this.$toast.warning("Name is required."); return; }
      this.editModal.saving = true;
      try {
        let res;
        if (this.editModal.isNew) {
          res = await fetch("/api/parties", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authentication-Token": this.token() },
            body: JSON.stringify(this.editModal.data),
          });
        } else {
          res = await fetch(`/api/update/customer/${this.editModal.data.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authentication-Token": this.token() },
            body: JSON.stringify(this.editModal.data),
          });
        }
        if (!res.ok) throw new Error("Failed to save customer.");
        this.editModal.show = false;
        await this.fetchCustomers();
        this.$toast.success(this.editModal.isNew ? "Customer added!" : "Customer updated!");
      } catch (e) { this.$toast.error(e.message); }
      finally { this.editModal.saving = false; }
    },

    async deleteCustomer(id) {
      if (!confirm("Delete this customer? This cannot be undone.")) return;
      try {
        const res = await fetch(`/delete/customer/${id}`, {
          method: "DELETE", headers: { "Authentication-Token": this.token() },
        });
        if (!res.ok) throw new Error("Cannot delete — customer has existing orders.");
        await this.fetchCustomers();
        this.$toast.success("Customer deleted.");
      } catch (e) { this.$toast.error(e.message); }
    },

    async openAnalytics(c) {
      this.analyticsModal = { show: true, loading: true, name: c.name, data: null };
      try {
        const res = await fetch(`/api/customers/${c.id}/analytics`, {
          headers: { "Authentication-Token": this.token() },
        });
        if (res.ok) this.analyticsModal.data = await res.json();
      } finally { this.analyticsModal.loading = false; }
    },

    fmt(v) { if (!v && v !== 0) return "—"; return "₹" + Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 }); },
    capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : "—"; },
    orderBadge(s) { return { confirmed:"bg-primary", draft:"bg-secondary", cancelled:"bg-danger" }[s] || "bg-secondary"; },
    payBadge(s) { return { paid:"bg-success", partial:"bg-warning text-dark", pending:"bg-danger" }[s] || "bg-secondary"; },
  },

  mounted() { this.fetchCustomers(); },
};
