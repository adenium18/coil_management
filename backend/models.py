from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from flask_security import UserMixin, RoleMixin
from sqlalchemy import Index, text as sa_text

db = SQLAlchemy()


# ── Auth Models ──────────────────────────────────────────────────────────────

class RolesUsers(db.Model):
    __tablename__ = "roles_users"
    id      = db.Column(db.Integer(), primary_key=True)
    user_id = db.Column("user_id", db.Integer(), db.ForeignKey("user.id"))
    role_id = db.Column("role_id", db.Integer(), db.ForeignKey("role.id"))


class Role(db.Model, RoleMixin):
    id          = db.Column(db.Integer(), primary_key=True)
    name        = db.Column(db.String(80), unique=True)
    description = db.Column(db.String(255))


class User(db.Model, UserMixin):
    id            = db.Column(db.Integer(), primary_key=True)
    email         = db.Column(db.String(255), unique=True, nullable=False)
    password      = db.Column(db.String(255), nullable=False)
    active        = db.Column(db.Boolean(), default=True)
    fs_uniquifier = db.Column(db.String(255), unique=True, nullable=False)

    full_name     = db.Column(db.String(255))
    business_name = db.Column(db.String(255))
    role          = db.Column(db.String(50), default="owner")   # "admin" | "owner"
    is_active     = db.Column(db.Boolean(), default=True)
    created_at    = db.Column(db.DateTime, default=datetime.now)
    last_login    = db.Column(db.DateTime)

    roles = db.relationship(
        "Role", secondary="roles_users", backref=db.backref("users", lazy="dynamic")
    )

    @property
    def is_admin(self):
        return self.role == "admin"

    def to_summary(self):
        return {
            "id":            self.id,
            "full_name":     self.full_name or self.email.split("@")[0],
            "business_name": self.business_name or "-",
            "email":         self.email,
            "role":          self.role,
            "is_active":     self.is_active,
            "created_at":    self.created_at.strftime("%Y-%m-%d") if self.created_at else None,
            "last_login":    self.last_login.strftime("%Y-%m-%d %H:%M") if self.last_login else None,
        }


# ── Company Settings ──────────────────────────────────────────────────────────

class CompanySettings(db.Model):
    __tablename__ = "company_settings"
    id             = db.Column(db.Integer, primary_key=True)
    owner_id       = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, unique=True)
    company_name   = db.Column(db.String(255))
    address        = db.Column(db.Text)
    phone          = db.Column(db.String(50))
    email          = db.Column(db.String(255))
    gstin          = db.Column(db.String(20))
    state          = db.Column(db.String(100))
    bank_name      = db.Column(db.String(255))
    bank_account   = db.Column(db.String(50))
    bank_ifsc      = db.Column(db.String(20))
    invoice_prefix = db.Column(db.String(20), default="INV")
    default_tax    = db.Column(db.Float, default=0.0)
    currency       = db.Column(db.String(10), default="INR")
    updated_at     = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    owner = db.relationship("User", backref=db.backref("company_settings", uselist=False))


# ── Business Models ───────────────────────────────────────────────────────────

class Party(db.Model):
    id              = db.Column(db.Integer, primary_key=True)
    name            = db.Column(db.String, nullable=False)
    phone           = db.Column(db.String)
    email           = db.Column(db.String(255))
    address         = db.Column(db.Text)
    gstin           = db.Column(db.String(20))
    balance         = db.Column(db.Float, default=0.0)
    total_purchases = db.Column(db.Float, default=0.0)
    notes           = db.Column(db.Text)
    created_at      = db.Column(db.DateTime, default=datetime.now)
    owner_id        = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    owner           = db.relationship("User", backref=db.backref("customers", lazy="dynamic"),
                                      foreign_keys=[owner_id])

    def to_dict(self):
        return {
            "id": self.id, "name": self.name, "phone": self.phone,
            "email": self.email or "", "address": self.address or "",
            "gstin": self.gstin or "", "balance": self.balance or 0.0,
            "total_purchases": self.total_purchases or 0.0, "notes": self.notes or "",
            "created_at": self.created_at.strftime("%Y-%m-%d") if self.created_at else None,
        }


