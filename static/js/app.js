// Sovannary Store - Customer View JavaScript
let allProducts = [];
let allCategories = [];
let cart = JSON.parse(localStorage.getItem('sovannary_cart') || '[]');
let currentCategory = 'all';
let storeConfig = {};
let searchQuery = '';

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', init);

async function init() {
    await loadConfig();
    await loadCategories();
    await loadProducts();
    renderCart();
    updateCartBadge();
    document.getElementById('liveBadge').style.display = 'flex';
}

async function loadConfig() {
    try {
        const res = await fetch('/api/v1/config');
        const data = await res.json();
        if (data.success) {
            storeConfig = data.data;
            document.getElementById('storeName').textContent = storeConfig.store_name || 'Sovannary Store';
            document.getElementById('heroText').textContent = storeConfig.hero_text || '';
            document.title = (storeConfig.store_name || 'Sovannary Store') + ' 🏪';
        }
    } catch(e) { console.error('Config load error:', e); }
}

async function loadCategories() {
    try {
        const res = await fetch('/api/v1/categories');
        const data = await res.json();
        if (data.success) {
            allCategories = data.data;
            renderCategoryTabs();
        }
    } catch(e) { console.error('Categories load error:', e); }
}

async function loadProducts() {
    document.getElementById('loadingState').style.display = 'flex';
    try {
        const res = await fetch('/api/v1/products?active=true');
        const data = await res.json();
        if (data.success) {
            allProducts = data.data.items || [];
            renderProducts(allProducts);
            renderFeatured();
        }
    } catch(e) {
        showToast('❌ មិនអាចផ្ទុកទំនិញ');
    } finally {
        document.getElementById('loadingState').style.display = 'none';
    }
}

// ==================== RENDER ====================
function renderCategoryTabs() {
    const tabs = document.getElementById('categoryTabs');
    let html = `<button class="cat-chip active" data-cat="all" onclick="filterByCategory('all')">✨ ទាំងអស់</button>`;
    allCategories.forEach(cat => {
        html += `<button class="cat-chip" data-cat="${cat.id}" onclick="filterByCategory('${cat.id}')">${cat.icon || ''} ${cat.name}</button>`;
    });
    tabs.innerHTML = html;
}

