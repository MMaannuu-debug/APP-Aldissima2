# Istruzioni Agente

Gli LLM sono probabilistici, mentre la maggior parte della logica di business è deterministica e richiede coerenza. 

Ti posizioni tra intenzione umana (direttive) ed esecuzione deterministica (script Python). Leggi le istruzioni, prendi decisioni, chiama i tool, gestisci gli errori, migliora continuamente il sistema.

Sii pragmatico. Sii affidabile. Auto-correggiti.



# SPECIFICA TECNICA – WEB APP GESTIONE PARTITE CALCETTO

## 1. Descrizione generale
- Web app **responsive**, funzionante su desktop e smartphone  
- Gestione partite di calcetto di un gruppo privato di circa **30 giocatori**  
- **Database persistente** per storico partite, statistiche e classifiche  
- Due sezioni:
  - **Amministrativa**: accessibile solo ad utenti autorizzati  
  - **Utente**: accessibile a tutti i giocatori registrati  

---

## 2. Utenti, autenticazione e ruoli

### Registrazione e accesso
- Ogni giocatore ha un **account personale**  
- **Registrazione autonoma**  
- Password numerica **4 cifre** (0000–9999)  
- Dopo registrazione, l’utente entra immediatamente come **Operatore**  

### Tipologie di utenti

#### Amministratore
- Bloccare/sbloccare utenti  
- Creare, modificare, annullare, riaprire partite  
- Convocare giocatori  
- Creare/modificare squadre  
- Inserire/modificare risultati, marcatori, cartellini, MVP  
- Chiudere partite  
- Creare/modificare giocatori  
- Esportare statistiche e classifiche  
- Tutti i permessi di Supervisore e Operatore  

#### Supervisore
- Creare/modificare squadre  
- Visualizzare informazioni  
- Tutti i permessi dell’Operatore  
- Non può modificare risultati o chiudere partite  

#### Operatore (Giocatore)
- Modificare solo la parte abilitata della propria scheda  
- Confermare presenza/assenza/forse alle partite  
- Visualizzare partite, squadre, risultati, statistiche e classifiche  

---

## 3. Stati della partita
1. **Creata** – convocazione aperta  
2. **Completa** – numero massimo giocatori raggiunto  
3. **Squadre generate** – squadre assegnate/aggiustate  
4. **Pubblicata** – squadre confermate e visibili  
5. **Chiusa** – partita giocata, dati salvati, formazione definitiva  

---

## 4. Convocazioni
- Due fasi:
  1. Prima: **solo Titolari**  
  2. Seconda (dopo 2 giorni): **anche Riserve**  

### Risposta giocatore
- **Presente** → conteggiato  
- **Assente** → non conteggiato  
- **Forse** → non conteggiato, indicazione per Admin  
- **In attesa** → non conteggiato  

### Visualizzazione lista giocatori (stato CREATA)
1. Presenti  
2. Forse  
3. Assenti  
4. In attesa  

### Conteggio giocatori
- Solo **Presente** contribuisce al numero massimo  

---

## 5. Tipologie di partita
- 5 vs 5 → 10 giocatori  
- 6 vs 6 → 12 giocatori  
- 7 vs 7 → 14 giocatori  
- 8 vs 8 → 16 giocatori (default)  

---

## 6. Scheda Giocatore

### Dati visibili a tutti
- ID, Nome, Cognome, Soprannome  
- Foto (JPG, opzionale, max 1MB, upload solo da dispositivo)  
- Ruolo principale / secondario  
  - Ruoli: Attaccante, Centrocampista, Difensore, Laterale, Portiere  

### Dati visibili e modificabili solo dall’Amministratore
- Tipologia: Titolare / Riserva  
- Valutazione generale (1–5)  
- Visione di gioco (1–5)  
- Corsa (1–5)  
- Possesso (1–5)  
- Forma fisica (1–5)  

### Dati personali
- Numero di telefono  
- Email facoltativa  
- Password di accesso (numerica, 4 cifre)  
  - Modificabile dal giocatore e dall’Amministratore  
  - Non modificabile da Supervisore o Operatore  

---

## 7. Scheda Partita

### Dati alla creazione (default)
- Data: martedì settimana successiva  
- Orario: 20:00  
- Luogo: “OGGIONA”  
- Tipologia partita: 8vs8  

### Dati dopo partita (necessari per chiusura)
- Gol squadra Rossa / Blu  
- Marcatori e numero gol  
- Cartellini gialli  
- MVP squadra Rossa / Blu  

---

## 8. Creazione delle squadre

### Fase 1 – Selezione manuale
- Admin assegna giocatori  
- Contatore in tempo reale per numero giocatori per squadra  

### Fase 2 – Funzione CREA
- Assegna automaticamente i giocatori restanti per bilanciare caratteristiche  
- Non cambia assegnazioni manuali  
- Admin può:
  - Confermare  
  - Modificare manualmente  
  - Forzare cambi  
  - **Annullare tutto e tornare alla Fase 1**  

### Bilanciamento
- Minimizza differenza tra somma caratteristiche squadre  
- Visualizza:
  - Indice equilibrio  
  - Gap caratteristiche  

---