class Coil(db.Model):
    id             = db.Column(db.Integer, primary_key=True)
    coil_number    = db.Column(db.String, nullable=False)
    supplier_name  = db.Column(db.String)
    total_weight   = db.Column(db.Float)
    purchase_price = db.Column(db.Float)
    make           = db.Column(db.String, nullable=False)
    type           = db.Column(db.String, nullable=False)
    color          = db.Column(db.String, nullable=False)
    purchase_date  = db.Column(db.String, default=datetime.now)
    length         = db.Column(db.Float)
    notes          = db.Column(db.Text)
    owner_id       = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    owner          = db.relationship("User", backref=db.backref("coils", lazy="dynamic"),
                                     foreign_keys=[owner_id])

    __table_args__ = (
        db.UniqueConstraint("coil_number", "owner_id", name="uq_coil_number_owner"),
    )

    products = db.relationship("Product", backref="coil", lazy=True)


class Product(db.Model):
    id       = db.Column(db.Integer, primary_key=True)
    make     = db.Column(db.String, nullable=False)
    type     = db.Column(db.String, nullable=False)
    color    = db.Column(db.String, nullable=False)
    rate     = db.Column(db.Float, nullable=False)
    date     = db.Column(db.String, default=datetime.now)
    coil_id  = db.Column(db.Integer, db.ForeignKey("coil.id"), nullable=False)
    owner_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    owner    = db.relationship("User", backref=db.backref("products", lazy="dynamic"),
                               foreign_keys=[owner_id])


class Sale(db.Model):
    id                = db.Column(db.Integer, primary_key=True)
    date              = db.Column(db.DateTime, default=datetime.now)
    party_id          = db.Column(db.Integer, db.ForeignKey("party.id"), nullable=False)
    total_amount      = db.Column(db.Float)
    discount          = db.Column(db.Float, default=0.0)
    tax_rate          = db.Column(db.Float, default=0.0)
    tax_amount        = db.Column(db.Float, default=0.0)
    net_amount        = db.Column(db.Float)
    status             = db.Column(db.String(20), default="confirmed")   # draft|confirmed|cancelled
    payment_status     = db.Column(db.String(20), default="pending")     # pending|partial|paid
    production_status  = db.Column(db.String(20), default="pending")     # pending|in_progress|completed
    amount_paid        = db.Column(db.Float, default=0.0)
    notes              = db.Column(db.Text)
    transport_details  = db.Column(db.String(255))
    invoice_number     = db.Column(db.String(50))
    owner_id           = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)

    __table_args__ = (
        # Partial unique index: enforces uniqueness only on non-NULL invoice numbers per owner.
        # SQLite allows multiple NULLs even with a UNIQUE constraint, so this is safe for
        # legacy rows that have no invoice number.
        Index(
            "uq_invoice_owner",
            "invoice_number", "owner_id",
            unique=True,
            sqlite_where=sa_text("invoice_number IS NOT NULL"),
        ),
    )

    party = db.relationship("Party", backref=db.backref("sales", lazy="dynamic"))
    owner = db.relationship("User",  backref=db.backref("sales", lazy="dynamic"),
                            foreign_keys=[owner_id])

    def total_ordered_length(self):
        return sum(
            item.length * item.quantity
            for coil in self.used_coils
            for item in coil.items
        )

    def to_dict(self):
        return {
            "id": self.id,
            "invoice_number": self.invoice_number or f"INV-{self.id:04d}",
            "date": self.date.strftime("%Y-%m-%d %H:%M") if self.date else None,
            "party_id": self.party_id,
            "party_name": self.party.name if self.party else None,
            "total_amount": self.total_amount or 0,
            "discount": self.discount or 0,
            "tax_rate": self.tax_rate or 0,
            "tax_amount": self.tax_amount or 0,
            "net_amount": self.net_amount or self.total_amount or 0,
            "status": self.status or "confirmed",
            "payment_status": self.payment_status or "pending",
            "production_status": self.production_status or "pending",
            "amount_paid": self.amount_paid or 0,
            "notes": self.notes or "",
            "transport_details": self.transport_details or "",
        }


