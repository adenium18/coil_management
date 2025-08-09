from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from flask_security import UserMixin,RoleMixin

db = SQLAlchemy()


class RolesUsers(db.Model):
    __tablename__ = "roles_users"
    id = db.Column(db.Integer(), primary_key=True)
    user_id = db.Column("user_id", db.Integer(), db.ForeignKey("user.id"))
    role_id = db.Column("role_id", db.Integer(), db.ForeignKey("role.id"))

class Role(db.Model, RoleMixin):
    id = db.Column(db.Integer(), primary_key=True)
    name = db.Column(db.String(80), unique=True)
    description = db.Column(db.String(255))
    
class User(db.Model, UserMixin):
    id = db.Column(db.Integer(), primary_key=True)
    email = db.Column(db.String(), unique=True)
    password = db.Column(db.String(255))
    active = db.Column(db.Boolean())
    fs_uniquifier = db.Column(db.String(255), unique=True, nullable=False)
    roles = db.relationship(
        "Role", secondary="roles_users", backref=db.backref("users", lazy="dynamic")
    )


"""

| Relationship      | Backref Created      |
| ----------------- | -------------------- |
| `Purchase → Coil` | `purchase.coils`     |
| `Party → Sale`    | `party.sales`        |
| `Product → Sale`  | `product.sales`      |
| `Sale → SaleItem` | `sale.items`         |
| `Sale → SaleCoil` | `sale.used_coils`    |
| `Coil → SaleCoil` | `coil.sales_used_in` |


source 
Model Relationships:

| Model      | Purpose                                                     |
| ---------- | ----------------------------------------------------------- |
| `Purchase` | Tracks inward stock (owner buying coils from suppliers)     |
| `Coil`     | Represents individual coil inventory items                  |
| `Product`  | Defines product types that are sold                         |
| `Party`    | Customer who buys from the owner                            |
| `Sale`     | Represents a sale transaction to a customer                 |
| `SaleItem` | Individual product/length line item in a sale               |
| `SaleCoil` | Links which coils are used in which sale (many-to-many)     |
"""

# ---------------------------
# Purchase & Coil
# ---------------------------


class Coil(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    coil_number = db.Column(db.String, nullable=False)
    supplier_name = db.Column(db.String)
    total_weight = db.Column(db.Float)
    purchase_price = db.Column(db.Float)
    purchase_date = db.Column(db.DateTime, default=datetime.now)
    

class Party(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)
    phone = db.Column(db.String)


class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    make = db.Column(db.String)
    type = db.Column(db.String)
    color = db.Column(db.String)
    rate = db.Column(db.Float)


# ---------------------------
# Sale (Main Transaction)
# ---------------------------

class Sale(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.DateTime, default=datetime.now)

    party_id = db.Column(db.Integer, db.ForeignKey('party.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)

    total_amount = db.Column(db.Float)

    party = db.relationship('Party', backref=db.backref('sales', lazy='dynamic'))
    product = db.relationship('Product', backref=db.backref('sales', lazy='dynamic'))

    def total_ordered_length(self):
        return sum(item.length * item.quantity for item in self.items)


# ---------------------------
# Sale Item (Line Items in Sale)
# ---------------------------

class SaleItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    sale_id = db.Column(db.Integer, db.ForeignKey('sale.id'), nullable=False)
    length = db.Column(db.Float, nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    rate = db.Column(db.Float)  # Rate per foot
    amount = db.Column(db.Float)  # Computed: quantity * length * rate
    is_custom = db.Column(db.Boolean, default=False)

    sale = db.relationship('Sale', backref=db.backref('items', lazy='dynamic'))


# ---------------------------
# Sale-Coil Bridge (Many-to-Many)
# ---------------------------

class SaleCoil(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    sale_id = db.Column(db.Integer, db.ForeignKey('sale.id'), nullable=False)
    coil_number = db.Column(db.Integer, db.ForeignKey('coil.coil_number'), nullable=False)

    sale = db.relationship('Sale', backref=db.backref('used_coils', lazy='dynamic'))
    coil = db.relationship('Coil', backref=db.backref('sales_used_in', lazy='dynamic'))
