#!/usr/bin/env python3
"""
Sovannary Store - Digital Store Menu & Inventory System
Backend: Flask + SQLite
Author: Senior Full-Stack Developer
"""

import os
import json
import uuid
from datetime import datetime, timedelta
from functools import wraps

from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
import jwt

# ============================================================
# CONFIGURATION
# ============================================================
app = Flask(__name__, template_folder='templates', static_folder='static')
app.config['SECRET_KEY'] = 'sovannary-store-secret-key-2024'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///sovannary_store.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'static/images'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

db = SQLAlchemy(app)

# ============================================================
# DATABASE MODELS
# ============================================================
class StoreConfig(db.Model):
    __tablename__ = 'store_config'
    id = db.Column(db.Integer, primary_key=True)
    store_name = db.Column(db.String(100), default='Sovannary Store')
    hero_text = db.Column(db.String(255), default='ទំនិញបរិស្ថានល្អ តម្លៃសមរម្យ')
    description = db.Column(db.Text, default='')
    logo_url = db.Column(db.String(255), default='')
    cover_url = db.Column(db.String(255), default='')
    theme_color = db.Column(db.String(20), default='#7c3aed')
    whatsapp_number = db.Column(db.String(50), default='855123456789')
    telegram_handle = db.Column(db.String(50), default='sovannarystore')
    facebook_page = db.Column(db.String(255), default='')
    currency = db.Column(db.String(10), default='KHR')
    currency_symbol = db.Column(db.String(10), default='៛')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'store_name': self.store_name,
            'hero_text': self.hero_text,
            'description': self.description,
            'logo_url': self.logo_url,
            'cover_url': self.cover_url,
            'theme_color': self.theme_color,
            'whatsapp_number': self.whatsapp_number,
            'telegram_handle': self.telegram_handle,
            'facebook_page': self.facebook_page,
            'currency': self.currency,
            'currency_symbol': self.currency_symbol
        }

class Category(db.Model):
    __tablename__ = 'categories'
    id = db.Column(db.String(50), primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    name_en = db.Column(db.String(100), default='')
    icon = db.Column(db.String(50), default='')
    sort_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'name_en': self.name_en,
            'icon': self.icon,
            'sort_order': self.sort_order,
            'is_active': self.is_active
        }

