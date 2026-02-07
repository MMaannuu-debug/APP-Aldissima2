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
            password: '9999',
            ruolo: 'operatore',
            tipologia: 'titolare',
            ruoloPrincipale: role,
            ruoloSecondario: '',
            valutazioneGenerale: Math.floor(Math.random() * 3) + 3, // 3-5
            visioneGioco: Math.floor(Math.random() * 3) + 3,
            corsa: Math.floor(Math.random() * 3) + 3,
            possesso: Math.floor(Math.random() * 3) + 3,
            formaFisica: Math.floor(Math.random() * 3) + 3,
            foto: '',
            bloccato: false,
            puntiMVP: 0,
            partiteVinte: 0,
            presenze: 0,
            golSegnati: 0,
            cartelliniRicevuti: 0,
            partiteRossi: 0,
            partiteBlu: 0
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

    if (players.length < 10) {
        console.error('Not enough players to generate matches');
        return;
    }

    const now = new Date();

    for (let i = 0; i < count; i++) {
        // Date in the past
        const date = new Date(now);
        date.setDate(date.getDate() - (i + 1) * 7); // One match per week

        const tipologia = '5v5'; // Simple 5v5
        const maxPlayers = 10;

        // Select random players
        const shuffled = [...players].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, maxPlayers);

        const squadraRossa = selected.slice(0, maxPlayers / 2).map(p => p.id);
        const squadraBlu = selected.slice(maxPlayers / 2, maxPlayers).map(p => p.id);

        const golRossi = Math.floor(Math.random() * 10);
        const golBlu = Math.floor(Math.random() * 10);

        const marcatori = [];
        // Assign random goals
        const totalGoals = golRossi + golBlu;
        for (let g = 0; g < totalGoals; g++) {
            const scorerId = selected[Math.floor(Math.random() * selected.length)].id;
            marcatori.push({ playerId: scorerId, gol: 1 });
        }

        const match = {
            data: date.toISOString().split('T')[0],
            orario: '20:00',
            luogo: 'OGGIONA',
            tipologia: tipologia,
            stato: STATI.CHIUSA,
            convocazioni: {},
            convocatiIds: selected.map(p => p.id),
            squadraRossa: squadraRossa,
            squadraBlu: squadraBlu,
            golRossi: golRossi,
            golBlu: golBlu,
            marcatori: marcatori,
            cartellini: [],
            mvpRossi: squadraRossa[Math.floor(Math.random() * squadraRossa.length)],
            mvpBlu: squadraBlu[Math.floor(Math.random() * squadraBlu.length)]
        };

        // Set convocations
        selected.forEach(p => match.convocazioni[p.id] = RISPOSTE.PRESENTE);

        try {
            await db.add('matches', match);

            // Update stats for this match (simplified version of handleMatchClose)
            // Ideally we should call updatePlayerStats from stats.js but that requires the match to be in store
            // For now let's just create the match data
        } catch (e) {
            console.error('Error adding match', e);
        }
    }

    // Refresh store
    const allMatches = await db.getAll('matches');
    store.setState({ matches: allMatches });

    // Trigger stats update
    const { updatePlayerStats } = await import('./stats.js');
    const newMatches = await db.getAll('matches'); // Get fresh with IDs

    // Update stats for all closed matches sequentially
    for (const m of newMatches) {
        if (m.stato === STATI.CHIUSA) {
            const currentPlayers = await db.getAll('players'); // Need fresh players for each iteration
            await updatePlayerStats(m, currentPlayers);
        }
    }

    // Final refresh
    const finalPlayers = await db.getAll('players');
    store.setState({ players: finalPlayers });

    console.log('Matches generated and stats updated');
}
