export default {
  name: "NotificationBell",
  template: `
  <div class="notif-bell-wrapper" v-click-outside="close">
    <!-- Bell button -->
    <button class="notif-bell" @click="toggle" title="Notifications">
      <i class="bi bi-bell"></i>
      <span class="notif-badge" v-if="unread > 0">{{ unread > 9 ? '9+' : unread }}</span>
    </button>

    <!-- Panel -->
    <transition name="notif-drop">
      <div class="notif-panel" v-if="open">
        <div class="notif-panel__header">
          <span>Notifications</span>
          <div class="d-flex gap-2 align-items-center">
            <span class="badge bg-primary" v-if="unread > 0">{{ unread }} new</span>
            <button class="btn btn-link btn-sm p-0" @click="markAllRead" v-if="unread > 0">
              Mark all read
            </button>
          </div>
        </div>

        <div class="notif-panel__body">
          <div v-if="loading" class="text-center py-3">
            <div class="spinner-border spinner-border-sm text-primary"></div>
          </div>
          <div v-else-if="!notifications.length" class="notif-empty">
            <i class="bi bi-bell-slash"></i>
            <p>No notifications</p>
          </div>
          <div v-else>
            <div v-for="n in notifications" :key="n.id"
                 class="notif-item" :class="{ 'notif-item--unread': !n.is_read }"
                 @click="handleClick(n)">
              <div class="notif-item__icon" :class="'notif-icon--' + (n.type || 'system')">
                <i class="bi" :class="typeIcon(n.type)"></i>
              </div>
              <div class="notif-item__content">
                <div class="notif-item__title">{{ n.title }}</div>
                <div class="notif-item__msg">{{ n.message }}</div>
                <div class="notif-item__time">{{ n.created_at }}</div>
              </div>
              <button class="notif-item__del" @click.stop="deleteNotif(n.id)" title="Dismiss">
                <i class="bi bi-x"></i>
              </button>
            </div>
          </div>
        </div>

        <div class="notif-panel__footer" v-if="notifications.length">
          <button class="btn btn-link btn-sm text-danger" @click="clearAll">Clear all</button>
        </div>
      </div>
    </transition>
  </div>
  `,

  data() {
    return {
      open: false,
      loading: false,
      notifications: [],
      unread: 0,
      pollTimer: null,
    };
  },

  methods: {
    token() { return localStorage.getItem("auth-token"); },

    toggle() {
      this.open = !this.open;
      if (this.open) this.load();
    },

    close() { this.open = false; },

    async load() {
      this.loading = true;
      try {
        const res = await fetch("/api/notifications", {
          headers: { "Authentication-Token": this.token() },
        });
        if (res.ok) {
          const data = await res.json();
          this.notifications = data.notifications || [];
          this.unread = data.unread || 0;
        }
      } finally {
        this.loading = false;
      }
    },

    async pollUnread() {
      try {
        const res = await fetch("/api/notifications", {
          headers: { "Authentication-Token": this.token() },
        });
        if (res.ok) {
          const data = await res.json();
          this.unread = data.unread || 0;
          if (!this.open) this.notifications = data.notifications || [];
        }
      } catch {}
    },

    async markAllRead() {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authentication-Token": this.token() },
        body: JSON.stringify({}),
      });
      this.notifications.forEach(n => n.is_read = true);
      this.unread = 0;
    },

    async deleteNotif(id) {
      await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
        headers: { "Authentication-Token": this.token() },
      });
      this.notifications = this.notifications.filter(n => n.id !== id);
      this.unread = this.notifications.filter(n => !n.is_read).length;
    },

    async clearAll() {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authentication-Token": this.token() },
        body: JSON.stringify({}),
      });
      this.notifications = [];
      this.unread = 0;
    },

    handleClick(n) {
      if (!n.is_read) {
        fetch("/api/notifications/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authentication-Token": this.token() },
          body: JSON.stringify({ ids: [n.id] }),
        });
        n.is_read = true;
        this.unread = Math.max(this.unread - 1, 0);
      }
      if (n.link) { this.$router.push(n.link); this.open = false; }
    },

    typeIcon(type) {
      return {
        low_stock: "bi-exclamation-triangle-fill",
        order:     "bi-receipt-cutoff",
        payment:   "bi-cash-coin",
        system:    "bi-gear-fill",
      }[type] || "bi-bell-fill";
    },
  },

  mounted() {
    this.pollUnread();
    this.pollTimer = setInterval(this.pollUnread, 60000);
  },

  beforeDestroy() {
    if (this.pollTimer) clearInterval(this.pollTimer);
  },
};
