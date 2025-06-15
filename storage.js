export const NOTES_KEY = 'zunaid-notes';
export const SETTINGS_KEY = 'zunaid-notes-settings';
export const CATEGORIES_KEY = 'zunaid-notes-categories';

export function saveNotes(notes) {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

export function loadNotes() {
    const savedNotes = localStorage.getItem(NOTES_KEY);
    return savedNotes ? JSON.parse(savedNotes) : [];
}

export function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadSettings(defaultSettings) {
    const savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (savedSettings) {
        return { ...defaultSettings, ...savedSettings };
    }
    return defaultSettings;
}

export function saveCategories(categories) {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

export function loadCategories() {
    const savedCategories = localStorage.getItem(CATEGORIES_KEY);
    return savedCategories ? JSON.parse(savedCategories) : [];
}

export function getAllData() {
    return {
        notes: loadNotes(),
        categories: loadCategories(),
    };
}

export function restoreAllData(data) {
    let importedNotesCount = 0;
    const existingNotes = loadNotes();
    let allCategories = loadCategories();
    
    // Category mapping: old ID from backup -> new ID in app
    const categoryIdMap = new Map();
    
    if (data.categories && Array.isArray(data.categories)) {
        const categoryNamesToIds = new Map(allCategories.map(c => [c.name.toLowerCase().trim(), c.id]));
        const newCategoriesToSave = [];

        data.categories.forEach(restoredCat => {
            if (!restoredCat.id || !restoredCat.name) return;
            const nameKey = restoredCat.name.toLowerCase().trim();
            
            if (categoryNamesToIds.has(nameKey)) {
                // Category with same name exists, map old ID to existing ID
                categoryIdMap.set(restoredCat.id, categoryNamesToIds.get(nameKey));
            } else {
                // New category, create it with a new ID
                const newId = crypto.randomUUID();
                newCategoriesToSave.push({ ...restoredCat, id: newId });
                categoryIdMap.set(restoredCat.id, newId);
                // Add to map to handle duplicates within the backup file itself
                categoryNamesToIds.set(nameKey, newId);
            }
        });
        
        if (newCategoriesToSave.length > 0) {
            allCategories = [...allCategories, ...newCategoriesToSave];
            saveCategories(allCategories);
        }
    }
    
    if (data.notes && Array.isArray(data.notes)) {
        // Create new notes for all notes in the backup to import them as "duplicates"
        const newNotes = data.notes.map(note => {
            // Find the new category ID, if it exists in our map
            const newCategoryId = note.categoryId ? categoryIdMap.get(note.categoryId) || null : null;

            return {
                ...note,
                id: crypto.randomUUID(), // Assign a new unique ID
                categoryId: newCategoryId, // Assign the re-mapped category ID
                // We preserve the original lastModified date from the backup
            };
        });
        
        const combinedNotes = [...existingNotes, ...newNotes].sort((a,b) => b.lastModified - a.lastModified);
        saveNotes(combinedNotes);
        importedNotesCount = newNotes.length;
    }
    
    return importedNotesCount;
}