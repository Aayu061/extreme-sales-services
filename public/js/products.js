// frontend/js/products.js

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:')
    ? 'http://localhost:5000'
    : (window.location.hostname.endsWith('github.io')
        ? 'https://extreme-sales-services.onrender.com'
        : window.location.origin);
const API_URL = `${API_BASE}/api/products`;
const ENQUIRY_URL = `${API_BASE}/api/enquiries`;

const productGrid = document.getElementById('productGrid');
let allProducts = [];
let activeCategory = 'all';
let productPriceRange = { min: 0, max: 100000 };

// ------ FETCH & RENDER ------ //

async function loadProducts() {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        
        if (data.success) {
            allProducts = data.products;
            updatePriceRange(allProducts);
            renderProducts(allProducts);
        } else {
            productGrid.innerHTML = `<div class="col-span-full text-center text-red-500 py-12">Failed to load marketplace.</div>`;
        }
    } catch (error) {
        console.error(error);
        productGrid.innerHTML = `<div class="col-span-full text-center text-gray-500 py-12">Unable to connect to server.</div>`;
    }
}

// ─── Compare State ─────────────────────────────────────────────
let compareList = [];

function toggleCompare(productId, encodedData) {
    const btn = document.getElementById(`cmp-${productId}`);
    const idx = compareList.findIndex(x => x.id === productId);
    if (idx > -1) {
        compareList.splice(idx, 1);
        if (btn) btn.classList.remove('selected');
    } else {
        if (compareList.length >= 2) {
            if (window.showToast) window.showToast('You can compare only 2 products at a time.', 'warning');
            return;
        }
        compareList.push(JSON.parse(decodeURIComponent(encodedData)));
        if (btn) btn.classList.add('selected');
    }
    updateComparePanel();
}

function updateComparePanel() {
    let panel = document.getElementById('comparePanel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'comparePanel';
        document.body.appendChild(panel);
    }
    if (compareList.length === 0) {
        panel.classList.remove('visible');
        return;
    }
    panel.classList.add('visible');
    const items = compareList.map(p => `<div class="flex items-center gap-2">
        <img src="${p.image_url}" class="w-10 h-10 object-contain rounded-lg border" onerror="this.src='https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=100&q=60'">
        <div><div class="text-xs font-bold text-slate-800 max-w-[140px] truncate">${p.name}</div><div class="text-blue-600 font-black text-sm">₹${p.price}</div></div>
    </div>`).join('<div class="text-slate-400 font-black text-xl">vs</div>');
    panel.innerHTML = `<div class="flex items-center gap-4 max-w-6xl mx-auto flex-wrap">
        <span class="text-xs font-extrabold uppercase tracking-widest text-slate-500">Compare (${compareList.length}/2)</span>
        ${items}
        ${compareList.length === 2
            ? `<button onclick="showCompareFull()" class="ml-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2 rounded-xl text-sm transition">Compare Now →</button>`
            : `<span class="ml-auto text-xs text-slate-400">Select 1 more to compare</span>`}
        <button onclick="clearCompare()" class="text-slate-400 hover:text-slate-700 font-bold text-xs">✕ Clear</button>
    </div>`;
}

function clearCompare() {
    compareList = [];
    document.querySelectorAll('.compare-btn').forEach(b => b.classList.remove('selected'));
    updateComparePanel();
}

function showCompareFull() {
    if (compareList.length < 2) return;
    const [a, b] = compareList;
    const emiA = Math.round(a.price / 12);
    const emiB = Math.round(b.price / 12);
    const win = document.createElement('div');
    win.className = 'fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4';
    win.innerHTML = `
        <div class="bg-white rounded-3xl max-w-3xl w-full p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-xl font-black text-slate-900">Product Comparison</h2>
                <button onclick="this.closest('.fixed').remove()" class="text-slate-400 hover:text-slate-700 font-bold text-lg">✕</button>
            </div>
            <div class="grid grid-cols-2 gap-6">
                ${[a, b].map(p => `
                <div class="text-center border border-slate-100 rounded-2xl p-5">
                    <img src="${p.image_url}" class="h-28 object-contain mx-auto mb-3" onerror="this.src='https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=200'">
                    <h3 class="font-black text-slate-900 text-sm mb-1">${p.name}</h3>
                    <p class="text-blue-600 font-black text-xl mb-1">₹${Number(p.price).toLocaleString('en-IN')}</p>
                    <p class="text-indigo-500 text-xs font-semibold">EMI from ₹${Math.round(p.price/12).toLocaleString('en-IN')}/mo</p>
                    <p class="text-slate-500 text-xs mt-2 leading-relaxed">${p.description || ''}</p>
                    <button onclick="openModal('${encodeURIComponent(JSON.stringify(p))}')" class="mt-4 bg-blue-600 text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-blue-500 transition">Enquire Now</button>
                </div>`).join('')}
            </div>
        </div>`;
    document.body.appendChild(win);
    win.addEventListener('click', e => { if (e.target === win) win.remove(); });
}

