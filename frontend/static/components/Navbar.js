export default {
    template: `
    <nav class="navbar navbar-expand-lg navbar-light bg-light">
        <div class="container-fluid">
            <a class="navbar-brand text-primary" href="/">Coil and Sheet Management</a>
            <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                    <!-- Admin Navigation -->
                    <li class="nav-item" v-if="role === 'admin'">
                        <router-link class="nav-link" to="/users">view customers</router-link>
                    </li>
                    
                    <li class="nav-item" v-if="role === 'admin'">
                        <router-link class="nav-link" to="/manage-products">purchase orders</router-link>
                    </li>

                    <li class="nav-item" v-if="role === 'admin'">
                        <router-link class="nav-link" to="/all-product-request">products info</router-link>
                    </li>

                    <!-- New product Summary Link -->
                    <li class="nav-item" v-if="role === 'admin'">
                        <router-link class="nav-link" to="/product-summary">sales</router-link>
                    </li>

                    <!-- Search Form -->
                    <li class="nav-item" v-if="role === 'admin'">
                        <form @submit.prevent="onSearch" class="d-flex align-items-center">
                            <input type="text" class="form-control me-2" v-model="searchQuery" placeholder="Search..." aria-label="Search">
                                <select class="form-select me-2" v-model="searchType" required>
                                    <option value="professionals">Professionals</option>
                                    <option value="customers">Customers</option>
                                    <option value="products">products</option>
                                    <option value="product_requests">product Requests</option>
                                </select>
                            <button type="submit" class="btn btn-info">Search</button>
                        </form>
                    </li>


                </ul>   

                <!-- Authentication Controls -->
                <ul class="navbar-nav ml-auto">
                    <li class="nav-item" v-if="!isAuthenticated">
                        <router-link class="nav-link" to="/user_login">Login</router-link>
                    </li>
                 

                    <li class="nav-item" v-if="isAuthenticated">
                        <button class="btn btn-outline-danger" @click="logout">Logout</button>
                    </li>
                </ul>
            </div>
        </div>
    </nav>
    `,

    data() {
        return {
            role: localStorage.getItem("role"),
            isAuthenticated: localStorage.getItem("auth-token") !== null,
            isActive: localStorage.getItem("active") === "true",
            searchQuery: '',
            searchType: 'professionals'
        };
    },

    methods: {
        logout() {
            localStorage.clear();
            this.$router.push("/user_login");
        },
        
        onSearch() {
            if (!this.searchQuery || !this.searchType) {
                alert("Please enter a search query and select a search type.");
                return;
            }
            
            this.$router.push({
                path: '/search',
                query: {
                    type: this.searchType,
                    query: this.searchQuery
                }
            });
        },

        onSearchforcustomer() {
            if (!this.searchQuery || !this.searchType) {
                alert("Please enter a search query.");
                return;
            }
            
            this.$router.push({
                path: '/search-for-customer',
                query: {
                    type: this.searchType,
                    query: this.searchQuery
                }
            });
        },

        onSearchforprof() {
            if (!this.searchQuery || !this.searchType) {
                alert("Please enter a search query.");
                return;
            }
            
            this.$router.push({
                path: '/search-for-prof',
                query: {
                    type: this.searchType,
                    query: this.searchQuery
                }
            });
        }
    }
};