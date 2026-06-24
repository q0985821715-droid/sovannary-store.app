// Sovannary Store - Admin Dashboard JavaScript
let authToken = localStorage.getItem('sovannary_admin_token');
let currentUser = null;
let allProducts = [];
let allCategories = [];
let allOrders = [];
let posCart = [];
let currentSection = 'dashboard';
let revenueChart = null;

// ==================== AUTH ====================
document.addEventListener('DOMContentLoaded', () => {
    if (authToken) {
        verifyToken();
    } else {
        showLogin();
    }
});

async function verifyToken() {
    try {
        const res = await fetch('/api/v1/auth/me', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        if (data.success) {
            currentUser = data.data;
            document.getElementById('userName').textContent = currentUser.full_name || currentUser.username;
            showDashboard();
            loadDashboardData();
        } else {
            showLogin();
        }
    } catch(e) {
        showLogin();
    }
}

async function login() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        showToast('សូមបញ្ចូលឈ្មោះ និងពាក្យសម្ងាត់', 'error');
        return;
    }

    try {
        const res = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (data.success) {
            authToken = data.data.token;
            currentUser = data.data.user;
            localStorage.setItem('sovannary_admin_token', authToken);
            document.getElementById('userName').textContent = currentUser.full_name || currentUser.username;
            showDashboard();
            loadDashboardData();
            showToast('ចូលប្រើប្រាស់ជោគជ័យ!', 'success');
        } else {
            showToast(data.message || 'ឈ្មោះ ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ', 'error');
        }
    } catch(e) {
        showToast('មានបញ្ហាក្នុងការចូលប្រើប្រាស់', 'error');
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('sovannary_admin_token');
    showLogin();
}

function showLogin() {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('dashboardPage').style.display = 'none';
}

function showDashboard() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('dashboardPage').style.display = 'flex';
}