function renderFeatured() {
    const featured = allProducts.filter(p => p.is_featured && p.stock_available > 0);
    const grid = document.getElementById('featuredGrid');
    const section = document.getElementById('featuredSection');

    if (featured.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    grid.innerHTML = featured.map(p => `
        <div class="featured-card" onclick="openModal('${p.id}')">
            <div class="featured-img" style="position:relative;">
                <img src="${getProductImage(p)}" alt="${p.name}" loading="lazy"
                    onerror="this.src='https://via.placeholder.com/400x300/7c3aed/ffffff?text=${encodeURIComponent(p.name)}'">
                <div class="featured-badge">⭐ ពិសេស</div>
            </div>
            <div class="featured-info">
                <p class="featured-name">${p.name}</p>
                <p class="featured-price">${formatPrice(p.price_amount)}</p>
            </div>
        </div>
    `).join('');
}

function renderProducts(products) {
    const grid = document.getElementById('productsGrid');
    const empty = document.getElementById('emptyState');
    const count = document.getElementById('productCount');

    count.textContent = products.length + ' ទំនិញ';

    if (products.length === 0) {
        grid.innerHTML = '';
        empty.classList.add('show');
        return;
    }

    empty.classList.remove('show');
    grid.innerHTML = products.map(p => {
        const inCart = cart.find(i => i.id === p.id);
        const qty = inCart ? inCart.qty : 0;
        const outOfStock = p.stock_available <= 0;
        const lowStock = p.stock_available <= p.stock_threshold && p.stock_available > 0;

        return `
        <div class="product-card ${outOfStock ? 'out-of-stock' : ''}">
            <div class="product-img-wrap" onclick="${outOfStock ? '' : `openModal('${p.id}')`}">
                <img src="${getProductImage(p)}" alt="${p.name}" class="product-img" loading="lazy"
                    onerror="this.src='https://via.placeholder.com/400x400/7c3aed/ffffff?text=${encodeURIComponent(p.name)}'">
                ${outOfStock ? `<div class="stock-badge out">អស់ស្តុក</div>` : ''}
                ${lowStock ? `<div class="stock-badge low">ជិតអស់</div>` : ''}
                ${p.is_featured ? `<div class="featured-star">⭐</div>` : ''}
            </div>
            <div class="product-info">
                <p class="product-name">${p.name}</p>
                <p class="product-price">${formatPrice(p.price_amount)}</p>
                ${p.pack_size && p.pack_unit ? `<p class="product-pack">${p.pack_size}${p.pack_unit}</p>` : ''}
                <div class="product-actions">
                    ${outOfStock ? 
                        `<button class="btn-add" disabled>មិនមានស្តុក</button>` :
                        qty > 0 ? `
                        <div class="qty-control">
                            <button class="qty-btn minus" onclick="changeQty('${p.id}', -1)">−</button>
                            <span class="qty-value">${qty}</span>
                            <button class="qty-btn plus" onclick="changeQty('${p.id}', 1)">+</button>
                        </div>` :
                        `<button class="btn-add" onclick="addToCart('${p.id}')">
                            <i class="fas fa-plus" style="font-size:10px;"></i> ថែមចូលកន្ត្រក
                        </button>`
                    }
                </div>
            </div>
        </div>`;
    }).join('');
}

// ==================== FILTER ====================
function filterByCategory(catID) {
    currentCategory = catID;

    document.querySelectorAll('.cat-chip').forEach(btn => {
        if (btn.dataset.cat === catID) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    applyFilters();

    const catName = catID === 'all' ? 'ទំនិញទាំងអស់' : 
        (allCategories.find(c => c.id === catID)?.name || 'ទំនិញ');
    document.getElementById('sectionTitle').innerHTML = `<span>📦</span> ${catName}`;
    document.getElementById('featuredSection').style.display = catID === 'all' ? 'block' : 'none';
}

function filterProducts() {
    searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();
    applyFilters();
}

function applyFilters() {
    let filtered = allProducts;

    if (currentCategory !== 'all') {
        filtered = filtered.filter(p => p.category_id === currentCategory);
    }

    if (searchQuery) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchQuery) || 
            (p.name_en && p.name_en.toLowerCase().includes(searchQuery))
        );
    }

    renderProducts(filtered);
}

// ==================== CART ====================
function addToCart(productID) {
    const p = allProducts.find(p => p.id === productID);
    if (!p || p.stock_available <= 0) return;

    const existing = cart.find(i => i.id === productID);
    if (existing) {
        existing.qty = Math.min(existing.qty + 1, p.stock_available);
    } else {
        cart.push({
            id: p.id,
            name: p.name,
            price: p.price_amount,
            qty: 1,
            image: getProductImage(p),
            sku: p.sku
        });
    }

    saveCart();
    updateCartBadge();
    showToast('✅ ' + p.name + ' បានបន្ថែម!');
    applyFilters();
}

function changeQty(productID, delta) {
    const item = cart.find(i => i.id === productID);
    if (!item) return;

    item.qty += delta;
    if (item.qty <= 0) {
        cart = cart.filter(i => i.id !== productID);
    }

    saveCart();
    updateCartBadge();
    renderCart();
    applyFilters();
}

function removeFromCart(productID) {
    cart = cart.filter(i => i.id !== productID);
    saveCart();
    updateCartBadge();
    renderCart();
    applyFilters();
}

function saveCart() {
    localStorage.setItem('sovannary_cart', JSON.stringify(cart));
}