class Product(db.Model):
    __tablename__ = 'products'
    id = db.Column(db.String(50), primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    name_en = db.Column(db.String(200), default='')
    description = db.Column(db.Text, default='')
    price_amount = db.Column(db.Float, default=0)
    cost_price = db.Column(db.Float, default=0)
    category_id = db.Column(db.String(50), db.ForeignKey('categories.id'), nullable=False)
    sku = db.Column(db.String(100), unique=True)
    barcode = db.Column(db.String(100), default='')
    image_url = db.Column(db.String(255), default='')
    images = db.Column(db.Text, default='[]')  # JSON array
    is_featured = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    stock_available = db.Column(db.Integer, default=0)
    stock_threshold = db.Column(db.Integer, default=5)
    pack_size = db.Column(db.String(50), default='')
    pack_unit = db.Column(db.String(50), default='')
    sort_order = db.Column(db.Integer, default=0)
    view_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category = db.relationship('Category', backref='products')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'name_en': self.name_en,
            'description': self.description,
            'price_amount': self.price_amount,
            'cost_price': self.cost_price,
            'category_id': self.category_id,
            'category_name': self.category.name if self.category else '',
            'sku': self.sku,
            'barcode': self.barcode,
            'image_url': self.image_url,
            'images': json.loads(self.images) if self.images else [],
            'is_featured': self.is_featured,
            'is_active': self.is_active,
            'stock_available': self.stock_available,
            'stock_threshold': self.stock_threshold,
            'pack_size': self.pack_size,
            'pack_unit': self.pack_unit,
            'sort_order': self.sort_order,
            'view_count': self.view_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Order(db.Model):
    __tablename__ = 'orders'
    id = db.Column(db.String(50), primary_key=True)
    order_number = db.Column(db.String(50), unique=True)
    customer_name = db.Column(db.String(100), nullable=False)
    customer_phone = db.Column(db.String(50), nullable=False)
    customer_address = db.Column(db.Text, default='')
    items = db.Column(db.Text, default='[]')  # JSON array
    total = db.Column(db.Float, default=0)
    subtotal = db.Column(db.Float, default=0)
    discount = db.Column(db.Float, default=0)
    tax = db.Column(db.Float, default=0)
    note = db.Column(db.Text, default='')
    channel = db.Column(db.String(50), default='direct')  # whatsapp, telegram, facebook, direct, pos
    status = db.Column(db.String(50), default='pending')  # pending, confirmed, preparing, ready, delivered, cancelled
    payment_status = db.Column(db.String(50), default='pending')  # pending, paid, failed, refunded
    payment_method = db.Column(db.String(50), default='')
    table_number = db.Column(db.String(20), default='')
    delivery_type = db.Column(db.String(50), default='pickup')  # pickup, delivery, dine_in
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'order_number': self.order_number,
            'customer_name': self.customer_name,
            'customer_phone': self.customer_phone,
            'customer_address': self.customer_address,
            'items': json.loads(self.items) if self.items else [],
            'total': self.total,
            'subtotal': self.subtotal,
            'discount': self.discount,
            'tax': self.tax,
            'note': self.note,
            'channel': self.channel,
            'status': self.status,
            'payment_status': self.payment_status,
            'payment_method': self.payment_method,
            'table_number': self.table_number,
            'delivery_type': self.delivery_type,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(100), unique=True)
    full_name = db.Column(db.String(100), default='')
    role = db.Column(db.String(50), default='admin')  # admin, staff, manager
    is_active = db.Column(db.Boolean, default=True)
    last_login = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'role': self.role,
            'is_active': self.is_active,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class ActivityLog(db.Model):
    __tablename__ = 'activity_logs'
    id = db.Column(db.Integer, primary_key=True)
    action = db.Column(db.String(100), nullable=False)
    entity_type = db.Column(db.String(50), default='')  # product, order, category, etc.
    entity_id = db.Column(db.String(50), default='')
    details = db.Column(db.Text, default='')
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'action': self.action,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'details': self.details,
            'user_id': self.user_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

# ============================================================
# AUTHENTICATION HELPERS
# ============================================================
def generate_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=7),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

def verify_token(token):
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload['user_id']
    except:
        return None

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]

        if not token:
            return jsonify({'success': False, 'message': 'Token is missing'}), 401

        user_id = verify_token(token)
        if not user_id:
            return jsonify({'success': False, 'message': 'Token is invalid or expired'}), 401

        current_user = User.query.get(user_id)
        if not current_user:
            return jsonify({'success': False, 'message': 'User not found'}), 401

        return f(current_user, *args, **kwargs)
    return decorated

