"""
Routes — all business APIs are owner-scoped.
Super Admin (role='admin') can see all data.
Coil Manager (role='owner') sees only their own records.
"""

import csv
from flask import current_app as app, jsonify, request, render_template
from flask_security import (
    auth_required, roles_required, verify_password, current_user, hash_password
)
from datetime import datetime, date, timedelta
from sqlalchemy.orm import joinedload
from sqlalchemy import func
import io
import uuid

from backend.models import (
    SaleCoil, SaleItem, User, Role, db, Coil, Party, Sale, Product,
    AuditLog, Notification, CompanySettings, StockMovement
)

datastore = app.security.datastore
cache     = app.cache


# ── Helpers ──────────────────────────────────────────────────────────────────

def _owner_id():
    """Return the logged-in user's id (used to scope queries)."""
    return current_user.id

def _is_admin():
    return current_user.role == "admin"

def _coil_q():
    """Base Coil query — admin sees all, owner sees own."""
    q = Coil.query
    if not _is_admin():
        q = q.filter_by(owner_id=_owner_id())
    return q

def _product_q():
    q = Product.query
    if not _is_admin():
        q = q.filter_by(owner_id=_owner_id())
    return q

def _party_q():
    q = Party.query
    if not _is_admin():
        q = q.filter_by(owner_id=_owner_id())
    return q

def _sale_q():
    q = Sale.query
    if not _is_admin():
        q = q.filter_by(owner_id=_owner_id())
    return q


# ── Public / Static ──────────────────────────────────────────────────────────

@app.get("/")
def home():
    return render_template("index.html")


@app.get("/admin")
@auth_required("token")
@roles_required("admin")
def admin():
    return "Welcome Admin"


# ── Authentication ────────────────────────────────────────────────────────────

@app.route("/user_login", methods=["POST"])
def user_login():
    data     = request.json
    email    = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()
    if not user or not verify_password(password, user.password):
        return jsonify({"message": "Invalid email or password"}), 401

    if not user.is_active:
        return jsonify({"message": "Account is deactivated. Contact your administrator."}), 403

    # Record last login
    user.last_login = datetime.now()
    db.session.commit()

    token = user.get_auth_token()
    return jsonify({
        "message":       "Login successful",
        "token":         token,
        "user_id":       user.id,
        "full_name":     user.full_name or user.email.split("@")[0],
        "business_name": user.business_name or "",
        "role":          user.role,
        "email":         user.email,
    }), 200


# ── Super-Admin: Owner Management ─────────────────────────────────────────────

@app.route("/api/admin/owners", methods=["GET"])
@auth_required("token")
def list_owners():
    if not _is_admin():
        return jsonify({"error": "Admin access required"}), 403

    owners = User.query.filter_by(role="owner").all()
    result = []
    for o in owners:
        coils_count    = Coil.query.filter_by(owner_id=o.id).count()
        products_count = Product.query.filter_by(owner_id=o.id).count()
        orders_count   = Sale.query.filter_by(owner_id=o.id).count()
        revenue        = db.session.query(
            func.coalesce(func.sum(Sale.total_amount), 0)
        ).filter_by(owner_id=o.id).scalar() or 0

        row = o.to_summary()
        row.update({
            "coils_count":    coils_count,
            "products_count": products_count,
            "orders_count":   orders_count,
            "revenue":        float(revenue),
        })
        result.append(row)

    return jsonify(result)


@app.route("/api/admin/owners", methods=["POST"])
@auth_required("token")
def create_owner():
    if not _is_admin():
        return jsonify({"error": "Admin access required"}), 403

    data = request.json
    email    = data.get("email", "").strip()
    password = data.get("password", "").strip()
    full_name     = data.get("full_name", "").strip()
    business_name = data.get("business_name", "").strip()

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "A user with this email already exists"}), 400

    owner_role = Role.query.filter_by(name="owner").first()
    new_user = datastore.create_user(
        email=email,
        password=hash_password(password),
        fs_uniquifier=str(uuid.uuid4()),
        active=True,
        roles=[owner_role] if owner_role else []
    )
    new_user.full_name     = full_name
    new_user.business_name = business_name
    new_user.role          = "owner"
    new_user.is_active     = True
    db.session.commit()

    return jsonify({"message": "Coil Manager created", "id": new_user.id}), 201


@app.route("/api/admin/owners/<int:owner_id>", methods=["GET"])
@auth_required("token")
def get_owner(owner_id):
    if not _is_admin():
        return jsonify({"error": "Admin access required"}), 403
    user = User.query.filter_by(id=owner_id, role="owner").first_or_404()
    return jsonify(user.to_summary())


@app.route("/api/admin/owners/<int:owner_id>/toggle", methods=["POST"])
@auth_required("token")
def toggle_owner(owner_id):
    if not _is_admin():
        return jsonify({"error": "Admin access required"}), 403
    user = User.query.filter_by(id=owner_id, role="owner").first_or_404()
    user.is_active = not user.is_active
    user.active    = user.is_active
    db.session.commit()
    status = "activated" if user.is_active else "deactivated"
    return jsonify({"message": f"Account {status}", "is_active": user.is_active})


@app.route("/api/admin/owners/<int:owner_id>", methods=["DELETE"])
@auth_required("token")
def delete_owner(owner_id):
    if not _is_admin():
        return jsonify({"error": "Admin access required"}), 403
    user = User.query.filter_by(id=owner_id, role="owner").first_or_404()
    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "Owner deleted"})


# ── Super-Admin: Platform Analytics ──────────────────────────────────────────

@app.route("/api/admin/dashboard", methods=["GET"])
@auth_required("token")
def admin_dashboard():
    if not _is_admin():
        return jsonify({"error": "Admin access required"}), 403

    total_owners   = User.query.filter_by(role="owner").count()
    active_owners  = User.query.filter_by(role="owner", is_active=True).count()
    total_coils    = Coil.query.count()
    total_products = Product.query.count()
    total_orders   = Sale.query.count()
    total_revenue  = db.session.query(
        func.coalesce(func.sum(Sale.total_amount), 0)
    ).scalar() or 0

    # Revenue by owner (top 10)
    revenue_by_owner = (
        db.session.query(
            User.id, User.full_name, User.business_name,
            func.coalesce(func.sum(Sale.total_amount), 0).label("revenue"),
            func.count(Sale.id).label("orders")
        )
        .outerjoin(Sale, Sale.owner_id == User.id)
        .filter(User.role == "owner")
        .group_by(User.id)
        .order_by(func.coalesce(func.sum(Sale.total_amount), 0).desc())
        .limit(10)
        .all()
    )

    owner_revenue = [
        {
            "id":            r.id,
            "full_name":     r.full_name or "—",
            "business_name": r.business_name or "—",
            "revenue":       float(r.revenue),
            "orders":        r.orders,
        }
        for r in revenue_by_owner
    ]

    # Monthly sales trend (last 6 months across all owners)
    trend_rows = (
        db.session.query(
            db.extract("month", Sale.date).label("month"),
            func.sum(Sale.total_amount).label("total")
        )
        .group_by("month")
        .order_by("month")
        .limit(6)
        .all()
    )
    trend = [{"month": int(m), "total": float(t or 0)} for m, t in trend_rows]

    return jsonify({
        "total_owners":   total_owners,
        "active_owners":  active_owners,
        "inactive_owners": total_owners - active_owners,
        "total_coils":    total_coils,
        "total_products": total_products,
        "total_orders":   total_orders,
        "total_revenue":  float(total_revenue),
        "owner_revenue":  owner_revenue,
        "sales_trend":    trend,
    })


