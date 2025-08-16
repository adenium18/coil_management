export default {
  template: `
  <nav class="navbar navbar-expand-lg navbar-light bg-light">
    <div class="container-fluid">
      <a class="navbar-brand text-primary" href="/">Coil and Sheet Management</a>
      <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">

          <!-- Admin Navigation -->
          <li class="nav-item" v-if="role === 'admin'">
            <router-link class="nav-link" to="/customer_info">View Customers</router-link>
          </li>
          <li class="nav-item" v-if="role === 'admin'">
            <router-link class="nav-link" to="/create_sale_order">Sale Orders</router-link>
          </li>
          <li class="nav-item" v-if="role === 'admin'">
            <router-link class="nav-link" to="/coil_info">Coil Info</router-link>
          </li>
          <li class="nav-item" v-if="role === 'admin'">
            <router-link class="nav-link" to="/view_all_orders">All Orders</router-link>
          </li>

        </ul>

        <!-- Authentication Controls -->
        <ul class="navbar-nav ml-auto">
          <li class="nav-item" v-if="!isAuthenticated">
            <router-link class="nav-link" to="/user_login">Login</router-link>
          </li>
          <li class="nav-item" v-if="isAuthenticated">
            <button class="btn btn-outline-danger" @click="logout">Logout</button>
          </li>
        </ul>
      </div>
    </div>
  </nav>
  `,

  data() {
    return {
      role: localStorage.getItem("role"),
      isAuthenticated: localStorage.getItem("auth-token") !== null,
      searchQuery: "",
      searchType: "customers"
    };
  },

  methods: {
    logout() {
      localStorage.clear();
      this.$router.push("/user_login");
    },

    onSearch() {
      if (!this.searchQuery || !this.searchType) {
        alert("Please enter a search query and select a search type.");
        return;
      }

      // Redirect to a dedicated search results page with query params
      this.$router.push({
        path: "/search",
        query: {
          type: this.searchType,
          query: this.searchQuery
        }
      });
    }
  }
};
