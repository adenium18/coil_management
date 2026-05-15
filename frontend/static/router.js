import Login            from "./components/Login.js";
import appinfo          from "./components/appinfo.js";
import AdminHome        from "./components/adminhome.js";
import AdminDashboard   from "./components/AdminDashboard.js";
import Purchase         from "./components/purchase.js";
import Customers        from "./components/customer.js";
import Coils            from "./components/coil_info.js";
import Products         from "./components/product_info.js";
import Sales            from "./components/create_sale.js";
import ProductForm      from "./components/productform.js";
import UpdateProductForm from "./components/updateproductform.js";
import CoilForm              from "./components/coilform.js";
import CreateCoilProducts   from "./components/CreateCoilProducts.js";
import SaleOrder        from "./components/view_sale_order.js";
import UpdateCoilForm   from "./components/updatecoilform.js";
import SearchResults    from "./components/searchresults.js";
import Dashboard        from "./components/dashboard.js";
import Productions      from "./components/productions.js";
import Settings         from "./components/Settings.js";
import Reports          from "./components/Reports.js";
import InvoicePrint     from "./components/InvoicePrint.js";
import Analytics        from "./components/Analytics.js";

const routes = [
    // Public
    { path: "/app_info",   component: appinfo },
    { path: "/user_login", component: Login   },

    // Admin-only
    { path: "/admin-dashboard", component: AdminDashboard, meta: { requiresAuth: true, adminOnly: true } },

    // Owner (Coil Manager) routes
    { path: "/dashboard",         component: Dashboard,         meta: { requiresAuth: true, ownerOnly: true } },
    { path: "/coil_info",         component: Coils,             meta: { requiresAuth: true, ownerOnly: true } },
    { path: "/productions",       component: Productions,       meta: { requiresAuth: true, ownerOnly: true } },
    { path: "/product_info",      component: Products,          meta: { requiresAuth: true, ownerOnly: true } },
    { path: "/customer_info",     component: Customers,         meta: { requiresAuth: true, ownerOnly: true } },
    { path: "/create_sale_order", component: Sales,             meta: { requiresAuth: true, ownerOnly: true } },
    { path: "/create-coil",       component: CoilForm,          meta: { requiresAuth: true, ownerOnly: true } },
    { path: "/coil-setup",        component: CreateCoilProducts, meta: { requiresAuth: true, ownerOnly: true } },
    { path: "/update-coil",       component: UpdateCoilForm,    meta: { requiresAuth: true, ownerOnly: true } },
    { path: "/create-product",    component: ProductForm,       meta: { requiresAuth: true, ownerOnly: true } },
    { path: "/update-product",    component: UpdateProductForm, meta: { requiresAuth: true, ownerOnly: true } },
    { path: "/purchase_history",  component: Purchase,          meta: { requiresAuth: true, ownerOnly: true } },
    { path: "/settings",          component: Settings,          meta: { requiresAuth: true, ownerOnly: true } },
    { path: "/reports",           component: Reports,           meta: { requiresAuth: true, ownerOnly: true } },
    { path: "/analytics",         component: Analytics,         meta: { requiresAuth: true, ownerOnly: true } },
    { path: "/invoice/:id",       component: InvoicePrint,      meta: { requiresAuth: true, ownerOnly: true } },

    // Accessible to both roles
    { path: "/view_all_orders", component: SaleOrder,       meta: { requiresAuth: true } },
    { path: "/search",          component: SearchResults,   meta: { requiresAuth: true } },

    // Home / landing page (public)
    { path: "/", component: appinfo },
];

const router = new VueRouter({
    mode: "history",
    routes,
    scrollBehavior: () => ({ x: 0, y: 0 }),
});

router.beforeEach((to, from, next) => {
    const token = localStorage.getItem("auth-token");
    const role  = localStorage.getItem("role");

    if (to.meta.requiresAuth && !token) {
        return next("/user_login");
    }

    if (to.meta.adminOnly && role !== "admin") {
        return next(role === "owner" ? "/dashboard" : "/user_login");
    }

    if (to.meta.ownerOnly && role !== "owner") {
        return next(role === "admin" ? "/admin-dashboard" : "/user_login");
    }

    // Redirect authenticated users away from public-only pages
    if ((to.path === "/user_login" || to.path === "/" || to.path === "/app_info") && token) {
        return next(role === "admin" ? "/admin-dashboard" : "/dashboard");
    }

    next();
});

export default router;