@app.route("/api/admin/all_orders", methods=["GET"])
@auth_required("token")
def admin_all_orders():
    if not _is_admin():
        return jsonify({"error": "Admin access required"}), 403
    return _all_orders_json(Sale.query)


# ── Customer endpoints ────────────────────────────────────────────────────────

@app.route("/api/customers", methods=["GET"])
@auth_required("token")
def customer_info():
    customers = _party_q().all()
    if not customers:
        return jsonify({"message": "No customers found"}), 404
    return jsonify([
        {"id": c.id, "phone": c.phone, "name": c.name}
        for c in customers
    ])


@app.route("/api/update/customer/<int:id>", methods=["GET", "POST"])
@auth_required("token")
def update_customer(id):
    customer = _party_q().filter_by(id=id).first_or_404()

    if request.method == "GET":
        return jsonify({"id": customer.id, "name": customer.name, "phone": customer.phone})

    data = request.json
    customer.phone = data.get("phone", customer.phone)
    customer.name  = data.get("name", customer.name)
    db.session.commit()
    return jsonify({"message": "Customer updated successfully"})


@app.route("/delete/customer/<int:id>", methods=["DELETE"])
@auth_required("token")
def delete_customer(id):
    customer = _party_q().filter_by(id=id).first_or_404()
    db.session.delete(customer)
    db.session.commit()
    return jsonify({"message": "Customer deleted successfully"})


@app.route("/api/customer/search", methods=["GET"])
@auth_required("token")
def search_customer():
    name_query = request.args.get("name", "").strip()
    if not name_query:
        return jsonify([]), 200
    matches = _party_q().filter(Party.name.ilike(f"%{name_query}%")).all()
    return jsonify([{"id": c.id, "name": c.name, "phone": c.phone} for c in matches]), 200


@app.route("/api/customers/search")
@auth_required("token")
def search_customers():
    query = request.args.get("query", "").strip()
    if not query:
        return jsonify({"error": "Query is required"}), 400

    customers = _party_q().filter(
        (Party.name.ilike(f"%{query}%")) | (Party.phone.ilike(f"%{query}%"))
    ).all()

    results = []
    for c in customers:
        orders = _sale_q().filter_by(party_id=c.id).all()
        results.append({
            "id": c.id, "name": c.name, "phone": c.phone,
            "orders": [
                {"id": o.id, "date": o.date.strftime("%Y-%m-%d") if o.date else None,
                 "total": o.total_amount}
                for o in orders
            ]
        })
    return jsonify(results)


@app.route("/api/parties", methods=["GET", "POST"])
@auth_required("token")
def manage_parties():
    if request.method == "GET":
        parties = _party_q().all()
        return jsonify([{"id": s.id, "name": s.name, "phone": s.phone} for s in parties])

    data = request.json
    if not data.get("name"):
        return jsonify({"message": "name is required"}), 400

    new_party = Party(
        name=data.get("name"),
        phone=data.get("phone"),
        owner_id=_owner_id() if not _is_admin() else data.get("owner_id")
    )
    db.session.add(new_party)
    db.session.commit()
    return jsonify({"id": new_party.id, "name": new_party.name, "phone": new_party.phone}), 201


# ── Product endpoints ─────────────────────────────────────────────────────────

@app.route("/api/products", methods=["GET", "POST"])
@auth_required("token")
def manage_products():
    if request.method == "GET":
        # Optional: filter by coil_id
        coil_id = request.args.get("coil_id", type=int)
        q = _product_q()
        if coil_id:
            q = q.filter_by(coil_id=coil_id)
        products = q.all()
        return jsonify([
            {"id": s.id, "make": s.make, "type": s.type, "color": s.color,
             "rate": s.rate, "coil_id": s.coil_id}
            for s in products
        ])

    data = request.json
    if not data.get("make") or not data.get("rate") or not data.get("color") or not data.get("type"):
        return jsonify({"message": "All fields are required"}), 400

    new_product = Product(
        make=data["make"], type=data["type"], color=data["color"],
        rate=data["rate"], coil_id=data.get("coil_id"),
        owner_id=_owner_id() if not _is_admin() else data.get("owner_id")
    )
    db.session.add(new_product)
    db.session.commit()
    return jsonify({"message": "Product created successfully"}), 201


@app.route("/api/update/product/<int:id>", methods=["GET", "POST"])
@auth_required("token")
def update_product(id):
    product = _product_q().filter_by(id=id).first_or_404()

    if request.method == "GET":
        return jsonify({
            "id": product.id, "make": product.make, "type": product.type,
            "color": product.color, "rate": product.rate, "coil_id": product.coil_id
        })

    data = request.json
    product.make  = data.get("make", product.make)
    product.type  = data.get("type", product.type)
    product.color = data.get("color", product.color)
    product.rate  = data.get("rate", product.rate)
    db.session.commit()
    return jsonify({"message": "Product updated successfully"})


@app.route("/delete/product/<int:id>", methods=["DELETE"])
@auth_required("token")
def delete_product(id):
    product = _product_q().filter_by(id=id).first_or_404()
    db.session.delete(product)
    db.session.commit()
    return jsonify({"message": "Product deleted successfully"})


# ── Coil endpoints ────────────────────────────────────────────────────────────

@app.route("/api/coils", methods=["GET", "POST"])
@auth_required("token")
def manage_coils():
    if request.method == "GET":
        coils = _coil_q().all()
        return jsonify([
            {"id": s.id, "coil_number": s.coil_number, "supplier_name": s.supplier_name,
             "total_weight": s.total_weight, "purchase_price": s.purchase_price,
             "length": s.length, "make": s.make, "type": s.type,
             "color": s.color, "purchase_date": s.purchase_date}
            for s in coils
        ])

    data = request.json
    if not data.get("coil_number"):
        return jsonify({"message": "coil_number is required"}), 400
    if not data.get("make") or not data.get("type") or not data.get("color"):
        return jsonify({"message": "make, type and color are required"}), 400

    oid = _owner_id() if not _is_admin() else data.get("owner_id")
    if Coil.query.filter_by(coil_number=data["coil_number"], owner_id=oid).first():
        return jsonify({"message": "A coil with this number already exists"}), 400

    new_coil = Coil(
        coil_number=data["coil_number"],
        supplier_name=data.get("supplier_name", ""),
        total_weight=data.get("total_weight"),
        purchase_price=data.get("purchase_price"),
        make=data["make"], type=data["type"], color=data["color"],
        purchase_date=data.get("purchase_date", ""),
        length=data.get("length"),
        owner_id=oid
    )
    db.session.add(new_coil)
    db.session.commit()
    return jsonify({"message": "New coil created successfully"}), 201


