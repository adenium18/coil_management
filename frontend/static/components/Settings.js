export default {
  name: "Settings",
  template: `
  <div class="page-wrapper">
    <div class="page-header">
      <div>
        <h1 class="page-title">Company Settings</h1>
        <p class="page-sub">Business profile, GST details &amp; invoice preferences</p>
      </div>
      <button class="btn btn-primary" @click="save" :disabled="saving">
        <span v-if="saving"><span class="spinner-border spinner-border-sm me-1"></span>Saving…</span>
        <span v-else><i class="bi bi-floppy me-1"></i>Save Settings</span>
      </button>
    </div>

    <div v-if="loading" class="d-flex justify-content-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <div v-else class="settings-grid">

      <!-- Company Profile -->
      <div class="card">
        <div class="card-header">
          <h5 class="mb-0"><i class="bi bi-building me-2 text-primary"></i>Company Profile</h5>
        </div>
        <div class="card-body">
          <div class="mb-3">
            <label class="form-label">Company Name</label>
            <input class="form-control" v-model="form.company_name" placeholder="e.g. Kumar Steel Works Pvt Ltd" />
          </div>
          <div class="mb-3">
            <label class="form-label">Address</label>
            <textarea class="form-control" rows="3" v-model="form.address"
                      placeholder="Full business address"></textarea>
          </div>
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">Phone</label>
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-telephone"></i></span>
                <input class="form-control" v-model="form.phone" placeholder="+91 98765 43210" />
              </div>
            </div>
            <div class="col-md-6">
              <label class="form-label">Email</label>
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-envelope"></i></span>
                <input type="email" class="form-control" v-model="form.email" placeholder="company@email.com" />
              </div>
            </div>
          </div>
          <div class="row g-3 mt-1">
            <div class="col-md-6">
              <label class="form-label">State</label>
              <input class="form-control" v-model="form.state" placeholder="e.g. Maharashtra" />
            </div>
            <div class="col-md-6">
              <label class="form-label">Currency</label>
              <select class="form-select" v-model="form.currency">
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- GST Details -->
      <div class="card">
        <div class="card-header">
          <h5 class="mb-0"><i class="bi bi-percent me-2 text-success"></i>GST &amp; Tax</h5>
        </div>
        <div class="card-body">
          <div class="mb-3">
            <label class="form-label">GSTIN</label>
            <input class="form-control" v-model="form.gstin"
                   placeholder="27AAAAA0000A1Z5" maxlength="15"
                   style="text-transform:uppercase;"
                   @input="form.gstin = form.gstin.toUpperCase()" />
            <div class="form-text">15-digit GST Identification Number</div>
          </div>
          <div class="mb-3">
            <label class="form-label">Default Tax Rate (%)</label>
            <div class="input-group">
              <input type="number" class="form-control" v-model.number="form.default_tax"
                     min="0" max="28" step="0.5" placeholder="18" />
              <span class="input-group-text">%</span>
            </div>
            <div class="form-text">Applied automatically on new invoices (can override per order)</div>
          </div>
        </div>
      </div>

      <!-- Invoice Settings -->
      <div class="card">
        <div class="card-header">
          <h5 class="mb-0"><i class="bi bi-receipt me-2 text-amber"></i>Invoice Settings</h5>
        </div>
        <div class="card-body">
          <div class="mb-3">
            <label class="form-label">Invoice Prefix</label>
            <div class="input-group">
              <input class="form-control" v-model="form.invoice_prefix"
                     placeholder="INV" maxlength="10"
                     style="max-width:160px;" />
              <span class="input-group-text text-muted">-0001, -0002, …</span>
            </div>
          </div>
          <div class="alert alert-info py-2" style="font-size:13px;">
            <i class="bi bi-info-circle me-1"></i>
            Invoices will be numbered: <strong>{{ form.invoice_prefix || 'INV' }}-0001</strong>,
            <strong>{{ form.invoice_prefix || 'INV' }}-0002</strong>, etc.
          </div>
        </div>
      </div>

      <!-- Bank Details -->
      <div class="card">
        <div class="card-header">
          <h5 class="mb-0"><i class="bi bi-bank me-2 text-primary"></i>Bank Details</h5>
        </div>
        <div class="card-body">
          <div class="mb-3">
            <label class="form-label">Bank Name</label>
            <input class="form-control" v-model="form.bank_name" placeholder="e.g. State Bank of India" />
          </div>
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">Account Number</label>
              <input class="form-control" v-model="form.bank_account" placeholder="Account number" />
            </div>
            <div class="col-md-6">
              <label class="form-label">IFSC Code</label>
              <input class="form-control" v-model="form.bank_ifsc"
                     placeholder="SBIN0001234"
                     style="text-transform:uppercase;"
                     @input="form.bank_ifsc = form.bank_ifsc.toUpperCase()" />
            </div>
          </div>
          <div class="form-text mt-2">Bank details will appear on printed invoices.</div>
        </div>
      </div>

    </div>

    <!-- Success toast handled via $toast -->
  </div>
  `,

  data() {
    return {
      loading: true,
      saving: false,
      form: {
        company_name: "", address: "", phone: "", email: "",
        gstin: "", state: "", bank_name: "", bank_account: "", bank_ifsc: "",
        invoice_prefix: "INV", default_tax: 0, currency: "INR",
      },
    };
  },

  methods: {
    token() { return localStorage.getItem("auth-token"); },

    async load() {
      this.loading = true;
      try {
        const res = await fetch("/api/settings", {
          headers: { "Authentication-Token": this.token() },
        });
        if (res.ok) {
          const data = await res.json();
          Object.assign(this.form, data);
        }
      } finally {
        this.loading = false;
      }
    },

    async save() {
      this.saving = true;
      try {
        const res = await fetch("/api/settings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authentication-Token": this.token(),
          },
          body: JSON.stringify(this.form),
        });
        if (res.ok) {
          this.$toast.success("Settings saved successfully!");
          // Update localStorage business name
          if (this.form.company_name) {
            localStorage.setItem("business_name", this.form.company_name);
          }
        } else {
          this.$toast.error("Failed to save settings.");
        }
      } catch {
        this.$toast.error("Network error. Please try again.");
      } finally {
        this.saving = false;
      }
    },
  },

  mounted() { this.load(); },
};
