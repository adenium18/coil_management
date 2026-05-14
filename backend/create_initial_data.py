from flask import current_app as app
from flask_security import SQLAlchemyUserDatastore, hash_password
from backend.models import db, Product, Party, Coil, Sale, SaleItem, SaleCoil
from datetime import datetime
from sqlalchemy import text

with app.app_context():
    db.create_all()

    # Apply partial unique index on (invoice_number, owner_id) for existing SQLite databases.
    # CREATE UNIQUE INDEX ... WHERE ... is idempotent via IF NOT EXISTS.
    with db.engine.connect() as _conn:
        _conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_invoice_owner "
            "ON sale(invoice_number, owner_id) "
            "WHERE invoice_number IS NOT NULL"
        ))
        _conn.commit()

    userdatastore: SQLAlchemyUserDatastore = app.security.datastore

    # ── Roles ────────────────────────────────────────────────────────────────
    userdatastore.find_or_create_role(id=1, name="admin",  description="Super Admin")
    userdatastore.find_or_create_role(id=2, name="owner",  description="Coil Manager / Business Owner")
    db.session.commit()

    # ── Super Admin ───────────────────────────────────────────────────────────
    if not userdatastore.find_user(email="admin@coilms.in"):
        userdatastore.create_user(
            email="admin@coilms.in",
            password=hash_password("Admin@123"),
            roles=["admin"],
            full_name="Super Admin",
            role="admin",
        )
        db.session.commit()

    # ── Sample Coil Manager (owner) ───────────────────────────────────────────
    owner = userdatastore.find_user(email="owner@coilms.in")
    if not owner:
        owner = userdatastore.create_user(
            email="owner@coilms.in",
            password=hash_password("Owner@123"),
            roles=["owner"],
            full_name="Demo Owner",
            business_name="Demo Steel Works",
            role="owner",
        )
        db.session.commit()

    # ── Sample data linked to owner ───────────────────────────────────────────
    coil1 = Coil.query.filter_by(coil_number="C001", owner_id=owner.id).first()
    if not coil1:
        coil1 = Coil(
            coil_number="C001",
            make="JSW",
            type="Coloron",
            color="Silver",
            purchase_date=datetime.now().strftime("%Y-%m-%d"),
            supplier_name="Steel Traders",
            total_weight=5000,
            purchase_price=250000,
            length=700,
            owner_id=owner.id,
        )
        db.session.add(coil1)
        db.session.commit()

    prod1 = Product.query.filter_by(make="JSW", type="Coloron", color="Silver",
                                    owner_id=owner.id).first()
    if not prod1:
        prod1 = Product(
            date=datetime.now().strftime("%Y-%m-%d"),
            make=coil1.make,
            type=coil1.type,
            color=coil1.color,
            rate=50.0,
            coil_id=coil1.id,
            owner_id=owner.id,
        )
        db.session.add(prod1)
        db.session.commit()

    party = Party.query.filter_by(name="Kumar SV", owner_id=owner.id).first()
    if not party:
        party = Party(name="Kumar SV", phone="9876543210", owner_id=owner.id)
        db.session.add(party)
        db.session.commit()

    print("✅ Initial data populated successfully.")
    print("   Super Admin : admin@coilms.in  /  Admin@123")
    print("   Coil Manager: owner@coilms.in  /  Owner@123")