# ============================================================
# SEED DATA
# ============================================================
def seed_data():
    """Initialize database with demo data"""
    # Create default store config
    if not StoreConfig.query.first():
        config = StoreConfig(
            store_name='Sovannary Store',
            hero_text='ទំនិញបរិស្ថានល្អ តម្លៃសមរម្យ',
            description='ហាងលក់ទំនិញគ្រប់ប្រភេទ ដឹកជញ្ជូនដល់ផ្ទះ',
            whatsapp_number='855123456789',
            telegram_handle='sovannarystore',
            theme_color='#7c3aed'
        )
        db.session.add(config)

    # Create default admin user
    if not User.query.filter_by(username='admin').first():
        admin = User(
            username='admin',
            password_hash=generate_password_hash('admin123'),
            email='admin@sovannary.store',
            full_name='Admin Sovannary',
            role='admin'
        )
        db.session.add(admin)

    # Create demo categories
    categories = [
        {'id': 'cat_food', 'name': 'អាហារ', 'name_en': 'Food', 'icon': '🍜', 'sort_order': 1},
        {'id': 'cat_drink', 'name': 'ភេសជ្ជៈ', 'name_en': 'Drinks', 'icon': '🥤', 'sort_order': 2},
        {'id': 'cat_snack', 'name': 'ចំណីអាហារ', 'name_en': 'Snacks', 'icon': '🍿', 'sort_order': 3},
        {'id': 'cat_grocery', 'name': 'ទំនិញទូទៅ', 'name_en': 'Grocery', 'icon': '🛒', 'sort_order': 4},
        {'id': 'cat_fresh', 'name': 'បន្លែផ្លែឈើ', 'name_en': 'Fresh Produce', 'icon': '🥬', 'sort_order': 5},
    ]

    for cat_data in categories:
        if not Category.query.get(cat_data['id']):
            cat = Category(**cat_data)
            db.session.add(cat)

    # Create demo products
    products = [
        {
            'id': 'prod_001', 'name': 'បាយសាច់គោ', 'name_en': 'Beef Rice',
            'description': 'បាយសាច់គោឆ្ងាញ់ ជាមួយបន្លែស្រស់ៗ',
            'price_amount': 8000, 'cost_price': 5000,
            'category_id': 'cat_food', 'sku': 'BF001',
            'stock_available': 50, 'stock_threshold': 10,
            'is_featured': True, 'is_active': True,
            'pack_size': '1', 'pack_unit': 'plate'
        },
        {
            'id': 'prod_002', 'name': 'មីហិរគោ', 'name_en': 'Beef Noodle Soup',
            'description': 'មីហិរសាច់គោឆ្ងាញ់ ទឹកស៊ុបឆ្ងាញ់',
            'price_amount': 10000, 'cost_price': 6000,
            'category_id': 'cat_food', 'sku': 'BF002',
            'stock_available': 30, 'stock_threshold': 5,
            'is_featured': True, 'is_active': True,
            'pack_size': '1', 'pack_unit': 'bowl'
        },
        {
            'id': 'prod_003', 'name': 'កាហ្វេទឹកដោះគោ', 'name_en': 'Milk Coffee',
            'description': 'កាហ្វេឆ្ងាញ់ ជាមួយទឹកដោះគោស្រស់',
            'price_amount': 5000, 'cost_price': 2500,
            'category_id': 'cat_drink', 'sku': 'DR001',
            'stock_available': 100, 'stock_threshold': 20,
            'is_featured': False, 'is_active': True,
            'pack_size': '1', 'pack_unit': 'cup'
        },
        {
            'id': 'prod_004', 'name': 'តែខ្មៅ', 'name_en': 'Black Tea',
            'description': 'តែខ្មៅឆ្ងាញ់ ជាមួយទឹកកក',
            'price_amount': 3500, 'cost_price': 1500,
            'category_id': 'cat_drink', 'sku': 'DR002',
            'stock_available': 80, 'stock_threshold': 15,
            'is_featured': False, 'is_active': True,
            'pack_size': '1', 'pack_unit': 'cup'
        },
        {
            'id': 'prod_005', 'name': 'ម្ហូបបាយ', 'name_en': 'Rice Package',
            'description': 'ម្ហូបបាយពេញចង្ហាន់ សាច់គោ+បន្លែ',
            'price_amount': 12000, 'cost_price': 7000,
            'category_id': 'cat_food', 'sku': 'BF003',
            'stock_available': 20, 'stock_threshold': 5,
            'is_featured': True, 'is_active': True,
            'pack_size': '1', 'pack_unit': 'set'
        },
        {
            'id': 'prod_006', 'name': 'ភីហ្សា', 'name_en': 'Pizza',
            'description': 'ភីហ្សាឆ្ងាញ់ ជាមួយសាច់ប្រហិត និងប៉េងប៉ោះ',
            'price_amount': 15000, 'cost_price': 9000,
            'category_id': 'cat_food', 'sku': 'BF004',
            'stock_available': 15, 'stock_threshold': 3,
            'is_featured': False, 'is_active': True,
            'pack_size': '1', 'pack_unit': 'piece'
        },
        {
            'id': 'prod_007', 'name': 'ស្ករត្នោត', 'name_en': 'Palm Sugar',
            'description': 'ស្ករត្នោតធម្មជាតិ ឆ្ងាញ់ សុវត្ថិភាព',
            'price_amount': 6000, 'cost_price': 3500,
            'category_id': 'cat_grocery', 'sku': 'GR001',
            'stock_available': 40, 'stock_threshold': 10,
            'is_featured': False, 'is_active': True,
            'pack_size': '500', 'pack_unit': 'g'
        },
        {
            'id': 'prod_008', 'name': 'ម៉ាស់ដូឡា', 'name_en': 'Coca Cola',
            'description': 'ភេសជ្ជៈម៉ាស់ដូឡា 330ml',
            'price_amount': 2500, 'cost_price': 1200,
            'category_id': 'cat_drink', 'sku': 'DR003',
            'stock_available': 200, 'stock_threshold': 50,
            'is_featured': False, 'is_active': True,
            'pack_size': '330', 'pack_unit': 'ml'
        },
        {
            'id': 'prod_009', 'name': 'ផ្លែឈើរួម', 'name_en': 'Mixed Fruits',
            'description': 'ផ្លែឈើស្រស់ៗ រួមបញ្ចូលផ្លែប៉ោម ផ្លែស្វាយ និងផ្លែក្រូច',
            'price_amount': 10000, 'cost_price': 6000,
            'category_id': 'cat_fresh', 'sku': 'FR001',
            'stock_available': 25, 'stock_threshold': 5,
            'is_featured': True, 'is_active': True,
            'pack_size': '1', 'pack_unit': 'kg'
        },
        {
            'id': 'prod_010', 'name': 'បន្លែស្រស់', 'name_en': 'Fresh Vegetables',
            'description': 'បន្លែស្រស់ៗ ពីកសិកម្មធម្មជាតិ',
            'price_amount': 5000, 'cost_price': 2500,
            'category_id': 'cat_fresh', 'sku': 'FR002',
            'stock_available': 35, 'stock_threshold': 8,
            'is_featured': False, 'is_active': True,
            'pack_size': '500', 'pack_unit': 'g'
        },
        {
            'id': 'prod_011', 'name': 'ប្រហិតឆ្ងាញ់', 'name_en': 'Tasty Sausage',
            'description': 'ប្រហិតឆ្ងាញ់ ធ្វើពីសាច់ស្រស់ៗ',
            'price_amount': 8000, 'cost_price': 4500,
            'category_id': 'cat_snack', 'sku': 'SN001',
            'stock_available': 60, 'stock_threshold': 15,
            'is_featured': False, 'is_active': True,
            'pack_size': '10', 'pack_unit': 'pieces'
        },
        {
            'id': 'prod_012', 'name': 'ពោតចំហយ៉ាង', 'name_en': 'Popcorn',
            'description': 'ពោតចំហយ៉ាងឆ្ងាញ់ ជាមួយរសជាតិអំបិល',
            'price_amount': 4000, 'cost_price': 2000,
            'category_id': 'cat_snack', 'sku': 'SN002',
            'stock_available': 100, 'stock_threshold': 25,
            'is_featured': False, 'is_active': True,
            'pack_size': '100', 'pack_unit': 'g'
        },
    ]

    for prod_data in products:
        if not Product.query.get(prod_data['id']):
            prod = Product(**prod_data)
            db.session.add(prod)

    db.session.commit()
    print("✅ Seed data created successfully!")

