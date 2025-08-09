import csv
from urllib import response
from flask import current_app as app, jsonify, request, render_template, send_file
from flask_security import auth_required, roles_required, verify_password, current_user
from datetime import datetime
from flask_restful import marshal, fields
import flask_excel as excel
from celery.result import AsyncResult
#from backend.celery.tasks import add, create_csv

from backend.models import User,db,Coil, Party, Sale, Product

datastore = app.security.datastore
cache=app.cache


@app.get('/cache')
@cache.cached(timeout=3)
def cache():
    return {'time':str(datetime.now())}
'''
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
    return {'task_id': task.id},200'''


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



@app.route("/api/products", methods=["GET", "POST"])
@auth_required("token")

def manage_products():
    if request.method == "GET":
        products = Product.query.all()
        return jsonify([
            {"id": s.id, "make": s.make, "type": s.type, "color": s.color, "rate": s.rate}
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
            rate=data["rate"]
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