@app.route("/api/update/coil/<int:id>", methods=["GET", "POST"])
@auth_required("token")
def update_coil(id):
    coil = _coil_q().filter_by(id=id).first_or_404()

    if request.method == "GET":
        return jsonify({
            "id": coil.id, "make": coil.make, "type": coil.type, "color": coil.color,
            "purchase_date": coil.purchase_date, "coil_number": coil.coil_number,
            "supplier_name": coil.supplier_name, "total_weight": coil.total_weight,
            "purchase_price": coil.purchase_price, "length": coil.length,
        })

    data = request.json
    coil.make          = data.get("make", coil.make)
    coil.type          = data.get("type", coil.type)
    coil.color         = data.get("color", coil.color)
    coil.purchase_price= data.get("purchase_price", coil.purchase_price)
    coil.coil_number   = data.get("coil_number", coil.coil_number)
    coil.supplier_name = data.get("supplier_name", coil.supplier_name)
    coil.total_weight  = data.get("total_weight", coil.total_weight)
    coil.purchase_date = data.get("purchase_date", coil.purchase_date)
    coil.length        = data.get("length", coil.length)
    db.session.commit()
    return jsonify({"message": "Coil updated successfully"})


@app.route("/delete/coil/<int:id>", methods=["DELETE"])
@auth_required("token")
def delete_coil(id):
    coil = _coil_q().filter_by(id=id).first_or_404()
    db.session.delete(coil)
    db.session.commit()
    return jsonify({"message": "Coil deleted successfully"})


# ── Coil stock: remaining length ──────────────────────────────────────────────

def _calc_remaining(coil):
    """Return (used_length, remaining_length) for a coil across all non-cancelled sales."""
    used = sum(
        (item.length or 0) * (item.quantity or 0)
        for sc in coil.sales_used_in
        for item in sc.items
        if (sc.sale.status or "confirmed") != "cancelled"
    )
    remaining = max((coil.length or 0) - used, 0.0)
    return round(used, 3), round(remaining, 3)


@app.route("/api/coils/<int:coil_id>/remaining", methods=["GET"])
@auth_required("token")
def coil_remaining(coil_id):
    """Return the remaining usable length of a coil."""
    coil = _coil_q().filter_by(id=coil_id).first_or_404()
    used, remaining = _calc_remaining(coil)
    return jsonify({
        "coil_id":         coil.id,
        "coil_number":     coil.coil_number,
        "make":            coil.make,
        "type":            coil.type,
        "color":           coil.color,
        "original_length": coil.length or 0,
        "used_length":     used,
        "remaining_length": remaining,
    })


# ── Sale endpoints ────────────────────────────────────────────────────────────

@app.route("/api/sales", methods=["GET", "POST"])
@auth_required("token")
def manage_sales():
    if request.method == "GET":
        sales = (
            _sale_q()
            .options(
                joinedload(Sale.used_coils).joinedload(SaleCoil.items),
                joinedload(Sale.party)
            )
            .all()
        )
        return jsonify([
            {
                "id": sale.id,
                "date": sale.date.strftime("%Y-%m-%d %H:%M:%S") if sale.date else None,
                "party_id": sale.party_id,
                "party_name": sale.party.name if sale.party else None,
                "total_amount": sale.total_amount,
                "used_coils": [
                    {
                        "id": sc.id, "coil_id": sc.coil_id,
                        "items": [
                            {"id": item.id, "product_id": item.product_id,
                             "length": item.length, "quantity": item.quantity,
                             "rate": item.rate, "amount": item.amount,
                             "is_custom": item.is_custom}
                            for item in sc.items
                        ]
                    }
                    for sc in sale.used_coils
                ]
            }
            for sale in sales
        ])

    # POST — create a new sale
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON data received"}), 400

    party_name = data.get("party_name")
    if not party_name:
        return jsonify({"error": "Party name is required"}), 400

    oid = _owner_id() if not _is_admin() else None

    # ── Stock validation: check every coil group BEFORE touching the DB ───────
    stock_errors = []
    for coil_group in data.get("coils", []):
        coil_id = coil_group.get("coil_id")
        if not coil_id:
            continue
        coil = _coil_q().filter_by(id=coil_id).first()
        if not coil:
            stock_errors.append(f"Coil ID {coil_id} not found.")
            continue
        _, remaining = _calc_remaining(coil)
        ordered = sum(
            float(item.get("length", 0)) * int(item.get("quantity", 0) or 0)
            for item in coil_group.get("items", [])
        )
        if ordered > remaining + 1e-6:   # small tolerance for float rounding
            stock_errors.append(
                f"Insufficient stock for coil {coil.coil_number}: "
                f"ordered {ordered:.2f} m but only {remaining:.2f} m available."
            )

    if stock_errors:
        return jsonify({"error": " | ".join(stock_errors), "stock_error": True}), 422
    # ──────────────────────────────────────────────────────────────────────────

    customer_id = data.get("customer_id")
    if customer_id:
        party = Party.query.get(customer_id)
        if not party:
            return jsonify({"error": "Customer not found"}), 404
    else:
        party = _party_q().filter_by(name=party_name).first()
        if not party:
            party = Party(name=party_name, owner_id=oid)
            db.session.add(party)
            db.session.flush()

    sale = Sale(
        party_id=party.id,
        total_amount=data.get("total_amount", 0),
        production_status="pending",
        owner_id=oid,
    )
    db.session.add(sale)
    db.session.flush()

    for coil_group in data.get("coils", []):
        coil_id    = coil_group.get("coil_id")
        product_id = coil_group.get("product_id")
        if not coil_id or not product_id:
            continue
        sale_coil = SaleCoil(sale_id=sale.id, coil_id=coil_id)
        db.session.add(sale_coil)
        db.session.flush()
        for item in coil_group.get("items", []):
            if not item.get("length") or not item.get("quantity"):
                continue
            db.session.add(SaleItem(
                sale_coil_id=sale_coil.id, product_id=product_id,
                length=item.get("length"), quantity=item.get("quantity"),
                rate=item.get("rate", 0), amount=item.get("amount", 0),
                is_custom=item.get("is_custom", False),
            ))

    db.session.commit()
    return jsonify({
        "message": "Sale created successfully",
        "sale_id": sale.id,
        "invoice_number": sale.invoice_number or f"INV-{sale.id:04d}",
    }), 201


