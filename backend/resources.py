import csv
import io
from socket import timeout
from flask import current_app as app, jsonify, request
from flask_restful import Resource, Api, reqparse, marshal, fields
from flask_security import auth_required, roles_required, current_user, hash_password
from backend.models import db, Product, Party, Coil, Sale, SaleItem, SaleCoil
from werkzeug.security import generate_password_hash
from datetime import datetime

datastore = app.security.datastore
cache = app.cache
api = Api(prefix="/api")

parser1 = reqparse.RequestParser()
parser1.add_argument(
    "make", type=str, help="Name is required and should be a string", required=True
)
parser1.add_argument(
    "type", type=str, help="type is required and should be a string", required=True
)
parser1.add_argument(
    "color", type=str, help="color is required and should be a string", required=True
)
parser1.add_argument(
    "rate", type=int, help="Price is required and should be float value", required=True
)
parser1.add_argument(
    "coil_id", type=int, help="coil_id is required and should be an integer", required=True
)


product_fields = {
    "id": fields.Integer,
    "make": fields.String,
    "type": fields.Integer,
    "color": fields.String,
    "rate": fields.Float,
    "coil_id": fields.Integer,
}

class ProductsAPI(Resource):
    @cache.cached(timeout=20)
    def get(self):
        products = Product.query.all()
        return jsonify([{
            "id": product.id,
            "type": product.type,
            "make": product.make,
            "color": product.color,
            "rate": product.rate,
            "coil_id": product.coil_id,
        } for product in products])

class UpdateProuct(Resource):
    @auth_required("token")
    @roles_required("admin")
    def get(self, id):
        product = Product.query.get(id)
        return marshal(product, product_fields)

    def post(self, id):
        product = Product.query.get(id)
        args = parser1.parse_args()
        product.make = args.make
        product.type = args.type
        product.color = args.color
        product.rate = args.rate
        db.session.commit()
        return {"message": "product Updated"}




parser2 = reqparse.RequestParser()
parser2.add_argument(
    "make", type=str, help="Name is required and should be a string", required=True
)
parser2.add_argument(
    "type", type=str, help="type is required and should be a string", required=True
)
parser2.add_argument(
    "color", type=str, help="color is required and should be a string", required=True
)
parser2.add_argument(
    "purchase_price",type=float,help="Price is required and should be float value", required=True
)
parser2.add_argument(
    "total_weight", type=float, help="weight is required and should be a float", required=True
)
parser2.add_argument(
    "supplier_name", type=str, help="supplier name is required and should be a string", required=True
)
parser2.add_argument(
    "coil_number", type=str, help="coilNumber is required and should be a string", required=True
)
parser2.add_argument(
    "purchase_date", type=str, help="date of purchase is required ", required=True
)


coil_fields = {
    "id": fields.Integer,
    "coil-number": fields.String,
    "make": fields.String,
    "type": fields.Integer,
    "color": fields.String,
    "purchase_price": fields.Float,
    "total_weight":fields.Float,
    "supplier_name":fields.String,
    "purchase_date":fields.DateTime,
}


class CoilAPI(Resource):
    @auth_required("token")
    @roles_required("admin")
    def get(self):
        coils = Coil.query.all()
        return jsonify([{
            "id": coil.id,
            "coil_number": coil.coil_number,
            "supplier_name": coil.supplier_name,
            "total_weight": coil.total_weight,
            "purchase_price": coil.purchase_price,
            "make": coil.make,
            "type": coil.type,
            "color": coil.color,
            "purchase_date": coil.purchase_date.strftime("%Y-%m-%d %H:%M:%S"),
        } for coil in coils])

class UpdateCoil(Resource):
    @auth_required("token")
    @roles_required("admin")
    def get(self, id):
        coil = Coil.query.get(id)
        return marshal(coil, {
            "id": fields.Integer,
            "coil_number": fields.String,
            "supplier_name": fields.String,
            "total_weight": fields.Float,
            "purchase_price": fields.Float,
            "make": fields.String,
            "type": fields.String,
            "color": fields.String,
            "purchase_date": fields.String,
        })

    def post(self, id):
        coil = Coil.query.get(id)
        args = request.json
        coil.coil_number = args.get("coil_number", coil.coil_number)
        coil.supplier_name = args.get("supplier_name", coil.supplier_name)
        coil.total_weight = args.get("total_weight", coil.total_weight)
        coil.purchase_price = args.get("purchase_price", coil.purchase_price)
        coil.make = args.get("make", coil.make)
        coil.type = args.get("type", coil.type)
        coil.color = args.get("color", coil.color)
        coil.purchase_date=args.get("purchase_date",coil.purchase_date)
        db.session.commit()
        return {"message": "Coil Updated"}

