export default {
  template: `
    <div>
      <h2 class="text-center">See All Customers</h2>

      <div class="table-responsive" v-if="customers.length">
        <table class="table table-striped table-hover text-center">
          <thead class="table-dark">
            <tr>
              <th>ID</th>
              <th>Full Name</th>
              <th>Phone Number</th>
              <th>Any change?</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cust in customers" :key="cust.id">
              <td>{{ cust.id }}</td>
              <td>{{ cust.name }}</td>
              <td>{{ cust.phone }}</td>
              <td>
                <button class="btn btn-secondary btn-sm" @click="openEditModal(cust)">Edit</button>
                <button class="btn btn-danger btn-sm" @click="deleteCustomer(cust.id)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="text-center text-danger">
        No customers available.
      </div>

      <!-- Modal -->
      <div class="modal fade" id="updateModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            
            <div class="modal-header">
              <h5 class="modal-title">Update Customer</h5>
              <button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span> </button>
            </div>

            <div class="modal-body">
              <form @submit.prevent="updateCustomerData">
                <div class="mb-3">
                  <label class="form-label">Full Name</label>
                  <input type="text" class="form-control" v-model="selectedCustomer.name" required>
                </div>

                <div class="mb-3">
                  <label class="form-label">Phone Number</label>
                  <input type="text" class="form-control" v-model="selectedCustomer.phone" required>
                </div>

                <div class="text-end">
                  <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                  <button type="submit" class="btn btn-primary">Save Changes</button>
                </div>
              </form>
            </div>

          </div>
        </div>
      </div>
    </div>
  `,

  data() {
    return {
      customers: [],
      selectedCustomer: { id: null, name: "", phone: "" },
      token: localStorage.getItem("auth-token")
    };
  },

  methods: {
    async fetchCustomers() {
      try {
        const res = await fetch("/api/customers", {
          headers: { "Authentication-Token": this.token }
        });
        if (res.ok) {
          const data = await res.json();
          this.customers = Array.isArray(data) ? data : [data];
        }
      } catch (error) {
        console.error("Error fetching customers:", error);
      }
    },

    openEditModal(customer) {
      this.selectedCustomer = { ...customer }; // Copy data
      const modal = new bootstrap.Modal(document.getElementById("updateModal"));
      modal.show();
    },

    async updateCustomerData() {
      try {
        const res = await fetch(`/api/update/customer/${this.selectedCustomer.id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authentication-Token": this.token
          },
          body: JSON.stringify(this.selectedCustomer)
        });

        if (res.ok) {
          alert("Customer updated successfully!");
          bootstrap.Modal.getInstance(document.getElementById("updateModal")).hide();
          this.fetchCustomers(); // Refresh
        } else {
          alert("Failed to update customer");
        }
      } catch (error) {
        console.error("Error updating customer:", error);
      }
    },

    async deleteCustomer(customerId) {
      if (!confirm("Are you sure you want to delete this customer?")) return;
      try {
        const res = await fetch(`/delete/customer/${customerId}`, {
          method: "DELETE",
          headers: { "Authentication-Token": this.token }
        });
        if (res.ok) {
          alert("Customer deleted successfully!");
          this.fetchCustomers();
        } else {
          alert("Sorry! This customer cannot be deleted because he has sale orders");
        }
      } catch (error) {
        console.error("Error deleting customer:", error);
      }
    }
  },

  mounted() {
    this.fetchCustomers();
  }
};
