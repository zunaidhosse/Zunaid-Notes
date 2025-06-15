import { getTranslation as i18n } from './translations.js';
import { debounce } from './utils.js';
import * as ui from './ui.js';
import * as notes from './notes.js';
import * as editor from './editor.js';
import * as settings from './settings.js';
import * as storage from './storage.js';
import * as categories from './categories.js';
import * as audio from './audio.js';

const App = {
    // --- STATE ---
    notes: [],
    categories: [],
    currentNoteId: null,
    activeView: 'notes-list-view',
    currentSearchTerm: '',
    notesListScrollPosition: 0,
    settings: {
        theme: 'light',
        fontSize: 'medium',
        language: 'en'
    },
    editHistory: {
        stack: [],
        currentIndex: -1,
        noteId: null,
        MAX_HISTORY: 50,
    },
    audioContext: null,
    sounds: {},
    debouncedAddToHistory: null,
    elements: {},
    deferredPrompt: null,

    // --- INITIALIZATION ---
    init() {
        audio.init(this);
        this.setupPWA(); // Set up PWA features
        ui.cacheDOMElements(this);
        this.settings = storage.loadSettings(this.settings);
        this.notes = storage.loadNotes();
        this.categories = storage.loadCategories();

        settings.applyInitialSettings(this);
        
        this.attachEventListeners();
        
        this.renderNotesList();
        ui.renderCategoriesList(this);
        this.debouncedAddToHistory = debounce((content) => editor.addToHistory(this, content), 400);
    },

    // --- PWA SETUP ---
    // এই ফাংশনটি Progressive Web App (PWA) এর কার্যকারিতা সেটআপ করে।
    // এর দুটি প্রধান কাজ:
    // ১. Service Worker রেজিস্টার করা, যা অফলাইন ব্যবহারের জন্য ফাইল ক্যাশ করে।
    // ২. ব্যবহারকারীকে অ্যাপ ইনস্টল করার জন্য একটি ব্যানার বা প্রম্পট দেখানো।
    setupPWA() {
        // ১. Service Worker রেজিস্টার করা:
        // 'serviceWorker' in navigator চেক করে নিশ্চিত করা হয় যে ব্রাউজারটি এটি সমর্থন করে কিনা।
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('service-worker.js')
                    .then(registration => {
                        console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    })
                    .catch(err => {
                        console.error('ServiceWorker registration failed: ', err);
                    });

                navigator.serviceWorker.ready.then(() => {
                    const isInitialized = localStorage.getItem('zunaid-notes-initialized');
                    if (!isInitialized) {
                        localStorage.setItem('zunaid-notes-initialized', 'true');
                        setTimeout(() => {
                            ui.showModal(this, {
                                title: this.getTranslation('appReadyTitle'),
                                contentHTML: `<p>${this.getTranslation('appReadyBody')}</p>`,
                                confirmText: this.getTranslation('ok'),
                                cancelText: ''
                            });
                        }, 500);
                    }
                });
            });
        }

        // ২. অ্যাপ ইনস্টলেশন প্রম্পট:
        // 'beforeinstallprompt' ইভেন্টটি ব্রাউজার দ্বারা ফায়ার করা হয় যখন PWA ইনস্টলযোগ্য হয়।
        // আমরা এই ইভেন্টটিকে ধরে ফেলি যাতে ডিফল্ট প্রম্পটটি দেখানো না হয়।
        window.addEventListener('beforeinstallprompt', (e) => {
            // ডিফল্ট ব্রাউজার প্রম্পটটি প্রতিরোধ করা হচ্ছে।
            e.preventDefault();
            // আমরা ইভেন্টটিকে একটি ভেরিয়েবলে (this.deferredPrompt) সংরক্ষণ করি,
            // যাতে আমরা পরে ব্যবহারকারীর সুবিধার সময়ে প্রম্পটটি দেখাতে পারি।
            this.deferredPrompt = e;
            // এখন আমরা আমাদের কাস্টম ইনস্টল ব্যানারটি দেখাই।
            if (this.elements.installBanner) {
                document.body.classList.add('install-banner-visible');
                this.elements.installBanner.classList.remove('hidden');
                ui.applyLanguage(this); // ব্যানারটির লেখা সঠিক ভাষায় অনুবাদ করা হচ্ছে।
            }
        });
    },

    // --- EVENT LISTENERS ---
    attachEventListeners() {
        notes.setupNotesEventListeners(this);
        editor.setupEditorEventListeners(this);
        settings.setupSettingsEventListeners(this);
        categories.setupCategoriesEventListeners(this);

        // PWA Install Listeners
        if (this.elements.installBtn) {
            this.elements.installBtn.addEventListener('click', () => {
                // যদি কোনো সংরক্ষিত প্রম্পট না থাকে, তবে কিছুই করার নেই।
                if (!this.deferredPrompt) return;
                // ব্যানারটি লুকিয়ে ফেলা হচ্ছে কারণ ব্যবহারকারী ইনস্টল করতে সম্মত হয়েছে।
                document.body.classList.remove('install-banner-visible');
                this.elements.installBanner.classList.add('hidden');
                // সংরক্ষিত প্রম্পটটি (deferredPrompt) দেখানো হচ্ছে।
                this.deferredPrompt.prompt();
                // ব্যবহারকারী "Install" বা "Cancel" এ ক্লিক করার পর ফলাফল দেখা হচ্ছে।
                this.deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('User accepted the install prompt');
                    } else {
                        console.log('User dismissed the install prompt');
                    }
                    // প্রম্পটটি একবার ব্যবহার করার পর এটিকে null করে দেওয়া হয়।
                    this.deferredPrompt = null;
                });
            });
        }
        
        if (this.elements.installDismissBtn) {
            this.elements.installDismissBtn.addEventListener('click', () => {
                document.body.classList.remove('install-banner-visible');
                this.elements.installBanner.classList.add('hidden');
            });
        }
    },

    // --- CORE METHODS (BRIDGES) ---
    saveNotes() {
        localStorage.setItem('zunaid-notes', JSON.stringify(this.notes));
    },

    renderNotesList() {
        ui.renderNotesList(this);
    },

    getTranslation(key, ...args) {
        return i18n(this.settings.language, key, ...args);
    },

    playSound(name) {
        audio.playSound(this, name);
    },
};

document.addEventListener('DOMContentLoaded', () => App.init());