class SaleCoil(db.Model):
    __tablename__ = "sale_coil"
    id      = db.Column(db.Integer, primary_key=True)
    sale_id = db.Column(db.Integer, db.ForeignKey("sale.id"), nullable=False)
    coil_id = db.Column(db.Integer, db.ForeignKey("coil.id"), nullable=False)

    sale  = db.relationship("Sale", backref=db.backref("used_coils", lazy="select",
                                                        cascade="all, delete-orphan"))
    coil  = db.relationship("Coil", backref=db.backref("sales_used_in", lazy="dynamic"))
    items = db.relationship("SaleItem", backref="sale_coil", lazy="select",
                            cascade="all, delete-orphan")


class SaleItem(db.Model):
    id              = db.Column(db.Integer, primary_key=True)
    sale_coil_id    = db.Column(db.Integer, db.ForeignKey("sale_coil.id"), nullable=False)
    product_id      = db.Column(db.Integer, db.ForeignKey("product.id"), nullable=False)
    length          = db.Column(db.Float, nullable=False)
    quantity        = db.Column(db.Integer, nullable=False)
    rate            = db.Column(db.Float)
    amount          = db.Column(db.Float)
    excess_material = db.Column(db.Float)
    wastage         = db.Column(db.Float, default=0.0)
    is_custom       = db.Column(db.Boolean, default=False)

    product = db.relationship("Product", backref=db.backref("sale_items", lazy="dynamic"))


# ── Stock Movement Log ────────────────────────────────────────────────────────

class StockMovement(db.Model):
    __tablename__ = "stock_movement"
    id          = db.Column(db.Integer, primary_key=True)
    coil_id     = db.Column(db.Integer, db.ForeignKey("coil.id"), nullable=False)
    sale_id     = db.Column(db.Integer, db.ForeignKey("sale.id"), nullable=True)
    movement    = db.Column(db.Float, nullable=False)   # negative = used
    description = db.Column(db.String(255))
    created_at  = db.Column(db.DateTime, default=datetime.now)
    owner_id    = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)

    coil  = db.relationship("Coil", backref=db.backref("movements", lazy="dynamic"))
    sale  = db.relationship("Sale", backref=db.backref("stock_movements", lazy="dynamic"))
    owner = db.relationship("User", backref=db.backref("stock_movements", lazy="dynamic"),
                            foreign_keys=[owner_id])


# ── Audit Log ─────────────────────────────────────────────────────────────────

class AuditLog(db.Model):
    __tablename__ = "audit_log"
    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    action     = db.Column(db.String(100), nullable=False)
    entity     = db.Column(db.String(50))
    entity_id  = db.Column(db.Integer)
    detail     = db.Column(db.Text)
    ip_address = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.now)

    user = db.relationship("User", backref=db.backref("audit_logs", lazy="dynamic"),
                           foreign_keys=[user_id])


# ── Notification ──────────────────────────────────────────────────────────────

class Notification(db.Model):
    __tablename__ = "notification"
    id         = db.Column(db.Integer, primary_key=True)
    owner_id   = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    type       = db.Column(db.String(50))   # low_stock | order | payment | system
    title      = db.Column(db.String(255), nullable=False)
    message    = db.Column(db.Text)
    is_read    = db.Column(db.Boolean, default=False)
    link       = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.now)

    owner = db.relationship("User", backref=db.backref("notifications", lazy="dynamic"),
                            foreign_keys=[owner_id])
