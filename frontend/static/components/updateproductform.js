export default {
    template: `
    <div class="container mt-4">
        <h2 class="text-center mb-4">Update Product</h2>

        <form @submit.prevent="updateProduct">
            <!-- Make -->
            <div class="mb-3">
                <label class="form-label">Make</label>
                <input type="text" v-model="product.make" class="form-control" required>
            </div>

            <!-- Type -->
            <div class="mb-3">
                <label class="form-label">Type</label>
                <input type="text" v-model="product.type" class="form-control" required>
            </div>

            <!-- Colour -->
            <div class="mb-3">
                <label class="form-label">Colour</label>
                <input type="text" v-model="product.color" class="form-control" required>
            </div>

            <!-- Rate -->
            <div class="mb-3">
                <label class="form-label">Rate</label>
                <input type="number" v-model="product.rate" class="form-control" step="0.01" required>
            </div>

            <div class="text-center">
                <button type="submit" class="btn btn-primary">Update</button>
                <button type="button" class="btn btn-secondary" @click="$router.push('/products')">Cancel</button>
            </div>
        </form>
    </div>
    `,
    data() {
        return {
            product: {
                make: '',
                type: '',
                color: '',
                rate: ''
            },
            token: localStorage.getItem("auth-token"),
            productId: localStorage.getItem("update_product_id")
        };
    },
    methods: {
        async fetchProductDetails() {
            try {
                const res = await fetch(`/api/update/product/${this.productId}`, {
                    headers: { "Authentication-Token": this.token }
                });

                if (res.ok) {
                    this.product = await res.json();
                } else {
                    console.error("Failed to fetch product details");
                    alert("Product not found!");
                    this.$router.push("/products");
                }
            } catch (error) {
                console.error("Error fetching product:", error);
            }
        },

        async updateProduct() {
            try {
                const res = await fetch(`api/update/product/${this.productId}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authentication-Token": this.token
                    },
                    body: JSON.stringify(this.product)
                });

                if (res.ok) {
                    alert("Product updated successfully!");
                    localStorage.removeItem("update_product_id");
                    this.$router.push("/");
                } else {
                    console.error("Failed to update product");
                    alert("Error updating product!");
                }
            } catch (error) {
                console.error("Error updating product:", error);
            }
        }
    },
    mounted() {
        if (!this.productId) {
            alert("No product selected for update!");
            this.$router.push("/products");
        } else {
            this.fetchProductDetails();
        }
    }
};
