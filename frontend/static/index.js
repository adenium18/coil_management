import router from "./router.js"
import Navbar from "./components/Navbar.js"
import store from "./store.js"

new Vue({
    el: '#app',
    template: `
    <div>
        <Navbar :key='has_changed'/>
        <router-view class="m-3"/>
    </div>
    `,
    
    components: {
        Navbar
    },
    router,
    store,
    data: {
        has_changed: true
    },
    watch: {
        $route(to, from) {
            this.has_changed = !this.has_changed
        }
    }
})