parser3 = reqparse.RequestParser()
parser3.add_argument(
    "date", type=str, help="Date of sale (YYYY-MM-DD HH:MM:SS)", required=False
)
parser3.add_argument(
    "party_id", type=int, help="Party ID is required and should be an integer", required=True
)
parser3.add_argument(
    "total_amount", type=float, help="Total amount should be a float", required=True
)
parser3.add_argument(
    "items", type=list, location="json", help="Items should be a list", required=True
)
parser3.add_argument(
    "coils", type=list, location="json", help="Coils should be a list", required=False
)


class SaleAPI(Resource):
    @auth_required("token")
    @roles_required("admin")
    def get(self):
        sales = Sale.query.all()

        sales_data = []
        for sale in sales:
            sales_data.append({
                "id": sale.id,
                "date": sale.date.strftime("%Y-%m-%d %H:%M:%S") if sale.date else None,
                "party_id": sale.party_id,
                "total_amount": sale.total_amount,

                "items": [
                    {
                        "id": item.id,
                        "product_id": item.product_id,
                        "product_details": {
                            "make": item.product.make if item.product else None,
                            "type": item.product.type if item.product else None,
                            "color": item.product.color if item.product else None
                        },
                        "length": item.length,
                        "quantity": item.quantity,
                        "rate": item.rate,
                        "amount": item.amount,
                        "is_custom": item.is_custom
                    }
                    for item in sale.items
                ],

                "coils": [
                    {
                        "id": coil_link.id,
                        "coil_id": coil_link.coil_id,
                        "coil_details": {
                            "make": coil_link.coil.make if coil_link.coil else None,
                            "type": coil_link.coil.type if coil_link.coil else None,
                            "color": coil_link.coil.color if coil_link.coil else None
                        },
                        "weight": coil_link.weight if hasattr(coil_link, "weight") else None
                    }
                    for coil_link in sale.coils
                ]
            })

        return jsonify(sales_data)


    @auth_required("token")
    @roles_required("admin")
    def post(self):
        args = parser3.parse_args()

        try:
            # Create Sale record
            sale = Sale(
                date=datetime.strptime(args["date"], "%Y-%m-%d %H:%M:%S") if args.get("date") else datetime.utcnow(),
                party_id=args["party_id"],
                total_amount=args["total_amount"]
            )
            db.session.add(sale)
            db.session.flush()  # Get sale.id

            # Add items
            for item in args["items"]:
                sale_item = SaleItem(
                    sale_id=sale.id,
                    product_id=item.get("product_id"),
                    length=item.get("length"),
                    quantity=item.get("quantity"),
                    rate=item.get("rate"),
                    amount=item.get("amount"),
                    is_custom=item.get("is_custom", False)
                )
                db.session.add(sale_item)

            # Add coils if provided
            if args.get("coils"):
                for coil in args["coils"]:
                    coil_link = SaleCoil(
                        sale_id=sale.id,
                        coil_id=coil.get("coil_id"),
                        weight=coil.get("weight") if "weight" in coil else None
                    )
                    db.session.add(coil_link)

            db.session.commit()
            return {"message": "Sale created successfully", "sale_id": sale.id}, 201

        except Exception as e:
            db.session.rollback()
            return {"error": str(e)}, 400

parser4= reqparse.RequestParser()
parser4.add_argument(
    "name", type=str, help="Name is required and should be a string", required=True
)
parser4.add_argument(
    "phone", type=str, help="Phone number is required and should be a string", required=True
)   

customers={
    "id": fields.Integer,
    "name": fields.String,
    "phone": fields.String,
}

class CustomerAPI(Resource):
    @auth_required("token")
    @roles_required("admin")
    def get(self):
        customers = Party.query.all()
        return jsonify([{
            "id": party.id,
            "name": party.name,
            "phone": party.phone,
        } for party in customers])

class UpdateCustomer(Resource):
    @auth_required("token")
    @roles_required("admin")
    def get(self, id):
        party = Party.query.get(id)
        return jsonify({
            "id": party.id,
            "name": party.name,
            "phone": party.phone,
        }) 
    def post(self, id):
        party = Party.query.get(id)
        args = request.json
        party.name = args.get("name", party.name)
        party.phone = args.get("phone", party.phone)
        db.session.commit()
        return {"message": "Customer Updated"}
    