@app.route("/api/all_orders", methods=["GET"])
@auth_required("token")
def all_orders():
    return _all_orders_json(_sale_q())


def _all_orders_json(base_query):
    """Shared helper — turns a Sale query into the full nested JSON."""
    sales = (
        base_query
        .options(
            joinedload(Sale.party),
            joinedload(Sale.used_coils).joinedload(SaleCoil.coil),
            joinedload(Sale.used_coils).joinedload(SaleCoil.items).joinedload(SaleItem.product)
        )
        .all()
    )
    results = []
    for sale in sales:
        sale_data = {
            "sale_id":           sale.id,
            "invoice_number":    sale.invoice_number or f"INV-{sale.id:04d}",
            "date":              sale.date.strftime("%Y-%m-%d") if sale.date else None,
            "owner_id":          sale.owner_id,
            "party":             {"id": sale.party.id, "name": sale.party.name, "phone": sale.party.phone},
            "total_amount":      sale.total_amount,
            "net_amount":        sale.net_amount or sale.total_amount,
            "status":            sale.status or "confirmed",
            "payment_status":    sale.payment_status or "pending",
            "production_status": sale.production_status or "pending",
            "amount_paid":       sale.amount_paid or 0,
            "used_coils":        [],
        }
        for sc in sale.used_coils:
            coil_data = {
                "coil_id": sc.coil.id, "coil_number": sc.coil.coil_number,
                "make": sc.coil.make, "type": sc.coil.type,
                "color": sc.coil.color, "length": sc.coil.length, "items": []
            }
            for item in sc.items:
                coil_data["items"].append({
                    "item_id": item.id,
                    "product": {"id": item.product.id, "make": item.product.make,
                                "type": item.product.type, "color": item.product.color,
                                "rate": item.product.rate},
                    "length": item.length, "quantity": item.quantity,
                    "rate": item.rate, "amount": item.amount, "is_custom": item.is_custom
                })
            sale_data["used_coils"].append(coil_data)
        results.append(sale_data)
    return jsonify(results)


# ── Search ────────────────────────────────────────────────────────────────────

@app.route("/api/sales/search/products")
@auth_required("token")
def search_sales_by_products():
    query = request.args.get("query", "").strip()
    if not query:
        return jsonify({"error": "Query is required"}), 400

    sale_items = (
        db.session.query(SaleItem)
        .join(Product, SaleItem.product_id == Product.id)
        .filter(
            (Product.make.ilike(f"%{query}%")) |
            (Product.type.ilike(f"%{query}%")) |
            (Product.color.ilike(f"%{query}%"))
        )
        .all()
    )

    results = []
    for item in sale_items:
        sc   = SaleCoil.query.get(item.sale_coil_id)
        sale = Sale.query.get(sc.sale_id) if sc else None
        if not _is_admin() and sale and sale.owner_id != _owner_id():
            continue
        results.append({
            "item_id": item.id, "sale_id": sale.id if sale else None,
            "date": sale.date.strftime("%Y-%m-%d") if sale and sale.date else None,
            "total_amount": sale.total_amount if sale else None,
            "product": {"make": item.product.make, "type": item.product.type, "color": item.product.color},
            "length": item.length, "quantity": item.quantity, "rate": item.rate, "amount": item.amount,
        })
    return jsonify(results)


@app.route("/api/sales/search/date")
@auth_required("token")
def search_sales_by_date():
    search_type = request.args.get("type")
    query       = request.args.get("query", "").strip()
    if not search_type or not query:
        return jsonify({"error": "type and query are required"}), 400

    q = _sale_q()
    try:
        if search_type == "date":
            q = q.filter(db.func.date(Sale.date) == query)
        elif search_type == "month":
            q = q.filter(db.extract("month", Sale.date) == int(query))
        elif search_type == "year":
            q = q.filter(db.extract("year", Sale.date) == int(query))
        else:
            return jsonify({"error": "Invalid search type"}), 400
    except ValueError:
        return jsonify({"error": "Invalid query value"}), 400

    return jsonify([
        {"sale_id": s.id, "party_id": s.party_id,
         "date": s.date.strftime("%Y-%m-%d") if s.date else None, "total": s.total_amount}
        for s in q.all()
    ])


# ── Owner-scoped Dashboard ────────────────────────────────────────────────────

@app.route("/api/dashboard", methods=["GET"])
@auth_required("token")
def dashboard():
    total_coils       = _coil_q().count()
    total_products    = _product_q().count()
    active_orders     = _sale_q().filter(Sale.total_amount > 0).count()
    pending_orders    = _sale_q().filter(Sale.production_status == "pending").count()
    in_progress_orders = _sale_q().filter(Sale.production_status == "in_progress").count()
    completed_orders  = _sale_q().filter(Sale.production_status == "completed").count()

    coil_data      = []
    total_remaining = 0.0
    finished_count = 0

    for coil in _coil_q().all():
        used_length = 0.0
        for sc in coil.sales_used_in:
            # Only count sales that belong to this owner
            if not _is_admin() and sc.sale.owner_id != _owner_id():
                continue
            for item in sc.items:
                used_length += (item.length or 0) * (item.quantity or 0)

        original  = float(coil.length or 0)
        remaining = max(original - used_length, 0.0)
        total_remaining += remaining
        if remaining <= 0:
            finished_count += 1

        coil_data.append({
            "id": coil.id, "coil_number": coil.coil_number,
            "make": coil.make, "type": coil.type, "color": coil.color,
            "original_length": original,
            "used_length":     round(used_length, 2),
            "remaining_length": round(remaining, 2),
        })

    trend_rows = (
        db.session.query(
            db.extract("month", Sale.date).label("month"),
            func.sum(Sale.total_amount).label("total")
        )
        .filter(Sale.owner_id == _owner_id() if not _is_admin() else True)
        .group_by("month").order_by("month").limit(6).all()
    )
    trend = [{"month": int(m), "total": float(t or 0)} for m, t in trend_rows]

    return jsonify({
        "total_coils":        total_coils,
        "total_products":     total_products,
        "active_orders":      active_orders,
        "pending_orders":     pending_orders,
        "in_progress_orders": in_progress_orders,
        "completed_orders":   completed_orders,
        "finished_coils":     finished_count,
        "remaining_material": round(total_remaining, 2),
        "sales_trend":        trend,
        "coil_details":       coil_data,
    })


# ── Import / Bulk-Add ─────────────────────────────────────────────────────────