# ============================================================
# INITIALIZE DATABASE
# ============================================================
with app.app_context():
    db.create_all()
    seed_data()

# ============================================================
# ROUTES - PAGES
# ============================================================
@app.route('/')
def index():
    """Customer View - Digital Store Menu"""
    return render_template('index.html')

@app.route('/admin')
def admin():
    """Admin Dashboard"""
    return render_template('admin.html')

@app.route('/pos')
def pos():
    """POS System"""
    return render_template('admin.html', pos_mode=True)

# ============================================================
# API - STORE CONFIG
# ============================================================
@app.route('/api/v1/config', methods=['GET'])
def get_config():
    config = StoreConfig.query.first()
    if not config:
        return jsonify({'success': False, 'message': 'Config not found'}), 404
    return jsonify({'success': True, 'data': config.to_dict()})

@app.route('/api/v1/config', methods=['PUT'])
@token_required
def update_config(current_user):
    config = StoreConfig.query.first()
    if not config:
        return jsonify({'success': False, 'message': 'Config not found'}), 404

    data = request.get_json()
    for key, value in data.items():
        if hasattr(config, key):
            setattr(config, key, value)

    db.session.commit()
    return jsonify({'success': True, 'data': config.to_dict()})

# ============================================================
# API - CATEGORIES
# ============================================================
@app.route('/api/v1/categories', methods=['GET'])
def get_categories():
    categories = Category.query.filter_by(is_active=True).order_by(Category.sort_order).all()
    return jsonify({'success': True, 'data': [c.to_dict() for c in categories]})

