import Home from "./components/Home.js";
import Login from "./components/Login.js";
import appinfo from "./components/appinfo.js"
import AdminHome from "./components/AdminHome.js";
import AllComplaints from "./components/AllComplaints.js";
import SearchDoctorResults from "./components/SearchDoctorResults.js";
import PatientHistory from "./components/PatientHistory.js";
import DoctorSignup from "./components/DoctorSignup.js";
import Patients from "./components/Patients.js"
import Casepaper from "./components/Casepaper.js";
//import ServiceProfessionalSignup from "./components/ServiceProfessionalSignup.js";
//import Users from "./components/Users.js";
//import ServiceForm from "./components/ServiceForm.js";
//import UpdatePatinet from "./components/UpdateServiceForm.js";





const routes = [
    { path: "/", component: Home, meta: { requiresAuth: true } },
    { path: "/app_info", component:appinfo},
    { path: "/user-login", component: Login },    
    { path: "/doctor-signup", component: DoctorSignup},
    { path: '/patient_history', component: PatientHistory},
    { path: '/search-for-doctor', component: SearchDoctorResults},
    { path: '/all_complaints', component: AllComplaints},
    { path: '/patients', component: Patients},
    { path: '/casepapers', component: Casepaper}
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