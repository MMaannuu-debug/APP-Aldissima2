// ================================
// MATCHES MODULE
// ================================

import db from './db.js';
import { store } from './store.js';

const COLLECTION = 'matches';

// Match states
export const STATI = {
    CREATA: 'creata',
    COMPLETA: 'completa',
    SQUADRE_GENERATE: 'squadre_generate',
    PUBBLICATA: 'pubblicata',
    CHIUSA: 'chiusa'
};

// Match types
export const TIPOLOGIE = [
    { value: '5v5', label: '5 vs 5', maxPlayers: 10 },
    { value: '6v6', label: '6 vs 6', maxPlayers: 12 },
    { value: '7v7', label: '7 vs 7', maxPlayers: 14 },
    { value: '8v8', label: '8 vs 8', maxPlayers: 16 }
];

// Convocation responses
export const RISPOSTE = {
    PRESENTE: 'presente',
    FORSE: 'forse',
    ASSENTE: 'assente',
    IN_ATTESA: 'in_attesa'
};

// ================================
// CRUD Operations
// ================================

export async function getAllMatches() {
    if (!db.getClient) return await db.getAll(COLLECTION);

    const supabase = db.getClient();
    // Fetch matches with related convocations and teams
    const { data: matches, error } = await supabase
        .from(COLLECTION)
        .select(`
            *,
            match_convocations(player_id, risposta, is_convocato),
            match_teams(player_id, team)
        `)
        .order('data', { ascending: false });

    if (error) throw error;

    // Map the relational data back to the format the app expects
    const formattedMatches = matches.map(m => {
        const convocazioni = {};
        const convocatiIds = [];
        m.match_convocations.forEach(c => {
            convocazioni[c.player_id] = c.risposta;
            if (c.is_convocato) convocatiIds.push(c.player_id);
        });

        return {
            ...m,
            convocazioni,
            convocatiIds,
            squadraRossa: m.match_teams.filter(t => t.team === 'rossi').map(t => t.player_id),
            squadraBlu: m.match_teams.filter(t => t.team === 'blu').map(t => t.player_id)
        };
    });

    store.setState({ matches: formattedMatches });
    return formattedMatches;
}

export async function updateConvocations(matchId, convocatiIds, convocazioni) {
    const supabase = db.getClient();
    if (!supabase) return;

    // First delete all existing for this match to be safe, or use upsert
    // Upsert is better but we might have removed some.
    // For simplicity with RLS and common patterns: delete then insert.
    const { error: delError } = await supabase
        .from('match_convocations')
        .delete()
        .eq('match_id', matchId);

    if (delError) throw delError;

    const insertData = convocatiIds.map(pid => ({
        match_id: matchId,
        player_id: pid,
        risposta: convocazioni[pid] || RISPOSTE.IN_ATTESA,
        is_convocato: true
    }));

    if (insertData.length > 0) {
        const { error: insError } = await supabase
            .from('match_convocations')
            .insert(insertData);
        if (insError) throw insError;
    }

    return await getAllMatches();
}

export async function updateTeams(matchId, squadraRossa, squadraBlu) {
    const supabase = db.getClient();
    if (!supabase) return;

    const { error: delError } = await supabase
        .from('match_teams')
        .delete()
        .eq('match_id', matchId);

    if (delError) throw delError;

    const insertData = [
        ...squadraRossa.map(pid => ({ match_id: matchId, player_id: pid, team: 'rossi' })),
        ...squadraBlu.map(pid => ({ match_id: matchId, player_id: pid, team: 'blu' }))
    ];

    if (insertData.length > 0) {
        const { error: insError } = await supabase
            .from('match_teams')
            .insert(insertData);
        if (insError) throw insError;
    }

    return await getAllMatches();
}

export async function getMatchWithDetails(id) {
    const supabase = db.getClient();
    if (!supabase) return await db.getById(COLLECTION, id);

    const { data: match, error } = await supabase
        .from(COLLECTION)
        .select(`
            *,
            match_convocations(player_id, risposta, is_convocato),
            match_teams(player_id, team)
        `)
        .eq('id', id)
        .single();

    if (error) throw error;

    const convocazioni = {};
    const convocatiIds = [];
    match.match_convocations.forEach(c => {
        convocazioni[c.player_id] = c.risposta;
        if (c.is_convocato) convocatiIds.push(c.player_id);
    });

    return {
        ...match,
        convocazioni,
        convocatiIds,
        squadraRossa: match.match_teams.filter(t => t.team === 'rossi').map(t => t.player_id),
        squadraBlu: match.match_teams.filter(t => t.team === 'blu').map(t => t.player_id)
    };
}

export async function getMatch(id) {
    return await db.getById(COLLECTION, id);
}

