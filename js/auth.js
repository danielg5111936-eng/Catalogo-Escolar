// Gestión de Autenticación con Auto-Logout

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.sessionTimeout = null;
        this.warningTimeout = null;
        this.SESSION_DURATION = 5 * 60 * 1000; // 5 minutos
        this.WARNING_TIME = 60 * 1000; // Avisar 1 minuto antes
        this.init();
    }

    init() {
        // Verificar si el usuario ya está autenticado
        auth.onAuthStateChanged(user => {
            this.currentUser = user;
            this.handleAuthState(user);
            
            // Iniciar temporizador si está autenticado
            if (user) {
                this.startSessionTimer();
                this.setupActivityListeners();
            }
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

    setupActivityListeners() {
        // Eventos que reinician el temporizador
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
        
        events.forEach(event => {
            document.addEventListener(event, () => {
                if (this.currentUser) {
                    this.resetSessionTimer();
                }
            });
        });
    }

    startSessionTimer() {
        // Limpiar temporizadores anteriores
        this.clearTimers();

        // Mostrar indicador de sesión
        this.showSessionIndicator();

        // Temporizador de advertencia (4 minutos)
        this.warningTimeout = setTimeout(() => {
            this.showWarning();
        }, this.SESSION_DURATION - this.WARNING_TIME);

        // Temporizador de cierre de sesión (5 minutos)
        this.sessionTimeout = setTimeout(() => {
            this.autoLogout();
        }, this.SESSION_DURATION);
    }

    resetSessionTimer() {
        this.startSessionTimer();
        this.hideWarning();
    }

    clearTimers() {
        if (this.sessionTimeout) {
            clearTimeout(this.sessionTimeout);
        }
        if (this.warningTimeout) {
            clearTimeout(this.warningTimeout);
        }
    }

    showSessionIndicator() {
        let indicator = document.getElementById('sessionTimer');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'sessionTimer';
            indicator.className = 'session-timer';
            document.body.appendChild(indicator);
        }
        
        const endTime = Date.now() + this.SESSION_DURATION;
        this.updateTimerDisplay(indicator, endTime);
        
        // Actualizar cada segundo
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        this.timerInterval = setInterval(() => {
            const remaining = endTime - Date.now();
            if (remaining <= 0) {
                clearInterval(this.timerInterval);
                return;
            }
            this.updateTimerDisplay(indicator, endTime);
        }, 1000);
    }

    updateTimerDisplay(indicator, endTime) {
        const remaining = Math.max(0, endTime - Date.now());
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        
        indicator.textContent = `Sesión: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Mostrar advertencia en el último minuto
        if (remaining <= this.WARNING_TIME) {
            indicator.classList.add('warning');
        } else {
            indicator.classList.remove('warning');
        }
    }

    showWarning() {
        utils.showToast('Tu sesión expirará en 1 minuto. Mueve el mouse para mantenerla activa.', 'warning');
    }

    hideWarning() {
        // Ocultar advertencia si existe
    }

    async autoLogout() {
        this.clearTimers();
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        utils.showToast('Sesión cerrada por inactividad', 'info');
        
        try {
            await auth.signOut();
            
            // Limpiar indicador
            const indicator = document.getElementById('sessionTimer');
            if (indicator) {
                indicator.remove();
            }
            
            // Recargar después de 2 segundos
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
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
            
            // Limpiar temporizadores
            this.clearTimers();
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }
            
            // Remover indicador
            const indicator = document.getElementById('sessionTimer');
            if (indicator) {
                indicator.remove();
            }
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
            errorDiv.classList.remove('show');
        } catch (error) {
            console.error('Error de login:', error);
            errorDiv.textContent = this.getErrorMessage(error.code);
            errorDiv.classList.add('show');
        }
    }

    async handleLogout() {
        try {
            this.clearTimers();
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }
            
            await auth.signOut();
            
            // Limpiar indicador
            const indicator = document.getElementById('sessionTimer');
            if (indicator) {
                indicator.remove();
            }
            
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