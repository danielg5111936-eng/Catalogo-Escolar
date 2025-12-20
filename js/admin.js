// Gestión del Panel de Administración

class AdminManager {
    constructor() {
        this.products = [];
        this.categories = [];
        this.currentTab = 'products';
        this.editingProduct = null;
        this.editingCategory = null;
        this.uploadedImages = [];
        this.existingImages = [];
        this.init();
    }

    init() {
        // Esperar a que el usuario esté autenticado
        auth.onAuthStateChanged(user => {
            if (user) {
                this.setupEventListeners();
                this.loadCategories();
                this.loadProducts();
            }
        });
    }

    setupEventListeners() {
        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // Productos
        document.getElementById('btnNewProduct')?.addEventListener('click', () => this.openProductForm());
        document.getElementById('btnCloseProductForm')?.addEventListener('click', () => this.closeProductForm());
        document.getElementById('btnCancelProduct')?.addEventListener('click', () => this.closeProductForm());
        document.getElementById('productForm')?.addEventListener('submit', (e) => this.saveProduct(e));
        document.getElementById('productImages')?.addEventListener('change', (e) => this.previewImages(e));

        // Categorías
        document.getElementById('btnNewCategory')?.addEventListener('click', () => this.openCategoryForm());
        document.getElementById('btnCloseCategoryForm')?.addEventListener('click', () => this.closeCategoryForm());
        document.getElementById('btnCancelCategory')?.addEventListener('click', () => this.closeCategoryForm());
        document.getElementById('categoryForm')?.addEventListener('submit', (e) => this.saveCategory(e));
    }

    switchTab(tabName) {
        this.currentTab = tabName;

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
    }

    // ===== CATEGORÍAS =====

    async loadCategories() {
        try {
            const snapshot = await db.collection('categories').get();

            // Ordenar en el cliente para evitar índices
            this.categories = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .sort((a, b) => (a.order || 0) - (b.order || 0));

            this.renderCategories();
            this.updateCategorySelect();
        } catch (error) {
            console.error('Error cargando categorías:', error);
            utils.showToast('Error al cargar categorías', 'error');
        }
    }

    renderCategories() {
        const container = document.getElementById('categoriesList');
        if (!container) return;

        if (this.categories.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No hay categorías creadas</p>';
            return;
        }

        container.innerHTML = this.categories.map(category => `
            <div class="category-item">
                <div class="item-info">
                    <div class="item-name">${category.name}</div>
                    <div class="item-details">Orden: ${category.order}</div>
                </div>
                <div class="item-actions">
                    <button class="btn-secondary" onclick="adminManager.editCategory('${category.id}')">Editar</button>
                    <button class="btn-danger" onclick="adminManager.deleteCategory('${category.id}')">Eliminar</button>
                </div>
            </div>
        `).join('');
    }

