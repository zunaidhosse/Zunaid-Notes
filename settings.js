import * as ui from './ui.js';
import * as storage from './storage.js';
import * as backup from './backup.js';

export function applyInitialSettings(app) {
    // Apply settings on load
    ui.applyTheme(app);
    ui.applyFontSize(app);
    ui.applyLanguage(app);
}

export function saveSettings(app) {
    storage.saveSettings(app.settings);
}

export function handleThemeChange(app, e) {
    if(e.target.matches('[data-theme]')) {
        app.settings.theme = e.target.dataset.theme;
        app.playSound('click');
        ui.applyTheme(app);
        saveSettings(app);
    }
}

export function handleFontSizeChange(app, e) {
    if(e.target.matches('[data-font-size]')) {
        app.settings.fontSize = e.target.dataset.fontSize;
        app.playSound('click');
        ui.applyFontSize(app);
        saveSettings(app);
    }
}

export function handleLanguageChange(app, e) {
    if(e.target.matches('[data-lang]')) {
        app.settings.language = e.target.dataset.lang;
        app.playSound('click');
        ui.applyLanguage(app);
        app.renderNotesList(); // Re-render for date format changes
        saveSettings(app);
    }
}

export function toggleMainMenu(app) {
    app.playSound('click');
    app.elements.mainMenuDropdown.classList.toggle('hidden');
}

export function handleDocumentClickForMenu(app, event) {
    if (app.elements.mainMenuBtn && app.elements.mainMenuDropdown) {
        const isMenuButton = app.elements.mainMenuBtn.contains(event.target);
        const isInsideDropdown = app.elements.mainMenuDropdown.contains(event.target);
        if (!isMenuButton && !isInsideDropdown && !app.elements.mainMenuDropdown.classList.contains('hidden')) {
            app.elements.mainMenuDropdown.classList.add('hidden');
        }
    }
}

export function handleMenuAction(app, action) {
    switch(action) {
        case 'settings':
            ui.switchView(app, 'settings-view');
            break;
        case 'backup-restore':
            ui.switchView(app, 'backup-restore-view');
            break;
        case 'categories':
            ui.switchView(app, 'categories-view');
            break;
        case 'info':
            ui.switchView(app, 'info-view');
            break;
    }
}

export function handleMenuClick(app, event) {
    if (event.target.classList.contains('menu-item')) {
        const action = event.target.dataset.action;
        handleMenuAction(app, action);
        app.elements.mainMenuDropdown.classList.add('hidden');
    }
}

export function setupSettingsEventListeners(app) {
    // Menu
    app.elements.mainMenuBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleMainMenu(app);
    });
    app.elements.mainMenuDropdown.addEventListener('click', (event) => handleMenuClick(app, event));
    document.addEventListener('click', (event) => handleDocumentClickForMenu(app, event));

    // Settings view & other back buttons
    app.elements.settingsBackBtn.addEventListener('click', () => ui.switchView(app, 'notes-list-view'));
    app.elements.backupBackBtn.addEventListener('click', () => ui.switchView(app, 'notes-list-view'));
    app.elements.categoriesBackBtn.addEventListener('click', () => ui.switchView(app, 'notes-list-view'));
    app.elements.infoBackBtn.addEventListener('click', () => ui.switchView(app, 'notes-list-view'));

    // Settings options
    app.elements.themeOptions.addEventListener('click', (e) => handleThemeChange(app, e));
    app.elements.fontSizeOptions.addEventListener('click', (e) => handleFontSizeChange(app, e));
    app.elements.languageOptions.addEventListener('click', (e) => handleLanguageChange(app, e));
    
    // Backup/Restore buttons
    app.elements.createBackupBtn.addEventListener('click', () => backup.createBackup(app));
    app.elements.restoreBackupBtn.addEventListener('click', () => backup.restoreBackup(app));
}