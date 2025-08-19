export default {
  name: "SaleOrders",
  template: `
    <div>
      <h2 class="text-center">📦 Sale Orders</h2>

      <!-- Filters -->
      <div class="row mb-3">
        <div class="col-md-3">
          <input v-model="filters.query" class="form-control" placeholder="Search party, coil, make..." />
        </div>
        <div class="col-md-2">
          <input v-model="filters.date" type="date" class="form-control" />
        </div>
        <div class="col-md-2">
          <select v-model="filters.month" class="form-select">
            <option value="">Month</option>
            <option v-for="m in 12" :key="m" :value="m">{{ m }}</option>
          </select>
        </div>
        <div class="col-md-2">
          <input v-model="filters.year" type="number" class="form-control" placeholder="Year" />
        </div>
        <div class="col-md-3">
          <button @click="applyFilters" class="btn btn-info">Apply Filters</button>
          <button @click="clearFilters" class="btn btn-secondary ms-2">Reset</button>
        </div>
      </div>

      <!-- Buttons -->
      <div class="text-center mb-3">
        <button class="btn btn-outline-success me-2" @click="exportCSV" :disabled="exporting">
          {{ exporting ? 'Exporting...' : 'Export CSV' }}
        </button>
        <button class="btn btn-outline-primary me-2" @click="toggleView">
          {{ showSummary ? 'Show Sale Orders' : 'Show Product Summary' }}
        </button>
        <!-- CSV Import -->
        <input type="file" accept=".csv" @change="importCSV" ref="fileInput" class="d-none" />
        <button class="btn btn-outline-warning" @click="$refs.fileInput.click()">
          Import CSV
        </button>
      </div>

      <!-- Loading / Error -->
      <div v-if="loading" class="text-center text-primary">Loading...</div>
      <div v-if="error" class="text-center text-danger">{{ error }}</div>

      <!-- Sales Orders Table -->
      <div v-if="!showSummary && filteredSales.length && !loading" class="table-responsive">
        <table class="table table-striped table-hover text-center">
          <thead class="table-dark">
            <tr>
              <th>Sale ID</th>
              <th>Date</th>
              <th>Party Name</th>
              <th>Phone</th>
              <th>Coil Number</th>
              <th>Make</th>
              <th>Type</th>
              <th>Color</th>
              <th>Length</th>
              <th>Rate</th>
              <th>Amount</th>
              <th>Total Amount</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="(sale, index) in filteredSales" :key="'sale-' + index">
              <tr v-for="(row, rowIndex) in sale.rows" :key="'row-' + rowIndex">
                <td v-if="rowIndex === 0" :rowspan="sale.rows.length">{{ sale.saleId }}</td>
                <td v-if="rowIndex === 0" :rowspan="sale.rows.length">{{ formatDate(sale.date) }}</td>
                <td v-if="rowIndex === 0" :rowspan="sale.rows.length">{{ sale.partyName }}</td>
                <td v-if="rowIndex === 0" :rowspan="sale.rows.length">{{ sale.partyPhone }}</td>
                <td>{{ row.coilNumber }}</td>
                <td>{{ row.make }}</td>
                <td>{{ row.type }}</td>
                <td>{{ row.color }}</td>
                <td>{{ row.length }}</td>
                <td>{{ row.rate }}</td>
                <td>{{ row.amount }}</td>
                <td v-if="rowIndex === 0" 
                    :rowspan="sale.rows.length" 
                    class="fw-bold text-white" 
                    style="background-color:#198754;">
                  {{ sale.totalAmount }}
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Product Summary Report -->
      <div v-if="showSummary && !loading" class="table-responsive">
        <h4 class="text-center">📊 Product Summary Report</h4>
        <table class="table table-bordered table-hover text-center">
          <thead class="table-dark">
            <tr>
              <th>Make</th>
              <th>Type</th>
              <th>Color</th>
              <th>Total Quantity</th>
              <th>Total Length</th>
              <th>Average Rate</th>
              <th>Total Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(summary, index) in productSummary" :key="'summary-' + index">
              <td>{{ summary.make }}</td>
              <td>{{ summary.type }}</td>
              <td>{{ summary.color }}</td>
              <td>{{ summary.totalQuantity }}</td>
              <td>{{ summary.totalLength }}</td>
              <td>{{ summary.avgRate.toFixed(2) }}</td>
              <td class="fw-bold text-success">{{ summary.totalAmount }}</td>
            </tr>
          </tbody>
        </table>
      </div>   

      <div v-else-if="!loading || !showSummary" class="text-center text-danger">
        No sale orders available.
      </div>
    </div>
  `,
  data() {
    return {
      sales: [],
      filters: {
        query: "",
        date: "",
        month: "",
        year: ""
      },
      loading: true,
      error: null,
      exporting: false,
      showSummary: false,
      token: localStorage.getItem("auth-token") || ""
    };
  },
  computed: {
    /* same computed props as your version (mergedSales, filteredSales, productSummary) */
    mergedSales() {
      if (!Array.isArray(this.sales)) return [];
      return this.sales.map(sale => {
        const coils = Array.isArray(sale.used_coils) ? sale.used_coils : [];
        let rows = [];
        coils.forEach(coil => {
          const items = Array.isArray(coil.items) ? coil.items : [];
          items.forEach(item => {
            rows.push({
              coilNumber: coil.coil_number || "",
              make: coil.make || "",
              type: coil.type || "",
              color: coil.color || "",
              length: item.length || 0,
              rate: item.rate || 0,
              amount: item.amount || 0
            });
          });
        });
        return {
          saleId: sale.sale_id || "",
          date: sale.date || "",
          partyName: sale.party?.name || "",
          partyPhone: sale.party?.phone || "",
          totalAmount: sale.total_amount || 0,
          rows
        };
      });
    },
    filteredSales() {
      return this.mergedSales.filter(sale => {
        let match = true;
        const dateObj = sale.date ? new Date(sale.date) : null;

        if (this.filters.query) {
          const q = this.filters.query.toLowerCase();
          match = match && (
            sale.partyName.toLowerCase().includes(q) ||
            sale.partyPhone.toLowerCase().includes(q) ||
            sale.rows.some(r =>
              r.make.toLowerCase().includes(q) ||
              r.type.toLowerCase().includes(q) ||
              r.color.toLowerCase().includes(q) ||
              r.coilNumber.toLowerCase().includes(q)
            )
          );
        }
        if (this.filters.date) {
          match = match && (dateObj?.toISOString().slice(0,10) === this.filters.date);
        }
        if (this.filters.month) {
          match = match && (dateObj?.getMonth() + 1 === Number(this.filters.month));
        }
        if (this.filters.year) {
          match = match && (dateObj?.getFullYear() === Number(this.filters.year));
        }
        return match;
      });
    },
    productSummary() {
      let summaryMap = {};
      this.filteredSales.forEach(sale => {
        sale.rows.forEach(row => {
          const key = `${row.make}-${row.type}-${row.color}`;
          if (!summaryMap[key]) {
            summaryMap[key] = {
              make: row.make,
              type: row.type,
              color: row.color,
              totalQuantity: 0,
              totalLength: 0,
              totalRate: 0,
              count: 0,
              totalAmount: 0
            };
          }
          summaryMap[key].totalQuantity += 1;
          summaryMap[key].totalLength += Number(row.length) || 0;
          summaryMap[key].totalRate += Number(row.rate) || 0;
          summaryMap[key].totalAmount += Number(row.amount) || 0;
          summaryMap[key].count += 1;
        });
      });
      return Object.values(summaryMap).map(s => ({
        ...s,
        avgRate: s.count ? s.totalRate / s.count : 0
      }));
    }
  },
  methods: {
    async fetchSales() {
      try {
        const res = await fetch("/api/all_orders", {
          method: "GET",
          headers: { "Authentication-Token": this.token }
        });
        if (!res.ok) throw new Error("Failed to fetch sale orders");
        const data = await res.json();
        this.sales = Array.isArray(data) ? data : [];
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
    toggleView() {
      this.showSummary = !this.showSummary;
    },
    exportCSV() {
      try {
        this.exporting = true;

        let rows = [];
        if (this.showSummary) {
          rows.push(["Make", "Type", "Color", "Total Quantity", "Total Length", "Average Rate", "Total Amount"]);
          this.productSummary.forEach(s => {
            rows.push([
              s.make, s.type, s.color,
              s.totalQuantity, s.totalLength,
              s.avgRate.toFixed(2), s.totalAmount
            ]);
          });
        } else {
          rows.push(["Sale ID","Date","Party Name","Phone","Coil Number","Make","Type","Color","Length","Rate","Amount","Total Amount"]);
          this.filteredSales.forEach(sale => {
            sale.rows.forEach((r, idx) => {
              rows.push([
                idx === 0 ? sale.saleId : "",
                idx === 0 ? this.formatDate(sale.date) : "",
                idx === 0 ? sale.partyName : "",
                idx === 0 ? sale.partyPhone : "",
                r.coilNumber, r.make, r.type, r.color,
                r.length, r.rate, r.amount,
                idx === 0 ? sale.totalAmount : ""
              ]);
            });
          });
        }

        const csvContent = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = this.showSummary ? "product_summary.csv" : "sale_orders.csv";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        alert(err.message);
      } finally {
        this.exporting = false;
      }
    },
importCSV(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async e => {
    const text = e.target.result;
    const rows = text.split("\n").map(r => r.split(",").map(v => v.replace(/"/g, "")));
    const headers = rows[0];
    const dataRows = rows.slice(1);

    let imported = [];
    dataRows.forEach(row => {
      if (row.length < 12) return;
      imported.push({
        sale_id: row[0],
        date: row[1],
        party: { name: row[2], phone: row[3] },
        used_coils: [{
          coil_number: row[4],
          make: row[5],
          type: row[6],
          color: row[7],
          items: [{
            length: Number(row[8]),
            rate: Number(row[9]),
            amount: Number(row[10])
          }]
        }],
        total_amount: Number(row[11]) || 0
      });
    });

    if (!imported.length) {
      alert("❌ No valid rows found in CSV.");
      return;
    }

    try {
      // 🔹 Send imported data to backend
      const res = await fetch("/api/add_orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authentication-Token": this.token
        },
        body: JSON.stringify(imported)   // send as array
      });

      if (!res.ok) throw new Error("Failed to save orders to backend");

      const saved = await res.json();

      // 🔹 Update frontend state only if backend save succeeded
      this.sales = [...this.sales, ...saved];
      alert("✅ CSV Imported & Saved to Database!");
    } catch (err) {
      alert("⚠️ Import failed: " + err.message);
    }
  };
  reader.readAsText(file);
}
,
    formatDate(dateStr) {
      const date = new Date(dateStr);
      return date.toLocaleDateString();
    },
    applyFilters() {
      this.filters = { ...this.filters };
    },
    clearFilters() {
      this.filters = { query: "", date: "", month: "", year: "" };
    }
  },
  mounted() {
    this.fetchSales();
  }
};
