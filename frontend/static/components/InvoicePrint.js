export default {
  name: "InvoicePrint",
  template: `
  <div class="page-wrapper">
    <div class="page-header no-print">
      <div>
        <h1 class="page-title">Invoice</h1>
        <p class="page-sub" v-if="invoice">{{ invoice.sale.invoice_number }}</p>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-outline-secondary" @click="$router.back()">
          <i class="bi bi-arrow-left me-1"></i>Back
        </button>
        <button class="btn btn-primary" @click="printInvoice">
          <i class="bi bi-printer me-1"></i>Print Invoice
        </button>
      </div>
    </div>

    <div v-if="loading" class="d-flex justify-content-center py-5 no-print">
      <div class="spinner-border text-primary"></div>
    </div>

    <div v-else-if="error" class="alert alert-danger no-print">{{ error }}</div>

    <!-- Invoice document -->
    <div v-else-if="invoice" class="invoice-doc" id="invoice-print">

      <!-- Header -->
      <div class="invoice-header">
        <div class="invoice-company">
          <h2 class="invoice-company__name">{{ invoice.company.name }}</h2>
          <p class="invoice-company__address" v-if="invoice.company.address">
            {{ invoice.company.address }}
          </p>
          <p v-if="invoice.company.phone">
            <i class="bi bi-telephone"></i> {{ invoice.company.phone }}
          </p>
          <p v-if="invoice.company.email">
            <i class="bi bi-envelope"></i> {{ invoice.company.email }}
          </p>
          <p v-if="invoice.company.gstin">
            <strong>GSTIN:</strong> {{ invoice.company.gstin }}
          </p>
        </div>
        <div class="invoice-meta">
          <div class="invoice-meta__box">
            <div class="invoice-meta__label">INVOICE</div>
            <div class="invoice-meta__number">{{ invoice.sale.invoice_number }}</div>
          </div>
          <table class="invoice-meta__table">
            <tr>
              <td>Date:</td>
              <td><strong>{{ formatDate(invoice.sale.date) }}</strong></td>
            </tr>
            <tr>
              <td>Status:</td>
              <td>
                <span class="badge" :class="statusBadge(invoice.sale.payment_status)">
                  {{ capitalize(invoice.sale.payment_status) }}
                </span>
              </td>
            </tr>
            <tr v-if="invoice.sale.transport_details">
              <td>Transport:</td>
              <td>{{ invoice.sale.transport_details }}</td>
            </tr>
          </table>
        </div>
      </div>

      <hr class="invoice-divider" />

      <!-- Bill To -->
      <div class="invoice-bill-section">
        <div>
          <div class="invoice-bill-section__label">BILL TO</div>
          <div class="invoice-bill-section__name">{{ invoice.party.name }}</div>
          <div class="invoice-bill-section__detail" v-if="invoice.party.phone">
            <i class="bi bi-telephone"></i> {{ invoice.party.phone }}
          </div>
          <div class="invoice-bill-section__detail" v-if="invoice.party.address">
            {{ invoice.party.address }}
          </div>
          <div class="invoice-bill-section__detail" v-if="invoice.party.gstin">
            <strong>GSTIN:</strong> {{ invoice.party.gstin }}
          </div>
        </div>
      </div>

      <!-- Items table -->
      <table class="invoice-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Coil</th>
            <th>Product</th>
            <th class="text-center">Length (m)</th>
            <th class="text-center">Qty</th>
            <th class="text-end">Rate (₹/m)</th>
            <th class="text-end">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, i) in invoice.items" :key="i">
            <td>{{ i + 1 }}</td>
            <td>{{ item.coil_number }}</td>
            <td>{{ item.make }} {{ item.type }} {{ item.color }}</td>
            <td class="text-center">{{ item.length }}</td>
            <td class="text-center">{{ item.quantity }}</td>
            <td class="text-end">{{ fmt(item.rate) }}</td>
            <td class="text-end fw-semibold">{{ fmt(item.amount) }}</td>
          </tr>
        </tbody>
      </table>

      <!-- Totals -->
      <div class="invoice-totals">
        <table class="invoice-totals__table">
          <tr>
            <td>Subtotal</td>
            <td>{{ fmt(invoice.sale.total_amount) }}</td>
          </tr>
          <tr v-if="invoice.sale.discount > 0">
            <td>Discount</td>
            <td class="text-danger">- {{ fmt(invoice.sale.discount) }}</td>
          </tr>
          <tr v-if="invoice.sale.tax_rate > 0">
            <td>GST ({{ invoice.sale.tax_rate }}%)</td>
            <td>+ {{ fmt(invoice.sale.tax_amount) }}</td>
          </tr>
          <tr class="invoice-totals__grand">
            <td>Total</td>
            <td>{{ fmt(invoice.sale.net_amount || invoice.sale.total_amount) }}</td>
          </tr>
          <tr v-if="(invoice.sale.amount_paid || 0) > 0">
            <td>Amount Paid</td>
            <td class="text-success">{{ fmt(invoice.sale.amount_paid) }}</td>
          </tr>
          <tr v-if="outstanding > 0" class="text-danger">
            <td><strong>Outstanding</strong></td>
            <td><strong>{{ fmt(outstanding) }}</strong></td>
          </tr>
        </table>
      </div>

      <!-- Notes -->
      <div class="invoice-notes" v-if="invoice.sale.notes">
        <strong>Notes:</strong> {{ invoice.sale.notes }}
      </div>

      <!-- Bank details -->
      <div class="invoice-bank" v-if="invoice.company.bank_name">
        <strong>Bank Details:</strong>
        {{ invoice.company.bank_name }} |
        A/C: {{ invoice.company.bank_account }} |
        IFSC: {{ invoice.company.bank_ifsc }}
      </div>

      <!-- Footer -->
      <div class="invoice-footer">
        <div></div>
        <div class="invoice-footer__sign">
          <div class="invoice-footer__sign-line"></div>
          <div>Authorised Signatory</div>
          <div>{{ invoice.company.name }}</div>
        </div>
      </div>

    </div>
  </div>
  `,

  data() {
    return { invoice: null, loading: true, error: null };
  },

  computed: {
    outstanding() {
      if (!this.invoice) return 0;
      const net = this.invoice.sale.net_amount || this.invoice.sale.total_amount || 0;
      return Math.max(net - (this.invoice.sale.amount_paid || 0), 0);
    },
  },

  methods: {
    token() { return localStorage.getItem("auth-token"); },

    async load() {
      const saleId = this.$route.params.id || this.$route.query.id;
      if (!saleId) { this.error = "No sale ID provided."; this.loading = false; return; }
      try {
        const res = await fetch(`/api/sales/${saleId}/invoice`, {
          headers: { "Authentication-Token": this.token() },
        });
        if (!res.ok) throw new Error("Invoice not found.");
        this.invoice = await res.json();
      } catch (e) {
        this.error = e.message;
      } finally {
        this.loading = false;
      }
    },

    printInvoice() { window.print(); },

    fmt(val) {
      if (!val && val !== 0) return "—";
      return "₹" + Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    formatDate(dt) {
      if (!dt) return "—";
      return dt.split(" ")[0];
    },

    capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : "—"; },

    statusBadge(s) {
      return { paid: "bg-success", partial: "bg-warning text-dark", pending: "bg-danger" }[s] || "bg-secondary";
    },
  },

  mounted() { this.load(); },
};