@app.route('/api/v1/categories', methods=['POST'])
@token_required
def create_category(current_user):
    data = request.get_json()
    category = Category(
        id=data.get('id') or str(uuid.uuid4())[:8],
        name=data['name'],
        name_en=data.get('name_en', ''),
        icon=data.get('icon', ''),
        sort_order=data.get('sort_order', 0)
    )
    db.session.add(category)
    db.session.commit()

    # Log activity
    log = ActivityLog(action='CREATE_CATEGORY', entity_type='category', entity_id=category.id,
                      details=f'Created category: {category.name}', user_id=current_user.id)
    db.session.add(log)
    db.session.commit()

    return jsonify({'success': True, 'data': category.to_dict()}), 201

@app.route('/api/v1/categories/<id>', methods=['PUT'])
@token_required
def update_category(current_user, id):
    category = Category.query.get_or_404(id)
    data = request.get_json()
    for key, value in data.items():
        if hasattr(category, key):
            setattr(category, key, value)
    db.session.commit()
    return jsonify({'success': True, 'data': category.to_dict()})

@app.route('/api/v1/categories/<id>', methods=['DELETE'])
@token_required
def delete_category(current_user, id):
    category = Category.query.get_or_404(id)
    db.session.delete(category)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Category deleted'})

# ============================================================
# API - PRODUCTS
# ============================================================
@app.route('/api/v1/products', methods=['GET'])
def get_products():
    query = Product.query

    # Filters
    category_id = request.args.get('category_id')
    if category_id:
        query = query.filter_by(category_id=category_id)

    active_only = request.args.get('active', 'true').lower() == 'true'
    if active_only:
        query = query.filter_by(is_active=True)

    featured = request.args.get('featured')
    if featured:
        query = query.filter_by(is_featured=featured.lower() == 'true')

    search = request.args.get('search')
    if search:
        query = query.filter(Product.name.contains(search))

    # Pagination
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 100, type=int)

    products = query.order_by(Product.sort_order, Product.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        'success': True,
        'data': {
            'items': [p.to_dict() for p in products.items],
            'total': products.total,
            'page': page,
            'per_page': per_page,
            'pages': products.pages
        }
    })

@app.route('/api/v1/products/<id>', methods=['GET'])
def get_product(id):
    product = Product.query.get_or_404(id)
    # Increment view count
    product.view_count += 1
    db.session.commit()
    return jsonify({'success': True, 'data': product.to_dict()})

@app.route('/api/v1/products', methods=['POST'])
@token_required
def create_product(current_user):
    data = request.get_json()
    product = Product(
        id=data.get('id') or str(uuid.uuid4())[:8],
        name=data['name'],
        name_en=data.get('name_en', ''),
        description=data.get('description', ''),
        price_amount=data.get('price_amount', 0),
        cost_price=data.get('cost_price', 0),
        category_id=data['category_id'],
        sku=data.get('sku', ''),
        barcode=data.get('barcode', ''),
        image_url=data.get('image_url', ''),
        images=json.dumps(data.get('images', [])),
        is_featured=data.get('is_featured', False),
        is_active=data.get('is_active', True),
        stock_available=data.get('stock_available', 0),
        stock_threshold=data.get('stock_threshold', 5),
        pack_size=data.get('pack_size', ''),
        pack_unit=data.get('pack_unit', ''),
        sort_order=data.get('sort_order', 0)
    )
    db.session.add(product)
    db.session.commit()

    log = ActivityLog(action='CREATE_PRODUCT', entity_type='product', entity_id=product.id,
                      details=f'Created product: {product.name}', user_id=current_user.id)
    db.session.add(log)
    db.session.commit()

    return jsonify({'success': True, 'data': product.to_dict()}), 201

@app.route('/api/v1/products/<id>', methods=['PUT'])
@token_required
def update_product(current_user, id):
    product = Product.query.get_or_404(id)
    data = request.get_json()
    for key, value in data.items():
        if key == 'images' and isinstance(value, list):
            value = json.dumps(value)
        if hasattr(product, key):
            setattr(product, key, value)
    db.session.commit()

    log = ActivityLog(action='UPDATE_PRODUCT', entity_type='product', entity_id=product.id,
                      details=f'Updated product: {product.name}', user_id=current_user.id)
    db.session.add(log)
    db.session.commit()

    return jsonify({'success': True, 'data': product.to_dict()})

