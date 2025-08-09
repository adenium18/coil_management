export default {
  template: `
    <div class="container-fluid">
      <h1 class="text-center fw-bold">Welcome to Coil & Sheet Management 📦</h1>
      <hr class="custom-hr">
      <h3 class="text-center success fw-bold">
        Streamline your coil & sheet inventory, sales, and production tracking
      </h3>

      <div class="container">
        <div class="row">

          <!-- Card for Coil Inventory -->
          <div class="col-lg-3 col-md-6 mb-4">
            <div class="card">
              <img src="/static/components/images/coil_inventory.png" class="card-img-top" alt="Coil Inventory">
              <div class="card-body">
                <h5 class="card-title">Coil Inventory</h5>
                <p class="card-text">
                  Track stock levels, grades, colors, and coil sizes in real time. 
                  Avoid shortages and overstocking with smart monitoring.
                </p>
              </div>
            </div>
          </div>

          <!-- Card for Sheet Cutting -->
          <div class="col-lg-3 col-md-6 mb-4">
            <div class="card">
              <img src="/static/components/images/sheet_cutting.png" class="card-img-top" alt="Sheet Cutting">
              <div class="card-body">
                <h5 class="card-title">Sheet Cutting Management</h5>
                <p class="card-text">
                  Record coil-to-sheet conversions, manage cutting lengths & quantities, 
                  and optimize material usage.
                </p>
              </div>
            </div>
          </div>

          <!-- Card for Orders -->
          <div class="col-lg-3 col-md-6 mb-4">
            <div class="card">
              <img src="/static/components/images/orders.png" class="card-img-top" alt="Orders">
              <div class="card-body">
                <h5 class="card-title">Order Management</h5>
                <p class="card-text">
                  Track customer orders, link them to specific coils or sheets, 
                  and generate invoices quickly.
                </p>
              </div>
            </div>
          </div>

          <!-- Card for Reports -->
          <div class="col-lg-3 col-md-6 mb-4">
            <div class="card">
              <img src="/static/components/images/reports.png" class="card-img-top" alt="Reports">
              <div class="card-body">
                <h5 class="card-title">Reports & Analytics</h5>
                <p class="card-text">
                  View production summaries, sales history, and material usage reports 
                  to improve efficiency and profitability.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div class="card text-center mt-4">
        <div class="card-title">
          <h2>Contact Us</h2>
        </div>
        <div class="card-text">
          <p>
            Need help or have questions? Reach out at 
            <a href="mailto:support@coilmanager.com">support@coilmanager.com</a>
          </p>
        </div>
      </div>
    </div>
  `
}
