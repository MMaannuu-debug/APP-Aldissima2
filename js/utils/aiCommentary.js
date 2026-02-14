export const frasiInizio = [
    "Match intenso fin dal primo minuto.",
    "Sfida emozionante giocata a ritmi altissimi.",
    "Partita combattuta e ricca di colpi di scena.",
    "Clima acceso e grande spettacolo in campo.",
    "Le squadre scendono in campo decise a darsi battaglia.",
    "Gara vibrante che non ha deluso le aspettative.",
    "Atmosfera elettrica per questa sfida molto sentita.",
    "Un incontro che prometteva scintille e le ha mantenute.",
    "Avvio bruciante con le due compagini subito aggressive.",
    "Calcio d'inizio e subito ritmi forsennati."
];

export const frasiEquilibrio = [
    "Equilibrio totale per gran parte della gara.",
    "Le squadre si sono affrontate a viso aperto.",
    "Botta e risposta continuo tra le due formazioni.",
    "Nessuna delle due squadre riusciva a prendere il sopravvento.",
    "Un continuo capovolgimento di fronte.",
    "Grande equilibrio tattico in mezzo al campo.",
    "Partita bloccata e molto tattica.",
    "Le difese hanno retto bene agli assalti avversari.",
    "Un braccio di ferro estenuante.",
    "Punteggio in bilico fino all'ultimo."
];

export const frasiDominio = [
    "Dominio netto della squadra vincente.",
    "Prestazione autoritaria senza lasciare scampo agli avversari.",
    "Controllo totale del match dall'inizio alla fine.",
    "Vittoria schiacciante che non ammette repliche.",
    "Gli avversari non sono mai entrati in partita.",
    "Una prova di forza impressionante.",
    "Risultato mai in discussione.",
    "Una lezione di calcio impartita agli avversari.",
    "Superiorità evidente in ogni reparto.",
    "Un monologo della squadra vincente."
];

export const frasiFinale = [
    "Tre punti meritati al termine di una gara avvincente.",
    "Vittoria che lascia il segno.",
    "Una partita che verrà ricordata a lungo.",
    "Grande fair play in campo nonostante l'agonismo.",
    "Il pubblico ha apprezzato lo spettacolo.",
    "Una serata di grande calcetto.",
    "Onore comunque agli sconfitti per l'impegno.",
    "Risultato giusto per quanto visto in campo.",
    "Una prova di carattere che dà morale.",
    "Si chiude qui una splendida serata di sport."
];

export const frasiRimonta = [
    "Incredibile rimonta quando tutto sembrava perduto.",
    "Hanno ribaltato il risultato con un cuore immenso.",
    "Una reazione d'orgoglio che ha cambiato la storia del match.",
    "Non hanno mai mollato crederci fino alla fine."
];

export const frasiGoleada = [
    "Una pioggia di gol che ha divertito gli spettatori.",
    "Le difese oggi erano in vacanza.",
    "Festival del gol, spettacolo puro.",
    "Punteggio tennistico per una gara scoppiettante."
];

function random(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function generaCommentoPartita(match, players) {
    const golRossi = match.gol_rossi || 0;
    const golBlu = match.gol_blu || 0;
    const marcatori = match.marcatori || [];
    const ammonizioni = match.ammonizioni || [];

    // Nomi squadre (statici per ora, potrebbero diventare dinamici)
    const squadraA = "ROSSI";
    const squadraB = "BLU";

    const differenza = Math.abs(golRossi - golBlu);
    const vincente = golRossi > golBlu ? squadraA : (golBlu > golRossi ? squadraB : null);
    const perdente = golRossi > golBlu ? squadraB : (golBlu > golRossi ? squadraA : null);
    const pareggio = golRossi === golBlu;
    const totaleGol = golRossi + golBlu;

    let commento = random(frasiInizio) + " ";

    // Analisi risultato
    if (pareggio) {
        commento += `Il match si chiude in parità (${golRossi}-${golBlu}) tra ${squadraA} e ${squadraB}. `;
        if (totaleGol > 8) {
            commento += random(frasiGoleada) + " ";
        } else {
            commento += random(frasiEquilibrio) + " ";
        }
    } else {
        commento += `${vincente} supera ${perdente} con il punteggio di ${golRossi}-${golBlu}. `;

        if (differenza >= 5) {
            commento += random(frasiDominio) + " ";
        } else if (differenza >= 3) {
            commento += "Vittoria convincente e meritata. ";
        } else if (differenza === 1) {
            commento += "Partita decisa da episodi nel finale dopo un grande equilibrio. ";
        } else {
            commento += random(frasiEquilibrio) + " ";
        }

        if (totaleGol > 10) {
            commento += " " + random(frasiGoleada);
        }
    }

    // Top scorer
    if (marcatori && marcatori.length > 0) {
        // Raggruppa gol per giocatore
        const golPerGiocatore = marcatori.reduce((acc, m) => {
            acc[m.playerId] = (acc[m.playerId] || 0) + (m.gol || 1);
            return acc;
        }, {});

        // Trova top scorer
        let topScorerId = null;
        let maxGol = 0;
        for (const [pid, gol] of Object.entries(golPerGiocatore)) {
            if (gol > maxGol) {
                maxGol = gol;
                topScorerId = pid;
            }
        }

        if (topScorerId) {
            const player = players.find(p => p.id === topScorerId);
            const nomeGiocatore = player ? `${player.nome} ${player.cognome}` : "il bomber";

            commento += " ";
            if (maxGol >= 4) {
                commento += `Show personale di ${nomeGiocatore}, autore di un poker devastante. `;
            } else if (maxGol === 3) {
                commento += `Protagonista assoluto ${nomeGiocatore}, che si porta a casa il pallone con una splendida tripletta. `;
            } else if (maxGol === 2) {
                commento += `Doppietta decisiva di ${nomeGiocatore}, sempre al posto giusto. `;
            } else {
                commento += `A segno anche ${nomeGiocatore} con una rete pesante. `;
            }
        }
    }

    // MVP
    if (match.mvp_rossi || match.mvp_blu) {
        const mvpId = match.mvp_rossi || match.mvp_blu; // Prende uno a caso se ci sono due (spesso è uno solo in DB per logica o due distinti)
        // La logica MVP attuale salva mvp_rossi e mvp_blu. Citiamoli entrambi se ci sono.

        const mvpRossiPlayer = match.mvp_rossi ? players.find(p => p.id === match.mvp_rossi) : null;
        const mvpBluPlayer = match.mvp_blu ? players.find(p => p.id === match.mvp_blu) : null;

        if (mvpRossiPlayer && mvpBluPlayer) {
            commento += `Prestazioni maiuscole per ${mvpRossiPlayer.cognome} e ${mvpBluPlayer.cognome}, votati MVP del match. `;
        } else if (mvpRossiPlayer) {
            commento += `Palma del migliore in campo a ${mvpRossiPlayer.nome} ${mvpRossiPlayer.cognome}, che ha illuminato il gioco. `;
        } else if (mvpBluPlayer) {
            commento += `MVP indiscusso ${mvpBluPlayer.nome} ${mvpBluPlayer.cognome}, vero trascinatore dei suoi. `;
        }
    }

    // Ammonizioni / Bad Guy
    if (ammonizioni.length > 2) {
        commento += "Gara maschia con qualche cartellino di troppo, ma l'agonismo non è mai mancato. ";
    }

    commento += " " + random(frasiFinale);

    return commento;
}
