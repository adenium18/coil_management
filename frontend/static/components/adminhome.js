export default {
    template: `
    <div>
        <h2 class="text-center">see all available products</h2>

        <!--Add product Button -->
        <div class="text-center mb-3">
            <button class="btn btn-outline-success" @click="goToCreateproduct">+ Add new product</button>
        </div>

        <!--products List -->
        <div class="table-responsive" v-if="products.length">
            <table class="table table-striped table-hover text-center">
                <thead class="table-dark">
                    <tr>
                        <th>ID</th>
                        <th>Make</th>
                        <th>Type</th>
                        <th>Colour</th>
                        <th>Rate</th>
                        <th>Any change?</th>
                    
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="product in products" :key="product.id">
                        <td>{{ product.id }}</td>
                        <td>{{ product.make }}</td>
                        <td>{{ product.type }}</td>
                        <td>{{ product.color }}</td>
                        <td>{{ product.rate }}</td>
                        <td>
                            <button class="btn btn-secondary btn-sm" @click="updateproduct(product.id)"> Edit</button>
                            <button class="btn btn-danger btn-sm" @click="deleteproduct(product.id)"> Delete</button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div v-else class="text-center text-danger">
            No products available.
        </div>

    

    </div>
    `,
    data() {
        return {
            products: [],
            searchQuery: '',
            searchType: 'professionals',
            searchResults: [],
            token: localStorage.getItem("auth-token")
        };
    },
    methods: {
        async fetchproducts() {
            try {
                const res = await fetch("/api/products", {
                    headers: { "Authentication-Token": this.token }
                });
                if (res.ok) {
                    this.products = await res.json();
                } else {
                    console.error("Failed to fetch products");
                }
            } catch (error) {
                console.error("Error fetching products:", error);
            }
        },

        // ✅ Navigate to the "Create product" Page
        goToCreateproduct() {
            this.$router.push("/create-product");
        },

        // ✅ Navigate to the "Update product" Page
        updateproduct(productId) {
            localStorage.setItem("update_product_id", productId);
            this.$router.push("/update-product");
        },

        // ✅ Delete a product
        async deleteproduct(productId) {
            if (!confirm("Are you sure you want to delete this product?")) return;

            try {
                const res = await fetch(`/delete/product/${productId}`, {
                    method: "DELETE",
                    headers: { "Authentication-Token": this.token }
                });

                if (res.ok) {
                    alert("product deleted successfully!");
                    this.fetchproducts(); // Refresh list
                } else {
                    console.error("product Request exists! Failed to delete product");
                    alert("Sorry! this product is requested by customer");
                }
            } catch (error) {
                console.error("Error deleting product:", error);
            }
        },

        
        

       
    },
    async mounted() {
        this.fetchproducts();
    }
};