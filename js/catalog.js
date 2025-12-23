// Gestión del Catálogo de Productos

class CatalogManager {
    constructor() {
        this.products = [];
        this.categories = [];
        this.cart = []; // Carrito vacío al iniciar
        this.currentCategory = 'all';
        this.searchQuery = '';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadCategories();
        this.loadProducts();
        this.updateCartUI();
    }

    setupEventListeners() {
        // Búsqueda
        const btnSearch = document.getElementById('btnSearch');
        const searchBar = document.getElementById('searchBar');
        const searchInput = document.getElementById('searchInput');

        btnSearch?.addEventListener('click', () => {
            searchBar.style.display = searchBar.style.display === 'none' ? 'block' : 'none';
            if (searchBar.style.display === 'block') {
                searchInput.focus();
            }
        });

        searchInput?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.filterProducts();
        });

        // Carrito
        const btnCart = document.getElementById('btnCart');
        const btnCloseCart = document.getElementById('btnCloseCart');
        const cartOverlay = document.getElementById('cartOverlay');
        const btnWhatsApp = document.getElementById('btnWhatsApp');

        btnCart?.addEventListener('click', () => this.openCart());
        btnCloseCart?.addEventListener('click', () => this.closeCart());
        cartOverlay?.addEventListener('click', () => this.closeCart());
        btnWhatsApp?.addEventListener('click', () => this.sendToWhatsApp());

        // Modal
        const btnCloseModal = document.getElementById('btnCloseModal');
        const productModal = document.getElementById('productModal');

        btnCloseModal?.addEventListener('click', () => this.closeModal());
        productModal?.addEventListener('click', (e) => {
            if (e.target === productModal) this.closeModal();
        });
    }

    async loadCategories() {
        try {
            const snapshot = await db.collection('categories')
                .orderBy('order', 'asc')
                .get();

            this.categories = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            this.renderCategories();
        } catch (error) {
            console.error('Error cargando categorías:', error);
        }
    }

    renderCategories() {
        const container = document.getElementById('categoriesFilter');
        if (!container) return;

        // Botón "Todos" siempre primero
        container.innerHTML = '<button class="category-btn active" data-category="all">Todos</button>';

        this.categories.forEach(category => {
            const btn = document.createElement('button');
            btn.className = 'category-btn';
            btn.textContent = category.name;
            btn.dataset.category = category.id;
            btn.addEventListener('click', () => this.selectCategory(category.id, btn));
            container.appendChild(btn);
        });

        // Agregar listener al botón "Todos"
        const btnTodos = container.querySelector('[data-category="all"]');
        if (btnTodos) {
            btnTodos.addEventListener('click', () => this.selectCategory('all', btnTodos));
        }
    }

    selectCategory(categoryId, btnElement) {
        this.currentCategory = categoryId;
        
        // Actualizar UI de botones
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        btnElement.classList.add('active');

        this.filterProducts();
    }

    async loadProducts() {
        const loading = document.getElementById('loading');
        const productsGrid = document.getElementById('productsGrid');
        
        if (loading) loading.style.display = 'block';
        if (productsGrid) productsGrid.innerHTML = '';

        try {
            // Cargar todos los productos sin filtro ni ordenamiento
            const snapshot = await db.collection('products').get();

            // Filtrar y ordenar en el cliente
            this.products = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .filter(product => product.active !== false)
                .sort((a, b) => a.name.localeCompare(b.name));

            this.filterProducts();
        } catch (error) {
            console.error('Error cargando productos:', error);
            utils.showToast('Error al cargar productos', 'error');
        } finally {
            if (loading) loading.style.display = 'none';
        }
    }

    filterProducts() {
        let filtered = this.products;

        // Filtrar por categoría
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(p => p.categoryId === this.currentCategory);
        }

        // Filtrar por búsqueda
        if (this.searchQuery) {
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(this.searchQuery) ||
                (p.description && p.description.toLowerCase().includes(this.searchQuery)) ||
                (p.sku && p.sku.toLowerCase().includes(this.searchQuery))
            );
        }

        this.renderProducts(filtered);
    }

    renderProducts(products) {
        const container = document.getElementById('productsGrid');
        const emptyState = document.getElementById('emptyState');

        if (!container) return;

        container.innerHTML = '';

        if (products.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        products.forEach(product => {
            const card = this.createProductCard(product);
            container.appendChild(card);
        });
    }

    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';

        const imageUrl = product.images && product.images.length > 0 
            ? product.images[0] 
            : 'https://via.placeholder.com/300x250?text=Sin+Imagen';

        const hasBoxPrice = product.priceBox && product.priceBox > 0;

        card.innerHTML = `
            <img src="${imageUrl}" alt="${product.name}" class="product-image" onerror="this.src='https://via.placeholder.com/300x250?text=Sin+Imagen'">
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                ${product.description ? `<p class="product-description">${product.description}</p>` : ''}
                <div class="product-prices">
                    <div class="price-item">
                        <span class="price-label">Precio:</span>
                        <span class="price-value">${utils.formatPrice(product.priceUnit)}</span>
                    </div>
                    ${hasBoxPrice ? `
                        <div class="price-item">
                            <span class="price-label">Por caja (${product.unitsPerBox || 0} uds):</span>
                            <span class="price-value">${utils.formatPrice(product.priceBox)}</span>
                        </div>
                    ` : ''}
                </div>
                <button class="btn-add-cart">Ver Detalles</button>
            </div>
        `;

        card.querySelector('.btn-add-cart').addEventListener('click', (e) => {
            e.stopPropagation();
            this.showProductModal(product);
        });

        return card;
    }

    showProductModal(product) {
        const modal = document.getElementById('productModal');
        const modalBody = document.getElementById('modalBody');

        if (!modal || !modalBody) return;

        const hasBoxPrice = product.priceBox && product.priceBox > 0;
        const images = product.images && product.images.length > 0 
            ? product.images 
            : ['https://via.placeholder.com/300x250?text=Sin+Imagen'];

        modalBody.innerHTML = `
            <h2>${product.name}</h2>
            ${product.sku ? `<p style="color: var(--text-secondary); margin-bottom: 1rem;">SKU: ${product.sku}</p>` : ''}
            
            <div class="modal-images">
                ${images.map(img => `
                    <img src="${img}" alt="${product.name}" class="modal-image" onerror="this.src='https://via.placeholder.com/300x250?text=Sin+Imagen'">
                `).join('')}
            </div>

            ${product.description ? `<p style="margin-bottom: 1.5rem;">${product.description}</p>` : ''}

            <div class="price-selector">
                <h3>${hasBoxPrice ? 'Selecciona el tipo de compra:' : 'Precio:'}</h3>
                <div class="price-options">
                    <div class="price-option selected" data-type="unit" data-price="${product.priceUnit}">
                        <span class="price-option-label">${hasBoxPrice ? 'Por Unidad' : 'Precio Unitario'}</span>
                        <span class="price-option-value">${utils.formatPrice(product.priceUnit)}</span>
                    </div>
                    ${hasBoxPrice ? `
                        <div class="price-option" data-type="box" data-price="${product.priceBox}">
                            <span class="price-option-label">Por Caja (${product.unitsPerBox || 0} uds)</span>
                            <span class="price-option-value">${utils.formatPrice(product.priceBox)}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="quantity-control" style="justify-content: center; margin: 1.5rem 0;">
                    <button type="button" id="decreaseQty">-</button>
                    <span id="modalQuantity">1</span>
                    <button type="button" id="increaseQty">+</button>
                </div>

                <button class="btn-add-cart" id="btnAddToCart" style="width: 100%;">
                    Agregar a Cotización
                </button>
            </div>
        `;

        // Setup price selection solo si hay precio por caja
        const priceOptions = modalBody.querySelectorAll('.price-option');
        let selectedType = 'unit';
        let selectedPrice = product.priceUnit;

        if (hasBoxPrice) {
            priceOptions.forEach(option => {
                option.addEventListener('click', () => {
                    priceOptions.forEach(opt => opt.classList.remove('selected'));
                    option.classList.add('selected');
                    selectedType = option.dataset.type;
                    selectedPrice = parseFloat(option.dataset.price);
                });
            });
        }

        // Setup quantity controls
        let quantity = 1;
        const qtyDisplay = modalBody.querySelector('#modalQuantity');
        const decreaseBtn = modalBody.querySelector('#decreaseQty');
        const increaseBtn = modalBody.querySelector('#increaseQty');

        decreaseBtn.addEventListener('click', () => {
            if (quantity > 1) {
                quantity--;
                qtyDisplay.textContent = quantity;
            }
        });

        increaseBtn.addEventListener('click', () => {
            quantity++;
            qtyDisplay.textContent = quantity;
        });

        // Setup add to cart
        const btnAddToCart = modalBody.querySelector('#btnAddToCart');
        btnAddToCart.addEventListener('click', () => {
            this.addToCart(product, quantity, selectedType, selectedPrice);
            this.closeModal();
        });

        modal.classList.add('open');
    }

    closeModal() {
        const modal = document.getElementById('productModal');
        if (modal) modal.classList.remove('open');
    }

    addToCart(product, quantity, priceType, price) {
        const existingIndex = this.cart.findIndex(item => 
            item.id === product.id && item.priceType === priceType
        );

        if (existingIndex > -1) {
            this.cart[existingIndex].quantity += quantity;
        } else {
            this.cart.push({
                id: product.id,
                name: product.name,
                price: price,
                priceType: priceType,
                quantity: quantity,
                image: product.images && product.images[0] || ''
            });
        }

        this.updateCartUI();
        utils.showToast(`Producto agregado a la cotización (${this.cart.reduce((sum, item) => sum + item.quantity, 0)})`, 'success');
    }

    removeFromCart(index) {
        this.cart.splice(index, 1);
        this.updateCartUI();
    }

    updateQuantity(index, newQuantity) {
        if (newQuantity <= 0) {
            this.removeFromCart(index);
        } else {
            this.cart[index].quantity = newQuantity;
            this.updateCartUI();
        }
    }

    updateCartUI() {
        const cartCount = document.getElementById('cartCount');
        const cartContent = document.getElementById('cartContent');
        const totalAmount = document.getElementById('totalAmount');

        const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        if (cartCount) {
            cartCount.textContent = totalItems;
            cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
        }

        if (totalAmount) {
            totalAmount.textContent = utils.formatPrice(total);
        }

        if (cartContent) {
            if (this.cart.length === 0) {
                cartContent.innerHTML = '<div class="empty-cart"><p>Tu cotización está vacía</p></div>';
            } else {
                cartContent.innerHTML = this.cart.map((item, index) => `
                    <div class="cart-item">
                        <div class="cart-item-header">
                            <span class="cart-item-name">${item.name}</span>
                            <button class="btn-remove" onclick="catalogManager.removeFromCart(${index})">&times;</button>
                        </div>
                        <div class="cart-item-details">
                            Tipo: ${item.priceType === 'unit' ? 'Unidad' : 'Caja'} - ${utils.formatPrice(item.price)} c/u
                        </div>
                        <div class="cart-item-controls">
                            <div class="quantity-control">
                                <button onclick="catalogManager.updateQuantity(${index}, ${item.quantity - 1})">-</button>
                                <span>${item.quantity}</span>
                                <button onclick="catalogManager.updateQuantity(${index}, ${item.quantity + 1})">+</button>
                            </div>
                            <span class="cart-item-price">${utils.formatPrice(item.price * item.quantity)}</span>
                        </div>
                    </div>
                `).join('');
            }
        }
    }

    openCart() {
        const sidebar = document.getElementById('cartSidebar');
        const overlay = document.getElementById('cartOverlay');
        
        if (sidebar) sidebar.classList.add('open');
        if (overlay) overlay.classList.add('open');
    }

    closeCart() {
        const sidebar = document.getElementById('cartSidebar');
        const overlay = document.getElementById('cartOverlay');
        
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
    }

    sendToWhatsApp() {
        if (this.cart.length === 0) {
            utils.showToast('La cotización está vacía', 'error');
            return;
        }

        const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const message = utils.formatWhatsAppMessage(this.cart, total);
        const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
        
        window.open(url, '_blank');
        
        // Limpiar carrito después de enviar
        this.cart = [];
        this.updateCartUI();
        this.closeCart();
        utils.showToast('Cotización enviada. El carrito se ha limpiado.', 'success');
    }
}

// Inicializar el gestor del catálogo cuando el DOM esté listo
let catalogManager;
document.addEventListener('DOMContentLoaded', () => {
    catalogManager = new CatalogManager();
});