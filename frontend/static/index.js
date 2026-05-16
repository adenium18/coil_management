import router             from "./router.js";
import store             from "./store.js";
import Sidebar           from "./components/Sidebar.js";
import TopBar            from "./components/TopBar.js";
import NotificationBell  from "./components/NotificationBell.js";
import OfflineBar        from "./components/OfflineBar.js";
import { installToast }  from "./components/Toast.js";

const PUBLIC_ROUTES = new Set(["/", "/app_info", "/user_login"]);

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

installToast(Vue);

new Vue({
  el: "#app",

  template: `
  <div class="app-shell">

    <Sidebar
      v-if="showSidebar"
      :collapsed="sidebarCollapsed"
      :auth-key="authKey"
    />

    <div
      v-if="showSidebar && !sidebarCollapsed && isMobile"
      class="sidebar-overlay"
      @click="sidebarCollapsed = true"
    ></div>

    <div
      class="app-main"
      :class="{
        'app-main--full':      isPublicRoute,
        'app-main--collapsed': showSidebar && sidebarCollapsed,
      }"
    >
      <TopBar
        :sidebar-collapsed="sidebarCollapsed"
        :auth-key="authKey"
        @toggle-sidebar="toggleSidebar"
      >
        <template v-slot:actions v-if="showSidebar && isOwner">
          <NotificationBell />
        </template>
      </TopBar>

      <main class="main-content">
        <router-view :key="$route.path" />
      </main>
    </div>

    <!-- Offline / pending-sync banner — fixed to bottom of viewport -->
    <OfflineBar v-if="showSidebar" />

  </div>
  `,

  components: { Sidebar, TopBar, NotificationBell, OfflineBar },
  router,
  store,

  data() {
    // In Electron, window.innerWidth is 0 while the BrowserWindow is hidden
    // (show:false). The preload script exposes electronAPI before any JS runs,
    // so we can reliably detect Electron here and skip mobile detection.
    const isElectron = !!(window.electronAPI?.isElectron);
    return {
      sidebarCollapsed: false,
      authKey: 0,
      isMobile: isElectron ? false : window.innerWidth < 768,
    };
  },

  computed: {
    isAuthenticated() { return !!localStorage.getItem("auth-token"); },
    isOwner()         { return localStorage.getItem("role") === "owner"; },
    isPublicRoute()   { return PUBLIC_ROUTES.has(this.$route.path); },
    showSidebar()     { return this.isAuthenticated && !this.isPublicRoute; },
  },

  watch: {
    $route(to, from) {
      // Only bump authKey when transitioning between public ↔ private routes
      // (i.e. login/logout). Remounting Sidebar+TopBar on every nav is wasteful
      // and causes the sidebar to flicker or lose its open state.
      const wasPublic = PUBLIC_ROUTES.has(from.path);
      const isPublic  = PUBLIC_ROUTES.has(to.path);
      if (wasPublic !== isPublic) this.authKey++;
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
