// ================================
// MAIN APPLICATION
// ================================

import { initDatabase } from './js/db.js';
import { store } from './js/store.js';
import auth from './js/auth.js';
import playersModule from './js/players.js';
import matchesModule from './js/matches.js';

import { renderDashboard } from './js/components/dashboard.js';
import { renderPlayers, renderPlayerModal } from './js/components/playerCard.js';
import { renderMatches, renderMatchModal } from './js/components/matchCard.js';
import { renderStats } from './js/components/statsView.js';
import { renderAdmin } from './js/components/admin.js';

// ================================
// DOM Elements
// ================================

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const elements = {
    loading: $('#loading'),
    authScreen: $('#auth-screen'),
    mainApp: $('#main-app'),
    mainContent: $('#main-content'),
    pageTitle: $('#page-title'),
    userRole: $('#user-role'),
    modalBackdrop: $('#modal-backdrop'),
    modalContainer: $('#modal-container'),
    toastContainer: $('#toast-container'),

    // Auth
    loginForm: $('#login-form'),
    registerForm: $('#register-form'),
    loginBtn: $('#login-btn'),
    registerBtn: $('#register-btn'),
    showRegister: $('#show-register'),
    showLogin: $('#show-login'),
    logoutBtn: $('#logout-btn'),

    // Nav
    navItems: $$('.nav-item, .nav-item-desktop'),
    adminNavItems: $$('.admin-only')
};

// ================================
// Toast Notifications
// ================================

export function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ================================
// Modal Management
// ================================

export function showModal(content) {
    elements.modalContainer.innerHTML = content;
    elements.modalBackdrop.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

export function closeModal() {
    elements.modalBackdrop.classList.add('hidden');
    elements.modalContainer.innerHTML = '';
    document.body.style.overflow = '';
}

// ================================
// Navigation
// ================================

function navigateTo(page) {
    store.setState({ currentPage: page });

    // Update nav items
    elements.navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        partite: 'Partite',
        giocatori: 'Giocatori',
        statistiche: 'Statistiche',
        admin: 'Amministrazione'
    };
    elements.pageTitle.textContent = titles[page] || 'Dashboard';

    // Render page
    renderPage(page);
}

export async function renderPage(page) {
    const state = store.getState();
    const container = elements.mainContent;

    if (!container) return;

    switch (page) {
        case 'dashboard':
            await renderDashboard(elements.mainContent, state);
            break;
        case 'partite':
            await renderMatches(elements.mainContent, state);
            break;
        case 'giocatori':
            await renderPlayers(elements.mainContent, state);
            break;
        case 'statistiche':
            await renderStats(elements.mainContent, state);
            break;
        case 'admin':
            if (store.isAdmin()) {
                await renderAdmin(elements.mainContent, state);
            } else {
                navigateTo('dashboard');
            }
            break;
        default:
            navigateTo('dashboard');
    }
}

export async function refreshCurrentPage() {
    const state = store.getState();
    await renderPage(state.currentPage || 'dashboard');
}

// ================================
// Authentication UI
// ================================

function showAuthScreen() {
    elements.loading.classList.add('hidden');
    elements.authScreen.classList.remove('hidden');
    elements.mainApp.classList.add('hidden');

    // Reset forms visibility
    elements.loginForm.classList.remove('hidden');
    elements.registerForm.classList.add('hidden');

    // Clear inputs
    const inputs = elements.authScreen.querySelectorAll('input');
    inputs.forEach(input => input.value = '');
}

