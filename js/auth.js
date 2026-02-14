// ================================
// AUTHENTICATION MODULE
// ================================

import db from './db.js';
import { store } from './store.js';

const AUTH_KEY = 'calcetto_auth';
const COLLECTION = 'players';

// Admin credentials (hardcoded as per requirements)
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: '4444'
};

// ================================
// Session Management
// ================================

export function getSession() {
    const session = localStorage.getItem(AUTH_KEY);
    return session ? JSON.parse(session) : null;
}

export function setSession(user) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    store.setState({ currentUser: user });
}

export function clearSession() {
    localStorage.removeItem(AUTH_KEY);
    store.setState({ currentUser: null });
}

// ================================
// Authentication Functions
// ================================

export async function login(username, password) {
    // Normalize username
    const normalizedUsername = username.toLowerCase().trim();

    // Check admin login
    if (normalizedUsername === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        const adminUser = {
            id: 'admin',
            username: 'admin',
            nome: 'Amministratore',
            cognome: 'Sistema',
            ruolo: 'admin',
            isAdmin: true
        };
        setSession(adminUser);
        return { success: true, user: adminUser };
    }

    // Find user by username (nome.cognome or soprannome)
    const players = await db.getAll(COLLECTION);

    const user = players.find(p => {
        const playerUsername = `${p.nome}.${p.cognome}`.toLowerCase();
        const nickname = (p.soprannome || '').toLowerCase();
        return playerUsername === normalizedUsername || nickname === normalizedUsername;
    });

    if (!user) {
        return { success: false, error: 'Utente non trovato' };
    }

    if (user.bloccato) {
        return { success: false, error: 'Account bloccato. Contatta l\'amministratore.' };
    }

    if (user.password_numeric !== password) {
        return { success: false, error: 'Password errata' };
    }

    // Create session
    const sessionUser = {
        id: user.id,
        username: `${user.nome}.${user.cognome}`.toLowerCase(),
        nome: user.nome,
        cognome: user.cognome,
        soprannome: user.soprannome,
        ruolo: user.ruolo || 'operatore',
        foto: user.foto,
        data_nascita: user.data_nascita
    };

    setSession(sessionUser);
    return { success: true, user: sessionUser };
}

export async function register(userData) {
    // Validate required fields
    if (!userData.nome || !userData.cognome || !userData.password || !userData.telefono || !userData.data_nascita) {
        return { success: false, error: 'Compila tutti i campi obbligatori' };
    }

    // Validate password format (4 digits)
    if (!/^\d{4}$/.test(userData.password)) {
        return { success: false, error: 'La password deve essere di 4 cifre' };
    }

    // Check if username already exists
    const players = await db.getAll(COLLECTION);
    const existingUser = players.find(p =>
        `${p.nome}.${p.cognome}`.toLowerCase() === `${userData.nome}.${userData.cognome}`.toLowerCase()
    );

    if (existingUser) {
        return { success: false, error: 'Un utente con questo nome esiste già' };
    }

    // Create new player
    const newPlayer = {
        nome: userData.nome.trim(),
        cognome: userData.cognome.trim(),
        soprannome: userData.soprannome?.trim() || '',
        telefono: userData.telefono.trim(),
        email: userData.email?.trim() || '',
        password_numeric: userData.password,
        ruolo: 'operatore', // Default role
        tipologia: 'riserva', // Default type
        ruolo_principale: 'centrocampista',
        ruolo_secondario: '',
        valutazione_generale: 3,
        visione_gioco: 3,
        corsa: 3,
        possesso: 3,
        forma_fisica: 3,
        foto: '',
        data_nascita: userData.data_nascita,
        bloccato: false,
        // Stats
        punti_mvp: 0,
        partite_vinte: 0,
        presenze: 0,
        gol_segnati: 0,
        ammonizioni_ricevute: 0,
        partite_rossi: 0,
        partite_blu: 0
    };

    try {
        const savedPlayer = await db.add(COLLECTION, newPlayer);

        // Update global players state
        const currentPlayers = store.getState().players || [];
        store.setState({ players: [...currentPlayers, savedPlayer] });

        // Auto-login after registration
        const sessionUser = {
            id: savedPlayer.id,
            username: `${savedPlayer.nome}.${savedPlayer.cognome}`.toLowerCase(),
            nome: savedPlayer.nome,
            cognome: savedPlayer.cognome,
            soprannome: savedPlayer.soprannome,
            ruolo: savedPlayer.ruolo,
            foto: savedPlayer.foto,
            data_nascita: savedPlayer.data_nascita
        };

        setSession(sessionUser);
        return { success: true, user: sessionUser };
    } catch (error) {
        console.error('Registration error:', error);
        return { success: false, error: 'Errore durante la registrazione' };
    }
}

export async function logout() {
    clearSession();
    return { success: true };
}

export async function updatePassword(userId, newPassword) {
    // Validate password format
    if (!/^\d{4}$/.test(newPassword)) {
        return { success: false, error: 'La password deve essere di 4 cifre' };
    }

    try {
        await db.update(COLLECTION, userId, { password_numeric: newPassword });
        return { success: true };
    } catch (error) {
        console.error('Password update error:', error);
        return { success: false, error: 'Errore durante l\'aggiornamento' };
    }
}

// ================================
// Restore Session
// ================================

export async function restoreSession() {
    const session = getSession();
    if (session) {
        // Verify session is still valid (user exists and not blocked)
        if (session.id === 'admin') {
            store.setState({ currentUser: session });
            return session;
        }

        const player = await db.getById(COLLECTION, session.id);
        if (player && !player.bloccato) {
            // Update session with latest data
            const updatedSession = {
                ...session,
                ruolo: player.ruolo || 'operatore',
                foto: player.foto,
                data_nascita: player.data_nascita
            };
            setSession(updatedSession);
            return updatedSession;
        } else {
            // Invalid session, clear it
            clearSession();
        }
    }
    return null;
}

export default {
    login,
    register,
    logout,
    updatePassword,
    restoreSession,
    getSession,
    setSession,
    clearSession
};
