export default {
  name: "SearchResults",
  template: `
  <div class="container mt-4">
    <h3 class="mb-3">Search Results</h3>

    <!-- Loading -->
    <div v-if="loading" class="alert alert-info">
      Loading results...
    </div>

    <!-- Error -->
    <div v-if="error" class="alert alert-danger">
      {{ error }}
    </div>

    <!-- No Results -->
    <div v-if="!loading && results.length === 0 && !error" class="alert alert-warning">
      No results found.
    </div>

    <!-- Customer Results -->
    <div v-if="searchType === 'customers' && results.length > 0">
      <h5>Customers</h5>
      <table class="table table-bordered">
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Orders</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in results" :key="c.id">
            <td>{{ c.name }}</td>
            <td>{{ c.phone }}</td>
            <td>
              <ul class="mb-0">
                <li v-for="o in c.orders" :key="o.id">
                  Order #{{ o.id }} - {{ o.sale_date }} - ₹{{ o.total }}
                </li>
              </ul>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Product Search Results -->
    <div v-if="searchType === 'products' && results.length > 0">
      <h5>Sales by Product</h5>
      <table class="table table-striped">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer ID</th>
            <th>Date</th>
            <th>Total</th>
            <th>Product</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in results" :key="s.order_id">
            <td>{{ s.order_id }}</td>
            <td>{{ s.customer_id }}</td>
            <td>{{ s.sale_date }}</td>
            <td>₹{{ s.total }}</td>
            <td>
              {{ s.product.make }} - {{ s.product.type }} -
              {{ s.product.color }} ({{ s.product.coil }})
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Date/Month/Year Search Results -->
    <div v-if="(searchType === 'sale_date' || searchType === 'sale_month' || searchType === 'sale_year') && results.length > 0">
      <h5>Sales by {{ searchType.replace('sale_', '') }}</h5>
      <table class="table table-hover">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer ID</th>
            <th>Date</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in results" :key="s.order_id">
            <td>{{ s.order_id }}</td>
            <td>{{ s.customer_id }}</td>
            <td>{{ s.sale_date }}</td>
            <td>₹{{ s.total }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
`,
  data() {
    return {
      searchType: this.$route.query.type || "",
      searchQuery: this.$route.query.query || "",
      results: [],
      loading: true,
      error: null,
    };
  },
  methods: {
    async fetchResults() {
      this.loading = true;
      this.error = null;

      try {
        let url = "";
        if (this.searchType === "customers") {
          url = `/api/customers/search?query=${this.searchQuery}`;
        } else if (this.searchType === "products") {
          url = `/api/sales/search/products?query=${this.searchQuery}`;
        } else if (
          this.searchType === "sale_date" ||
          this.searchType === "sale_month" ||
          this.searchType === "sale_year"
        ) {
          url = `/api/sales/search/date?type=${this.searchType}&query=${this.searchQuery}`;
        } else {
          this.error = "Invalid search type.";
          this.loading = false;
          return;
        }

        const res = await axios.get(url);
        this.results = res.data;
      } catch (err) {
        this.error = "Error fetching results.";
      } finally {
        this.loading = false;
      }
    },
  },
  created() {
    this.fetchResults();
  },
  watch: {
    // re-fetch when user searches again
    "$route.query": {
      handler() {
        this.searchType = this.$route.query.type;
        this.searchQuery = this.$route.query.query;
        this.fetchResults();
      },
      deep: true,
    },
  },
};
