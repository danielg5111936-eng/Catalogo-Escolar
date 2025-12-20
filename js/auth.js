// Gestión de Autenticación

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        // Verificar si el usuario ya está autenticado
        auth.onAuthStateChanged(user => {
            this.currentUser = user;
            this.handleAuthState(user);
        });

        // Configurar evento de login
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Configurar evento de logout
        const btnLogout = document.getElementById('btnLogout');
        if (btnLogout) {
            btnLogout.addEventListener('click', () => this.handleLogout());
        }
    }

    handleAuthState(user) {
        const loginContainer = document.getElementById('loginContainer');
        const adminContainer = document.getElementById('adminContainer');
        const adminUser = document.getElementById('adminUser');

        if (user) {
            // Usuario autenticado
            if (loginContainer) loginContainer.style.display = 'none';
            if (adminContainer) adminContainer.style.display = 'block';
            if (adminUser) adminUser.textContent = user.email;
        } else {
            // Usuario no autenticado
            if (loginContainer) loginContainer.style.display = 'flex';
            if (adminContainer) adminContainer.style.display = 'none';
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');

        try {
            await auth.signInWithEmailAndPassword(email, password);
            errorDiv.textContent = '';
        } catch (error) {
            console.error('Error de login:', error);
            errorDiv.textContent = this.getErrorMessage(error.code);
        }
    }

    async handleLogout() {
        try {
            await auth.signOut();
            window.location.reload();
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            utils.showToast('Error al cerrar sesión', 'error');
        }
    }

    getErrorMessage(code) {
        const messages = {
            'auth/invalid-email': 'Correo electrónico inválido',
            'auth/user-disabled': 'Usuario deshabilitado',
            'auth/user-not-found': 'Usuario no encontrado',
            'auth/wrong-password': 'Contraseña incorrecta',
            'auth/invalid-credential': 'Credenciales inválidas',
            'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde'
        };
        return messages[code] || 'Error al iniciar sesión. Verifica tus credenciales.';
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    getCurrentUser() {
        return this.currentUser;
    }
}

// Inicializar el gestor de autenticación
const authManager = new AuthManager();