@app.route('/api/v1/products/<id>', methods=['DELETE'])
@token_required
def delete_product(current_user, id):
    product = Product.query.get_or_404(id)
    db.session.delete(product)
    db.session.commit()

    log = ActivityLog(action='DELETE_PRODUCT', entity_type='product', entity_id=id,
                      details=f'Deleted product: {product.name}', user_id=current_user.id)
    db.session.add(log)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Product deleted'})

# ============================================================
# API - ORDERS
# ============================================================
@app.route('/api/v1/orders', methods=['GET'])
@token_required
def get_orders(current_user):
    query = Order.query

    status = request.args.get('status')
    if status:
        query = query.filter_by(status=status)

    channel = request.args.get('channel')
    if channel:
        query = query.filter_by(channel=channel)

    date_from = request.args.get('date_from')
    if date_from:
        query = query.filter(Order.created_at >= datetime.fromisoformat(date_from))

    date_to = request.args.get('date_to')
    if date_to:
        query = query.filter(Order.created_at <= datetime.fromisoformat(date_to))

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)

    orders = query.order_by(Order.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        'success': True,
        'data': {
            'items': [o.to_dict() for o in orders.items],
            'total': orders.total,
            'page': page,
            'per_page': per_page,
            'pages': orders.pages
        }
    })

@app.route('/api/v1/orders', methods=['POST'])
def create_order():
    data = request.get_json()

    # Generate order number
    today = datetime.now().strftime('%Y%m%d')
    count = Order.query.filter(Order.order_number.like(f'ORD-{today}%')).count() + 1
    order_number = f'ORD-{today}-{count:04d}'

    order = Order(
        id=str(uuid.uuid4())[:8],
        order_number=order_number,
        customer_name=data['customer_name'],
        customer_phone=data['customer_phone'],
        customer_address=data.get('customer_address', ''),
        items=json.dumps(data.get('items', [])),
        total=data.get('total', 0),
        subtotal=data.get('subtotal', 0),
        discount=data.get('discount', 0),
        tax=data.get('tax', 0),
        note=data.get('note', ''),
        channel=data.get('channel', 'direct'),
        status='pending',
        table_number=data.get('table_number', ''),
        delivery_type=data.get('delivery_type', 'pickup')
    )
    db.session.add(order)
    db.session.commit()

    return jsonify({'success': True, 'data': order.to_dict()}), 201

@app.route('/api/v1/orders/<id>', methods=['GET'])
@token_required
def get_order(current_user, id):
    order = Order.query.get_or_404(id)
    return jsonify({'success': True, 'data': order.to_dict()})

@app.route('/api/v1/orders/<id>', methods=['PUT'])
@token_required
def update_order(current_user, id):
    order = Order.query.get_or_404(id)
    data = request.get_json()
    for key, value in data.items():
        if hasattr(order, key):
            setattr(order, key, value)
    db.session.commit()

    log = ActivityLog(action='UPDATE_ORDER', entity_type='order', entity_id=order.id,
                      details=f'Updated order {order.order_number} to status: {order.status}', user_id=current_user.id)
    db.session.add(log)
    db.session.commit()

    return jsonify({'success': True, 'data': order.to_dict()})

@app.route('/api/v1/orders/<id>', methods=['DELETE'])
@token_required
def delete_order(current_user, id):
    order = Order.query.get_or_404(id)
    db.session.delete(order)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Order deleted'})

