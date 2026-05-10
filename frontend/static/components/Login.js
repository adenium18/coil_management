export default {
  template: `
  <div class="login-page">

    <!-- Public top nav -->
    <header class="public-topbar">
      <router-link class="public-topbar__brand" to="/app_info">
        <div class="public-topbar__brand-icon">
          <i class="bi bi-layers-half"></i>
        </div>
        <span>CoilMS</span>
      </router-link>
    </header>

    <!-- Centered card -->
    <div class="login-center">
      <div class="login-card">
        <!-- Header -->
        <div class="login-card__header">
          <div class="login-card__icon"><i class="bi bi-shield-lock"></i></div>
          <h2 class="login-card__title">Welcome back</h2>
          <p class="login-card__sub">Sign in to continue</p>
        </div>

        <!-- Alert -->
        <div class="alert alert-danger py-2 mb-3" v-if="error">
          <i class="bi bi-exclamation-circle me-2"></i>{{ error }}
        </div>

        <!-- Form -->
        <form @submit.prevent="login">
          <div class="mb-3">
            <label for="user-email" class="form-label">Email address</label>
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-envelope"></i></span>
              <input type="email" class="form-control" id="user-email"
                     v-model="cred.email" placeholder="you@example.com" required />
            </div>
          </div>

          <div class="mb-4">
            <label for="user-password" class="form-label">Password</label>
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-lock"></i></span>
              <input :type="showPw ? 'text' : 'password'" class="form-control"
                     id="user-password" v-model="cred.password"
                     placeholder="••••••••" required />
              <button type="button" class="input-group-text" style="cursor:pointer;"
                      @click="showPw = !showPw">
                <i class="bi" :class="showPw ? 'bi-eye-slash' : 'bi-eye'"></i>
              </button>
            </div>
          </div>

          <button class="btn btn-primary w-100 py-2" type="submit" :disabled="loading">
            <span v-if="loading">
              <span class="spinner-border spinner-border-sm me-2" role="status"></span>
              Signing in...
            </span>
            <span v-else>Sign In &rarr;</span>
          </button>
        </form>

        <p class="text-center mt-4 mb-0 text-muted" style="font-size:12px;">
          Access restricted to authorised users.
        </p>
      </div>
    </div>
  </div>
  `,

  data() {
    return {
      cred: { email: "", password: "" },
      error: null,
      loading: false,
      showPw: false,
    };
  },

  methods: {
    async login() {
      this.error = null;
      this.loading = true;
      try {
        const res = await fetch("/user_login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(this.cred),
        });

        const data = await res.json();

        if (!res.ok) {
          this.error = data.message || "Invalid email or password.";
          return;
        }

        // Persist session
        localStorage.setItem("auth-token",    data.token);
        localStorage.setItem("role",          data.role);
        localStorage.setItem("full_name",     data.full_name || "");
        localStorage.setItem("user_id",       data.user_id);
        localStorage.setItem("business_name", data.business_name || "");
        localStorage.setItem("user", JSON.stringify({
          token: data.token,
          role:  data.role,
          id:    data.user_id,
        }));

        this.$store.commit("setUser");

        // Route based on role
        if (data.role === "admin") {
          this.$router.push("/admin-dashboard");
        } else {
          this.$router.push("/dashboard");
        }
      } catch {
        this.error = "Server error. Please try again.";
      } finally {
        this.loading = false;
      }
    },
  },
};