@app.route("/api/import_orders", methods=["POST"])
@auth_required("token")
def import_orders():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files["file"]
    if not file.filename.endswith(".csv"):
        return jsonify({"error": "Invalid file format — please upload a .csv file"}), 400

    stream  = io.StringIO(file.stream.read().decode("utf-8"))
    reader  = csv.DictReader(stream)
    oid     = _owner_id() if not _is_admin() else None
    imported         = 0
    created_customers = []

    for row in reader:
        try:
            party_name  = row.get("Party Name", "").strip()
            party_phone = row.get("Phone", "").strip()
            if not party_name:
                continue

            customer = _party_q().filter_by(phone=party_phone).first() if party_phone else None
            if not customer:
                customer = Party(name=party_name, phone=party_phone or None, owner_id=oid)
                db.session.add(customer)
                db.session.flush()
                created_customers.append(party_name)

            sale = Sale(party_id=customer.id,
                        total_amount=float(row.get("Total Amount") or 0), owner_id=oid)
            db.session.add(sale)
            db.session.flush()

            coil_number = row.get("Coil Number", "").strip()
            if coil_number:
                coil = _coil_q().filter_by(coil_number=coil_number).first()
                if coil:
                    product = _product_q().filter_by(
                        make=row.get("Make", ""), type=row.get("Type", ""),
                        color=row.get("Color", ""), coil_id=coil.id
                    ).first()
                    if product:
                        sc = SaleCoil(sale_id=sale.id, coil_id=coil.id)
                        db.session.add(sc)
                        db.session.flush()
                        db.session.add(SaleItem(
                            sale_coil_id=sc.id, product_id=product.id,
                            length=float(row.get("Length") or 0),
                            quantity=int(row.get("Quantity") or 1),
                            rate=float(row.get("Rate") or 0),
                            amount=float(row.get("Amount") or 0),
                        ))
            imported += 1
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    db.session.commit()
    return jsonify({"message": f"Imported {imported} rows successfully",
                    "new_customers": created_customers})


@app.route("/api/add_orders", methods=["POST"])
@auth_required("token")
def add_orders():
    try:
        data = request.get_json()
        if not isinstance(data, list):
            return jsonify({"error": "Expected a list of orders"}), 400

        oid = _owner_id() if not _is_admin() else None
        saved_orders = []

        for order in data:
            pi   = order.get("party", {})
            pname = pi.get("name", "")
            pphone = pi.get("phone", "")

            customer = _party_q().filter_by(name=pname, phone=pphone).first()
            if not customer:
                customer = Party(name=pname, phone=pphone, owner_id=oid)
                db.session.add(customer)
                db.session.flush()

            date_str  = order.get("date")
            sale_date = datetime.strptime(date_str, "%Y-%m-%d") if date_str else datetime.now()

            sale = Sale(date=sale_date, party_id=customer.id,
                        total_amount=order.get("total_amount", 0), owner_id=oid)
            db.session.add(sale)
            db.session.flush()

            for cd in order.get("used_coils", []):
                db_coil = _coil_q().filter_by(coil_number=cd.get("coil_number")).first()
                if not db_coil:
                    continue
                sc = SaleCoil(sale_id=sale.id, coil_id=db_coil.id)
                db.session.add(sc)
                db.session.flush()
                for item in cd.get("items", []):
                    pid = item.get("product_id")
                    if not pid:
                        continue
                    db.session.add(SaleItem(
                        sale_coil_id=sc.id, product_id=pid,
                        length=item.get("length", 0), quantity=item.get("quantity", 1),
                        rate=item.get("rate", 0), amount=item.get("amount", 0)
                    ))

            saved_orders.append({"sale_id": sale.id, "date": str(sale.date),
                                  "party_name": customer.name, "total_amount": sale.total_amount})

        db.session.commit()
        return jsonify(saved_orders), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400


# ── Helpers ───────────────────────────────────────────────────────────────────

def _audit(action, entity=None, entity_id=None, detail=None):
    """Write an audit log entry for the current user."""
    try:
        db.session.add(AuditLog(
            user_id=current_user.id if current_user and current_user.is_authenticated else None,
            action=action, entity=entity, entity_id=entity_id, detail=detail,
            ip_address=request.remote_addr,
        ))
    except Exception:
        pass  # never crash the real request due to audit logging


def _notify(owner_id, type_, title, message, link=None):
    """Create an in-app notification for a user."""
    try:
        db.session.add(Notification(
            owner_id=owner_id, type=type_, title=title, message=message, link=link
        ))
    except Exception:
        pass


def _low_stock_threshold():
    return 50.0  # metres — configurable later per company


def _check_low_stock(coil, owner_id):
    """After a sale, check if a coil is low-stock and create a notification."""
    used = sum(
        (item.length or 0) * (item.quantity or 0)
        for sc in coil.sales_used_in
        for item in sc.items
    )
    remaining = max((coil.length or 0) - used, 0)
    threshold = _low_stock_threshold()
    if 0 < remaining <= threshold:
        existing = Notification.query.filter_by(
            owner_id=owner_id, type="low_stock", is_read=False
        ).filter(Notification.message.contains(coil.coil_number)).first()
        if not existing:
            _notify(owner_id, "low_stock",
                    f"Low Stock: {coil.coil_number}",
                    f"Only {remaining:.1f} m remaining on coil {coil.coil_number} ({coil.make} {coil.color}).",
                    link="/coil_info")
    elif remaining <= 0:
        existing = Notification.query.filter_by(
            owner_id=owner_id, type="low_stock", is_read=False
        ).filter(Notification.message.contains(coil.coil_number)).first()
        if not existing:
            _notify(owner_id, "low_stock",
                    f"Coil Exhausted: {coil.coil_number}",
                    f"Coil {coil.coil_number} ({coil.make} {coil.color}) is fully used.",
                    link="/coil_info")


# ── Sale status & payment management ─────────────────────────────────────────

@app.route("/api/sales/<int:sale_id>/status", methods=["POST"])
@auth_required("token")
def update_sale_status(sale_id):
    sale = _sale_q().filter_by(id=sale_id).first_or_404()
    data = request.json
    new_status = data.get("status")
    if new_status not in ("draft", "confirmed", "cancelled"):
        return jsonify({"error": "Invalid status"}), 400
    sale.status = new_status
    _audit("update_sale_status", "sale", sale_id, f"status→{new_status}")
    db.session.commit()
    return jsonify({"message": "Status updated", "status": sale.status})


@app.route("/api/sales/<int:sale_id>/payment", methods=["POST"])
@auth_required("token")
def update_payment(sale_id):
    sale = _sale_q().filter_by(id=sale_id).first_or_404()
    data = request.json
    amount = float(data.get("amount_paid", 0))
    sale.amount_paid = amount
    net = sale.net_amount or sale.total_amount or 0
    if amount <= 0:
        sale.payment_status = "pending"
    elif amount < net:
        sale.payment_status = "partial"
    else:
        sale.payment_status = "paid"

    # Update party balance
    party = sale.party
    if party:
        total_paid = sum(
            (s.amount_paid or 0) for s in party.sales if s.id != sale_id
        ) + amount
        total_owed = sum(
            (s.net_amount or s.total_amount or 0) for s in party.sales
        )
        party.balance = max(total_owed - total_paid, 0)

    _audit("update_payment", "sale", sale_id, f"paid={amount} status={sale.payment_status}")
    db.session.commit()
    return jsonify({"message": "Payment updated", "payment_status": sale.payment_status,
                    "amount_paid": sale.amount_paid})


