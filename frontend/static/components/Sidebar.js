export default {
  name: "Sidebar",
  props: {
    collapsed: { type: Boolean, default: false },
    authKey:   { type: Number, default: 0 },
  },
  template: `
  <aside class="sidebar" :class="{ 'sidebar--collapsed': collapsed }">

    <!-- Logo -->
    <div class="sidebar-logo">
      <div class="sidebar-logo__icon">
        <i class="bi bi-layers-half"></i>
      </div>
      <span class="sidebar-logo__text">CoilMS</span>
    </div>

    <!-- ── Admin navigation ── -->
    <template v-if="isAdmin">
      <div class="sidebar-section-label">Administration</div>
      <nav class="sidebar-nav">
        <router-link to="/admin-dashboard" class="sidebar-link" active-class="sidebar-link--active" exact>
          <i class="bi bi-shield-check"></i>
          <span class="sidebar-link__label">System Dashboard</span>
        </router-link>
        <router-link to="/view_all_orders" class="sidebar-link" active-class="sidebar-link--active">
          <i class="bi bi-receipt"></i>
          <span class="sidebar-link__label">All Orders</span>
        </router-link>
      </nav>
    </template>

    <!-- ── Owner navigation ── -->
    <template v-else>
      <div class="sidebar-section-label">Main Menu</div>
      <nav class="sidebar-nav">
        <router-link to="/dashboard" class="sidebar-link" active-class="sidebar-link--active" exact>
          <i class="bi bi-speedometer2"></i>
          <span class="sidebar-link__label">Dashboard</span>
        </router-link>

        <router-link to="/coil-setup" class="sidebar-link" active-class="sidebar-link--active">
          <i class="bi bi-magic"></i>
          <span class="sidebar-link__label">Coil Setup</span>
        </router-link>

        <router-link to="/coil_info" class="sidebar-link" active-class="sidebar-link--active">
          <i class="bi bi-layers"></i>
          <span class="sidebar-link__label">Coils</span>
        </router-link>

        <router-link to="/productions" class="sidebar-link" active-class="sidebar-link--active">
          <i class="bi bi-box-seam"></i>
          <span class="sidebar-link__label">Products</span>
        </router-link>

        <router-link to="/customer_info" class="sidebar-link" active-class="sidebar-link--active">
          <i class="bi bi-people"></i>
          <span class="sidebar-link__label">Customers</span>
        </router-link>
      </nav>

      <div class="sidebar-section-label mt-3">Sales</div>
      <nav class="sidebar-nav">
        <router-link to="/create_sale_order" class="sidebar-link" active-class="sidebar-link--active">
          <i class="bi bi-plus-circle"></i>
          <span class="sidebar-link__label">New Sale Order</span>
        </router-link>

        <router-link to="/view_all_orders" class="sidebar-link" active-class="sidebar-link--active">
          <i class="bi bi-receipt"></i>
          <span class="sidebar-link__label">All Orders</span>
        </router-link>
      </nav>

      <div class="sidebar-section-label mt-3">Insights</div>
      <nav class="sidebar-nav">
        <router-link to="/analytics" class="sidebar-link" active-class="sidebar-link--active">
          <i class="bi bi-graph-up-arrow"></i>
          <span class="sidebar-link__label">Analytics</span>
        </router-link>

        <router-link to="/reports" class="sidebar-link" active-class="sidebar-link--active">
          <i class="bi bi-bar-chart-line"></i>
          <span class="sidebar-link__label">Reports</span>
        </router-link>

        <router-link to="/settings" class="sidebar-link" active-class="sidebar-link--active">
          <i class="bi bi-gear"></i>
          <span class="sidebar-link__label">Settings</span>
        </router-link>
      </nav>
    </template>

    <!-- Spacer -->
    <div class="sidebar-spacer"></div>

    <!-- User + Logout -->
    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="sidebar-user__avatar">{{ userInitial }}</div>
        <div class="sidebar-user__info">
          <div class="sidebar-user__name">{{ fullName }}</div>
          <div class="sidebar-user__role">{{ roleLabel }}</div>
        </div>
      </div>
      <button class="sidebar-logout" @click="logout" title="Logout">
        <i class="bi bi-box-arrow-right"></i>
      </button>
    </div>
  </aside>
  `,

  computed: {
    isAdmin()    { return localStorage.getItem("role") === "admin"; },
    roleLabel()  { return this.isAdmin ? "Super Admin" : "Coil Manager"; },
    fullName() {
      // authKey dependency ensures this re-evaluates after login/logout.
      void this.authKey;
      const n = localStorage.getItem("full_name");
      return n || (this.isAdmin ? "Admin" : "Owner");
    },
    userInitial() { return (this.fullName)[0].toUpperCase(); },
  },

  methods: {
    logout() {
      ["auth-token","role","full_name","user_id","user","business_name"]
        .forEach(k => localStorage.removeItem(k));
      this.$store.commit("logout");
      this.$router.push("/user_login");
    },
  },
};
