// ================================
// STATISTICS VIEW COMPONENT
// ================================

import { store } from '../store.js';
import { 
    getLeaderboard, 
    getMatchesStats, 
    exportPlayersToExcel, 
    exportMatchesToExcel, 
    exportLeaderboardToExcel, 
    getPlayerYearlyStats, 
    exportStatsToXlsx,
    getPlayerStats,
    getRanks
} from '../stats.js';
import { getPlayerDisplayName, getPlayerInitials } from '../players.js';
import { STATI } from '../matches.js';

let currentPeriod = 'year'; // Default period

export async function renderStats(container, state) {
    const { players, matches } = state;
    const isAdmin = store.isAdmin();
    const matchStats = getMatchesStats(matches);

    let html = `
        <div class="page">
            <!-- Overview Stats -->
            <div class="section-header">
                <h2 class="section-title">Panoramica</h2>
            </div>
            
            <div class="stats-grid" style="margin-bottom: var(--spacing-6);">
                <div class="stat-card">
                    <div class="stat-value">${matchStats.totalMatches}</div>
                    <div class="stat-label">Partite giocate</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${matchStats.totalGoals}</div>
                    <div class="stat-label">Gol totali</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${matchStats.avgGoalsPerMatch}</div>
                    <div class="stat-label">Media gol/partita</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${players.length}</div>
                    <div class="stat-label">Giocatori</div>
                </div>
            </div>
            
            <!-- Win distribution -->
            <div class="card" style="margin-bottom: var(--spacing-6);">
                <div class="card-header">
                    <span class="card-title">Vincite squadre</span>
                </div>
                <div class="card-body">
                    <div style="display: flex; gap: var(--spacing-4); justify-content: center; text-align: center;">
                        <div>
                            <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-team-red-dark);">
                                ${matchStats.rossiWins}
                            </div>
                            <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">Rossi</div>
                        </div>
                        <div>
                            <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-text-muted);">
                                ${matchStats.draws}
                            </div>
                            <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">Pareggi</div>
                        </div>
                        <div>
                            <div style="font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-team-blue-dark);">
                                ${matchStats.bluWins}
                            </div>
                            <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">Blu</div>
                        </div>
                    </div>
                    ${matchStats.totalMatches > 0 ? `
                        <div style="margin-top: var(--spacing-4);">
                            <div style="display: flex; height: 8px; border-radius: var(--radius-full); overflow: hidden;">
                                <div style="width: ${matchStats.rossiWins / matchStats.totalMatches * 100}%; background: var(--color-team-red-dark);"></div>
                                <div style="width: ${matchStats.draws / matchStats.totalMatches * 100}%; background: var(--color-text-muted);"></div>
                                <div style="width: ${matchStats.bluWins / matchStats.totalMatches * 100}%; background: var(--color-team-blue-dark);"></div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- Leaderboard Controls -->
            <div class="leaderboard-controls">
                <div class="tabs" id="leaderboard-tabs" style="margin-bottom: 0; flex: 1; overflow-x: auto;">
                    <button class="tab active" data-category="ald_index">🔥 ALDINDEX</button>
                    <button class="tab" data-category="gol">⚽ Gol</button>
                    <button class="tab" data-category="mvp">🏆 MVP</button>
                    <button class="tab" data-category="presenze">👥 Presenze</button>
                    <button class="tab" data-category="vittorie">🥇 Vittorie</button>
                    <button class="tab" data-category="ammonizioni">🟨 Ammonizioni</button>
                </div>
                
                <select id="period-selector" class="form-control" style="width: auto; padding: var(--spacing-2) var(--spacing-4); border-radius: var(--radius-md); font-weight: 600; border: 2px solid var(--color-primary-100);">
                    <option value="year" ${currentPeriod === 'year' ? 'selected' : ''}>Anno ${new Date().getFullYear()}</option>
                    <option value="month" ${currentPeriod === 'month' ? 'selected' : ''}>Mese Corrente</option>
                </select>
            </div>
            
            <div id="leaderboard-container">
                ${renderLeaderboardContent(players, 'ald_index', matches, currentPeriod)}
            </div>
            
            ${isAdmin ? `
                <div style="margin-top: var(--spacing-6);">
                    <div class="section-header">
                        <h2 class="section-title">Esporta dati</h2>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: var(--spacing-3);">
                        <button class="btn btn-primary" id="export-all-xlsx-btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: var(--spacing-2); padding: var(--spacing-4);">
                            <span style="font-size: 1.2rem;">📊</span> Esporta Resoconto Completo (.xlsx)
                        </button>
                        <p style="font-size: var(--font-size-xs); color: var(--color-text-secondary); text-align: center;">
                            Genera un file Excel con Classifiche (ordinate per ALDINDEX) e Riepilogo Partite.
                        </p>
                    </div>
                </div>
            ` : ''}
        </div>
    `;

    container.innerHTML = html;

    // Tab switching
    document.querySelectorAll('#leaderboard-tabs .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('#leaderboard-tabs .tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const category = tab.dataset.category;
            const period = document.getElementById('period-selector').value;
            document.getElementById('leaderboard-container').innerHTML = renderLeaderboardContent(players, category, matches, period);
        });
    });

    // Period switching
    document.getElementById('period-selector')?.addEventListener('change', (e) => {
        currentPeriod = e.target.value;
        const activeTab = document.querySelector('#leaderboard-tabs .tab.active');
        const category = activeTab ? activeTab.dataset.category : 'ald_index';
        document.getElementById('leaderboard-container').innerHTML = renderLeaderboardContent(players, category, matches, currentPeriod);
    });

    // Export handlers
    if (isAdmin) {
        document.getElementById('export-all-xlsx-btn')?.addEventListener('click', () => {
            exportStatsToXlsx(players, matches);
        });
    }
}

function renderLeaderboardContent(players, category, matches, period) {
    const data = players.map(p => {
        const stats = getPlayerStats(p, matches, period);
        let value = 0;
        let secondary = null;

        switch (category) {
            case 'ald_index': value = stats.aldIndex; break;
            case 'gol': value = stats.gol; secondary = stats.mediaGol; break;
            case 'mvp': value = stats.mvpPoints; secondary = stats.mvpRate; break;
            case 'presenze': value = stats.presenze; secondary = stats.percentuale; break;
            case 'vittorie': value = stats.vittorie; secondary = stats.winRate; break;
            case 'ammonizioni': value = stats.ammonizioni; secondary = stats.badGuyRate; break;
        }

        return { player: p, value, secondary };
    })
    .filter(item => item.value > 0 || period === 'year') // Hide zeros in monthly view
    .sort((a, b) => b.value - a.value);

    if (data.length === 0) {
        return `
            <div class="card">
                <div class="card-body">
                    <div class="empty-state" style="padding: var(--spacing-6);">
                        <div class="empty-state-icon">📊</div>
                        <div class="empty-state-title">Nessun dato per questo periodo</div>
                        <p class="empty-state-text">Gioca una partita per comparire in classifica!</p>
                    </div>
                </div>
            </div>
        `;
    }

    const top3 = data.slice(0, 3);
    const rest = data.slice(3);
    const maxValue = data[0].value || 1;

    // Calculate trends
    const closedMatches = matches.filter(m => m.stato === STATI.CHIUSA).sort((a, b) => new Date(a.data) - new Date(b.data));
    const previousMatches = closedMatches.slice(0, -1);
    const currentRanks = getRanks(players, matches, category, period);
    const previousRanks = getRanks(players, previousMatches, category, period);

    return `
        ${renderPodium(top3, category)}
        <div class="card">
            <ul class="leaderboard">
                ${data.map((item, index) => renderLeaderboardItem(item, index, maxValue, currentRanks, previousRanks, category)).join('')}
            </ul>
        </div>
    `;
}

function renderPodium(top3, category) {
    if (top3.length === 0) return '';
    
    // Sort for display: 2nd, 1st, 3rd (handled by CSS order but good to have a logic)
    return `
        <div class="podium">
            ${top3.map((item, index) => {
                const rank = index + 1;
                return `
                    <div class="podium-item rank-${rank}">
                        <div class="podium-avatar">
                            ${rank === 1 ? '<span class="crown">👑</span>' : ''}
                            ${item.player.foto 
                                ? `<img src="${item.player.foto}" alt="${getPlayerDisplayName(item.player)}">`
                                : getPlayerInitials(item.player)
                            }
                        </div>
                        <div class="podium-name">${item.player.nome}</div>
                        <div class="podium-value">${item.value}</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderLeaderboardItem(item, index, maxValue, currentRanks, previousRanks, category) {
    const rank = index + 1;
    const player = item.player;
    const progress = (item.value / maxValue) * 100;
    
    const curRank = currentRanks[player.id];
    const prevRank = previousRanks[player.id];
    let trendHtml = '<span class="trend trend-stable">−</span>';
    
    if (prevRank && curRank) {
        if (curRank < prevRank) trendHtml = '<span class="trend trend-up">▲</span>';
        else if (curRank > prevRank) trendHtml = '<span class="trend trend-down">▼</span>';
    }

    let displayValue = item.value;
    if (item.secondary !== null) {
        const isAvg = category === 'gol';
        displayValue = `${item.value} <span style="font-size: 0.75rem; opacity: 0.6; font-weight: 400;">(${item.secondary}${isAvg ? '' : '%'})</span>`;
    }

    const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';

    return `
        <li class="leaderboard-item">
            <div class="ghost-bar" style="width: ${progress}%"></div>
            <div class="leaderboard-rank ${rankClass}">
                ${trendHtml}
                ${rank}
            </div>
            <div class="player-avatar" style="width: 36px; height: 36px; font-size: 0.9rem;">
                ${player.foto
                    ? `<img src="${player.foto}" alt="${getPlayerDisplayName(player)}">`
                    : getPlayerInitials(player)
                }
            </div>
            <div class="leaderboard-info">
                <div class="leaderboard-name">${getPlayerDisplayName(player)}</div>
            </div>
            <div class="leaderboard-value">${displayValue}</div>
        </li>
    `;
}

export default { renderStats };