function updateCartBadge() {
    const total = cart.reduce((s, i) => s + i.qty, 0);
    const badge = document.getElementById('cartBadge');
    const floatBadge = document.getElementById('floatingBadge');
    const floatBtn = document.getElementById('floatingCart');

    if (total > 0) {
        badge.textContent = total;
        badge.classList.add('show');
        floatBadge.textContent = total;
        floatBtn.classList.add('show');
    } else {
        badge.classList.remove('show');
        floatBtn.classList.remove('show');
    }
}

function renderCart() {
    const itemsContainer = document.getElementById('cartItems');
    const emptyState = document.getElementById('cartEmpty');
    const footer = document.getElementById('cartFooter');

    if (cart.length === 0) {
        itemsContainer.style.display = 'none';
        emptyState.style.display = 'flex';
        footer.style.display = 'none';
        return;
    }

    itemsContainer.style.display = 'block';
    emptyState.style.display = 'none';
    footer.style.display = 'block';

    itemsContainer.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${item.image || 'https://via.placeholder.com/100x100/7c3aed/ffffff?text=?' }" 
                alt="${item.name}" class="cart-item-img"
                onerror="this.src='https://via.placeholder.com/100x100/7c3aed/ffffff?text=?'">
            <div class="cart-item-info">
                <p class="cart-item-name">${item.name}</p>
                <p class="cart-item-price">${formatPrice(item.price)}</p>
            </div>
            <div class="cart-item-qty">
                <button class="qty-minus" onclick="changeQty('${item.id}', -1)">−</button>
                <span class="qty-num">${item.qty}</span>
                <button class="qty-plus" onclick="changeQty('${item.id}', 1)">+</button>
            </div>
        </div>
    `).join('');

    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    document.getElementById('cartTotal').textContent = formatPrice(total);
}

function openCart() {
    renderCart();
    document.getElementById('cartDrawer').classList.add('show');
    document.getElementById('cartOverlay').classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    document.getElementById('cartDrawer').classList.remove('show');
    document.getElementById('cartOverlay').classList.remove('show');
    document.body.style.overflow = '';
}

// ==================== ORDER ====================
async function orderVia(channel) {
    if (cart.length === 0) {
        showToast('❌ កន្ត្រករបស់អ្នកទទេ!');
        return;
    }

    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const note = document.getElementById('orderNote').value.trim();

    if (!name || !phone) {
        showToast('⚠️ សូមបញ្ចូលឈ្មោះ និងលេខទូរសព្ទ!');
        if (!name) document.getElementById('customerName').focus();
        else document.getElementById('customerPhone').focus();
        return;
    }

    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const itemsText = cart.map(i => `• ${i.name} x${i.qty} = ${formatPrice(i.price * i.qty)}`).join('\n');
    const orderMsg = `🛒 *ការបញ្ជាទិញថ្មី - ${storeConfig.store_name || 'Sovannary Store'}*\n\n👤 ឈ្មោះ: ${name}\n📞 ទូរសព្ទ: ${phone}\n\n📦 ទំនិញ:\n${itemsText}\n\n💰 *សរុប: ${formatPrice(total)}*${note ? '\n\n📝 កំណត់ចំណាំ: ' + note : ''}`;

    // Save order to backend
    try {
        const orderData = {
            customer_name: name,
            customer_phone: phone,
            items: cart.map(i => ({ product_id: i.id, name: i.name, qty: i.qty, price: i.price })),
            total: total,
            note: note,
            channel: channel,
            status: 'pending'
        };
        await fetch('/api/v1/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
    } catch(e) { console.error('Order save error:', e); }

    // Open channel
    if (channel === 'whatsapp') {
        const waNumber = storeConfig.whatsapp_number || '855123456789';
        window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(orderMsg)}`, '_blank');
    } else if (channel === 'telegram') {
        const tg = storeConfig.telegram_handle || 'sovannarystore';
        const tgClean = tg.replace('@', '');
        window.open(`https://t.me/${tgClean}?text=${encodeURIComponent(orderMsg)}`, '_blank');
    } else if (channel === 'facebook') {
        const fb = storeConfig.facebook_page || '';
        if (fb) {
            window.open(`https://m.me/${fb}?text=${encodeURIComponent(orderMsg)}`, '_blank');
        } else {
            showToast('⚠️ មិនបានកំណត់ទំព័រ Facebook');
            return;
        }
    } else {
        showToast('✅ ការបញ្ជាទិញបានកត់ត្រា!');
    }

    // Clear cart
    cart = [];
    saveCart();
    updateCartBadge();
    closeCart();
    document.getElementById('customerName').value = '';
    document.getElementById('customerPhone').value = '';
    document.getElementById('orderNote').value = '';
    applyFilters();
    showToast('🎉 ការបញ្ជាទិញបានបញ្ជូន!');
}

