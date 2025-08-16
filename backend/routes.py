import csv
from urllib import response
from flask import current_app as app, jsonify, request, render_template, send_file
from flask_security import auth_required, roles_required, verify_password, current_user
from datetime import datetime
from flask_restful import marshal, fields
import flask_excel as excel
from celery.result import AsyncResult
from sqlalchemy.orm import joinedload
from backend.celery.tasks import create_csv

from backend.models import SaleCoil, SaleItem, User,db,Coil, Party, Sale, Product

datastore = app.security.datastore
cache=app.cache


@app.get('/cache')
@cache.cached(timeout=3)
def cache():
    return {'time':str(datetime.now())}

@app.get('/celery')
def celery():
    task = add.delay(10, 30)
    return {'task initiates, task id': task.id},200

@app.get('/get-celery-data/<id>')
def getData(id):
    result=AsyncResult(id)

    if result.ready():
        return {'result':result.result}
    else:
        return  {'message':'task not ready'},405
    

@app.get('/create_csv')
def createCSV():
    task=create_csv.delay(2)
    return {'task_id': task.id},200


@app.get('/get_csv/<id>')
def getCSV(id):
    result= AsyncResult(id)

    if result.ready():
        return send_file(f'./backend/celery/user_downloads/{result.result}')
    else:
        return {'message':'task not ready'},405
    


    
@app.get("/")
def home():
    return render_template("index.html")


@app.get("/admin")
@auth_required("token")
@roles_required("admin")
def admin():
    return "Welcome Admin"


@app.route("/user_login", methods=["POST"])
def user_login():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()
    if not user or not verify_password(password, user.password):
        return jsonify({"message": "Invalid email or password"}), 401



    # Generate token using Flask-Security
    token = user.get_auth_token()

    # Allow frontend to access the token
    #response.headers["Access-Control-Allow-Origin"] = "http://localhost:5173"
    #response.headers["Access-Control-Allow-Credentials"] = "true"
    
    return jsonify({
        "message": "Login successful",
        "token": token,
        "user_id": user.id,
        "full_name": user.email.split('@')[0],
        "role": "admin" }), 200

@app.route("/api/customers", methods=["GET"])
@auth_required("token")
def customer_info():
    customers = Party.query.all()
    if not customers:
        return jsonify({"message": "No customer found"}), 404
    
    return jsonify([
            {"id": customer.id, "phone": customer.phone, "name": customer.name}
            for customer in customers
        ])


@app.route("/api/update/customer/<int:id>", methods=["GET","POST"])
@auth_required("token")
@roles_required("admin")
def update_customer(id):
    customer = Party.query.get_or_404(id)

    if request.method == "GET":
        return jsonify({
            "id": customer.id,
            "name": customer.name,
            "phone ": customer.phone,
        })

    elif request.method == "POST":
        data = request.json
        customer.phone = data["phone"]
        customer.name = data["name"]
        db.session.commit()
        return jsonify({"message": "customer info updated successfully"})


@app.route("/delete/customer/<int:id>", methods=["DELETE"])
@auth_required("token")
@roles_required("admin")
def delete_customer(id):
    customer = Party.query.get_or_404(id)
    db.session.delete(customer)
    db.session.commit()
    return jsonify({"message": "customer deleted successfully"})


@app.route("/api/products", methods=["GET", "POST"])
@auth_required("token")

def manage_products():
    if request.method == "GET":
        products = Product.query.all()
        return jsonify([
            {"id": s.id, "make": s.make, "type": s.type, "color": s.color, "rate": s.rate, "coil_id": s.coil_id }
            for s in products
        ])

    elif request.method == "POST":
        
        data = request.json
        if not data.get("make") or not data.get("rate") or not data.get("color") or not data.get("type"):
            return jsonify({"message": "All fields are required"}), 400
        
        new_product = Product(
            make=data["make"],
            type=data["type"],
            color=data["color"],
            rate=data["rate"],
            coil_id=data["coil_id"] if "coil_id" in data else None
        )
        db.session.add(new_product)
        db.session.commit()
        return jsonify({"message": "product created successfully"}), 201


@app.route("/api/update/product/<int:id>", methods=["GET","POST"])
@auth_required("token")
@roles_required("admin")
def update_product(id):
    product = Product.query.get_or_404(id)

    if request.method == "GET":
        return jsonify({
            "id": product.id,
            "make": product.make,
            "type": product.type,
            "color": product.color,
            "rate": product.rate
        })

    elif request.method == "POST":
        data = request.json
        product.make = data["make"]
        product.type = data["type"]
        product.color = data["color"]
        product.rate= data["rate"]
        db.session.commit()
        return jsonify({"message": "product updated successfully"})


@app.route("/delete/product/<int:id>", methods=["DELETE"])
@auth_required("token")
@roles_required("admin")
def delete_product(id):
    product = Product.query.get_or_404(id)
    db.session.delete(product)
    db.session.commit()
    return jsonify({"message": "product deleted successfully"})


@app.route("/api/coils", methods=["GET", "POST"])
@auth_required("token")