function renderProducts(productsArray) {
    productGrid.innerHTML = '';

    // Update result count
    const countEl = document.getElementById('resultCount');
    if (countEl) countEl.textContent = productsArray.length + ' item' + (productsArray.length !== 1 ? 's' : '');

    if (productsArray.length === 0) {
        productGrid.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-20 text-center">
                <div class="text-6xl mb-4">🔍</div>
                <h3 class="font-black text-slate-700 text-xl mb-2">No Products Found</h3>
                <p class="text-slate-500 text-sm mb-6">Try adjusting your filters or search term.</p>
                <button onclick="clearFilters()" class="bg-blue-600 text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-blue-500 transition">Clear Filters</button>
            </div>`;
        return;
    }

    if (productPriceRange.min === 0 && productPriceRange.max === 100000 && productsArray.length > 0) {
        updatePriceRange(productsArray);
    }

    productsArray.forEach(p => {
        const card = document.createElement('div');
        card.className = 'bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 relative flex flex-col group';

        const catMap = { new_ac: ['Brand New','bg-emerald-500'], used_ac: ['Certified 2nd Hand','bg-purple-500'], spare_part: ['Genuine Spare','bg-orange-500'] };
        const [badgeLabel, badgeClass] = catMap[p.category] || ['Item','bg-gray-400'];

        const stockVal  = p.stock ?? p.quantity ?? 10;
        const isLowStock = Number(stockVal) <= 3;
        const encodedData = encodeURIComponent(JSON.stringify(p));
        const emi12 = Math.round(p.price / 12);

        card.innerHTML = `
            <div class="product-img-wrap h-48 bg-gray-50 flex items-center justify-center p-4">
                <img src="${p.image_url}" alt="${p.name}"
                    onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80';"
                    class="h-full object-contain transition-transform duration-500">
                <span class="absolute top-3 left-3 ${badgeClass} text-white text-[10px] uppercase font-extrabold px-2.5 py-1 rounded-full tracking-wide shadow">${badgeLabel}</span>
                ${isLowStock ? `<span class="stock-low-badge">⚠ Only ${stockVal} left!</span>` : ''}
            </div>
            <div class="p-5 flex flex-col flex-1 border-t border-gray-50">
                <h3 class="font-bold text-gray-800 text-base leading-tight mb-1">${p.name}</h3>
                <p class="text-xs text-gray-500 mb-2 line-clamp-2 flex-1">${p.description || p.category.replace('_',' ')}</p>
                <div class="mb-3">
                    <p class="text-xl font-black text-blue-600">₹${Number(p.price).toLocaleString('en-IN')}</p>
                    <span class="emi-label">EMI from ₹${emi12.toLocaleString('en-IN')}/mo</span>
                </div>
                <div class="flex items-center gap-2 mt-auto flex-wrap">
                    <button onclick="openModal('${encodedData}')" class="flex-1 bg-blue-600 text-white hover:bg-blue-700 px-3 py-2 rounded-xl font-bold transition text-xs">
                        Enquire Now
                    </button>
                    <button id="cmp-${p.id}" onclick="toggleCompare('${p.id}', '${encodedData}')" class="compare-btn">
                        ⚖ Compare
                    </button>
                </div>
            </div>`;
        productGrid.appendChild(card);

        // Re-apply compare selection state
        if (compareList.find(x => x.id === p.id)) {
            const btn = document.getElementById(`cmp-${p.id}`);
            if (btn) btn.classList.add('selected');
        }
    });
}

// ------ FILTER, SEARCH, SORT ------ //

function applyFilters() {
    const searchTerm = document.getElementById('productSearch')?.value.trim().toLowerCase() || '';
    const sortMode = document.getElementById('productSort')?.value || 'default';

    let filtered = allProducts;

    if (activeCategory !== 'all') {
        filtered = filtered.filter((p) => p.category === activeCategory);
    }

    if (searchTerm) {
        filtered = filtered.filter((p) => {
            return p.name.toLowerCase().includes(searchTerm) || (p.description || '').toLowerCase().includes(searchTerm) || p.category.toLowerCase().includes(searchTerm);
        });
    }

    const minPrice = Number(document.getElementById('minPrice')?.value || 0);
    const maxPrice = Number(document.getElementById('maxPrice')?.value || 0);
    const inStockOnly = document.getElementById('inStockOnly')?.checked || false;

    if (minPrice > 0) {
        filtered = filtered.filter((p) => Number(p.price) >= minPrice);
    }
    if (maxPrice > 0) {
        filtered = filtered.filter((p) => Number(p.price) <= maxPrice);
    }

    // ensure bounds make sense
    if (minPrice > 0 && maxPrice > 0 && minPrice > maxPrice) {
        filtered = [];
    }

    if (inStockOnly) {
        filtered = filtered.filter((p) => {
            if (p.stock === undefined && p.quantity === undefined && p.availability === undefined) return true;
            const stockValue = p.stock ?? p.quantity ?? p.availability;
            return Number(stockValue) > 0;
        });
    }

    if (sortMode === 'price_asc') {
        filtered = filtered.slice().sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortMode === 'price_desc') {
        filtered = filtered.slice().sort((a, b) => Number(b.price) - Number(a.price));
    }

    renderProducts(filtered);
}

// Attach filtering events
const searchInput = document.getElementById('productSearch');
const sortSelect = document.getElementById('productSort');
const minPriceInput = document.getElementById('minPrice');
const maxPriceInput = document.getElementById('maxPrice');
const inStockCheckbox = document.getElementById('inStockOnly');

if (searchInput) searchInput.addEventListener('input', applyFilters);
if (sortSelect) sortSelect.addEventListener('change', applyFilters);
if (minPriceInput) {
    minPriceInput.addEventListener('input', () => {
        document.getElementById('minPriceValue').innerText = minPriceInput.value;
        applyFilters();
    });
}
if (maxPriceInput) {
    maxPriceInput.addEventListener('input', () => {
        document.getElementById('maxPriceValue').innerText = maxPriceInput.value;
        applyFilters();
    });
}
if (inStockCheckbox) inStockCheckbox.addEventListener('change', applyFilters);

// ------ CATEGORY FILTERING ------ //

function filterCategory(cat, btnElement) {
    // Styling toggle
    const buttons = document.querySelectorAll('.cat-btn');
    buttons.forEach(btn => {
        btn.classList.remove('bg-white', 'text-blue-600', 'shadow-md', 'scale-105');
        btn.classList.add('bg-blue-500', 'text-white', 'shadow-inner', 'border', 'border-blue-400');
    });

    btnElement.classList.add('bg-white', 'text-blue-600', 'shadow-md', 'scale-105');
    btnElement.classList.remove('bg-blue-500', 'text-white', 'shadow-inner', 'border', 'border-blue-400');

    // Implementation
    activeCategory = cat;
    applyFilters();
}

function clearFilters() {
    activeCategory = 'all';
    document.getElementById('productSearch').value = '';
    document.getElementById('productSort').value = 'default';
    const minPriceInput = document.getElementById('minPrice');
    const maxPriceInput = document.getElementById('maxPrice');
    const minPriceLabel = document.getElementById('minPriceValue');
    const maxPriceLabel = document.getElementById('maxPriceValue');

    if (minPriceInput && maxPriceInput && minPriceLabel && maxPriceLabel) {
        minPriceInput.value = productPriceRange.min;
        maxPriceInput.value = productPriceRange.max;
        minPriceLabel.innerText = productPriceRange.min;
        maxPriceLabel.innerText = productPriceRange.max;
    }

    document.getElementById('inStockOnly').checked = false;

    const categoryBtns = document.querySelectorAll('.cat-btn');
    categoryBtns.forEach(btn => {
        btn.classList.remove('bg-white', 'text-blue-600', 'shadow-md', 'scale-105');
        btn.classList.add('bg-blue-500', 'text-white', 'shadow-inner', 'border', 'border-blue-400');
    });

    // Restore the all button styles as active
    const allBtn = [...categoryBtns].find(btn => btn.textContent.includes('All Items'));
    if (allBtn) {
        allBtn.classList.add('bg-white', 'text-blue-600', 'shadow-md', 'scale-105');
        allBtn.classList.remove('bg-blue-500', 'text-white', 'shadow-inner', 'border', 'border-blue-400');
    }

    renderProducts(allProducts);
}


// ------ FAST ENQUIRY MODAL LOGIC ------ //

const modal = document.getElementById('enquiryModal');
const modalContent = document.getElementById('modalContent');
const form = document.getElementById('enquiryForm');

function openModal(encodedData) {
    const p = JSON.parse(decodeURIComponent(encodedData));
    
    // Populate
    document.getElementById('modalProductId').value = p.id;
    document.getElementById('modalProductName').innerText = p.name;
    document.getElementById('modalProductPrice').innerText = `₹${p.price}`;
    const modalImg = document.getElementById('modalImage');
    modalImg.src = p.image_url;
    modalImg.onerror = () => {
        modalImg.src = 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80';
    };
    document.getElementById('enqSuccessMsg').classList.add('hidden'); // Reset Success label
    
    // Show Flow
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modalContent.classList.remove('scale-95');
    }, 10);
    
    // Auto-focus logic (nice UX touch)
    setTimeout(() => document.getElementById('enqName').focus(), 150);
}

function closeModal() {
    modal.classList.add('opacity-0');
    modalContent.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        form.reset(); // clear inputs
    }, 300);
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
        product_id: document.getElementById('modalProductId').value,
        product_name: document.getElementById('modalProductName').innerText,
        name: document.getElementById('enqName').value,
        phone: document.getElementById('enqPhone').value,
        message: document.getElementById('enqMessage').value
    };

    const btn = form.querySelector('button[type="submit"]');
    btn.innerText = "Sending...";
    btn.disabled = true;

    try {
        const res = await fetch(ENQUIRY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            form.reset();
            document.getElementById('enqSuccessMsg').classList.remove('hidden');
            setTimeout(closeModal, 2000);
        } else {
            alert("Something went wrong saving the enquiry.");
        }
    } catch (e) {
        alert("Network error.");
    } finally {
        btn.innerText = "Submit Enquiry";
        btn.disabled = false;
    }
});

// Close modal when clicking outside of it
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});


// ─── Filter Pill category switcher ─────────────────────────────
window.setPillFilter = function(cat, el) {
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    if (el) el.classList.add('active');
    activeCategory = cat;
    applyFilters();
};

// Initialization
loadProducts();

function updatePriceRange(productsArray) {
    if (!productsArray || productsArray.length === 0) {
        return;
    }

    const prices = productsArray
        .map((p) => Number(p.price) || 0)
        .filter((v) => !isNaN(v));

    if (prices.length === 0) {
        return;
    }

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    productPriceRange = { min: minPrice, max: maxPrice };

    const minSlider = document.getElementById('minPrice');
    const maxSlider = document.getElementById('maxPrice');
    const minValue = document.getElementById('minPriceValue');
    const maxValue = document.getElementById('maxPriceValue');

    if (minSlider && maxSlider && minValue && maxValue) {
        minSlider.min = 0;
        minSlider.max = maxPrice;
        minSlider.value = minPrice;
        minValue.innerText = minPrice;

        maxSlider.min = 0;
        maxSlider.max = maxPrice;
        maxSlider.value = maxPrice;
        maxValue.innerText = maxPrice;
    }

    // apply filters so new ranges take effect immediately
    applyFilters();
}

// ------ FILTER, SEARCH, SORT ------ //