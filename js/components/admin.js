// ================================
// ADMIN COMPONENT
// ================================

import { store } from '../store.js';
import db from '../db.js';
import { getPlayerDisplayName, getPlayerInitials } from '../players.js';
import { showToast, refreshCurrentPage } from '../../app.js';
import { escapeHtml } from '../utils.js';
import { APP_VERSION, DB_TYPE } from '../config.js';
import { exportDataToJSON, importDataFromJSON } from '../backup.js';
import { getDatabaseUsage } from '../db-usage.js';

export async function renderAdmin(container, state) {
    console.log('Rendering Admin Page...', { version: APP_VERSION, db: DB_TYPE });
    const { players } = state;

    // Get DB usage data
    const dbUsage = await getDatabaseUsage();

    // Sort by name
    const sortedPlayers = [...players].sort((a, b) => a.nome.localeCompare(b.nome));

    let html = `
        <div class="page">
            <div class="section-header">
                <h2 class="section-title">Amministrazione</h2>
            </div>
            
            <!-- Quick Actions -->
            <div class="admin-section">
                <h3 style="margin-bottom: var(--spacing-3);">Azioni rapide</h3>
                <div style="display: flex; flex-wrap: wrap; gap: var(--spacing-2);">
                    <button class="admin-btn" id="admin-create-match">
                        <span class="admin-btn-icon">📊</span>
                        <span class="admin-btn-label">Nuova partita</span>
                    </button>
                    <button class="admin-btn" id="admin-create-player">
                        <span class="admin-btn-icon">👤</span>
                        <span class="admin-btn-label">Nuovo giocatore</span>
                    </button>
                    <button class="admin-btn" id="admin-export-json">
                        <span class="admin-btn-icon">💾</span>
                        <span class="admin-btn-label">Backup JSON</span>
                    </button>
                    <button class="admin-btn" id="admin-import-json">
                        <span class="admin-btn-icon">📥</span>
                        <span class="admin-btn-label">Ripristina</span>
                    </button>
                    <button class="admin-btn" id="admin-export">
                        <span class="admin-btn-icon">📦</span>
                        <span class="admin-btn-label">Excel (View)</span>
                    </button>
                    <button class="admin-btn" id="admin-clear-data">
                        <span class="admin-btn-icon">🗑️</span>
                        <span class="admin-btn-label">Reset dati</span>
                    </button>
                </div>
                
                <!-- Hidden file input for restore -->
                <input type="file" id="admin-restore-file" accept=".json" style="display: none;">
                
                <button class="btn btn-secondary btn-sm" id="admin-generate-test" style="width: 100%; border-style: dashed; margin-top: var(--spacing-3);">
                     <span>🧪 Genera Dati Test (20 Giocatori + Storico)</span>
                </button>
            </div>
            
            <!-- User Management -->
            <div class="admin-section">
                <h3 style="margin-bottom: var(--spacing-3);">Gestione utenti</h3>
                <div class="card">
                    <div class="card-body" style="padding: 0;">
                        ${sortedPlayers.length > 0 ? sortedPlayers.map(player => `
                            <div class="player-item">
                                <div class="player-avatar" style="width: 40px; height: 40px;">
                                    ${player.foto ? `<img src="${player.foto}">` : getPlayerInitials(player)}
                                </div>
                                <div class="player-info">
                                    <div class="player-name">${getPlayerDisplayName(player)}</div>
                                    <div class="player-role" style="display: flex; gap: var(--spacing-2); align-items: center; margin-top: 4px;">
                                        <span class="role-badge ${escapeHtml(player.ruolo || 'operatore')}">${escapeHtml(player.ruolo || 'operatore')}</span>
                                        <span style="font-family: monospace; background: var(--color-primary-50); color: var(--color-primary-dark); padding: 2px 8px; border-radius: var(--radius-sm); font-size: 0.75rem; font-weight: 700;">PWD: ••••</span>
                                        ${player.bloccato ? '<span style="color: var(--color-error); font-size: var(--font-size-xs);">🔒 Bloccato</span>' : ''}
                                    </div>
                                </div>
                                <div class="list-actions">
                                    <select class="role-select" data-player-id="${player.id}" style="padding: var(--spacing-1) var(--spacing-2); font-size: var(--font-size-sm); border-radius: var(--radius-sm);">
                                        <option value="operatore" ${player.ruolo === 'operatore' ? 'selected' : ''}>Operatore</option>
                                        <option value="supervisore" ${player.ruolo === 'supervisore' ? 'selected' : ''}>Supervisore</option>
                                        <option value="admin" ${player.ruolo === 'admin' ? 'selected' : ''}>Admin</option>
                                    </select>
                                    <button class="btn-icon block-btn" data-player-id="${player.id}" data-blocked="${player.bloccato ? 'true' : 'false'}" title="${player.bloccato ? 'Sblocca' : 'Blocca'}">
                                        ${player.bloccato ? '🔓' : '🔒'}
                                    </button>
                                </div>
                            </div>
                        `).join('') : `
                            <div class="empty-state">
                                <p>Nessun giocatore registrato</p>
                            </div>
                        `}
                    </div>
                </div>
            </div>
            
            <!-- Info -->
            <div class="admin-section">
                <div class="card">
                    <div class="card-body">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--spacing-2);">
                            <h4 style="margin: 0;">ℹ️ Info sistema</h4>
                            <button id="admin-refresh-db-usage" class="btn btn-icon" title="Aggiorna stima spazio" style="padding: 4px; font-size: 0.9rem;">🔄</button>
                        </div>
                        <p style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: var(--spacing-3);">
                            Calcetto Manager ${APP_VERSION}<br>
                            Database: ${DB_TYPE} (cloud)<br>
                            Giocatori: ${players.length}<br>
                            Partite: ${state.matches.length}
                        </p>

                        <h4 style="margin-bottom: var(--spacing-2); font-size: 0.9rem;">Utilizzo Database (Piano Free 500MB)</h4>
                        <div style="background: var(--color-bg-secondary); border-radius: var(--radius-sm); height: 8px; width: 100%; margin-bottom: var(--spacing-1); overflow: hidden;">
                            <div style="background: ${dbUsage?.error ? 'var(--color-error)' : (parseFloat(dbUsage?.percentage) > 80 ? 'var(--color-error)' : 'var(--color-primary)')}; width: ${dbUsage?.percentage || 0}%; height: 100%; transition: width 0.3s ease;"></div>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--color-text-secondary);">
                            <span>${dbUsage?.error ? 'Errore' : (dbUsage ? `${dbUsage.mb} MB` : 'In calcolo...')}</span>
                            <span>${dbUsage?.error ? '-' : (dbUsage ? `${dbUsage.percentage}%` : '-')}</span>
                        </div>
                        <div style="font-size: 0.65rem; color: var(--color-text-muted); margin-top: 4px; text-align: right;">
                            ${dbUsage?.error ? `<span style="color: var(--color-error)">Riconnetti Supabase</span>` : `Ultimo aggiornamento: ${dbUsage?.lastUpdate || 'mai'}`}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Event handlers

    // Create match
    document.getElementById('admin-create-match')?.addEventListener('click', async () => {
        const { renderMatchForm } = await import('./matchCard.js');
        renderMatchForm(null);
    });

    // Create player
    document.getElementById('admin-create-player')?.addEventListener('click', async () => {
        const { renderPlayerForm } = await import('./playerCard.js');
        renderPlayerForm(null);
    });

    // Export Excel
    document.getElementById('admin-export')?.addEventListener('click', async () => {
        const { exportPlayersToExcel, exportMatchesToExcel } = await import('../stats.js');
        exportPlayersToExcel(players);
        setTimeout(() => exportMatchesToExcel(state.matches), 500);
        showToast('Esportazione Excel avviata', 'success');
    });

    // Backup JSON
    document.getElementById('admin-export-json')?.addEventListener('click', async () => {
        try {
            await exportDataToJSON();
            showToast('Backup JSON creato con successo', 'success');
        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    // Import JSON (triggers file selection)
    const fileInput = document.getElementById('admin-restore-file');
    document.getElementById('admin-import-json')?.addEventListener('click', () => {
        if (confirm('ATTENZIONE: Il ripristino sovrascriverà i dati attuali con quelli contenuti nel file JSON. Vuoi procedere con la selezione del file?')) {
            fileInput.click();
        }
    });

    fileInput?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!confirm(`Sei sicuro di voler importare i dati dal file "${file.name}"? Tutta la configurazione attuale verrà sostituita.`)) {
            fileInput.value = '';
            return;
        }

        try {
            await importDataFromJSON(file);
            // Reload happens inside importDataFromJSON
        } catch (error) {
            showToast(error.message, 'error');
            fileInput.value = ''; // Reset input
        }
    });

    // Clear data
    document.getElementById('admin-clear-data')?.addEventListener('click', async () => {
        if (!confirm('Sei sicuro di voler cancellare TUTTI i dati? Questa azione non può essere annullata!')) return;
        if (!confirm('CONFERMA FINALE: Tutti i giocatori, partite e statistiche verranno eliminati!')) return;

        try {
            showToast('Reset in corso...', 'info');
            await db.resetDatabase();
            showToast('Database resettato con successo', 'success');
            setTimeout(() => location.reload(), 1000);
        } catch (error) {
            showToast('Errore durante il reset: ' + error.message, 'error');
        }
    });

    // Generate Test Data
    document.getElementById('admin-generate-test')?.addEventListener('click', async () => {
        if (!confirm('Vuoi generare 20 giocatori titolari (pwd 9999) e uno storico partite?')) return;
        if (!confirm('ATTENZIONE: Questi dati verranno AGGIUNTI a quelli esistenti. Vuoi procedere comunque?')) return;

        try {
            showToast('Generazione in corso...', 'info');
            const { generateTestPlayers, generateTestMatches } = await import('../testDataGenerator.js');
            await generateTestPlayers(20);
            await generateTestMatches(10);
            showToast('Dati di test generati con successo!', 'success');
            setTimeout(() => location.reload(), 1500);
        } catch (error) {
            console.error(error);
            showToast('Errore generazione dati: ' + error.message, 'error');
        }
    });

    // Role change
    document.querySelectorAll('.role-select').forEach(select => {
        select.addEventListener('change', async () => {
            const playerId = select.dataset.playerId;
            const newRole = select.value;

            try {
                await db.update('players', playerId, { ruolo: newRole });
                const players = await db.getAll('players');
                store.setState({ players });
                showToast('Ruolo aggiornato', 'success');
                refreshCurrentPage();
            } catch (error) {
                showToast('Errore: ' + error.message, 'error');
            }
        });
    });

    // Block/unblock
    document.querySelectorAll('.block-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const playerId = btn.dataset.playerId;
            const isBlocked = btn.dataset.blocked === 'true';

            try {
                await db.update('players', playerId, { bloccato: !isBlocked });
                const players = await db.getAll('players');
                store.setState({ players });
                showToast(isBlocked ? 'Utente sbloccato' : 'Utente bloccato', 'success');
                refreshCurrentPage();
            } catch (error) {
                showToast('Errore: ' + error.message, 'error');
            }
        });
    });

    // Refresh DB Usage
    document.getElementById('admin-refresh-db-usage')?.addEventListener('click', async () => {
        try {
            showToast('Aggiornamento stima spazio...', 'info');
            await getDatabaseUsage(true);
            showToast('Spazio database aggiornato', 'success');
            refreshCurrentPage();
        } catch (error) {
            showToast('Errore durante l\'aggiornamento: ' + error.message, 'error');
        }
    });
}

export default { renderAdmin };