// ==================== PRODUCT MODAL ====================
function openModal(productID) {
    const p = allProducts.find(p => p.id === productID);
    if (!p) return;

    const inCart = cart.find(i => i.id === productID);
    const qty = inCart ? inCart.qty : 0;
    const outOfStock = p.stock_available <= 0;
    const lowStock = p.stock_available <= p.stock_threshold && p.stock_available > 0;

    document.getElementById('modalContent').innerHTML = `
        <img src="${getProductImage(p)}" alt="${p.name}" class="modal-img"
            onerror="this.src='https://via.placeholder.com/800x500/7c3aed/ffffff?text=${encodeURIComponent(p.name)}'">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">${p.name}</h2>
                ${p.is_featured ? '<span style="font-size:20px;">⭐</span>' : ''}
            </div>
            ${p.category_name ? `<p class="modal-category">📂 ${p.category_name}</p>` : ''}
            ${p.description ? `<p class="modal-desc">${p.description}</p>` : ''}
            <div class="modal-meta">
                <div>
                    <p class="modal-price">${formatPrice(p.price_amount)}</p>
                    ${p.pack_size && p.pack_unit ? `<p style="font-size:12px;color:#94a3b8;margin:0;">${p.pack_size} ${p.pack_unit}</p>` : ''}
                </div>
                <div style="text-align:right;">
                    <p style="font-size:12px;color:#94a3b8;margin:0;">ស្តុក</p>
                    <p class="modal-stock ${outOfStock ? 'out' : lowStock ? 'low' : 'in'}">
                        ${outOfStock ? 'អស់ស្តុក' : lowStock ? p.stock_available + ' នៅសល់ (ជិតអស់)' : p.stock_available + ' នៅសល់'}
                    </p>
                </div>
            </div>
            <div class="modal-actions">
                ${outOfStock ? 
                    `<button class="btn-add" disabled style="flex:1;">អស់ស្តុក</button>` :
                    qty > 0 ? `
                    <div class="qty-control" style="flex:1;">
                        <button class="qty-btn minus" onclick="changeQtyModal('${p.id}', -1)">−</button>
                        <span class="qty-value">${qty} ក្នុងកន្ត្រក</span>
                        <button class="qty-btn plus" onclick="changeQtyModal('${p.id}', 1)">+</button>
                    </div>` :
                    `<button class="btn-add" onclick="addToCart('${p.id}'); closeModal();" style="flex:1;">
                        🛒 ថែមចូលកន្ត្រក
                    </button>`
                }
            </div>
        </div>
    `;

    document.getElementById('modalOverlay').classList.add('show');
    document.getElementById('productModal').classList.add('show');
    document.body.style.overflow = 'hidden';
}

function changeQtyModal(productID, delta) {
    changeQty(productID, delta);
    openModal(productID);
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('show');
    document.getElementById('productModal').classList.remove('show');
    document.body.style.overflow = '';
}

// ==================== HELPERS ====================
function getProductImage(p) {
    if (p.image_url) return p.image_url;
    if (p.images && p.images.length > 0) return p.images[0];
    return `https://via.placeholder.com/400x400/7c3aed/ffffff?text=${encodeURIComponent(p.name || 'Product')}`;
}

function formatPrice(amount) {
    if (!amount) return '0 ៛';
    return amount.toLocaleString('km-KH') + ' ៛';
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
        closeCart();
    }
});