@app.route("/api/sales/<int:sale_id>", methods=["DELETE"])
@auth_required("token")
def delete_sale(sale_id):
    sale = _sale_q().filter_by(id=sale_id).first_or_404()
    _audit("delete_sale", "sale", sale_id)
    db.session.delete(sale)
    db.session.commit()
    return jsonify({"message": "Sale deleted"})


# ── Production status ─────────────────────────────────────────────────────────

VALID_PRODUCTION_STATUSES = {"pending", "in_progress", "completed"}

@app.route("/api/sales/<int:sale_id>/production-status", methods=["POST"])
@auth_required("token")
def update_production_status(sale_id):
    sale = _sale_q().filter_by(id=sale_id).first_or_404()
    data = request.json
    new_status = data.get("production_status", "").strip()

    if new_status not in VALID_PRODUCTION_STATUSES:
        return jsonify({
            "error": f"Invalid production_status. Must be one of: {', '.join(VALID_PRODUCTION_STATUSES)}"
        }), 400

    old_status = sale.production_status
    sale.production_status = new_status

    # When marked completed, confirm the order status too
    if new_status == "completed" and sale.status == "draft":
        sale.status = "confirmed"

    _audit(
        "update_production_status", "sale", sale_id,
        f"{old_status} → {new_status}"
    )

    # Notify the owner
    if sale.owner_id:
        label = {"pending": "Pending", "in_progress": "In Progress", "completed": "Completed"}[new_status]
        _notify(
            sale.owner_id, "order",
            f"Order {sale.invoice_number or ('INV-' + str(sale_id).zfill(4))} — {label}",
            f"Production status updated to '{label}'.",
            link="/view_all_orders",
        )

    db.session.commit()
    return jsonify({
        "message": "Production status updated",
        "production_status": sale.production_status,
        "sale_id": sale.id,
    })


# ── Enhanced dashboard ─────────────────────────────────────────────────────────

@app.route("/api/dashboard/analytics", methods=["GET"])
@auth_required("token")
def dashboard_analytics():
    today      = date.today()
    month_start = today.replace(day=1)
    year_start  = today.replace(month=1, day=1)

    sale_q = _sale_q()

    revenue_today = db.session.query(
        func.coalesce(func.sum(Sale.total_amount), 0)
    ).filter(
        Sale.owner_id == _owner_id() if not _is_admin() else True,
        func.date(Sale.date) == today
    ).scalar() or 0

    revenue_month = db.session.query(
        func.coalesce(func.sum(Sale.total_amount), 0)
    ).filter(
        Sale.owner_id == _owner_id() if not _is_admin() else True,
        Sale.date >= month_start
    ).scalar() or 0

    revenue_year = db.session.query(
        func.coalesce(func.sum(Sale.total_amount), 0)
    ).filter(
        Sale.owner_id == _owner_id() if not _is_admin() else True,
        Sale.date >= year_start
    ).scalar() or 0

    total_customers = _party_q().count()
    pending_orders  = sale_q.filter(Sale.payment_status == "pending").count()
    completed_orders = sale_q.filter(Sale.payment_status == "paid").count()
    cancelled_orders = sale_q.filter(Sale.status == "cancelled").count()

    # Top customers by revenue
    top_customers = (
        db.session.query(Party.name, func.coalesce(func.sum(Sale.total_amount), 0).label("rev"))
        .join(Sale, Sale.party_id == Party.id)
        .filter(Sale.owner_id == _owner_id() if not _is_admin() else True)
        .group_by(Party.id)
        .order_by(func.coalesce(func.sum(Sale.total_amount), 0).desc())
        .limit(5).all()
    )

    # Most sold products (by length × quantity)
    most_sold = (
        db.session.query(
            Product.make, Product.type, Product.color,
            func.coalesce(func.sum(SaleItem.length * SaleItem.quantity), 0).label("total_length")
        )
        .join(SaleItem, SaleItem.product_id == Product.id)
        .join(SaleCoil, SaleCoil.id == SaleItem.sale_coil_id)
        .join(Sale, Sale.id == SaleCoil.sale_id)
        .filter(Sale.owner_id == _owner_id() if not _is_admin() else True)
        .group_by(Product.id)
        .order_by(func.coalesce(func.sum(SaleItem.length * SaleItem.quantity), 0).desc())
        .limit(5).all()
    )

    # Monthly trend — last 12 months
    trend = (
        db.session.query(
            db.extract("year", Sale.date).label("yr"),
            db.extract("month", Sale.date).label("mo"),
            func.coalesce(func.sum(Sale.total_amount), 0).label("total")
        )
        .filter(Sale.owner_id == _owner_id() if not _is_admin() else True)
        .group_by("yr", "mo")
        .order_by("yr", "mo")
        .limit(12).all()
    )

    return jsonify({
        "revenue_today":     float(revenue_today),
        "revenue_month":     float(revenue_month),
        "revenue_year":      float(revenue_year),
        "total_customers":   total_customers,
        "pending_orders":    pending_orders,
        "completed_orders":  completed_orders,
        "cancelled_orders":  cancelled_orders,
        "top_customers":     [{"name": n, "revenue": float(r)} for n, r in top_customers],
        "most_sold_products": [
            {"make": m, "type": t, "color": c, "total_length": float(l)}
            for m, t, c, l in most_sold
        ],
        "monthly_trend": [
            {"year": int(yr), "month": int(mo), "total": float(tot)}
            for yr, mo, tot in trend
        ],
    })


# ── Stock intelligence ─────────────────────────────────────────────────────────

@app.route("/api/stock/alerts", methods=["GET"])
@auth_required("token")
def stock_alerts():
    threshold = _low_stock_threshold()
    alerts = []
    for coil in _coil_q().all():
        used = sum(
            (item.length or 0) * (item.quantity or 0)
            for sc in coil.sales_used_in
            for item in sc.items
        )
        remaining = max((coil.length or 0) - used, 0)
        if remaining <= threshold:
            alerts.append({
                "coil_id": coil.id, "coil_number": coil.coil_number,
                "make": coil.make, "type": coil.type, "color": coil.color,
                "remaining": round(remaining, 2),
                "severity": "critical" if remaining <= 0 else "low",
            })
    return jsonify(alerts)


@app.route("/api/stock/movements", methods=["GET"])
@auth_required("token")
def stock_movements():
    coil_id = request.args.get("coil_id", type=int)
    q = StockMovement.query.filter_by(owner_id=_owner_id() if not _is_admin() else None)
    if coil_id:
        q = q.filter_by(coil_id=coil_id)
    movements = q.order_by(StockMovement.created_at.desc()).limit(100).all()
    return jsonify([
        {
            "id": m.id, "coil_id": m.coil_id,
            "coil_number": m.coil.coil_number if m.coil else None,
            "sale_id": m.sale_id, "movement": m.movement,
            "description": m.description,
            "created_at": m.created_at.strftime("%Y-%m-%d %H:%M") if m.created_at else None,
        }
        for m in movements
    ])


