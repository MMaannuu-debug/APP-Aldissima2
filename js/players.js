// ================================
// PLAYERS MODULE
// ================================

import db from './db.js';
import { store } from './store.js';
import { escapeHtml } from './utils.js';

const COLLECTION = 'players';

// Player roles
export const RUOLI = [
    { value: 'portiere', label: 'Portiere' },
    { value: 'difensore', label: 'Difensore' },
    { value: 'laterale', label: 'Laterale' },
    { value: 'centrocampista', label: 'Centrocampista' },
    { value: 'attaccante', label: 'Attaccante' }
];

// ================================
// CRUD Operations
// ================================

export async function getAllPlayers() {
    const players = await db.getAll(COLLECTION);
    store.setState({ players });
    return players;
}

export async function getPlayer(id) {
    return await db.getById(COLLECTION, id);
}

export async function createPlayer(playerData) {
    const newPlayer = {
        ...getDefaultPlayerData(),
        ...playerData,
        email: playerData.email || null
    };

    const saved = await db.add(COLLECTION, newPlayer);

    // Update store
    const players = store.getState().players;
    store.setState({ players: [...players, saved] });

    return saved;
}

export async function updatePlayer(id, updates) {
    if (updates.email === '') updates.email = null;
    const updated = await db.update(COLLECTION, id, updates);

    // Update store
    const players = store.getState().players.map(p =>
        p.id === id ? { ...p, ...updates } : p
    );
    store.setState({ players });

    // Update current user if updating self
    const currentUser = store.getState().currentUser;
    if (currentUser && currentUser.id === id) {
        store.setState({
            currentUser: {
                ...currentUser,
                foto: updates.foto ?? currentUser.foto,
                ruolo: updates.ruolo ?? currentUser.ruolo
            }
        });
    }

    return updated;
}

export async function deletePlayer(id) {
    await db.delete(COLLECTION, id);

    // Update store
    const players = store.getState().players.filter(p => p.id !== id);
    store.setState({ players });
}

export async function blockPlayer(id, blocked) {
    return await updatePlayer(id, { bloccato: blocked });
}

export async function setPlayerRole(id, role) {
    return await updatePlayer(id, { ruolo: role });
}

// ================================
// Photo Management
// ================================

export async function uploadPhoto(id, file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('Nessun file selezionato'));
            return;
        }

        if (!file.type.startsWith('image/')) {
            reject(new Error('Il file deve essere un\'immagine'));
            return;
        }

        if (file.size > 1024 * 1024) {
            reject(new Error('L\'immagine deve essere max 1MB'));
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const base64 = e.target.result;
                await updatePlayer(id, { foto: base64 });
                resolve(base64);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error('Errore lettura file'));
        reader.readAsDataURL(file);
    });
}

// ================================
// Helper Functions
// ================================

function getDefaultPlayerData() {
    return {
        nome: '',
        cognome: '',
        soprannome: '',
        telefono: '',
        email: null,
        password_numeric: '0000',
        ruolo: 'operatore',
        tipologia: 'riserva',
        ruolo_principale: 'centrocampista',
        ruolo_secondario: '',
        valutazione_generale: 3,
        visione_gioco: 3,
        corsa: 3,
        possesso: 3,
        forma_fisica: 3,
        foto: '',
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
}

export function getPlayerDisplayName(player) {
    if (!player) return 'Sconosciuto';
    if (player.soprannome) return escapeHtml(player.soprannome);
    return `${escapeHtml(player.nome)} ${escapeHtml(player.cognome)}`;
}

export function getPlayerInitials(player) {
    if (!player) return '?';
    return escapeHtml(`${player.nome[0] || ''}${player.cognome[0] || ''}`.toUpperCase());
}

export function calculatePlayerRating(player) {
    if (!player) return 0;
    const total = (
        (player.valutazione_generale || 3) +
        (player.visione_gioco || 3) +
        (player.corsa || 3) +
        (player.possesso || 3) +
        (player.forma_fisica || 3)
    );
    return total;
}

export function getRoleLabel(role) {
    const found = RUOLI.find(r => r.value === role);
    return found ? found.label : role;
}

// ================================
// Filtering and Sorting
// ================================

export function filterPlayers(players, filters = {}) {
    let result = [...players];

    if (filters.tipologia) {
        result = result.filter(p => p.tipologia === filters.tipologia);
    }

    if (filters.ruolo) {
        result = result.filter(p =>
            p.ruolo_principale === filters.ruolo ||
            p.ruolo_secondario === filters.ruolo
        );
    }

    if (filters.search) {
        const search = filters.search.toLowerCase();
        result = result.filter(p =>
            p.nome.toLowerCase().includes(search) ||
            p.cognome.toLowerCase().includes(search) ||
            (p.soprannome || '').toLowerCase().includes(search)
        );
    }

    if (filters.notBlocked) {
        result = result.filter(p => !p.bloccato);
    }

    return result;
}

export function sortPlayers(players, sortBy = 'nome') {
    return [...players].sort((a, b) => {
        switch (sortBy) {
            case 'nome':
                return a.nome.localeCompare(b.nome);
            case 'cognome':
                return a.cognome.localeCompare(b.cognome);
            case 'rating':
                return calculatePlayerRating(b) - calculatePlayerRating(a);
            case 'presenze':
                return (b.presenze || 0) - (a.presenze || 0);
            case 'gol':
                return (b.gol_segnati || 0) - (a.gol_segnati || 0);
            case 'mvp':
                return (b.punti_mvp || 0) - (a.punti_mvp || 0);
            default:
                return 0;
        }
    });
}

export default {
    getAllPlayers,
    getPlayer,
    createPlayer,
    updatePlayer,
    deletePlayer,
    blockPlayer,
    setPlayerRole,
    uploadPhoto,
    getPlayerDisplayName,
    getPlayerInitials,
    calculatePlayerRating,
    filterPlayers,
    sortPlayers,
    RUOLI
};