## 9. Assegnazione punti
- Vittoria → 3 punti  
- Pareggio → 1 punto  
- Presenza → 1 punto  
- MVP squadra vincente → 3 punti  
- MVP squadra perdente → 1 punto  

---

## 10. UI / UX
- Stile minimale, colori chiari, verde dominante  
- Font grandi e leggibili  
- Menu in basso  
- Mobile + desktop  

### Visualizzazione squadre
- Non assegnati → bianco  
- Rossi → rosso chiaro  
- Blu → blu chiaro  

### Interazione foto
- Mobile: pressione 3 sec → mostra foto 2 sec  
- Desktop: hover → mostra foto  

---

## 11. Home / Dashboard Giocatore
- Mostra ultima partita chiusa (3 giorni)  
- Se partita aperta → mostra convocazione  
- Squadre pubblicate → mostra formazioni + **pronostico risultato secco**  
- Partita chiusa → mostra risultato finale  

---

## 12. Statistiche e classifiche

### Statistiche giocatore
- Punti MVP  
- Partite vinte  
- Presenze  
- Gol segnati  
- Cartellini ricevuti  
- Partite giocate nei Rossi  
- Partite giocate nei Blu  

### Statistiche partite
- Numero partite giocate  
- Vittorie Rossi / Blu  
- Gol totali  
- Media gol a partita  
- Storico risultati  

### Classifiche
- Punti MVP  
- Presenze  
- Gol per giocatore  
- Cartellini per giocatore  

**Admin può esportare tutto in Excel**  

---

## 13. Pronostico AI
- Mostra **risultato secco** (es. 3–2)  
- Generato automaticamente dall’AI  
- Basato su:
  - Schede giocatori  
  - Statistiche storiche  
- Solo visuale, non modificabile  

---

## 14. Notifiche
- Solo in-app  

---

## 15. Cartellini
- Solo gialli  

---

## 16. Diagrammi flowchart

```mermaid
flowchart TD
    A[Partita CREATA] --> B{Convocazione aperta}
    B --> C[Giocatori rispondono: Presente / Forse / Assente / In attesa]
    C --> D[Conteggio giocatori presenti]
    D -->|Numero sufficiente| E[Partita COMPLETA]
    E --> F[Fase 1: selezione manuale squadre]
    F --> G[Fase 2: CREA squadre + bilanciamento]
    G --> H{Admin conferma o modifica?}
    H -->|Conferma| I[Partita PUBBLICATA]
    H -->|Modifica / Forza| G
    H -->|Annulla tutto| F
    I --> J[Partita GIOCATA / CHIUSA]
    J --> K[Inserimento dati: gol, marcatori, cartellini, MVP]
    K --> L[Aggiornamento statistiche e classifiche]
flowchart LR
    P[Giocatore convocato] -->|Presente| A1[Conteggiato]
    P -->|Forse| A2[Non conteggiato, indicazione Admin]
    P -->|Assente| A3[Non conteggiato]
    P -->|In attesa| A4[Non conteggiato]
17. Mockup UI (testuale schematico)
Dashboard
+-----------------------------+
|        HOME DASHBOARD       |
+-----------------------------+
| Ultima partita chiusa       |
| - Risultato finale          |
| - MVP                       |
+-----------------------------+
| Nuova partita aperta        |
| - Convocazione              |
|   [Presente][Forse][Assente]|
| - Lista giocatori ordinata  |
|   1. Presenti               |
|   2. Forse                  |
|   3. Assenti                |
|   4. In attesa              |
+-----------------------------+
| Squadre pubblicate          |
| - ROSSI                     |
|   Nome1, Nome2, ...         |
| - BLU                       |
|   Nome1, Nome2, ...         |
| - Pronostico risultato secco|
+-----------------------------+
Scheda giocatore
+--------------------------------------+
| Scheda Giocatore                     |
+--------------------------------------+
| ID: 01                               |
| Nome: Mario Rossi                     |
| Cognome: Rossi                        |
| Soprannome: “Mago”                    |
| Foto: [Carica JPG, max 1MB]           |
| Ruolo 1: Attaccante                   |
| Ruolo 2: Centrocampista               |
+--------------------------------------+
| [Admin only]                          |
| Tipologia: Titolare/Riserva           |
| Valutazione generale: 4               |
| Visione di gioco: 5                   |
| Corsa: 4                              |
| Possesso: 3                           |
| Forma fisica: 5                        |
| Password: 1234                        |
| Email: mario@email.com (facoltativa)  |
+--------------------------------------+
Scheda partita
+------------------------------------+
| Scheda Partita                     |
+------------------------------------+
| Data: 14/02/2026                   |
| Orario: 20:00                       |
| Luogo: OGGIONA                       |
| Tipologia: 8 vs 8                     |
+------------------------------------+
| Stato: CREATA / COMPLETA / PUBBLICATA|
| Lista giocatori:                     |
| - Presente                            |
| - Forse                               |
| - Assente                             |
| - In attesa                            |
+------------------------------------+
| Squadre generate: ROSSI / BLU         |
| Pronostico risultato secco: 3-2       |
+------------------------------------+
| Dati partita chiusa:                  |
| - Gol, marcatori, cartellini, MVP    |
| - Aggiornamento statistiche           |
+------------------------------------+