# ── Notifications ─────────────────────────────────────────────────────────────

@app.route("/api/notifications", methods=["GET"])
@auth_required("token")
def get_notifications():
    notifs = (
        Notification.query
        .filter_by(owner_id=_owner_id())
        .order_by(Notification.created_at.desc())
        .limit(30).all()
    )
    unread = Notification.query.filter_by(owner_id=_owner_id(), is_read=False).count()
    return jsonify({
        "unread": unread,
        "notifications": [
            {
                "id": n.id, "type": n.type, "title": n.title,
                "message": n.message, "is_read": n.is_read,
                "link": n.link,
                "created_at": n.created_at.strftime("%Y-%m-%d %H:%M") if n.created_at else None,
            }
            for n in notifs
        ]
    })


@app.route("/api/notifications/mark-read", methods=["POST"])
@auth_required("token")
def mark_notifications_read():
    ids = request.json.get("ids", [])
    if ids:
        Notification.query.filter(
            Notification.id.in_(ids),
            Notification.owner_id == _owner_id()
        ).update({"is_read": True}, synchronize_session=False)
    else:
        Notification.query.filter_by(owner_id=_owner_id()).update({"is_read": True})
    db.session.commit()
    return jsonify({"message": "Marked as read"})


@app.route("/api/notifications/<int:notif_id>", methods=["DELETE"])
@auth_required("token")
def delete_notification(notif_id):
    n = Notification.query.filter_by(id=notif_id, owner_id=_owner_id()).first_or_404()
    db.session.delete(n)
    db.session.commit()
    return jsonify({"message": "Deleted"})


# ── Company Settings ──────────────────────────────────────────────────────────

@app.route("/api/settings", methods=["GET", "POST"])
@auth_required("token")
def company_settings():
    settings = CompanySettings.query.filter_by(owner_id=_owner_id()).first()

    if request.method == "GET":
        if not settings:
            return jsonify({})
        return jsonify({
            "company_name": settings.company_name, "address": settings.address,
            "phone": settings.phone, "email": settings.email,
            "gstin": settings.gstin, "state": settings.state,
            "bank_name": settings.bank_name, "bank_account": settings.bank_account,
            "bank_ifsc": settings.bank_ifsc,
            "invoice_prefix": settings.invoice_prefix or "INV",
            "default_tax": settings.default_tax or 0,
            "currency": settings.currency or "INR",
        })

    data = request.json
    if not settings:
        settings = CompanySettings(owner_id=_owner_id())
        db.session.add(settings)

    for field in ("company_name", "address", "phone", "email", "gstin", "state",
                  "bank_name", "bank_account", "bank_ifsc", "invoice_prefix",
                  "default_tax", "currency"):
        if field in data:
            setattr(settings, field, data[field])

    _audit("update_settings", "company_settings")
    db.session.commit()
    return jsonify({"message": "Settings saved"})


# ── Customer analytics ────────────────────────────────────────────────────────

@app.route("/api/customers/<int:customer_id>/analytics", methods=["GET"])
@auth_required("token")
def customer_analytics(customer_id):
    party = _party_q().filter_by(id=customer_id).first_or_404()
    sales = _sale_q().filter_by(party_id=customer_id).all()

    total_orders   = len(sales)
    total_spent    = sum(s.total_amount or 0 for s in sales)
    total_paid     = sum(s.amount_paid or 0 for s in sales)
    outstanding    = max(total_spent - total_paid, 0)
    recent_orders  = sorted(sales, key=lambda s: s.date or datetime.min, reverse=True)[:5]

    # Most bought products
    product_counts = {}
    for sale in sales:
        for sc in sale.used_coils:
            for item in sc.items:
                key = f"{item.product.make} {item.product.type} {item.product.color}"
                product_counts[key] = product_counts.get(key, 0) + (item.length * item.quantity)

    top_products = sorted(product_counts.items(), key=lambda x: x[1], reverse=True)[:5]

    return jsonify({
        "id": party.id, "name": party.name, "phone": party.phone,
        "email": party.email, "address": party.address, "gstin": party.gstin,
        "total_orders": total_orders, "total_spent": total_spent,
        "total_paid": total_paid, "outstanding": outstanding,
        "recent_orders": [
            {"id": s.id, "date": s.date.strftime("%Y-%m-%d") if s.date else None,
             "amount": s.total_amount, "status": s.status, "payment_status": s.payment_status}
            for s in recent_orders
        ],
        "top_products": [{"name": k, "total_length": v} for k, v in top_products],
    })


# ── Coil utilization report ───────────────────────────────────────────────────

@app.route("/api/reports/coil-utilization", methods=["GET"])
@auth_required("token")
def coil_utilization_report():
    rows = []
    for coil in _coil_q().all():
        used = sum(
            (item.length or 0) * (item.quantity or 0)
            for sc in coil.sales_used_in
            for item in sc.items
        )
        original  = float(coil.length or 0)
        remaining = max(original - used, 0)
        pct       = round((used / original * 100), 1) if original else 0
        rows.append({
            "coil_id": coil.id, "coil_number": coil.coil_number,
            "make": coil.make, "type": coil.type, "color": coil.color,
            "supplier_name": coil.supplier_name, "purchase_date": coil.purchase_date,
            "purchase_price": coil.purchase_price or 0,
            "original_length": original,
            "used_length": round(used, 2),
            "remaining_length": round(remaining, 2),
            "utilization_pct": pct,
            "status": "exhausted" if remaining <= 0 else ("low" if remaining <= 50 else "healthy"),
        })
    return jsonify(sorted(rows, key=lambda r: r["utilization_pct"], reverse=True))