function showMainApp() {
    elements.loading.classList.add('hidden');
    elements.authScreen.classList.add('hidden');
    elements.mainApp.classList.remove('hidden');

    const user = store.getState().currentUser;

    // Update UI based on role
    // Update UI based on role
    const displayName = user.soprannome || `${user.nome} ${user.cognome}`;
    elements.userRole.textContent = displayName;
    elements.userRole.className = `role-badge ${user.ruolo}`;

    // Show/hide admin nav
    elements.adminNavItems.forEach(el => {
        if (store.isAdmin()) {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });

    // Navigate to dashboard
    navigateTo('dashboard');
}

// ================================
// Event Handlers
// ================================

function setupEventListeners() {
    // Auth form switching
    elements.showRegister.addEventListener('click', (e) => {
        e.preventDefault();
        elements.loginForm.classList.add('hidden');
        elements.registerForm.classList.remove('hidden');
    });

    elements.showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        elements.registerForm.classList.add('hidden');
        elements.loginForm.classList.remove('hidden');
    });

    // Login
    elements.loginBtn.addEventListener('click', async () => {
        const username = $('#login-username').value.trim();
        const password = $('#login-password').value;

        if (!username || !password) {
            showToast('Compila tutti i campi', 'error');
            return;
        }

        elements.loginBtn.disabled = true;
        const result = await auth.login(username, password);
        elements.loginBtn.disabled = false;

        if (result.success) {
            showToast('Benvenuto!', 'success');
            showMainApp();
        } else {
            showToast(result.error, 'error');
        }
    });

    // Register
    elements.registerBtn.addEventListener('click', async () => {
        const userData = {
            nome: $('#reg-nome').value.trim(),
            cognome: $('#reg-cognome').value.trim(),
            soprannome: $('#reg-soprannome').value.trim(),
            telefono: $('#reg-telefono').value.trim(),
            data_nascita: $('#reg-data-nascita').value,
            password: $('#reg-password').value
        };

        if (!userData.nome || !userData.cognome || !userData.telefono || !userData.password || !userData.data_nascita) {
            showToast('Compila tutti i campi obbligatori', 'error');
            return;
        }

        elements.registerBtn.disabled = true;
        const result = await auth.register(userData);
        elements.registerBtn.disabled = false;

        if (result.success) {
            showToast('Registrazione completata!', 'success');
            showMainApp();
        } else {
            showToast(result.error, 'error');
        }
    });

    // Logout
    elements.logoutBtn.addEventListener('click', async () => {
        await auth.logout();
        showAuthScreen();
        showToast('Arrivederci!');
    });

    // Navigation
    elements.navItems.forEach(item => {
        item.addEventListener('click', () => {
            navigateTo(item.dataset.page);
        });
    });

    // Modal close
    elements.modalBackdrop.addEventListener('click', (e) => {
        if (e.target === elements.modalBackdrop) {
            closeModal();
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });

    // Enter key for login/register
    $('#login-password').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') elements.loginBtn.click();
    });

    $('#reg-password').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') elements.registerBtn.click();
    });
}

// ================================
// Global Event Delegation
// ================================

document.addEventListener('click', async (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const id = target.dataset.id;

    switch (action) {
        case 'view-player':
            await renderPlayerModal(id);
            break;
        case 'view-match':
            await renderMatchModal(id);
            break;
        case 'respond-convocation':
            const risposta = target.dataset.risposta;
            const matchId = target.dataset.matchId;
            await handleConvocationResponse(matchId, risposta);
            break;
        case 'close-modal':
            closeModal();
            break;
    }
});

async function handleConvocationResponse(matchId, risposta) {
    const user = store.getState().currentUser;
    if (!user) return;

    try {
        await matchesModule.respondToConvocation(matchId, user.id, risposta);
        showToast('Risposta salvata!', 'success');
        renderPage(store.getState().currentPage);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ================================
// Photo Preview (Touch/Hover)
// ================================

let photoTimeout = null;

document.addEventListener('touchstart', (e) => {
    const avatar = e.target.closest('.player-avatar[data-photo]');
    if (!avatar) return;

    photoTimeout = setTimeout(() => {
        showPhotoPreview(avatar.dataset.photo);
    }, 3000);
});

document.addEventListener('touchend', () => {
    if (photoTimeout) {
        clearTimeout(photoTimeout);
        photoTimeout = null;
    }
});

document.addEventListener('mouseover', (e) => {
    const avatar = e.target.closest('.player-avatar[data-photo]');
    if (!avatar || !avatar.dataset.photo) return;

    // Avoid duplicate overlays
    if (document.querySelector('.photo-preview-overlay')) return;

    showPhotoPreview(avatar.dataset.photo);
});

document.addEventListener('mouseout', (e) => {
    const avatar = e.target.closest('.player-avatar[data-photo]');
    if (!avatar) return;

    hidePhotoPreview();
});

function showPhotoPreview(photoUrl) {
    if (!photoUrl) return;

    // Prevent duplicate overlays
    if (document.querySelector('.photo-preview-overlay')) return;

    const overlay = document.createElement('div');
    overlay.className = 'photo-preview-overlay';
    overlay.innerHTML = `<img src="${photoUrl}" alt="Foto giocatore">`;
    overlay.addEventListener('click', hidePhotoPreview);
    document.body.appendChild(overlay);

    // Auto-hide after 2 seconds on mobile
    if ('ontouchstart' in window) {
        setTimeout(hidePhotoPreview, 2000);
    }
}

function hidePhotoPreview() {
    const overlay = document.querySelector('.photo-preview-overlay');
    if (overlay) overlay.remove();
}

// ================================
// App Initialization
// ================================

async function init() {
    try {
        // Initialize database
        await initDatabase();

        // Load initial data
        await Promise.all([
            playersModule.getAllPlayers(),
            matchesModule.getAllMatches()
        ]);

        // Try to restore session
        const user = await auth.restoreSession();

        // Setup event listeners
        setupEventListeners();

        // Show appropriate screen
        if (user) {
            showMainApp();
        } else {
            showAuthScreen();
        }

        store.setState({ isLoading: false });

    } catch (error) {
        console.error('Initialization error:', error);
        showToast('Errore durante il caricamento', 'error');
        showAuthScreen();
    }
}

// Start the app
init();
