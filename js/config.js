// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD_e39H7_c3MOJiddqhAxLBMVzBFqoqzXo",
  authDomain: "catalogo-escolar-44b09.firebaseapp.com",
  projectId: "catalogo-escolar-44b09",
  storageBucket: "catalogo-escolar-44b09.firebasestorage.app",
  messagingSenderId: "1080671636164",
  appId: "1:1080671636164:web:81a278666fc381ceebd791"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referencias a servicios de Firebase
const db = firebase.firestore();
const auth = firebase.auth ? firebase.auth() : null;

// ========================================
// CONFIGURACIÓN DE CLOUDINARY (GRATIS)
// ========================================
// Crea tu cuenta en: https://cloudinary.com/
// Obtén estos valores en tu Dashboard
const CLOUDINARY_CONFIG = {
    cloudName: "dcmkhqfbm",  // Lo encuentras en tu dashboard
    uploadPreset: "catalog_products"  // Lo crearás en Settings > Upload
};

// Número de WhatsApp
const WHATSAPP_NUMBER = "573128412832";

// Configuración de la aplicación
const APP_CONFIG = {
    currency: "$",
    decimals: 0,
    maxImagesPerProduct: 5
};

// ========================================
// UTILIDADES PARA CLOUDINARY
// ========================================
const imageUploader = {
    // Subir imagen a Cloudinary
    async uploadImage(file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
        formData.append('cloud_name', CLOUDINARY_CONFIG.cloudName);
        
        try {
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
                {
                    method: 'POST',
                    body: formData
                }
            );
            
            if (!response.ok) {
                throw new Error('Error al subir imagen');
            }
            
            const data = await response.json();
            return data.secure_url;  // URL de la imagen
        } catch (error) {
            console.error('Error subiendo a Cloudinary:', error);
            throw error;
        }
    },
    
    // Subir múltiples imágenes
    async uploadMultiple(files) {
        const uploadPromises = files.map(file => this.uploadImage(file));
        return Promise.all(uploadPromises);
    },
    
    // Eliminar imagen (opcional - requiere backend o API key)
    // Por seguridad, Cloudinary no permite eliminar desde el frontend sin autenticación
    // Las imágenes antiguas quedarán en tu cuenta pero no afectará el funcionamiento
    async deleteImage(url) {
        console.log('Imagen marcada para eliminación:', url);
        // Las imágenes no usadas puedes eliminarlas manualmente desde Cloudinary Dashboard
        return true;
    }
};

// ========================================
// UTILIDADES GENERALES
// ========================================
const utils = {
    formatPrice(price) {
        return `${APP_CONFIG.currency}${parseFloat(price).toLocaleString('es-CO', {
            minimumFractionDigits: APP_CONFIG.decimals,
            maximumFractionDigits: APP_CONFIG.decimals
        })}`;
    },
    
    formatWhatsAppMessage(cart, total) {
        let message = "*COTIZACIÓN DE PRODUCTOS*\n\n";
        
        cart.forEach((item, index) => {
            message += `${index + 1}. *${item.name}*\n`;
            message += `   Cantidad: ${item.quantity}\n`;
            message += `   Tipo: ${item.priceType === 'unit' ? 'Unidad' : 'Caja'}\n`;
            message += `   Precio unitario: ${utils.formatPrice(item.price)}\n`;
            message += `   Subtotal: ${utils.formatPrice(item.price * item.quantity)}\n\n`;
        });
        
        message += `*TOTAL: ${utils.formatPrice(total)}*\n\n`;
        message += "¡Gracias por su interés!";
        
        return encodeURIComponent(message);
    },
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background-color: ${type === 'error' ? '#ef4444' : '#10b981'};
            color: white;
            border-radius: 0.5rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            z-index: 3000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// Animaciones CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);