// ==================== NAVIGATION ====================
function showSection(section) {
    currentSection = section;

    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    event.currentTarget.classList.add('active');

    // Update sections
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(`section-${section}`).classList.add('active');

    // Update title
    const titles = {
        'dashboard': 'Dashboard',
        'products': 'គ្រប់គ្រងទំនិញ',
        'categories': 'គ្រប់គ្រងប្រភេទ',
        'orders': 'គ្រប់គ្រងការបញ្ជាទិញ',
        'pos': 'POS លក់ផ្ទាល់',
        'settings': 'ការកំណត់'
    };
    document.getElementById('pageTitle').textContent = titles[section] || section;

    // Load data
    if (section === 'dashboard') loadDashboardData();
    else if (section === 'products') loadProducts();
    else if (section === 'categories') loadCategories();
    else if (section === 'orders') loadOrders();
    else if (section === 'pos') loadPOS();
    else if (section === 'settings') loadSettings();

    // Close sidebar on mobile
    document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// ==================== DASHBOARD ====================
async function loadDashboardData() {
    try {
        const res = await fetch('/api/v1/dashboard/stats', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();

        if (data.success) {
            const stats = data.data;
            document.getElementById('statTodayRevenue').textContent = formatCurrency(stats.today_revenue);
            document.getElementById('statTodayOrders').textContent = stats.today_orders;
            document.getElementById('statPendingOrders').textContent = stats.pending_orders;
            document.getElementById('statWeekRevenue').textContent = formatCurrency(stats.week_revenue);
            document.getElementById('statTotalProducts').textContent = stats.total_products;
            document.getElementById('statActiveProducts').textContent = stats.active_products;
            document.getElementById('statFeaturedProducts').textContent = stats.featured_products;
            document.getElementById('statTotalCategories').textContent = stats.total_categories;

            // Revenue change
            const revChange = stats.yesterday_revenue > 0 
                ? ((stats.today_revenue - stats.yesterday_revenue) / stats.yesterday_revenue * 100).toFixed(1)
                : 0;
            const revChangeEl = document.getElementById('statRevenueChange');
            revChangeEl.innerHTML = revChange >= 0 
                ? `<i class="fas fa-arrow-up"></i> ${revChange}%`
                : `<i class="fas fa-arrow-down"></i> ${Math.abs(revChange)}%`;
            revChangeEl.className = `stat-change ${revChange >= 0 ? 'up' : 'down'}`;

            // Chart
            renderChart(stats.chart_data);
        }
    } catch(e) {
        console.error('Dashboard load error:', e);
    }
}

function renderChart(chartData) {
    const ctx = document.getElementById('revenueChart').getContext('2d');

    if (revenueChart) {
        revenueChart.destroy();
    }

    revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.map(d => d.date),
            datasets: [{
                label: 'ចំណូល',
                data: chartData.map(d => d.revenue),
                borderColor: '#7c3aed',
                backgroundColor: 'rgba(124,58,237,0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#7c3aed',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#f1f5f9' },
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

// ==================== PRODUCTS ====================
async function loadProducts() {
    try {
        const res = await fetch('/api/v1/products?per_page=100', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();

        if (data.success) {
            allProducts = data.data.items;
            renderProductsTable(allProducts);
            updateCategoryFilter();
        }
    } catch(e) {
        console.error('Products load error:', e);
    }
}

function renderProductsTable(products) {
    const tbody = document.getElementById('productsTableBody');

    if (products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;">មិនមានទំនិញ</td></tr>`;
        return;
    }

    tbody.innerHTML = products.map(p => `
        <tr>
            <td>
                <img src="${p.image_url || 'https://via.placeholder.com/48x48/7c3aed/ffffff?text=?'}" 
                    alt="${p.name}" class="product-img-sm"
                    onerror="this.src='https://via.placeholder.com/48x48/7c3aed/ffffff?text=?'">
            </td>
            <td>
                <strong>${p.name}</strong>
                ${p.name_en ? `<br><span style="font-size:11px;color:#94a3b8;">${p.name_en}</span>` : ''}
            </td>
            <td>${p.category_name || '-'}</td>
            <td><strong style="color:#7c3aed;">${formatCurrency(p.price_amount)}</strong></td>
            <td>${p.is_featured ? '⭐' : '-'}</td>
            <td>
                <span class="badge ${p.stock_available <= 0 ? 'badge-danger' : p.stock_available <= p.stock_threshold ? 'badge-warning' : 'badge-success'}">
                    ${p.stock_available}
                </span>
            </td>
            <td>
                <span class="badge ${p.is_active ? 'badge-success' : 'badge-secondary'}">
                    ${p.is_active ? 'សកម្ម' : 'មិនសកម្ម'}
                </span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn-edit" onclick="editProduct('${p.id}')" title="កែប្រែ">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" onclick="deleteProduct('${p.id}')" title="លុប">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function filterAdminProducts() {
    const search = document.getElementById('productSearch').value.toLowerCase();
    const category = document.getElementById('productCategoryFilter').value;
    const status = document.getElementById('productStatusFilter').value;

    let filtered = allProducts;

    if (search) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(search) || 
            (p.name_en && p.name_en.toLowerCase().includes(search))
        );
    }

    if (category) {
        filtered = filtered.filter(p => p.category_id === category);
    }

    if (status) {
        filtered = filtered.filter(p => status === 'active' ? p.is_active : !p.is_active);
    }

    renderProductsTable(filtered);
}

function updateCategoryFilter() {
    const select = document.getElementById('productCategoryFilter');
    const modalSelect = document.getElementById('productCategory');

    let options = '<option value="">គ្រប់ប្រភេទ</option>';
    let modalOptions = '<option value="">ជ្រើសរើសប្រភេទ</option>';

    allCategories.forEach(c => {
        options += `<option value="${c.id}">${c.name}</option>`;
        modalOptions += `<option value="${c.id}">${c.name}</option>`;
    });

    select.innerHTML = options;
    modalSelect.innerHTML = modalOptions;
}

function showAddModal() {
    document.getElementById('productId').value = '';
    document.getElementById('productModalTitle').textContent = 'បន្ថែមទំនិញថ្មី';
    document.getElementById('productName').value = '';
    document.getElementById('productNameEn').value = '';
    document.getElementById('productDescription').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productCost').value = '';
    document.getElementById('productCategory').value = '';
    document.getElementById('productSKU').value = '';
    document.getElementById('productStock').value = '';
    document.getElementById('productThreshold').value = '5';
    document.getElementById('productPackSize').value = '';
    document.getElementById('productPackUnit').value = '';
    document.getElementById('productImage').value = '';
    document.getElementById('productFeatured').checked = false;
    document.getElementById('productActive').checked = true;

    document.getElementById('productModalOverlay').classList.add('show');
}

function editProduct(id) {
    const p = allProducts.find(prod => prod.id === id);
    if (!p) return;

    document.getElementById('productId').value = p.id;
    document.getElementById('productModalTitle').textContent = 'កែប្រែទំនិញ';
    document.getElementById('productName').value = p.name;
    document.getElementById('productNameEn').value = p.name_en || '';
    document.getElementById('productDescription').value = p.description || '';
    document.getElementById('productPrice').value = p.price_amount;
    document.getElementById('productCost').value = p.cost_price || '';
    document.getElementById('productCategory').value = p.category_id;
    document.getElementById('productSKU').value = p.sku || '';
    document.getElementById('productStock').value = p.stock_available;
    document.getElementById('productThreshold').value = p.stock_threshold;
    document.getElementById('productPackSize').value = p.pack_size || '';
    document.getElementById('productPackUnit').value = p.pack_unit || '';
    document.getElementById('productImage').value = p.image_url || '';
    document.getElementById('productFeatured').checked = p.is_featured;
    document.getElementById('productActive').checked = p.is_active;

    document.getElementById('productModalOverlay').classList.add('show');
}

function closeProductModal() {
    document.getElementById('productModalOverlay').classList.remove('show');
}

async function saveProduct() {
    const id = document.getElementById('productId').value;
    const data = {
        name: document.getElementById('productName').value,
        name_en: document.getElementById('productNameEn').value,
        description: document.getElementById('productDescription').value,
        price_amount: parseFloat(document.getElementById('productPrice').value) || 0,
        cost_price: parseFloat(document.getElementById('productCost').value) || 0,
        category_id: document.getElementById('productCategory').value,
        sku: document.getElementById('productSKU').value,
        stock_available: parseInt(document.getElementById('productStock').value) || 0,
        stock_threshold: parseInt(document.getElementById('productThreshold').value) || 5,
        pack_size: document.getElementById('productPackSize').value,
        pack_unit: document.getElementById('productPackUnit').value,
        image_url: document.getElementById('productImage').value,
        is_featured: document.getElementById('productFeatured').checked,
        is_active: document.getElementById('productActive').checked
    };

    if (!data.name || !data.category_id) {
        showToast('សូមបំពេញឈ្មោះទំនិញ និងប្រភេទ', 'error');
        return;
    }

    try {
        const url = id ? `/api/v1/products/${id}` : '/api/v1/products';
        const method = id ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(data)
        });

        const result = await res.json();

        if (result.success) {
            closeProductModal();
            loadProducts();
            showToast(id ? 'ទំនិញបានកែប្រែជោគជ័យ!' : 'ទំនិញបានបន្ថែមជោគជ័យ!', 'success');
        } else {
            showToast(result.message || 'មានបញ្ហា', 'error');
        }
    } catch(e) {
        showToast('មានបញ្ហាក្នុងការរក្សាទុក', 'error');
    }
}

async function deleteProduct(id) {
    if (!confirm('តើអ្នកប្រាកដជាចង់លុបទំនិញនេះមែនទេ?')) return;

    try {
        const res = await fetch(`/api/v1/products/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await res.json();
        if (data.success) {
            loadProducts();
            showToast('ទំនិញបានលុបជោគជ័យ!', 'success');
        }
    } catch(e) {
        showToast('មានបញ្ហាក្នុងការលុប', 'error');
    }
}

// ==================== CATEGORIES ====================
async function loadCategories() {
    try {
        const res = await fetch('/api/v1/categories', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();

        if (data.success) {
            allCategories = data.data;
            renderCategoriesTable(allCategories);
        }
    } catch(e) {
        console.error('Categories load error:', e);
    }
}

function renderCategoriesTable(categories) {
    const tbody = document.getElementById('categoriesTableBody');

    if (categories.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;">មិនមានប្រភេទ</td></tr>`;
        return;
    }

    tbody.innerHTML = categories.map(c => `
        <tr>
            <td style="font-size:24px;">${c.icon || '-'}</td>
            <td><strong>${c.name}</strong></td>
            <td>${c.name_en || '-'}</td>
            <td>${c.sort_order}</td>
            <td>
                <span class="badge ${c.is_active ? 'badge-success' : 'badge-secondary'}">
                    ${c.is_active ? 'សកម្ម' : 'មិនសកម្ម'}
                </span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn-edit" onclick="editCategory('${c.id}')" title="កែប្រែ">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" onclick="deleteCategory('${c.id}')" title="លុប">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function showCategoryModal() {
    document.getElementById('categoryId').value = '';
    document.getElementById('categoryModalTitle').textContent = 'បន្ថែមប្រភេទថ្មី';
    document.getElementById('categoryName').value = '';
    document.getElementById('categoryNameEn').value = '';
    document.getElementById('categoryIcon').value = '';
    document.getElementById('categorySort').value = '0';

    document.getElementById('categoryModalOverlay').classList.add('show');
}

function editCategory(id) {
    const c = allCategories.find(cat => cat.id === id);
    if (!c) return;

    document.getElementById('categoryId').value = c.id;
    document.getElementById('categoryModalTitle').textContent = 'កែប្រែប្រភេទ';
    document.getElementById('categoryName').value = c.name;
    document.getElementById('categoryNameEn').value = c.name_en || '';
    document.getElementById('categoryIcon').value = c.icon || '';
    document.getElementById('categorySort').value = c.sort_order;

    document.getElementById('categoryModalOverlay').classList.add('show');
}

function closeCategoryModal() {
    document.getElementById('categoryModalOverlay').classList.remove('show');
}

async function saveCategory() {
    const id = document.getElementById('categoryId').value;
    const data = {
        name: document.getElementById('categoryName').value,
        name_en: document.getElementById('categoryNameEn').value,
        icon: document.getElementById('categoryIcon').value,
        sort_order: parseInt(document.getElementById('categorySort').value) || 0
    };

    if (!data.name) {
        showToast('សូមបំពេញឈ្មោះប្រភេទ', 'error');
        return;
    }

    try {
        const url = id ? `/api/v1/categories/${id}` : '/api/v1/categories';
        const method = id ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(data)
        });

        const result = await res.json();

        if (result.success) {
            closeCategoryModal();
            loadCategories();
            showToast(id ? 'ប្រភេទបានកែប្រែជោគជ័យ!' : 'ប្រភេទបានបន្ថែមជោគជ័យ!',