    updateCategorySelect() {
        const select = document.getElementById('productCategory');
        if (!select) return;

        const currentValue = select.value;
        select.innerHTML = '<option value="">Seleccionar categoría</option>';

        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });

        if (currentValue) {
            select.value = currentValue;
        }
    }

    openCategoryForm(category = null) {
        this.editingCategory = category;
        const modal = document.getElementById('categoryFormModal');
        const title = document.getElementById('categoryFormTitle');
        const form = document.getElementById('categoryForm');

        if (!modal || !form) return;

        title.textContent = category ? 'Editar Categoría' : 'Nueva Categoría';

        if (category) {
            document.getElementById('categoryId').value = category.id;
            document.getElementById('categoryName').value = category.name;
            document.getElementById('categoryOrder').value = category.order || 0;
        } else {
            form.reset();
            document.getElementById('categoryId').value = '';
        }

        modal.classList.add('open');
    }

    closeCategoryForm() {
        const modal = document.getElementById('categoryFormModal');
        const form = document.getElementById('categoryForm');
        
        if (modal) modal.classList.remove('open');
        if (form) form.reset();
        this.editingCategory = null;
    }

    async saveCategory(e) {
        e.preventDefault();

        const id = document.getElementById('categoryId').value;
        const data = {
            name: document.getElementById('categoryName').value,
            order: parseInt(document.getElementById('categoryOrder').value) || 0
        };

        try {
            if (id) {
                await db.collection('categories').doc(id).update(data);
                utils.showToast('Categoría actualizada correctamente', 'success');
            } else {
                await db.collection('categories').add(data);
                utils.showToast('Categoría creada correctamente', 'success');
            }

            this.closeCategoryForm();
            this.loadCategories();
        } catch (error) {
            console.error('Error guardando categoría:', error);
            utils.showToast('Error al guardar la categoría', 'error');
        }
    }

    editCategory(id) {
        const category = this.categories.find(c => c.id === id);
        if (category) {
            this.openCategoryForm(category);
        }
    }

    async deleteCategory(id) {
        if (!confirm('¿Estás seguro de eliminar esta categoría? Los productos con esta categoría quedarán sin categorizar.')) {
            return;
        }

        try {
            await db.collection('categories').doc(id).delete();
            utils.showToast('Categoría eliminada correctamente', 'success');
            this.loadCategories();
        } catch (error) {
            console.error('Error eliminando categoría:', error);
            utils.showToast('Error al eliminar la categoría', 'error');
        }
    }

    // ===== PRODUCTOS =====

    async loadProducts() {
        try {
            const snapshot = await db.collection('products').get();

            // Ordenar en el cliente para evitar índices
            this.products = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .sort((a, b) => a.name.localeCompare(b.name));

            this.renderProducts();
        } catch (error) {
            console.error('Error cargando productos:', error);
            utils.showToast('Error al cargar productos', 'error');
        }
    }

    renderProducts() {
        const container = document.getElementById('productsList');
        if (!container) return;

        if (this.products.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No hay productos creados</p>';
            return;
        }

        container.innerHTML = this.products.map(product => {
            const category = this.categories.find(c => c.id === product.categoryId);
            const categoryName = category ? category.name : 'Sin categoría';
            const hasBoxPrice = product.priceBox && product.priceBox > 0;

            return `
                <div class="product-item">
                    <div class="item-info">
                        <div class="item-name">${product.name}</div>
                        <div class="item-details">
                            Categoría: ${categoryName} | 
                            Precio unidad: ${utils.formatPrice(product.priceUnit)}
                            ${hasBoxPrice ? ` | Precio caja: ${utils.formatPrice(product.priceBox)}` : ''} | 
                            ${product.active ? '✅ Activo' : '❌ Inactivo'}
                        </div>
                    </div>
                    <div class="item-actions">
                        <button class="btn-secondary" onclick="adminManager.editProduct('${product.id}')">Editar</button>
                        <button class="btn-danger" onclick="adminManager.deleteProduct('${product.id}')">Eliminar</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    openProductForm(product = null) {
        this.editingProduct = product;
        this.uploadedImages = [];
        this.existingImages = product?.images || [];

        const modal = document.getElementById('productFormModal');
        const title = document.getElementById('productFormTitle');
        const form = document.getElementById('productForm');

        if (!modal || !form) return;

        title.textContent = product ? 'Editar Producto' : 'Nuevo Producto';

        if (product) {
            document.getElementById('productId').value = product.id;
            document.getElementById('productName').value = product.name;
            document.getElementById('productSku').value = product.sku || '';
            document.getElementById('productDescription').value = product.description || '';
            document.getElementById('productCategory').value = product.categoryId || '';
            document.getElementById('productStock').value = product.stock || 0;
            document.getElementById('productPriceUnit').value = product.priceUnit;
            document.getElementById('productPriceBox').value = product.priceBox || '';
            document.getElementById('productUnitsPerBox').value = product.unitsPerBox || '';
            document.getElementById('productActive').checked = product.active !== false;
            
            this.renderExistingImages();
        } else {
            form.reset();
            document.getElementById('productId').value = '';
            document.getElementById('productActive').checked = true;
            document.getElementById('imagePreview').innerHTML = '';
        }

        modal.classList.add('open');
    }

    closeProductForm() {
        const modal = document.getElementById('productFormModal');
        const form = document.getElementById('productForm');
        
        if (modal) modal.classList.remove('open');
        if (form) form.reset();
        
        this.editingProduct = null;
        this.uploadedImages = [];
        this.existingImages = [];
        document.getElementById('imagePreview').innerHTML = '';
    }

    previewImages(e) {
        const files = Array.from(e.target.files);
        const preview = document.getElementById('imagePreview');
        
        if (files.length + this.existingImages.length > APP_CONFIG.maxImagesPerProduct) {
            utils.showToast(`Máximo ${APP_CONFIG.maxImagesPerProduct} imágenes por producto`, 'error');
            e.target.value = '';
            return;
        }

        this.uploadedImages = files;
        preview.innerHTML = '';
        
        // Primero mostrar imágenes existentes
        this.renderExistingImages();
        
        // Luego mostrar nuevas imágenes
        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const div = document.createElement('div');
                div.className = 'preview-item';
                div.innerHTML = `
                    <img src="${event.target.result}" class="preview-image">
                    <button type="button" class="preview-remove" onclick="adminManager.removeNewImage(${index})">&times;</button>
                `;
                preview.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
    }

    renderExistingImages() {
        const preview = document.getElementById('imagePreview');

        this.existingImages.forEach((url, index) => {
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.innerHTML = `
                <img src="${url}" class="preview-image">
                <button type="button" class="preview-remove" onclick="adminManager.removeExistingImage(${index})">&times;</button>
            `;
            preview.appendChild(div);
        });
    }

    removeNewImage(index) {
        this.uploadedImages.splice(index, 1);
        const fileInput = document.getElementById('productImages');
        const dt = new DataTransfer();
        this.uploadedImages.forEach(file => dt.items.add(file));
        fileInput.files = dt.files;
        
        this.previewImages({ target: fileInput });
    }

    removeExistingImage(index) {
        this.existingImages.splice(index, 1);
        this.renderExistingImages();
    }

    async uploadImages() {
        const urls = [...this.existingImages];

        if (this.uploadedImages.length > 0) {
            try {
                // Mostrar mensaje de progreso
                utils.showToast('Subiendo imágenes...', 'info');
                
                // Subir imágenes a Cloudinary
                const newUrls = await imageUploader.uploadMultiple(this.uploadedImages);
                urls.push(...newUrls);
                
            } catch (error) {
                console.error('Error subiendo imágenes:', error);
                throw new Error('Error al subir las imágenes');
            }
        }

        return urls;
    }

    async saveProduct(e) {
        e.preventDefault();

        const id = document.getElementById('productId').value;
        const priceBox = parseFloat(document.getElementById('productPriceBox').value) || null;
        
        try {
            // Subir imágenes
            const images = await this.uploadImages();

            const data = {
                name: document.getElementById('productName').value,
                sku: document.getElementById('productSku').value || null,
                description: document.getElementById('productDescription').value || null,
                categoryId: document.getElementById('productCategory').value,
                stock: parseInt(document.getElementById('productStock').value) || 0,
                priceUnit: parseFloat(document.getElementById('productPriceUnit').value),
                priceBox: priceBox,
                unitsPerBox: priceBox ? parseInt(document.getElementById('productUnitsPerBox').value) || null : null,
                active: document.getElementById('productActive').checked,
                images: images,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (id) {
                await db.collection('products').doc(id).update(data);
                utils.showToast('Producto actualizado correctamente', 'success');
            } else {
                data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('products').add(data);
                utils.showToast('Producto creado correctamente', 'success');
            }

            this.closeProductForm();
            this.loadProducts();
        } catch (error) {
            console.error('Error guardando producto:', error);
            utils.showToast('Error al guardar el producto', 'error');
        }
    }

    editProduct(id) {
        const product = this.products.find(p => p.id === id);
        if (product) {
            this.openProductForm(product);
        }
    }

    async deleteProduct(id) {
        if (!confirm('¿Estás seguro de eliminar este producto?')) {
            return;
        }

        try {
            // Nota: Las imágenes en Cloudinary se pueden eliminar manualmente desde el dashboard
            // o configurar auto-limpieza en Cloudinary
            
            await db.collection('products').doc(id).delete();
            utils.showToast('Producto eliminado correctamente', 'success');
            this.loadProducts();
        } catch (error) {
            console.error('Error eliminando producto:', error);
            utils.showToast('Error al eliminar el producto', 'error');
        }
    }
}

// Inicializar el gestor de administración
let adminManager;
document.addEventListener('DOMContentLoaded', () => {
    adminManager = new AdminManager();
});