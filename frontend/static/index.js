import router             from "./router.js";
import store             from "./store.js";
import Sidebar           from "./components/Sidebar.js";
import TopBar            from "./components/TopBar.js";
import NotificationBell  from "./components/NotificationBell.js";
import { installToast }  from "./components/Toast.js";

/* Public routes that use the full-screen layout (no sidebar) */
const PUBLIC_ROUTES = new Set(["/app_info", "/user_login"]);

/* Global: click-outside directive */
Vue.directive("click-outside", {
  bind(el, binding) {
    el._clickOutside = (e) => { if (!el.contains(e.target)) binding.value(e); };
    document.addEventListener("mousedown", el._clickOutside);
  },
  unbind(el) {
    document.removeEventListener("mousedown", el._clickOutside);
  },
});

/* Install toast globally → this.$toast.success("…") */
installToast(Vue);

new Vue({
  el: "#app",

  template: `
  <div class="app-shell">

    <!-- Sidebar (authenticated layout only) -->
    <transition name="sidebar-slide">
      <Sidebar
        v-if="showSidebar"
        :collapsed="sidebarCollapsed"
        :key="authKey"
      />
    </transition>

    <!-- Mobile overlay -->
    <div
      v-if="showSidebar && !sidebarCollapsed && isMobile"
      class="sidebar-overlay"
      @click="sidebarCollapsed = true"
    ></div>

    <!-- Main area -->
    <div
      class="app-main"
      :class="{
        'app-main--full':      isPublicRoute,
        'app-main--collapsed': showSidebar && sidebarCollapsed,
      }"
    >
      <TopBar
        :sidebar-collapsed="sidebarCollapsed"
        :key="'tb-' + authKey"
        @toggle-sidebar="toggleSidebar"
      >
        <!-- Notification bell slot (only for owners) -->
        <template v-slot:actions v-if="showSidebar && isOwner">
          <NotificationBell />
        </template>
      </TopBar>

      <main class="main-content">
        <router-view :key="$route.path" />
      </main>
    </div>

  </div>
  `,

  components: { Sidebar, TopBar, NotificationBell },
  router,
  store,

  data() {
    return {
      sidebarCollapsed: false,
      authKey: 0,
      isMobile: window.innerWidth < 768,
    };
  },

  computed: {
    isAuthenticated() { return !!localStorage.getItem("auth-token"); },
    isOwner()         { return localStorage.getItem("role") === "owner"; },
    isPublicRoute()   { return PUBLIC_ROUTES.has(this.$route.path); },
    showSidebar()     { return this.isAuthenticated && !this.isPublicRoute; },
  },

  watch: {
    $route() {
      this.authKey++;
      if (this.isMobile) this.sidebarCollapsed = true;
    },
  },

  methods: {
    toggleSidebar() { this.sidebarCollapsed = !this.sidebarCollapsed; },
    handleResize() {
      this.isMobile = window.innerWidth < 768;
      if (!this.isMobile) this.sidebarCollapsed = false;
    },
  },

  mounted() {
    window.addEventListener("resize", this.handleResize);
    if (this.isMobile) this.sidebarCollapsed = true;
  },

  beforeDestroy() {
    window.removeEventListener("resize", this.handleResize);
  },
});
