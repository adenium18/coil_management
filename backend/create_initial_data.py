from flask import current_app as app
from flask_security import SQLAlchemyUserDatastore, hash_password

from backend.models import db, Product, Party, Coil, Sale, SaleItem, SaleCoil
from datetime import datetime

with app.app_context():
    db.create_all()

    userdatastore : SQLAlchemyUserDatastore = app.security.datastore

    userdatastore.find_or_create_role(id=1, name="admin", description="admin")
    if not userdatastore.find_user(email="admin@abc.in"):
        userdatastore.create_user(
            email="admin@abc.in",
            password=hash_password("pass"),
            roles=["admin"],
        )
        db.session.commit()

    # Example Products
    if not Product.query.filter_by(make="JSW").first():
        prod1 = Product(make="JSW", type="Coloron", color="Silver", rate=50.0)
        
        db.session.add(prod1)
        db.session.commit()

    ''''# Example Party
    if not Party.query.filter_by(name="Kumar SV").first():
        party = Party(name="Kumar SV", phone="9876543210")
        db.session.add(party)
        db.session.commit()
    else:
        party = Party.query.filter_by(name="Kumar SV").first()


    # Example Coils for the purchase
    coil1 = Coil(coil_number="C001", purchase_date=datetime.now(), supplier_name="Steel Traders", total_weight=5000, purchase_price=250000)
    db.session.add(coil1)
    db.session.commit()

    # Example Sale
    sale = Sale(
        date=datetime.now(),
        party_id=party.id,
        product_id=prod1.id,
        total_amount=2000  # (for now, set directly)
    )
    db.session.add(sale)
    db.session.commit()

    # Example Sale Items (length x qty)
    items = [
    {"length": 22.0, "quantity": 10, "is_custom": False},
    {"length": 18.0, "quantity": 10, "is_custom": False},
    {"length": 16.0, "quantity": 5, "is_custom": False}
    ]

    for item in items:
        rate = prod1.rate  # Assuming single product
        amount = item["length"] * item["quantity"] * rate
        sale_item = SaleItem(
        sale_id=sale.id,
        length=item["length"],
        quantity=item["quantity"],
        rate=rate,
        amount=amount,
        is_custom=item["is_custom"]
        )
        db.session.add(sale_item)

    db.session.commit()
    
    sale.total_amount = sum(i.amount for i in sale.items)
    db.session.commit()
    
    
    # Example SaleCoil usage (which coils were used in sale)
    sale_coil1 = SaleCoil(sale_id=sale.id, coil_number=coil1.coil_number)
    
    db.session.add(sale_coil1)
    db.session.commit()
'''
    print("✅ Initial data populated successfully.")