class AddOrdersAPI(Resource):
    @auth_required("token")
    @roles_required("admin")
    def post(self):
        try:
            data = request.json  # should be a list of orders
            if not isinstance(data, list):
                return {"error": "Orders must be a list"}, 400

            saved_orders = []

            for order in data:
                # 1. Check customer
                customer = Party.query.filter_by(phone=order["customer"]["phone"]).first()
                if not customer:
                    customer = Party(name=order["customer"]["name"], phone=order["customer"]["phone"])
                    db.session.add(customer)
                    db.session.flush()

                # 2. Create sale
                sale = Sale(
                    date=datetime.strptime(order.get("date"), "%Y-%m-%d %H:%M:%S") if order.get("date") else datetime.utcnow(),
                    party_id=customer.id,
                    total_amount=order["total_amount"]
                )
                db.session.add(sale)
                db.session.flush()

                # 3. Add items
                for item in order.get("items", []):
                    product = Product.query.get(item.get("product_id"))
                    sale_item = SaleItem(
                        sale_id=sale.id,
                        product_id=product.id if product else None,
                        length=item.get("length"),
                        quantity=item.get("quantity"),
                        rate=item.get("rate"),
                        amount=item.get("amount"),
                        is_custom=item.get("is_custom", False)
                    )
                    db.session.add(sale_item)

                # 4. Add coils
                for coil in order.get("coils", []):
                    sale_coil = SaleCoil(
                        sale_id=sale.id,
                        coil_id=coil.get("coil_id"),
                        weight=coil.get("weight")
                    )
                    db.session.add(sale_coil)

                saved_orders.append({"sale_id": sale.id, "customer": customer.name})

            db.session.commit()
            return {"message": "Orders imported successfully", "orders": saved_orders}, 201

        except Exception as e:
            db.session.rollback()
            return {"error": str(e)}, 400


class ImportOrdersAPI(Resource):
    @auth_required("token")
    @roles_required("admin")
    def post(self):
        try:
            if "file" not in request.files:
                return {"error": "No file uploaded"}, 400

            file = request.files["file"]
            if file.filename == "":
                return {"error": "Empty file name"}, 400

            stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
            reader = csv.DictReader(stream)

            saved_orders = []

            for row in reader:
                # Expected columns: customer_name, customer_phone, date, total_amount, product_id, quantity, rate, amount, coil_id, weight
                customer = Party.query.filter_by(phone=row["customer_phone"]).first()
                if not customer:
                    customer = Party(name=row["customer_name"], phone=row["customer_phone"])
                    db.session.add(customer)
                    db.session.flush()

                sale = Sale(
                    date=datetime.strptime(row.get("date"), "%Y-%m-%d %H:%M:%S") if row.get("date") else datetime.utcnow(),
                    party_id=customer.id,
                    total_amount=float(row["total_amount"])
                )
                db.session.add(sale)
                db.session.flush()

                sale_item = SaleItem(
                    sale_id=sale.id,
                    product_id=int(row["product_id"]) if row.get("product_id") else None,
                    quantity=int(row["quantity"]) if row.get("quantity") else 1,
                    rate=float(row["rate"]) if row.get("rate") else 0,
                    amount=float(row["amount"]) if row.get("amount") else 0,
                    is_custom=False
                )
                db.session.add(sale_item)

                if row.get("coil_id"):
                    sale_coil = SaleCoil(
                        sale_id=sale.id,
                        coil_id=int(row["coil_id"]),
                        weight=float(row["weight"]) if row.get("weight") else None
                    )
                    db.session.add(sale_coil)

                saved_orders.append({"sale_id": sale.id, "customer": customer.name})

            db.session.commit()
            return {"message": "CSV imported successfully", "orders": saved_orders}, 201

        except Exception as e:
            db.session.rollback()
            return {"error": str(e)}, 400


api.add_resource(ProductsAPI, "/products")
api.add_resource(UpdateProuct, "/update/product/<int:id>")
api.add_resource(CoilAPI, "/coils")
api.add_resource(UpdateCoil, "/update/coil/<int:id>")
api.add_resource(SaleAPI, "/sales")
api.add_resource(CustomerAPI, "/customers")
api.add_resource(UpdateCustomer,"/update/customer/<int:id>")
api.add_resource(AddOrdersAPI, "/add_orders")
api.add_resource(ImportOrdersAPI, "/import_orders")