# ============================================================
# API - DASHBOARD STATS
# ============================================================
@app.route('/api/v1/dashboard/stats', methods=['GET'])
@token_required
def get_dashboard_stats(current_user):
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday = today - timedelta(days=1)
    week_ago = today - timedelta(days=7)

    # Today's stats
    today_orders = Order.query.filter(Order.created_at >= today).all()
    today_revenue = sum(o.total for o in today_orders)
    today_order_count = len(today_orders)
    pending_orders = Order.query.filter_by(status='pending').count()

    # Yesterday stats
    yesterday_orders = Order.query.filter(
        Order.created_at >= yesterday,
        Order.created_at < today
    ).all()
    yesterday_revenue = sum(o.total for o in yesterday_orders)

    # Week stats
    week_orders = Order.query.filter(Order.created_at >= week_ago).all()
    week_revenue = sum(o.total for o in week_orders)

    # Product stats
    total_products = Product.query.count()
    active_products = Product.query.filter_by(is_active=True).count()
    featured_products = Product.query.filter_by(is_featured=True).count()
    total_categories = Category.query.filter_by(is_active=True).count()

    # Low stock products
    low_stock = Product.query.filter(
        Product.stock_available <= Product.stock_threshold,
        Product.stock_available > 0
    ).count()

    out_of_stock = Product.query.filter(Product.stock_available <= 0).count()

    # 7-day revenue chart data
    chart_data = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        next_day = day + timedelta(days=1)
        day_orders = Order.query.filter(
            Order.created_at >= day,
            Order.created_at < next_day
        ).all()
        day_revenue = sum(o.total for o in day_orders)
        chart_data.append({
            'date': day.strftime('%a'),
            'revenue': day_revenue,
            'orders': len(day_orders)
        })

    return jsonify({
        'success': True,
        'data': {
            'today_revenue': today_revenue,
            'today_orders': today_order_count,
            'yesterday_revenue': yesterday_revenue,
            'pending_orders': pending_orders,
            'week_revenue': week_revenue,
            'total_products': total_products,
            'active_products': active_products,
            'featured_products': featured_products,
            'total_categories': total_categories,
            'low_stock': low_stock,
            'out_of_stock': out_of_stock,
            'chart_data': chart_data
        }
    })

# ============================================================
# API - AUTHENTICATION
# ============================================================
@app.route('/api/v1/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'success': False, 'message': 'Invalid username or password'}), 401

    if not user.is_active:
        return jsonify({'success': False, 'message': 'Account is disabled'}), 403

    user.last_login = datetime.utcnow()
    db.session.commit()

    token = generate_token(user.id)
    return jsonify({
        'success': True,
        'data': {
            'token': token,
            'user': user.to_dict()
        }
    })

@app.route('/api/v1/auth/me', methods=['GET'])
@token_required
def get_me(current_user):
    return jsonify({'success': True, 'data': current_user.to_dict()})

@app.route('/api/v1/auth/change-password', methods=['POST'])
@token_required
def change_password(current_user):
    data = request.get_json()
    old_password = data.get('old_password')
    new_password = data.get('new_password')

    if not check_password_hash(current_user.password_hash, old_password):
        return jsonify({'success': False, 'message': 'Current password is incorrect'}), 400

    current_user.password_hash = generate_password_hash(new_password)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Password changed successfully'})

# ============================================================
# API - FILE UPLOAD
# ============================================================
@app.route('/api/v1/upload', methods=['POST'])
@token_required
def upload_file(current_user):
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'message': 'No file selected'}), 400

    if file:
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(filepath)

        return jsonify({
            'success': True,
            'data': {
                'filename': unique_filename,
                'url': f'/static/images/{unique_filename}'
            }
        })

@app.route('/api/v1/upload-multiple', methods=['POST'])
@token_required
def upload_multiple_files(current_user):
    if 'files' not in request.files:
        return jsonify({'success': False, 'message': 'No files provided'}), 400

    files = request.files.getlist('files')
    uploaded = []

    for file in files:
        if file and file.filename:
            filename = secure_filename(file.filename)
            unique_filename = f"{uuid.uuid4()}_{filename}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(filepath)
            uploaded.append({
                'filename': unique_filename,
                'url': f'/static/images/{unique_filename}'
            })

    return jsonify({'success': True, 'data': uploaded})

# ============================================================
# API - ACTIVITY LOGS
# ============================================================
@app.route('/api/v1/activity-logs', methods=['GET'])
@token_required
def get_activity_logs(current_user):
    logs = ActivityLog.query.order_by(ActivityLog.created_at.desc()).limit(100).all()
    return jsonify({'success': True, 'data': [l.to_dict() for l in logs]})

# ============================================================
# ERROR HANDLERS
# ============================================================
@app.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'message': 'Resource not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'success': False, 'message': 'Internal server error'}), 500

# ============================================================
# MAIN
# ============================================================
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
