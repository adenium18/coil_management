export default {
    template: `
    <div class="container">
        <h2 class="text-center text-primary">Add a New Product</h2>
        <form @submit.prevent="createProduct">
            
            <!-- ProductMAKE Name -->
            <div class="mb-3">
                <label for="product-make" class="form-label">Product make:</label>
                <select class="form-control" id="product-make" v-model="product.make">
                    <option v-for="make in makeOptions" :key="make">{{ make }}</option>
                    <option value="Other">Other</option>
                </select>
                <input v-if="product.make === 'Other'" type="text" class="form-control mt-2"
                       placeholder="Enter product name" v-model="customProductName">
            </div>

            <!-- TYPE -->
            <div class="mb-3">
                <label for="product-type" class="form-label">Type:</label>
                <select class="form-control" id="product-type" v-model="product.type">
                    <option v-for="type in typeOptions" :key="type">{{ type }}</option>
                    <option value="Other">Other</option>
                </select>
                <input v-if="product.type === 'Other'" type="text" class="form-control mt-2"
                       placeholder="Enter type" v-model="customMake">
            </div>

            <!-- Color -->
            <div class="mb-3">
                <label for="product-color" class="form-label">Color:</label>
                <select class="form-control" id="product-color" v-model="product.color">
                    <option v-for="color in colorOptions" :key="color">{{ color }}</option>
                    <option value="Other">Other</option>
                </select>
                <input v-if="product.color === 'Other'" type="text" class="form-control mt-2"
                       placeholder="Enter color" v-model="customColor">
            </div>

            <!-- Rate -->
            <div class="mb-3">
                <label for="product-rate" class="form-label">Rate (₹):</label>
                <input type="number" class="form-control" id="product-rate" v-model="product.rate" required>
            </div>

            <button type="submit" class="btn btn-primary">Create Product</button>
        </form>
    </div>
    `,
    data() {
        return {
            makeOptions: ["JSW", "Jindal", "TATA"],  // Existing products
            typeOptions: ["COLORON", "PRAGATI"],       // Existing makes
            colorOptions: ["Red", "silver"],      // Existing colors
            product: {make: "", type: "", color: "", rate: "" },
            customMake: "",
            customType: "",
            customColor: "",
            token: localStorage.getItem("auth-token")
        };
    },
    methods: {
        async createProduct() {
            // Replace dropdown 'Other' with custom input values
            if (this.product.make === "Other") {
                this.product.make = this.customProductName;
            }
            if (this.product.type === "Other") {
                this.product.type = this.customMake;
            }
            if (this.product.color === "Other") {
                this.product.color = this.customColor;
            }

            try {
                const res = await fetch("/api/products", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authentication-Token": this.token
                    },
                    body: JSON.stringify(this.product)
                });
                if (res.ok) {
                    alert("Product created successfully!");
                    this.$router.push("/"); // Redirect to Admin Dashboard
                } else {
                    alert("This product already exists or an error occurred!");
                }
            } catch (error) {
                console.error("Error creating product:", error);
            }
        }
    }
};