export async function createMatch(matchData = {}) {
    // Calculate default date (next Tuesday)
    const nextTuesday = getNextTuesday();

    const newMatch = {
        data: matchData.data || nextTuesday.toISOString().split('T')[0],
        orario: matchData.orario || '20:00',
        luogo: matchData.luogo || 'OGGIONA',
        tipologia: matchData.tipologia || '8v8',
        stato: STATI.CREATA,
        convocazioni: {}, // { playerId: 'presente' | 'forse' | 'assente' | 'in_attesa' }
        convocatiIds: matchData.convocatiIds || [], // List of convocated player IDs
        faseConvocazione: 1, // 1 = solo titolari, 2 = anche riserve
        dataAperturaRiserve: null,
        squadraRossa: [],
        squadraBlu: [],
        gol_rossi: null,
        gol_blu: null,
        mvp_rossi: null,
        mvp_blu: null,
        pronostico: null
    };

    const saved = await db.add(COLLECTION, newMatch);
    await getAllMatches();
    return saved;
}

export async function updateMatch(id, updates) {
    const updated = await db.update(COLLECTION, id, updates);

    // Update store
    const matches = store.getState().matches.map(m =>
        m.id === id ? { ...m, ...updates } : m
    );
    store.setState({ matches });

    return updated;
}

export async function deleteMatch(id) {
    await db.delete(COLLECTION, id);

    const matches = store.getState().matches.filter(m => m.id !== id);
    store.setState({ matches });
}

// ================================
// Convocation Management
// ================================

export async function convokePlayer(matchId, playerId) {
    const match = await getMatch(matchId);
    if (!match) throw new Error('Partita non trovata');

    const convocatiIds = [...(match.convocatiIds || [])];
    if (!convocatiIds.includes(playerId)) {
        convocatiIds.push(playerId);
    }

    const convocazioni = { ...match.convocazioni };
    if (!convocazioni[playerId]) {
        convocazioni[playerId] = RISPOSTE.IN_ATTESA;
    }

    return await updateMatch(matchId, { convocatiIds, convocazioni });
}

export async function removeConvocation(matchId, playerId) {
    const match = await getMatch(matchId);
    if (!match) throw new Error('Partita non trovata');

    const convocatiIds = (match.convocatiIds || []).filter(id => id !== playerId);
    const convocazioni = { ...match.convocazioni };
    delete convocazioni[playerId];

    return await updateMatch(matchId, { convocatiIds, convocazioni });
}

export async function respondToConvocation(matchId, playerId, risposta) {
    const match = await getMatch(matchId);
    if (!match) throw new Error('Partita non trovata');

    if (!Object.values(RISPOSTE).includes(risposta)) {
        throw new Error('Risposta non valida');
    }

    const convocazioni = { ...match.convocazioni, [playerId]: risposta };

    // Check if match is complete
    let updates = { convocazioni };
    const presentCount = Object.values(convocazioni).filter(r => r === RISPOSTE.PRESENTE).length;
    const maxPlayers = getMaxPlayers(match.tipologia);

    if (presentCount >= maxPlayers && match.stato === STATI.CREATA) {
        updates.stato = STATI.COMPLETA;
    }

    // Update the specific convocation in Supabase
    const supabase = db.getClient();
    if (supabase) {
        const { error } = await supabase
            .from('match_convocations')
            .upsert({
                match_id: matchId,
                player_id: playerId,
                risposta: risposta,
                is_convocato: match.convocatiIds?.includes(playerId) || false
            }, { onConflict: 'match_id, player_id' });

        if (error) throw error;

        // Also update match state if needed
        if (updates.stato) {
            await updateMatch(matchId, { stato: updates.stato });
        }

        // Refetch to ensure local state is consistent
        return await getAllMatches();
    }

    return await updateMatch(matchId, updates);
}

export async function openToReserves(matchId) {
    return await updateMatch(matchId, {
        faseConvocazione: 2,
        dataAperturaRiserve: new Date().toISOString()
    });
}

// ================================
// Team Management
// ================================

export async function setTeams(matchId, squadraRossa, squadraBlu) {
    return await updateMatch(matchId, {
        squadraRossa,
        squadraBlu,
        stato: STATI.SQUADRE_GENERATE
    });
}

export async function publishTeams(matchId) {
    return await updateMatch(matchId, { stato: STATI.PUBBLICATA });
}

export async function resetTeams(matchId) {
    return await updateMatch(matchId, {
        squadraRossa: [],
        squadraBlu: [],
        stato: STATI.COMPLETA
    });
}

// ================================
// Match Results
// ================================

export async function setResults(matchId, results) {
    const { gol_rossi, gol_blu, marcatori, cartellini, mvp_rossi, mvp_blu } = results;

    return await updateMatch(matchId, {
        gol_rossi,
        gol_blu,
        marcatori: marcatori || [],
        cartellini: cartellini || [],
        mvp_rossi,
        mvp_blu
    });
}

export async function closeMatch(matchId) {
    const match = await getMatch(matchId);
    if (!match) throw new Error('Partita non trovata');

    // Validate required data
    if (match.gol_rossi === null || match.gol_blu === null) {
        throw new Error('Inserisci il risultato prima di chiudere');
    }

    if (!match.mvpRossi || !match.mvpBlu) {
        throw new Error('Seleziona gli MVP prima di chiudere');
    }

    return await updateMatch(matchId, { stato: STATI.CHIUSA });
}

