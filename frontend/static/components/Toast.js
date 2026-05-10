/**
 * Global toast notification system.
 * Usage (from any component):
 *   this.$toast.success("Saved!")
 *   this.$toast.error("Something went wrong")
 *   this.$toast.info("Processing…")
 *   this.$toast.warning("Low stock detected")
 */

const ToastComponent = {
  name: "ToastContainer",
  template: `
  <div class="toast-container" aria-live="polite">
    <transition-group name="toast-slide" tag="div">
      <div v-for="t in toasts" :key="t.id"
           class="toast-item" :class="'toast-item--' + t.type" role="alert">
        <div class="toast-item__icon">
          <i class="bi" :class="iconClass(t.type)"></i>
        </div>
        <div class="toast-item__body">
          <div class="toast-item__title" v-if="t.title">{{ t.title }}</div>
          <div class="toast-item__msg">{{ t.message }}</div>
        </div>
        <button class="toast-item__close" @click="remove(t.id)">
          <i class="bi bi-x"></i>
        </button>
        <div class="toast-item__progress" :style="{ animationDuration: t.duration + 'ms' }"></div>
      </div>
    </transition-group>
  </div>
  `,
  data() {
    return { toasts: [] };
  },
  methods: {
    add({ type = "info", title = "", message, duration = 3500 }) {
      const id = Date.now() + Math.random();
      this.toasts.push({ id, type, title, message, duration });
      setTimeout(() => this.remove(id), duration);
    },
    remove(id) {
      this.toasts = this.toasts.filter(t => t.id !== id);
    },
    iconClass(type) {
      return {
        success: "bi-check-circle-fill",
        error:   "bi-x-circle-fill",
        warning: "bi-exclamation-triangle-fill",
        info:    "bi-info-circle-fill",
      }[type] || "bi-info-circle-fill";
    },
  },
};

export function installToast(Vue) {
  const ToastConstructor = Vue.extend(ToastComponent);
  const instance = new ToastConstructor().$mount(
    document.body.appendChild(document.createElement("div"))
  );

  const toast = {
    show:    (opts)    => instance.add(opts),
    success: (msg, title) => instance.add({ type: "success", message: msg, title }),
    error:   (msg, title) => instance.add({ type: "error",   message: msg, title, duration: 5000 }),
    warning: (msg, title) => instance.add({ type: "warning", message: msg, title }),
    info:    (msg, title) => instance.add({ type: "info",    message: msg, title }),
  };

  Vue.prototype.$toast = toast;
  return toast;
}
