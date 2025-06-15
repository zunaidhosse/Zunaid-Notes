import JSZip from 'jszip';
import { DateTime } from 'luxon';
import * as storage from './storage.js';
import * as ui from './ui.js';

export async function createBackup(app) {
    try {
        const zip = new JSZip();
        const allData = storage.getAllData();
        
        zip.file("backup.json", JSON.stringify(allData, null, 2));
        
        const content = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
        
        const timestamp = DateTime.now().toFormat('yyyy-MM-dd_HH-mm-ss');
        const filename = `ZunaidNotes_Backup_${timestamp}.zip`;
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        app.playSound('add');
        alert(app.getTranslation('backupSuccess'));

    } catch (error) {
        console.error("Backup failed:", error);
        alert(`Backup failed: ${error.message}`);
    }
}

export function restoreBackup(app) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.zip,application/zip,application/x-zip-compressed';
    fileInput.style.display = 'none';

    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const zip = await JSZip.loadAsync(file);
            const backupFile = zip.file('backup.json');
            
            if (!backupFile) {
                throw new Error("backup.json not found in zip file.");
            }

            const content = await backupFile.async('string');
            const data = JSON.parse(content);
            
            const count = storage.restoreAllData(data);
            
            // Reload data into the app state
            app.notes = storage.loadNotes();
            app.categories = storage.loadCategories();
            
            // Re-render everything
            app.renderNotesList();
            ui.renderCategoriesList(app);
            
            app.playSound('add');
            alert(app.getTranslation('restoreSuccess', count));

        } catch (error) {
            console.error("Restore failed:", error);
            alert(app.getTranslation('restoreError'));
        } finally {
            document.body.removeChild(fileInput);
        }
    });

    document.body.appendChild(fileInput);
    fileInput.click();
}