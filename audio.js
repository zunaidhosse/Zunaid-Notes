export async function init(app) {
    const initAudioContext = () => {
        if (app.audioContext) return;
        try {
            app.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (app.audioContext.state === 'suspended') {
                app.audioContext.resume();
            }
            loadAllSounds(app);
            console.log("AudioContext initialized.");
        } catch (e) {
            console.error("Web Audio API is not supported in this browser", e);
        }
        document.body.removeEventListener('pointerdown', initAudioContext);
    };
    document.body.addEventListener('pointerdown', initAudioContext, { once: true });
}

async function loadSound(app, name, url) {
    if (!app.audioContext) {
        console.warn("AudioContext not ready, cannot load sound:", name);
        return;
    }
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await app.audioContext.decodeAudioData(arrayBuffer);
        app.sounds[name] = audioBuffer;
    } catch (e) {
        console.error(`Failed to load sound: ${name} from ${url}`, e);
    }
}

function loadAllSounds(app) {
    const soundsToLoad = {
        'click': './click.mp3',
        'swoosh': './swoosh.mp3',
        'add': './add.mp3',
        'delete': './delete.mp3',
        'open_modal': './open_modal.mp3',
        'close_modal': './close_modal.mp3'
    };
    for (const [name, url] of Object.entries(soundsToLoad)) {
        loadSound(app, name, url);
    }
}

export function playSound(app, name) {
    if (!app.audioContext || !app.sounds[name] || app.audioContext.state !== 'running') {
        if (app.audioContext && app.audioContext.state !== 'running') {
            app.audioContext.resume(); // Try to resume context if it's suspended
        }
        return;
    }
    try {
        const source = app.audioContext.createBufferSource();
        source.buffer = app.sounds[name];
        source.connect(app.audioContext.destination);
        source.start(0);
    } catch (e) {
        console.error(`Error playing sound: ${name}`, e);
    }
}