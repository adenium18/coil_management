export default {
  name: "TopBar",
  props: {
    sidebarCollapsed: { type: Boolean, default: false },
    authKey:          { type: Number,  default: 0 },
  },
  template: `
  <header class="topbar">
    <!-- Left: hamburger + breadcrumb -->
    <div class="topbar__left">
      <button class="topbar__toggle" @click="$emit('toggle-sidebar')" title="Toggle menu">
        <i class="bi" :class="sidebarCollapsed ? 'bi-layout-sidebar' : 'bi-layout-sidebar-reverse'"></i>
      </button>
      <div class="topbar__breadcrumb">
        <span class="topbar__section">{{ section }}</span>
        <i class="bi bi-chevron-right topbar__sep" v-if="subTitle"></i>
        <span class="topbar__page" v-if="subTitle">{{ subTitle }}</span>
      </div>
    </div>

    <!-- Right: actions -->
    <div class="topbar__right">
      <!-- Owner quick actions -->
      <div class="topbar__actions" v-if="isAuthenticated && isOwner">
        <router-link to="/create_sale_order" class="topbar__btn topbar__btn--primary" title="New Sale">
          <i class="bi bi-plus-lg"></i>
          <span class="topbar__btn-label">New Sale</span>
        </router-link>
      </div>

      <!-- Admin quick actions -->
      <div class="topbar__actions" v-if="isAuthenticated && isAdmin">
        <router-link to="/admin-dashboard" class="topbar__btn topbar__btn--primary" title="Manage Owners">
          <i class="bi bi-person-plus"></i>
          <span class="topbar__btn-label">Add Owner</span>
        </router-link>
      </div>

      <!-- Notification bell (injected via slot from index.js) -->
      <slot name="actions"></slot>

      <!-- User chip -->
      <div class="topbar__user" v-if="isAuthenticated">
        <div class="topbar__avatar">{{ userInitial }}</div>
        <div>
          <span class="topbar__username">{{ fullName }}</span>
          <span class="topbar__role-badge"
                :class="isAdmin ? 'topbar__role-badge--admin' : 'topbar__role-badge--owner'">
            {{ isAdmin ? 'Admin' : 'Owner' }}
          </span>
        </div>
      </div>
    </div>
  </header>
  `,

  computed: {
    isAuthenticated() { return !!localStorage.getItem("auth-token"); },
    isAdmin()  { return localStorage.getItem("role") === "admin"; },
    isOwner()  { return localStorage.getItem("role") === "owner"; },
    fullName() {
      void this.authKey; // re-evaluate after login/logout
      return localStorage.getItem("full_name") || "User";
    },
    userInitial() { return (this.fullName)[0].toUpperCase(); },

    routeMeta() {
      const map = {
        "/":                   { section: "Products",    subTitle: null },
        "/admin-dashboard":    { section: "Admin",       subTitle: "System Dashboard" },
        "/dashboard":          { section: "Dashboard",   subTitle: null },
        "/coil_info":          { section: "Inventory",   subTitle: "Coils" },
        "/productions":        { section: "Inventory",   subTitle: "Products" },
        "/customer_info":      { section: "CRM",         subTitle: "Customers" },
        "/create_sale_order":  { section: "Sales",       subTitle: "New Order" },
        "/view_all_orders":    { section: "Sales",       subTitle: "All Orders" },
        "/create-coil":        { section: "Inventory",   subTitle: "Add Coil" },
        "/update-coil":        { section: "Inventory",   subTitle: "Edit Coil" },
        "/create-product":     { section: "Inventory",   subTitle: "Add Product" },
        "/update-product":     { section: "Inventory",   subTitle: "Edit Product" },
        "/user_login":         { section: "Login",       subTitle: null },
        "/app_info":           { section: "CoilMS",      subTitle: null },
        "/search":             { section: "Search",      subTitle: "Results" },
        "/settings":           { section: "Settings",    subTitle: "Company Profile" },
        "/reports":            { section: "Reports",     subTitle: "Analytics" },
      };
      if (this.$route.path.startsWith("/invoice/"))
        return { section: "Sales", subTitle: "Invoice" };
      return map[this.$route.path] || { section: "CoilMS", subTitle: null };
    },
    section()  { return this.routeMeta.section; },
    subTitle() { return this.routeMeta.subTitle; },
  },
};
