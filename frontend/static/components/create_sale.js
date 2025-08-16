export default {
  template: `
  <div class="container mt-4">
    <h2 class="text-center mb-3">Create New Sale Order</h2>

    <!-- Party Name -->
    <div class="mb-3">
      <label class="form-label">Customer Name :</label>
      <input class="form-control" v-model="partyName" @blur="checkCustomer" placeholder="Enter party / customer name" />
    </div>

    <!-- Customer Modal -->
    <div v-if="showCustomerModal" class="modal fade show d-block" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Select Customer</h5>
            <button type="button" class="close" @click="closeModal"> <span aria-hidden="true">&times;</span> </button>
          </div>
          <div class="modal-body">
            <p>We found existing customers with the name <b>{{ partyName }}</b>. Please select:</p>
            <ul class="list-group">
              <li v-for="c in customerMatches" :key="c.id"
                  class="list-group-item list-group-item-action"
                  @click="selectCustomer(c)">
                {{ c.name }} (ID: {{ c.id }})
              </li>
            </ul>
            <div class="mt-3 text-center">
              <button class="btn btn-outline-primary" @click="createNewCustomer">Create New Customer Anyway</button>
            </div>
          </div>
        </div>
      </div>
    </div>

       <!-- Coil Groups -->
    <div v-for="(group, gIdx) in coilGroups" :key="gIdx" class="border p-3 mb-4">
      <h5>Coil #{{ gIdx + 1 }}</h5>

      <div class="row g-3 mb-3">
        <!-- Coil Select -->
        <div class="col-md-6">
          <label class="form-label">Select Coil</label>
          <select class="form-select" v-model="group.selectedCoilId" @change="filterProductsByCoil(gIdx)">
            <option disabled value="">-- Select Coil --</option>
            <option v-for="c in coils" :key="c.id" :value="c.id">
              {{ c.coil_number }} — {{ c.make || '' }} {{ c.color ? '(' + c.color + ')' : '' }}
            </option>
          </select>
        </div>

        <!-- Product Select -->
        <div class="col-md-6">
          <label class="form-label">Product</label>
          <select class="form-select" v-model="group.selectedProductId" @change="onProductChange(gIdx)" :disabled="!group.selectedCoilId">
            <option disabled value="">-- Select Product --</option>
            <option v-for="p in group.filteredProducts" :key="p.id" :value="p.id">
              {{ p.make }} - {{ p.type }} - {{ p.color }}
            </option>
          </select>
        </div>

        <!-- Product Details -->
        <div class="col-md-12" v-if="group.selectedProduct">
          <div class="card p-2">
            <div><strong>Make:</strong> {{ group.selectedProduct.make || '-' }}</div>
            <div><strong>Type:</strong> {{ group.selectedProduct.type || '-' }}</div>
            <div><strong>Color:</strong> {{ group.selectedProduct.color || '-' }}</div>
            <div><strong>Rate (per ft):</strong> ₹{{ group.selectedProduct.rate != null ? group.selectedProduct.rate : '-' }}</div>
          </div>
        </div>
      </div>

      <!-- Items Table -->
      <div class="table-responsive">
        <table class="table table-bordered align-middle">
          <thead class="table-light">
            <tr>
              <th style="width:28%">Length (ft)</th>
              <th style="width:20%">Quantity</th>
              <th style="width:20%">Rate (₹ / ft)</th>
              <th style="width:20%">Amount (₹)</th>
              <th style="width:12%">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in group.items" :key="idx">
              <td>
                <input type="number" class="form-control"
                       v-model.number="item.length"
                       @input="onLengthInput(gIdx, idx)"
                       placeholder="e.g. 22" step="0.1" min="0" />
              </td>

              <td>
                <input type="number" class="form-control"
                       v-model.number="item.quantity"
                       @input="updateAmount(gIdx, idx)"
                       placeholder="pieces" min="0" />
              </td>

              <td>
                <input type="number" class="form-control" :value="item.rate ?? ''" readonly />
              </td>

              <td>
                <div class="form-control-plaintext">₹ {{ formatNumber(item.amount) }}</div>
              </td>

              <td class="text-center">
                <button class="btn btn-sm btn-danger" @click="removeItem(gIdx, idx)" type="button">Remove</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="d-flex justify-content-between align-items-center mt-2">
        <button class="btn btn-secondary" @click="addBlankItem(gIdx)" type="button">+ Add Row</button>
        <h5>Subtotal: <strong>₹ {{ formatNumber(groupSubtotal(gIdx)) }}</strong></h5>
      </div>

      <div class="text-end mt-2">
        <button class="btn btn-outline-danger btn-sm" @click="removeCoilGroup(gIdx)" v-if="coilGroups.length > 1">Remove Coil</button>
      </div>
    </div>

    <!-- Add Another Coil -->
    <div class="mb-4">
      <button class="btn btn-outline-primary" @click="addCoilGroup" type="button">+ Add Another Coil</button>
    </div>

    <!-- Total -->
    <div class="mt-3 text-center">
      <h4>Total Amount: <strong>₹ {{ formatNumber(totalAmount) }}</strong></h4>
      <button class="btn btn-primary mt-2" @click="createSale" :disabled="isSubmitting">Confirm Order</button>
    </div>
  </div>
  `,

  data() {
    return {
      partyName: "",
      selectedCustomerId: null,   // store selected or new customer id
      showCustomerModal: false,
      customerMatches: [],
      products: [],
      coils: [],
      coilGroups: [
        {
          selectedCoilId: "",
          filteredProducts: [],
          selectedProductId: "",
          selectedProduct: null,
          items: [{ length: null, quantity: null, rate: null, amount: 0 }]
        }
      ],
      token: localStorage.getItem("auth-token"),
      isSubmitting: false
    };
  },

  computed: {
    totalAmount() {
      return this.coilGroups.reduce((sum, g) => sum + this.groupSubtotalByGroup(g), 0);
    }
  },

  methods: {
    formatNumber(v) {
      return Number(v || 0).toFixed(2);
    },

    async checkCustomer() {
      if (!this.partyName.trim()) return;

      try {
        const res = await fetch(`/api/customer/search?name=${encodeURIComponent(this.partyName)}`, {
          headers: { "Authentication-Token": this.token }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) {
            // Multiple matches → show modal
            this.customerMatches = data;
            this.showCustomerModal = true;
          } else {
            // No matches → mark as new customer
            this.selectedCustomerId = null;
          }
        }
      } catch (err) {
        console.error("Customer check failed:", err);
      }
    },

    selectCustomer(c) {
      this.selectedCustomerId = c.id;
      this.partyName = c.name;
      this.showCustomerModal = false;
    },

    createNewCustomer() {
      this.selectedCustomerId = null; // backend will create a new one
      this.showCustomerModal = false;
    },

    closeModal() {
      this.showCustomerModal = false;
    },

    groupSubtotal(gIdx) {
      return this.groupSubtotalByGroup(this.coilGroups[gIdx]);
    },
    groupSubtotalByGroup(group) {
      return group.items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
    },
    async fetchData() {
      try {
        const headers = { "Authentication-Token": this.token };
        const [prodRes, coilRes] = await Promise.all([
          fetch("/api/products", { headers }),
          fetch("/api/coils", { headers })
        ]);
        if (prodRes.ok) this.products = await prodRes.json();
        if (coilRes.ok) this.coils = await coilRes.json();
      } catch (err) {
        console.error("Failed to load data:", err);
      }
    },
    filterProductsByCoil(gIdx) {
      const group = this.coilGroups[gIdx];
      group.filteredProducts = this.products.filter(p => p.coil_id === group.selectedCoilId);
      group.selectedProductId = "";
      group.selectedProduct = null;
    },
    onProductChange(gIdx) {
      const group = this.coilGroups[gIdx];
      group.selectedProduct = group.filteredProducts.find(p => p.id === group.selectedProductId) || null;
      group.items.forEach((it, idx) => {
        it.rate = group.selectedProduct ? group.selectedProduct.rate : null;
        this.updateAmount(gIdx, idx);
      });
    },
    onLengthInput(gIdx, idx) {
      const group = this.coilGroups[gIdx];
      const lastIndex = group.items.length - 1;
      if (idx === lastIndex && group.items[idx].length) {
        this.addBlankItem(gIdx);
      }
      this.updateAmount(gIdx, idx);
    },
    updateAmount(gIdx, idx) {
      const it = this.coilGroups[gIdx].items[idx];
      it.amount = (Number(it.length) || 0) * (Number(it.quantity) || 0) * (Number(it.rate) || 0);
      this.$set(this.coilGroups[gIdx].items, idx, { ...it });
    },
    addBlankItem(gIdx) {
      const group = this.coilGroups[gIdx];
      group.items.push({ length: null, quantity: null, rate: group.selectedProduct ? group.selectedProduct.rate : null, amount: 0 });
    },
    removeItem(gIdx, idx) {
      const group = this.coilGroups[gIdx];
      group.items.splice(idx, 1);
      if (!group.items.length) this.addBlankItem(gIdx);
    },
    addCoilGroup() {
      this.coilGroups.push({
        selectedCoilId: "",
        filteredProducts: [],
        selectedProductId: "",
        selectedProduct: null,
        items: [{ length: null, quantity: null, rate: null, amount: 0 }]
      });
    },
    removeCoilGroup(gIdx) {
      this.coilGroups.splice(gIdx, 1);
    },

    async createSale() {
      if (!this.partyName.trim()) return alert("Please enter party name.");
      const validGroups = this.coilGroups.map(g => ({
        coil_id: g.selectedCoilId,
        product_id: g.selectedProductId,
        items: g.items.filter(i => i.length && i.quantity && i.length > 0 && i.quantity > 0),
        subtotal: this.groupSubtotalByGroup(g)
      })).filter(g => g.items.length > 0 && g.coil_id && g.product_id);

      if (!validGroups.length) return alert("Add at least one valid coil group with items.");

      const payload = {
        party_name: this.partyName.trim(),
        customer_id: this.selectedCustomerId,   // ✅ send selected or null (for new)
        coils: validGroups,
        total_amount: Number(this.totalAmount)
      };

      try {
        this.isSubmitting = true;
        const res = await fetch("/api/sales", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authentication-Token": this.token },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          alert("Sale created successfully!");
          this.partyName = "";
          this.selectedCustomerId = null;
          this.coilGroups = [{
            selectedCoilId: "",
            filteredProducts: [],
            selectedProductId: "",
            selectedProduct: null,
            items: [{ length: null, quantity: null, rate: null, amount: 0 }]
          }];
          this.$router.push("/");
        } else {
          alert("Failed to create sale.");
        }
      } finally {
        this.isSubmitting = false;
      }
    }
  },

  async mounted() {
    await this.fetchData();
  }
};