def manage_coils():
    if request.method == "GET":
        coils = Coil.query.all()
        return jsonify([
            {"id": s.id, "coil_number":s.coil_number, "supplier_name":s.supplier_name,
             "total_weight":s.total_weight,"purchase_price":s.purchase_price,
             "make": s.make, "type": s.type, "color": s.color, "purchase_date": s.purchase_date}
            for s in coils
        ])

    elif request.method == "POST":
        
        data = request.json
        if not data.get("coil_number"):
            return jsonify({"message": "coil_number is necessary"}), 400
        
        new_coil = Coil(
                coil_number=data["coil_number"],
                supplier_name=data["supplier_name"],
                total_weight=data["total_weight"],
                purchase_price=data["purchase_price"],
                make=data["make"],
                type=data["type"],
                color=data["color"],
                purchase_date=data["purchase_date"]    
        )
        db.session.add(new_coil)
        db.session.commit()
        return jsonify({"message": "new coil created successfully"}), 201


@app.route("/api/update/coil/<int:id>", methods=["GET","POST"])
@auth_required("token")
@roles_required("admin")
def update_coil(id):
    coil = Coil.query.get_or_404(id)

    if request.method == "GET":
        return jsonify({
            "id": coil.id,
            "make": coil.make,
            "type": coil.type,
            "color": coil.color,
            "purchase_date": coil.purchase_date,
            "coil_number":coil.coil_number,
            "supplier_name":coil.supplier_name,
            "total_weight":coil.total_weight,
            "purchase_price":coil.purchase_price,

        })

    elif request.method == "POST":
        data = request.json
        coil.make = data["make"]
        coil.type = data["type"]
        coil.color = data["color"]
        coil.purchase_price= data["purchase_price"]
        coil.coil_number=data["coil_number"]
        coil.supplier_name=data["supplier_name"]
        coil.total_weight=data["total_weight"]
        coil.purchase_date=data["purchase_date"]
        db.session.commit()
        return jsonify({"message": "product updated successfully"})


@app.route("/delete/coil/<int:id>", methods=["DELETE"])
@auth_required("token")
@roles_required("admin")
def delete_coil(id):
    coil = Coil.query.get_or_404(id)
    db.session.delete(coil)
    db.session.commit()
    return jsonify({"message": "product deleted successfully"})


@app.route("/api/parties", methods=["GET", "POST"])
@auth_required("token")
def manage_parties():
    if request.method == "GET":
        parties = Party.query.all()
        return jsonify([
            {"id": s.id, "name": s.name, "phone": s.phone}
            for s in parties
        ])

    elif request.method == "POST":
        data = request.json
        if not data.get("name"):
            return jsonify({"message": "name is necessary"}), 400
        
        new_party = Party(
            name=data.get("name"),
            phone=data.get("phone")
        )
        db.session.add(new_party)
        db.session.commit()
        return jsonify({
                "id": new_party.id,
                "name": new_party.name,
                "phone_number": new_party.phone_number
            })
    
    
@app.route("/api/sales", methods=["GET", "POST"])
@auth_required("token")
def manage_sales():
    if request.method == "GET":
        sales = Sale.query.all()
        return jsonify([
            {
                "id": sale.id,
                "date": sale.date.strftime("%Y-%m-%d %H:%M:%S"),
                "party_id": sale.party_id,
                "total_amount": sale.total_amount,
                "items": [
                    {
                        "id": item.id,
                        "product_id": item.product_id,
                        "length": item.length,
                        "quantity": item.quantity,
                        "rate": item.rate,
                        "amount": item.amount,
                        "is_custom": item.is_custom
                    } for item in sale.items
                ],
                "coils": [
                    {
                        "id": coil.id,
                        "coil_id": coil.coil_id,
                        #"weight": coil.weight
                    } for coil in sale.coils
                ]
            } for sale in sales
        ])

    elif request.method == "POST":
        # DEBUG — print exactly what Flask sees
        print("Raw data received:", request.data)
        print("Content-Type header:", request.headers.get("Content-Type"))
            
        data = request.get_json()

    party_name = data.get("party_name")
    if not party_name:
        return jsonify({"error": "Party name is required"}), 400

    # Find or create party
    party = Party.query.filter_by(name=party_name).first()
    if not party:
        party = Party(name=party_name)
        db.session.add(party)
        db.session.flush()  # Now we have party.id

    # Create Sale
    sale = Sale(
        party_id=party.id,
        total_amount=data.get("total_amount", 0)
    )
    db.session.add(sale)
    db.session.flush()

    # Add coils & items
    for coil_group in data.get("coils", []):
        coil_id = coil_group.get("coil_id")
        product_id = coil_group.get("product_id")

        # Skip coil if missing IDs
        if not coil_id or not product_id:
            continue

        sale_coil = SaleCoil(
            sale_id=sale.id,
            coil_id=coil_id,
        )
        db.session.add(sale_coil)
        db.session.flush()

        for item in coil_group.get("items", []):
            # Skip invalid items
            if not product_id or not item.get("length") or not item.get("quantity"):
                continue

            sale_item = SaleItem(
                sale_coil_id=sale_coil.id,
                product_id=product_id,
                length=item.get("length"),
                quantity=item.get("quantity"),
                rate=item.get("rate", 0),
                amount=item.get("amount", 0),
                is_custom=item.get("is_custom", False)
            )
            db.session.add(sale_item)

    db.session.commit()

    return jsonify({"message": "Sale created successfully", "sale_id": sale.id}), 201

