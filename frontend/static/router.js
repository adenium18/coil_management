import Login from "./components/Login.js";
import appinfo from "./components/appinfo.js"
import AdminHome from "./components/adminhome.js";
import Purchase from "./components/purchase.js";
import Customers from "./components/customer.js"
import Coils from "./components/coil_info.js"
import Products from "./components/product_info.js";
import Sales from "./components/create_sale.js";
import ProductForm from "./components/productform.js";
import UpdateProductForm from "./components/updateproductform.js";
import CoilForm from "./components/coilform.js";
import SaleOrder from "./components/view_sale_order.js";
import UpdateCoilForm from "./components/updatecoilform.js";
import SearchResults from "./components/searchresults.js";



const routes = [
    { path: "/", component: AdminHome, meta: { requiresAuth: true } },
    { path: "/app_info", component:appinfo},
    { path: "/user_login", component: Login},
    { path: '/purchase_history', component: Purchase},
    { path: '/customer_info', component: Customers},
    { path: '/coil_info', component: Coils},
    { path: '/product_info', component: Products},
    { path: '/create_sale_order', component: Sales},
    { path: "/create-product", component:ProductForm},
    { path:"/update-product", component:UpdateProductForm},
    { path:"/create-coil", component:CoilForm},
    { path:"/update-coil", component:UpdateCoilForm},
    { path:"/view_all_orders", component:SaleOrder},
    { path:"/search", component: SearchResults},
    

];

const router = new VueRouter({
    mode: "history",
    routes
});

// ✅ Protect routes based on authentication & roles
router.beforeEach((to, from, next) => {
    const role = localStorage.getItem("role");
    const isAuthenticated = localStorage.getItem("auth-token");

    if (to.meta.requiresAuth && !isAuthenticated) {
        next("/app_info");
    } else if (to.meta.adminOnly && role !== "admin") {
        next("/");
    } else {
        next();
    }
});

export default router;