export async function reopenMatch(matchId) {
    return await updateMatch(matchId, { stato: STATI.PUBBLICATA });
}

// ================================
// Helper Functions
// ================================

function getNextTuesday() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilTuesday = (9 - dayOfWeek) % 7 || 7;
    const nextTuesday = new Date(today);
    nextTuesday.setDate(today.getDate() + daysUntilTuesday);
    return nextTuesday;
}

export function getMaxPlayers(tipologia) {
    const tipo = TIPOLOGIE.find(t => t.value === tipologia);
    return tipo ? tipo.maxPlayers : 16;
}

export function getPlayersPerTeam(tipologia) {
    return getMaxPlayers(tipologia) / 2;
}

export function getConvocationStats(match) {
    if (!match || !match.convocazioni) {
        return { presente: 0, forse: 0, assente: 0, in_attesa: 0 };
    }

    const stats = { presente: 0, forse: 0, assente: 0, in_attesa: 0 };

    // Count explicit responses
    if (match.convocazioni) {
        Object.values(match.convocazioni).forEach(risposta => {
            if (stats[risposta] !== undefined) {
                stats[risposta]++;
            }
        });
    }

    // Count players without response as "in_attesa"
    if (match.convocatiIds) {
        match.convocatiIds.forEach(id => {
            if (!match.convocazioni || !match.convocazioni[id]) {
                stats.in_attesa++;
            }
        });
    }

    return stats;
}

export function getPlayerResponse(match, playerId) {
    return match?.convocazioni?.[playerId] || RISPOSTE.IN_ATTESA;
}

export function isPlayerConvoked(match, playerId) {
    return match?.convocatiIds?.includes(playerId) || false;
}

export function getMatchResult(match) {
    if (match.golRossi === null || match.golBlu === null) return null;

    if (match.golRossi > match.golBlu) return 'rossi';
    if (match.golBlu > match.golRossi) return 'blu';
    return 'pareggio';
}

export function formatMatchDate(dateString) {
    const date = new Date(dateString);
    const options = {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    };
    return date.toLocaleDateString('it-IT', options);
}

export function getStateLabel(stato) {
    const labels = {
        [STATI.CREATA]: 'Convocazione aperta',
        [STATI.COMPLETA]: 'Completa',
        [STATI.SQUADRE_GENERATE]: 'Squadre generate',
        [STATI.PUBBLICATA]: 'Pubblicata',
        [STATI.CHIUSA]: 'Chiusa'
    };
    return labels[stato] || stato;
}

// ================================
// Filtering and Sorting
// ================================

export function getActiveMatch(matches) {
    // Return the most recent non-closed match
    const active = matches.filter(m => m.stato !== STATI.CHIUSA);
    if (active.length === 0) return null;

    return active.sort((a, b) => new Date(a.data) - new Date(b.data))[0];
}

export function getRecentClosedMatch(matches, daysBack = 3) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysBack);

    const closed = matches.filter(m =>
        m.stato === STATI.CHIUSA &&
        new Date(m.data) >= cutoff
    );

    if (closed.length === 0) return null;

    return closed.sort((a, b) => new Date(b.data) - new Date(a.data))[0];
}

export function sortMatches(matches, direction = 'desc') {
    return [...matches].sort((a, b) => {
        const diff = new Date(b.data) - new Date(a.data);
        return direction === 'desc' ? diff : -diff;
    });
}

export function getMatchIdentifier(match, allMatches) {
    if (!match || !match.data) return '';

    const date = new Date(match.data);
    const year = date.getFullYear();

    // If already has number, use it
    if (match.numeroPartita) {
        return `${year}-${String(match.numeroPartita).padStart(2, '0')}`;
    }

    // Otherwise calculate it (fallback/legacy)
    if (!allMatches) return `${year}-??`;

    // Filter matches of same year
    const yearMatches = allMatches.filter(m => {
        const d = new Date(m.data);
        return d.getFullYear() === year;
    });

    // Sort by date/time
    yearMatches.sort((a, b) => {
        const da = new Date(a.data + 'T' + a.orario);
        const db = new Date(b.data + 'T' + b.orario);
        return da - db;
    });

    // Find index (1-based)
    const index = yearMatches.findIndex(m => m.id === match.id);
    if (index === -1) return `${year}-??`;

    return `${year}-${String(index + 1).padStart(2, '0')}`;
}



export default {
    getAllMatches,
    getMatch,
    createMatch,
    updateMatch,
    deleteMatch,
    convokePlayer,
    removeConvocation,
    respondToConvocation,
    openToReserves,
    setTeams,
    publishTeams,
    resetTeams,
    setResults,
    closeMatch,
    reopenMatch,
    getMaxPlayers,
    getPlayersPerTeam,
    getConvocationStats,
    getPlayerResponse,
    isPlayerConvoked,
    getMatchResult,
    formatMatchDate,
    getStateLabel,
    getActiveMatch,
    getRecentClosedMatch,
    sortMatches,
    getMatchIdentifier,
    STATI,
    TIPOLOGIE,
    RISPOSTE
};
