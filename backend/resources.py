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



product_fields = {
    "id": fields.Integer,
    "make": fields.String,
    "type": fields.Integer,
    "color": fields.String,
    "rate": fields.Float,
}




class ProductsAPI(Resource):

    @cache.cached(timeout=20)
    def get(self):
        products = Product.query.all()
        return jsonify([{
            "id": products.id,
            "type": products.type,
            "make": products.make,
            "color": products.color,
            "rate": products.rate,
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

api.add_resource(ProductsAPI, "/products")
api.add_resource(UpdateProuct, "/update/product/<int:id>")