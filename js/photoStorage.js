// ================================
// PHOTO STORAGE MODULE
// Carica le foto giocatore su Supabase Storage invece di salvarle
// in base64 dentro la tabella `players`.
// ================================

import db from './db.js';

const BUCKET = 'avatars';
const MAX_SIZE = 400;          // lato massimo in pixel
const JPEG_QUALITY = 0.7;
const CACHE_SECONDS = '31536000'; // 1 anno: il nome file cambia a ogni upload

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Errore lettura file'));
        reader.readAsDataURL(file);
    });
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Errore caricamento immagine'));
        img.src = src;
    });
}

// source: File oppure stringa data:image/...;base64,...
async function resizeToBlob(source) {
    const src = typeof source === 'string' ? source : await fileToDataUrl(source);
    const img = await loadImage(src);

    const scale = Math.min(1, MAX_SIZE / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; // evita sfondo nero con PNG trasparenti
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Errore compressione immagine'))),
            'image/jpeg',
            JPEG_QUALITY
        );
    });
}

/**
 * Ridimensiona e carica la foto su Storage. Ritorna l'URL pubblico
 * da salvare nella colonna `foto` di `players`.
 */
export async function uploadPlayerPhoto(source, playerKey = 'player') {
    const supabase = db.getClient();
    if (!supabase) throw new Error('Supabase non disponibile');

    const blob = await resizeToBlob(source);
    const path = `${playerKey}_${Date.now()}.jpg`;

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: 'image/jpeg', cacheControl: CACHE_SECONDS });
    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
}

/**
 * MIGRAZIONE UNA TANTUM: sposta su Storage tutte le foto ancora in base64.
 * Da lanciare dalla console del browser, sull'app aperta (vedi istruzioni).
 * Prima fai un "Backup JSON" dalla pagina Admin.
 */
export async function migratePhotosToStorage() {
    const supabase = db.getClient();
    if (!supabase) throw new Error('Supabase non disponibile');

    const { data: rows, error } = await supabase
        .from('players')
        .select('id, foto')
        .like('foto', 'data:image%');
    if (error) throw error;

    console.log(`Foto da migrare: ${rows.length}`);
    let ok = 0;
    let failed = 0;

    for (const row of rows) {
        try {
            const url = await uploadPlayerPhoto(row.foto, row.id);
            const { error: updError } = await supabase
                .from('players')
                .update({ foto: url })
                .eq('id', row.id);
            if (updError) throw updError;
            ok++;
            console.log(`OK ${ok}/${rows.length}`, row.id);
        } catch (e) {
            failed++;
            console.error('Errore migrazione', row.id, e);
        }
    }

    console.log(`Migrazione finita. Riuscite: ${ok}, fallite: ${failed}`);
    return { ok, failed };
}

export default { uploadPlayerPhoto, migratePhotosToStorage };