@app.route("/api/reports/sales", methods=["GET"])
@auth_required("token")
def sales_report():
    start_str  = request.args.get("start")
    end_str    = request.args.get("end")
    period     = request.args.get("period", "month")  # today|week|month|year|custom

    today  = date.today()
    if period == "today":
        start = datetime.combine(today, datetime.min.time())
        end   = datetime.combine(today, datetime.max.time())
    elif period == "week":
        start = datetime.combine(today - timedelta(days=today.weekday()), datetime.min.time())
        end   = datetime.combine(today, datetime.max.time())
    elif period == "month":
        start = datetime.combine(today.replace(day=1), datetime.min.time())
        end   = datetime.combine(today, datetime.max.time())
    elif period == "year":
        start = datetime.combine(today.replace(month=1, day=1), datetime.min.time())
        end   = datetime.combine(today, datetime.max.time())
    elif period == "custom" and start_str and end_str:
        start = datetime.strptime(start_str, "%Y-%m-%d")
        end   = datetime.strptime(end_str, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
    else:
        start = datetime.combine(today.replace(day=1), datetime.min.time())
        end   = datetime.combine(today, datetime.max.time())

    sales = (
        _sale_q()
        .filter(Sale.date >= start, Sale.date <= end)
        .options(joinedload(Sale.party))
        .all()
    )

    total_revenue  = sum(s.total_amount or 0 for s in sales)
    total_orders   = len(sales)
    paid_orders    = sum(1 for s in sales if s.payment_status == "paid")
    pending_amount = sum(
        max((s.net_amount or s.total_amount or 0) - (s.amount_paid or 0), 0) for s in sales
    )

    return jsonify({
        "period": period, "start": start.strftime("%Y-%m-%d"), "end": end.strftime("%Y-%m-%d"),
        "total_revenue": total_revenue, "total_orders": total_orders,
        "paid_orders": paid_orders, "pending_amount": pending_amount,
        "orders": [
            {
                "id": s.id,
                "invoice_number": s.invoice_number or f"INV-{s.id:04d}",
                "date": s.date.strftime("%Y-%m-%d") if s.date else None,
                "party": s.party.name if s.party else "—",
                "amount": s.total_amount or 0,
                "net_amount": s.net_amount or s.total_amount or 0,
                "paid": s.amount_paid or 0,
                "status": s.status or "confirmed",
                "payment_status": s.payment_status or "pending",
            }
            for s in sales
        ]
    })


# ── Invoice data ──────────────────────────────────────────────────────────────

@app.route("/api/sales/<int:sale_id>/invoice", methods=["GET"])
@auth_required("token")
def get_invoice(sale_id):
    sale = (
        _sale_q()
        .filter_by(id=sale_id)
        .options(
            joinedload(Sale.party),
            joinedload(Sale.used_coils).joinedload(SaleCoil.coil),
            joinedload(Sale.used_coils).joinedload(SaleCoil.items).joinedload(SaleItem.product),
        )
        .first_or_404()
    )

    settings = CompanySettings.query.filter_by(owner_id=sale.owner_id).first()
    owner    = User.query.get(sale.owner_id) if sale.owner_id else None

    items_flat = []
    for sc in sale.used_coils:
        for item in sc.items:
            items_flat.append({
                "coil_number": sc.coil.coil_number if sc.coil else "—",
                "make": item.product.make, "type": item.product.type, "color": item.product.color,
                "length": item.length, "quantity": item.quantity,
                "rate": item.rate or item.product.rate,
                "amount": item.amount or (item.rate or 0) * item.length * item.quantity,
            })

    return jsonify({
        "sale": sale.to_dict(),
        "party": sale.party.to_dict() if sale.party else {},
        "items": items_flat,
        "company": {
            "name":     (settings and settings.company_name) or (owner and owner.business_name) or "CoilMS",
            "address":  (settings and settings.address) or "",
            "phone":    (settings and settings.phone) or "",
            "email":    (settings and settings.email) or "",
            "gstin":    (settings and settings.gstin) or "",
            "state":    (settings and settings.state) or "",
            "bank_name":    (settings and settings.bank_name) or "",
            "bank_account": (settings and settings.bank_account) or "",
            "bank_ifsc":    (settings and settings.bank_ifsc) or "",
            "invoice_prefix": (settings and settings.invoice_prefix) or "INV",
        }
    })


# ── Enhanced sale creation (with GST, discount, stock movements) ──────────────

@app.route("/api/sales/enhanced", methods=["POST"])
@auth_required("token")
def create_enhanced_sale():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON data received"}), 400

    party_name = data.get("party_name")
    if not party_name:
        return jsonify({"error": "Party name is required"}), 400

    oid = _owner_id() if not _is_admin() else None

    customer_id = data.get("customer_id")
    if customer_id:
        party = Party.query.get(customer_id)
        if not party:
            return jsonify({"error": "Customer not found"}), 404
    else:
        party = _party_q().filter_by(name=party_name).first()
        if not party:
            party = Party(name=party_name, phone=data.get("party_phone"), owner_id=oid)
            db.session.add(party)
            db.session.flush()

    subtotal     = float(data.get("total_amount", 0))
    discount     = float(data.get("discount", 0))
    tax_rate     = float(data.get("tax_rate", 0))
    taxable      = subtotal - discount
    tax_amount   = round(taxable * tax_rate / 100, 2)
    net_amount   = round(taxable + tax_amount, 2)

    # Generate invoice number
    settings = CompanySettings.query.filter_by(owner_id=oid).first()
    prefix   = (settings and settings.invoice_prefix) or "INV"
    last_sale_count = Sale.query.filter_by(owner_id=oid).count() + 1
    invoice_number = f"{prefix}-{last_sale_count:04d}"

    sale = Sale(
        party_id=party.id,
        total_amount=subtotal,
        discount=discount,
        tax_rate=tax_rate,
        tax_amount=tax_amount,
        net_amount=net_amount,
        status=data.get("status", "confirmed"),
        payment_status="pending",
        amount_paid=0,
        notes=data.get("notes", ""),
        transport_details=data.get("transport_details", ""),
        invoice_number=invoice_number,
        owner_id=oid,
    )
    db.session.add(sale)
    db.session.flush()

    for coil_group in data.get("coils", []):
        coil_id    = coil_group.get("coil_id")
        product_id = coil_group.get("product_id")
        if not coil_id or not product_id:
            continue
        sale_coil = SaleCoil(sale_id=sale.id, coil_id=coil_id)
        db.session.add(sale_coil)
        db.session.flush()

        coil_used_length = 0.0
        for item in coil_group.get("items", []):
            if not item.get("length") or not item.get("quantity"):
                continue
            item_length = float(item["length"]) * int(item["quantity"])
            coil_used_length += item_length
            db.session.add(SaleItem(
                sale_coil_id=sale_coil.id, product_id=product_id,
                length=item["length"], quantity=item["quantity"],
                rate=item.get("rate", 0), amount=item.get("amount", 0),
                is_custom=item.get("is_custom", False),
            ))

        # Stock movement log
        coil_obj = Coil.query.get(coil_id)
        if coil_obj and coil_used_length > 0:
            db.session.add(StockMovement(
                coil_id=coil_id, sale_id=sale.id,
                movement=-coil_used_length,
                description=f"Sale {invoice_number}",
                owner_id=oid,
            ))
            _check_low_stock(coil_obj, oid)

    # Update party totals
    party.total_purchases = (party.total_purchases or 0) + net_amount
    party.balance = (party.balance or 0) + net_amount

    _audit("create_sale", "sale", sale.id, f"invoice={invoice_number} amount={net_amount}")
    _notify(oid, "order", f"New Order #{invoice_number}",
            f"Order for {party.name} — ₹{net_amount:,.0f}", link="/view_all_orders")

    db.session.commit()
    return jsonify({"message": "Sale created", "sale_id": sale.id,
                    "invoice_number": invoice_number}), 201