from sqlalchemy.orm import joinedload

@app.route("/api/all_orders", methods=["GET"])
def all_orders():
    sales = (
        Sale.query
        .options(
            joinedload(Sale.party),  # Party info
            joinedload(Sale.used_coils)
                .joinedload(SaleCoil.coil),  # Coil info
            joinedload(Sale.used_coils)
                .joinedload(SaleCoil.items)
                .joinedload(SaleItem.product)  # Product info
        )
        .all()
    )

    results = []
    for sale in sales:
        sale_data = {
            "sale_id": sale.id,
            "date": sale.date.strftime("%Y-%m-%d"),
            "party": {
                "id": sale.party.id,
                "name": sale.party.name,
                "phone": sale.party.phone
            },
            "total_amount": sale.total_amount,
            "used_coils": []
        }

        for sc in sale.used_coils:
            coil_data = {
                "coil_id": sc.coil.id,
                "coil_number": sc.coil.coil_number,
                "make": sc.coil.make,
                "type": sc.coil.type,
                "color": sc.coil.color,
                "items": []
            }
            for item in sc.items:
                coil_data["items"].append({
                    "item_id": item.id,
                    "product": {
                        "id": item.product.id,
                        "make": item.product.make,
                        "type": item.product.type,
                        "color": item.product.color,
                        "rate": item.product.rate
                    },
                    "length": item.length,
                    "quantity": item.quantity,
                    "rate": item.rate,
                    "amount": item.amount,
                    "is_custom": item.is_custom
                })
            sale_data["used_coils"].append(coil_data)

        results.append(sale_data)

    return jsonify(results)


@app.route("/api/customer/search", methods=["GET"])
def search_customer():
    name_query = request.args.get("name", "").strip()
    if not name_query:
        return jsonify([]), 200

    # case-insensitive search
    matches = Party.query.filter(Party.name.ilike(f"%{name_query}%")).all()

    results = [
        {"id": c.id, "name": c.name, "phone": c.phone}
        for c in matches
    ]
    return jsonify(results), 200




# ---------------------------
# 1. Search Customers (by name / phone)
# ---------------------------
@app.route("/api/customers/search")
def search_customers():
    query = request.args.get("query", "").strip()
    if not query:
        return jsonify({"error": "Query is required"}), 400

    customers = Party.query.filter(
        (Party.name.ilike(f"%{query}%")) | 
        (Party.phone.ilike(f"%{query}%"))
    ).all()

    results = []
    for c in customers:
        # also fetch sale orders for each customer
        orders = Sale.query.filter_by(customer_id=c.id).all()
        results.append({
            "id": c.id,
            "name": c.name,
            "phone": c.phone,
            "orders": [
                {
                    "id": o.id,
                    "sale_date": o.sale_date,
                    "total": o.total_amount
                } for o in orders
            ]
        })
    return jsonify(results)


# ---------------------------
# 2. Search Sales by Product (make, type, color, coil)
# ---------------------------
@app.route("/api/sales/search/products")
def search_sales_by_products():
    query = request.args.get("query", "").strip()
    if not query:
        return jsonify({"error": "Query is required"}), 400

    sales = (
        db.session.query(SaleItem)
        .join(Product, SaleItem.product_id == Product.id)
        .filter(
            (Product.make.ilike(f"%{query}%")) |
            (Product.type.ilike(f"%{query}%")) |
            (Product.color.ilike(f"%{query}%")) |
            (Product.coil_name.ilike(f"%{query}%"))
        )
        .all()
    )

    results = [
        {
            "order_id": s.id,
            "customer_id": s.customer_id,
            "sale_date": s.sale_date,
            "total": s.total_amount,
            "product": {
                "make": s.product.make,
                "type": s.product.type,
                "color": s.product.color,
                "coil": s.product.coil_name
            }
        }
        for s in sales
    ]
    return jsonify(results)


# ---------------------------
# 3. Search Sales by Date / Month / Year
# ---------------------------
@app.route("/api/sales/search/date")
def search_sales_by_date():
    search_type = request.args.get("type")   # date | month | year
    query = request.args.get("query", "").strip()
    if not search_type or not query:
        return jsonify({"error": "type and query are required"}), 400

    q = Sale.query
    if search_type == "date":
        q = q.filter(Sale.sale_date == query)
    elif search_type == "month":
        q = q.filter(db.extract("month", Sale.sale_date) == int(query))
    elif search_type == "year":
        q = q.filter(db.extract("year", Sale.sale_date) == int(query))
    else:
        return jsonify({"error": "Invalid search type"}), 400

    sales = q.all()

    results = [
        {
            "order_id": s.id,
            "customer_id": s.customer_id,
            "sale_date": s.date,
            "total": s.total_amount
        }
        for s in sales
    ]
    return jsonify(results)
