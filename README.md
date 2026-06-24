# Sovannary Store 🏪

Digital Store Menu & Inventory Management System

## កម្មវិធីគ្រប់គ្រងស្តុក និងបង្ហាញមុខទំនិញបែបឌីជីថល

កម្មវិធីនេះបង្កើតឡើងសម្រាប់ហាង **"Sovannary Store"** ដោយធ្វើតាមទម្រង់របស់ readmenu.site

## លក្ខណៈពិសេស

### 🛒 Customer View (ទំព័រសម្រាប់អតិថិជន)
- ✅ បង្ហាញមុខទំនិញស្អាតៗ ជាមួយរូបភាព តម្លៃ បរិយាយ
- ✅ ប្រភេទទំនិញ (Categories) ជាមួយរូបតំណាង Emoji
- ✅ ប៊ូតុង "ថែមចូលកន្ត្រក" (Add to Cart)
- ✅ កន្ត្រកទំនិញ (Cart) ជាមួយប៊ូតុងបញ្ជាទិញតាម Telegram/WhatsApp/Facebook
- ✅ រចនាសម្រាប់ទូរសព្ទចល័ត (Mobile-first Responsive)
- ✅ ការស្វែងរក និងច្រាស (Search & Filter)
- ✅ បង្ហាញស្ថានភាពស្តុក (In Stock, Low Stock, Out of Stock)

### 🔧 Admin Dashboard (ផ្នែកគ្រប់គ្រង)
- 📊 **Dashboard** - ស្ថិតិផ្ទៃក្នុង (Revenue, Orders, Views) ជាមួយក្រាហ្វ
- 📦 **Products** - បន្ថែម/កែប្រែ/លុបទំនិញ
- 🏷️ **Categories** - គ្រប់គ្រងប្រភេទទំនិញ
- 🛒 **Orders** - គ្រប់គ្រងការបញ្ជាទិញ និងធ្វើបច្ចុប្បន្នភាពស្ថានភាព
- 💰 **POS System** - ប្រព័ន្ធលក់ផ្ទាល់ (Point of Sale)
- ⚙️ **Settings** - ការកំណត់ហាង

### 🔒 Security
- ✅ JWT Authentication សម្រាប់ Admin
- ✅ Password hashing (Werkzeug)
- ✅ Activity logging

## តម្រូវការប្រព័ន្ធ

- Python 3.8+
- pip

## ការដំឡើង

### 1. ដំឡើងបណ្ណាល័យ
```bash
pip install -r requirements.txt
```

### 2. ដំណើរការកម្មវិធី
```bash
python server.py
```

### 3. ចូលប្រើប្រាស់
- **Customer View**: http://localhost:5000/
- **Admin Dashboard**: http://localhost:5000/admin

### គណនី Admin លំនាំដើម
- Username: `admin`
- Password: `admin123`

## រចនាសម្ព័ន្ធឯកសារ

```
sovannary-store/
├── server.py              # Flask Backend + API + Database
├── requirements.txt       # កូដបណ្ណាល័យដែលត្រូវការ
├── templates/
│   ├── index.html        # Customer View
│   └── admin.html        # Admin Dashboard
├── static/
│   ├── css/
│   │   └── style.css     # រចនាសម្ព័ន្ធ
│   ├── js/
│   │   ├── app.js        # Customer View JS
│   │   └── admin.js      # Admin Dashboard JS
│   └── images/           # រូបភាពទំនិញ
└── README.md
```

## API Endpoints

### Store Config
- `GET /api/v1/config` - ទាញយកការកំណត់ហាង
- `PUT /api/v1/config` - ធ្វើបច្ចុប្បន្នភាពការកំណត់ហាង

### Categories
- `GET /api/v1/categories` - ទាញយកប្រភេទទំនិញទាំងអស់
- `POST /api/v1/categories` - បន្ថែមប្រភេទថ្មី
- `PUT /api/v1/categories/<id>` - កែប្រែប្រភេទ
- `DELETE /api/v1/categories/<id>` - លុបប្រភេទ

### Products
- `GET /api/v1/products` - ទាញយកទំនិញទាំងអស់
- `GET /api/v1/products/<id>` - ទាញយកទំនិញតាមលេខសម្គាល់
- `POST /api/v1/products` - បន្ថែមទំនិញថ្មី
- `PUT /api/v1/products/<id>` - កែប្រែទំនិញ
- `DELETE /api/v1/products/<id>` - លុបទំនិញ

### Orders
- `GET /api/v1/orders` - ទាញយកការបញ្ជាទិញទាំងអស់
- `POST /api/v1/orders` - បង្កើតការបញ្ជាទិញថ្មី
- `PUT /api/v1/orders/<id>` - ធ្វើបច្ចុប្បន្នភាពការបញ្ជាទិញ
- `DELETE /api/v1/orders/<id>` - លុបការបញ្ជាទិញ

### Dashboard
- `GET /api/v1/dashboard/stats` - ស្ថិតិសម្រាប់ Dashboard

### Auth
- `POST /api/v1/auth/login` - ចូលប្រើប្រាស់
- `GET /api/v1/auth/me` - ព័ត៌មានអ្នកប្រើប្រាស់បច្ចុប្បន្ន

## បច្ចេកវិទ្យាប្រើប្រាស់

| បច្ចេកវិទ្យា | ព័ត៌មាន |
|------------|--------|
| **Backend** | Python Flask |
| **Database** | SQLite (SQLAlchemy ORM) |
| **Frontend** | Vanilla JavaScript + CSS3 |
| **Charts** | Chart.js |
| **Icons** | Font Awesome 6.5.1 |
| **Font** | Kantumruy Pro (Khmer font) |
| **Auth** | JWT Tokens |

## អ្នកអភិវឌ្ឍ

Senior Full-Stack Developer

## អាជ្ញាប័ណ្ណ

MIT License
