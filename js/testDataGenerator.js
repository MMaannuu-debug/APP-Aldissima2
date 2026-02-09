import db from './db.js';
import { store } from './store.js';
import { STATI, TIPOLOGIE, RISPOSTE } from './matches.js';
import { RUOLI } from './players.js';

export async function generateTestPlayers(count = 20) {
    console.log(`Generating ${count} test players...`);
    const players = [];

    for (let i = 1; i <= count; i++) {
        const role = RUOLI[Math.floor(Math.random() * RUOLI.length)].value;
        const player = {
            nome: `Giocatore Test`,
            cognome: `${i}`,
            soprannome: `TestPlayer${i}`,
            telefono: `33300000${i.toString().padStart(2, '0')}`,
            email: `player${i}@test.com`,
            password_numeric: '9999',
            ruolo: 'operatore',
            tipologia: 'titolare',
            ruolo_principale: role,
            ruolo_secondario: '',
            valutazione_generale: Math.floor(Math.random() * 3) + 3, // 3-5
            visione_gioco: Math.floor(Math.random() * 3) + 3,
            corsa: Math.floor(Math.random() * 3) + 3,
            possesso: Math.floor(Math.random() * 3) + 3,
            forma_fisica: Math.floor(Math.random() * 3) + 3,
            foto: '',
            bloccato: false,
            punti_mvp: 0,
            partite_vinte: 0,
            presenze: 0,
            gol_segnati: 0,
            cartellini_ricevuti: 0,
            partite_rossi: 0,
            partite_blu: 0
        };

        try {
            await db.add('players', player);
        } catch (e) {
            console.error('Error adding player', e);
        }
    }

    // Refresh store
    const allPlayers = await db.getAll('players');
    store.setState({ players: allPlayers });
    console.log('Players generated');
}

export async function generateTestMatches(count = 10) {
    console.log(`Generating ${count} test matches...`);
    const players = store.getState().players;
    const { updateConvocations, updateTeams, setResults, STATI, RISPOSTE } = await import('./matches.js');
    const { updatePlayerStats } = await import('./stats.js');

    if (players.length < 10) {
        console.error('Not enough players to generate matches');
        return;
    }

    const now = new Date();

    for (let i = 0; i < count; i++) {
        // Date in the past
        const date = new Date(now);
        date.setDate(date.getDate() - (i + 1) * 7);

        const tipologia = '5v5';
        const maxPlayers = 10;

        // Select random players
        const shuffled = [...players].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, maxPlayers);

        const squadraRossa = selected.slice(0, maxPlayers / 2).map(p => p.id);
        const squadraBlu = selected.slice(maxPlayers / 2, maxPlayers).map(p => p.id);

        const golRossi = Math.floor(Math.random() * 6); // More realistic score
        const golBlu = Math.floor(Math.random() * 6);

        // Prepare match core data
        const matchData = {
            data: date.toISOString().split('T')[0],
            orario: '20:00',
            luogo: 'OGGIONA',
            tipologia: tipologia,
            stato: STATI.CREATA,
            pronostico: 'Gara equilibrata'
        };

        try {
            // 1. Create Match
            const insertedMatch = await db.add('matches', matchData);
            const matchId = insertedMatch.id;

            // 2. Set Convocations
            const convocazioni = {};
            selected.forEach(p => convocazioni[p.id] = RISPOSTE.PRESENTE);
            await updateConvocations(matchId, selected.map(p => p.id), convocazioni);

            // 3. Set Teams
            await updateTeams(matchId, squadraRossa, squadraBlu);

            // 4. Set Results (Goals & Events)
            const marcatori = [];

            // Goals for Rossi
            for (let g = 0; g < golRossi; g++) {
                marcatori.push({ playerId: squadraRossa[Math.floor(Math.random() * squadraRossa.length)], gol: 1 });
            }
            // Goals for Blu
            for (let g = 0; g < golBlu; g++) {
                marcatori.push({ playerId: squadraBlu[Math.floor(Math.random() * squadraBlu.length)], gol: 1 });
            }

            const results = {
                gol_rossi: golRossi,
                gol_blu: golBlu,
                mvp_rossi: squadraRossa[Math.floor(Math.random() * squadraRossa.length)],
                mvp_blu: squadraBlu[Math.floor(Math.random() * squadraBlu.length)],
                marcatori: marcatori,
                cartellini: []
            };

            await setResults(matchId, results);

            // 5. Update Stats for this match
            console.log(`Match ${i + 1}/${count} generated: ${golRossi}-${golBlu}`);

        } catch (e) {
            console.error('Error generating test match', e);
        }
    }

    // Refresh store and trigger global stats refresh
    console.log('Finalizing stats update...');
    const allMatches = await db.getAll('matches');
    const { getMatchWithDetails } = await import('./matches.js');

    for (const m of allMatches) {
        if (m.stato === STATI.CHIUSA) {
            const richMatch = await getMatchWithDetails(m.id);
            const currentPlayers = await db.getAll('players');
            await updatePlayerStats(richMatch, currentPlayers);
        }
    }

    // Re-sync final state
    const finalMatches = await db.getAll('matches');
    const finalPlayers = await db.getAll('players');
    store.setState({ matches: finalMatches, players: finalPlayers });

    console.log('Test data generation complete');
}
