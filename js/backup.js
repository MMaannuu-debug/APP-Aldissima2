// ================================
// BACKUP & RESTORE MODULE
// ================================

import db from './db.js';
import { APP_VERSION } from './config.js';
import { showToast } from '../app.js';

/**
 * Tables to export/import in specific order to respect foreign keys
 */
const TABLES = [
    'players',
    'matches',
    'match_teams',
    'match_convocations',
    'match_events'
];

/**
 * EXPORT DATA TO JSON
 */
export async function exportDataToJSON() {
    try {
        const backupData = {
            metadata: {
                version: APP_VERSION,
                date: new Date().toISOString(),
                source: 'Calcetto Web App'
            },
            data: {}
        };

        // Fetch all data from all tables
        for (const table of TABLES) {
            backupData.data[table] = await db.getAll(table);
        }

        // Create and download file
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `backup_calcetto_${APP_VERSION}_${dateStr}.json`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return true;
    } catch (error) {
        console.error('Export error:', error);
        throw new Error('Errore durante l\'esportazione: ' + error.message);
    }
}

/**
 * IMPORT DATA FROM JSON
 */
export async function importDataFromJSON(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const backup = JSON.parse(e.target.result);

                // Basic validation
                if (!backup.metadata || !backup.data) {
                    throw new Error('Formato file non valido: metadata o dati mancanti.');
                }

                // Version check (warning only for now)
                if (backup.metadata.version !== APP_VERSION) {
                    console.warn(`Versione backup (${backup.metadata.version}) diversa dalla versione attuale (${APP_VERSION})`);
                }

                // Confirm destruction
                if (!confirm(`ATTENZIONE: Il ripristino cancellerà TUTTI i dati attuali.\nBackup del: ${new Date(backup.metadata.date).toLocaleString()}\nVersione: ${backup.metadata.version}\n\nProcedere?`)) {
                    resolve(false);
                    return;
                }

                showToast('Ripristino in corso...', 'info');

                // 1. Clear database (reusing existing reset logic which handles dependencies)
                await db.resetDatabase();

                const supabase = db.getClient ? db.getClient() : null;

                // 2. Import data in order
                for (const table of TABLES) {
                    const records = backup.data[table];
                    if (!records || records.length === 0) continue;

                    // If Supabase is active, use bulk insert
                    if (supabase) {
                        // We use direct supabase client to avoid single-record 'add' overhead
                        // and potential ID generation issues (we want to preserve IDs)
                        const { error } = await supabase.from(table).insert(records);
                        if (error) throw error;
                    } else {
                        // Fallback for localDB if needed (though project is on Supabase)
                        for (const record of records) {
                            await db.add(table, record);
                        }
                    }
                }

                showToast('Ripristino completato con successo!', 'success');
                setTimeout(() => location.reload(), 1500);
                resolve(true);

            } catch (error) {
                console.error('Import error:', error);
                reject(new Error('Errore durante il ripristino: ' + error.message));
            }
        };
        reader.onerror = () => reject(new Error('Errore nella lettura del file.'));
        reader.readAsText(file);
    });
}
