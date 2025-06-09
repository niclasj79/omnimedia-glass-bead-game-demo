import { DISCIPLINES, GAME_SETTINGS } from './config.js';
import { Bead } from './Bead.js';

let beads = [];
let selectedBeads = [];
let links = [];
let activeTextOverlays = [];
let activeVisualEffects = [];

let synth; // Keep declaration
let audioContextReady = false; // Track audio readiness
let isMuted = false;
let linkedCount = 0;

let p5instance;

let loadingScreen, infoPanel, disciplineLegend, muteButton, resetButton, linkedCountDisplay, maxLinksDisplay, textOverlayContainer;
let cam;
let initialDriftComplete = false;
let targetCameraPosition;
let startCameraPosition;

const sketch = (p) => {
    p5instance = p;

    // Function to initialize synth once audio context is ready
    function tryInitSynth() {
        if (p.getAudioContext().state === 'running' && !audioContextReady) {
            if (p.PolySynth) { // Check if PolySynth constructor exists
                synth = new p.PolySynth();
                console.log("PolySynth initialized.");
                audioContextReady = true;
            } else {
                console.error("p5.PolySynth not available. p5.sound may not have loaded correctly or is not ready yet.");
            }
        } else if (audioContextReady) {
            // console.log("Synth already initialized or audio context was ready.");
        } else {
            // console.log("Audio context not running yet, synth not initialized.");
        }
    }

    p.preload = () => {
        // No synth initialization here
    };

    p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL);
        p.pixelDensity(p.min(p.devicePixelRatio, 1.5));
        p.disableFriendlyErrors = true;

        cam = p.createCamera();
        p.camera(0, 0, GAME_SETTINGS.INITIAL_CAMERA_DISTANCE, 0, 0, 0, 0, 1, 0);
        startCameraPosition = p.createVector(0, 0, GAME_SETTINGS.INITIAL_CAMERA_DISTANCE);
        targetCameraPosition = p.createVector(0, 0, GAME_SETTINGS.INITIAL_CAMERA_DISTANCE / 2);

        loadingScreen = p.select('#loading-screen');
        infoPanel = p.select('#info-panel');
        disciplineLegend = p.select('#discipline-legend');
        muteButton = p.select('#mute-button');
        resetButton = p.select('#reset-button');
        linkedCountDisplay = p.select('#linked-count');
        maxLinksDisplay = p.select('#max-links-display');
        textOverlayContainer = p.select('#text-overlay-container');

        muteButton.mousePressed(toggleMute);
        resetButton.mousePressed(resetGame);
        
        populateLegend();
        resetGame();

        // Attempt to start audio context
        p.userStartAudio().then(() => {
            console.log("Audio context gesture acknowledged by userStartAudio.");
            tryInitSynth(); // Attempt to initialize synth now
        }).catch(e => {
            console.error("Audio context failed to start via userStartAudio:", e);
            // We'll also try in mousePressed
        });

        setTimeout(() => {
            if (loadingScreen) loadingScreen.style('opacity', '0');
            setTimeout(() => {
                if (loadingScreen) loadingScreen.style('display', 'none');
                if (infoPanel) infoPanel.style('display', 'block');
            }, 1000);
        }, 500);
    };

    function populateLegend() {
        if (!disciplineLegend) return;
        disciplineLegend.html('');
        for (const key in DISCIPLINES) {
            const d = DISCIPLINES[key];
            const li = p.createElement('li');
            const colorBox = p.createElement('span');
            colorBox.addClass('legend-color-box');
            colorBox.style('background-color', `rgb(${d.color[0]},${d.color[1]},${d.color[2]})`);
            colorBox.parent(li);
            const nameSpan = p.createSpan(d.name);
            nameSpan.parent(li);
            li.parent(disciplineLegend);
        }
    }
    p.easeOutCubic = (t) => { return 1 - Math.pow(1 - t, 3); };
    let driftFrame = 0;
    function initialCameraDrift() {
        const total = GAME_SETTINGS.CAMERA_DRIFT_FRAMES;
        if (driftFrame <= total) {
            const t = p.easeOutCubic(driftFrame / total);
            const x = p.lerp(startCameraPosition.x, targetCameraPosition.x, t);
            const y = p.lerp(startCameraPosition.y, targetCameraPosition.y, t);
            const z = p.lerp(startCameraPosition.z, targetCameraPosition.z, t);
            cam.setPosition(x, y, z);
            cam.lookAt(0, 0, 0);
            driftFrame++;
        } else {
            initialDriftComplete = true;
        }
    }


    p.draw = () => {
        p.background(30, 30, 40); 

        if (!initialDriftComplete) {
            initialCameraDrift();
        } else {
            p.orbitControl(2,2,0.1); 
        }
        
        p.ambientLight(100);
        p.directionalLight(255, 255, 255, 0.5, 0.5, -1);
        p.pointLight(200, 200, 255, 0, 0, 300);

        beads.forEach(bead => {
            bead.update();
            bead.display();
        });

        drawLinks();
        handleActiveEffects();
        updateTextOverlays();
    };

    function generateBeads() {
        beads = [];
        const keys = Object.keys(DISCIPLINES);
        for (let i = 0; i < GAME_SETTINGS.NUM_BEADS; i++) {
            const type = keys[Math.floor(p.random(keys.length))];
            const bead = new Bead(p, i, type, DISCIPLINES[type]);
            beads.push(bead);
        }
    }
    function resetGame() {
        // audioContextReady = false; // No, don't reset this, context stays running
        generateBeads();
        selectedBeads = [];
        links = [];
        linkedCount = 0;
        initialDriftComplete = false;
        p.camera(0, 0, GAME_SETTINGS.INITIAL_CAMERA_DISTANCE, 0, 0, 0, 0, 1, 0);

        if (linkedCountDisplay) linkedCountDisplay.html(linkedCount);
        if (maxLinksDisplay) maxLinksDisplay.html(GAME_SETTINGS.MAX_LINKS_BEFORE_RESET);
        
        if (textOverlayContainer) textOverlayContainer.html('');
        activeTextOverlays = [];
        activeVisualEffects = [];
        console.log("Game Reset");
    }
    function drawLinks() {
        p.stroke(255);
        p.strokeWeight(2);
        links.forEach(l => {
            p.line(l.bead1.pos.x, l.bead1.pos.y, l.bead1.pos.z,
                   l.bead2.pos.x, l.bead2.pos.y, l.bead2.pos.z);
        });
    }
    function handleActiveEffects() {
        const now = p.millis();
        activeVisualEffects = activeVisualEffects.filter(e => {
            const elapsed = now - e.start;
            if (elapsed < GAME_SETTINGS.LINK_EFFECT_DURATION) {
                const alpha = p.map(elapsed, 0, GAME_SETTINGS.LINK_EFFECT_DURATION, 255, 0);
                p.push();
                p.stroke(255, 255, 200, alpha);
                p.strokeWeight(4);
                p.line(e.bead1.pos.x, e.bead1.pos.y, e.bead1.pos.z,
                       e.bead2.pos.x, e.bead2.pos.y, e.bead2.pos.z);
                p.pop();
                return true;
            }
            return false;
        });
    }
    function updateTextOverlays() {
        const now = p.millis();
        activeTextOverlays = activeTextOverlays.filter(o => {
            const elapsed = now - o.start;
            if (elapsed < GAME_SETTINGS.TEXT_SNIPPET_DURATION) {
                const screen1 = o.bead1.getScreenPosition();
                const screen2 = o.bead2.getScreenPosition();
                const x = (screen1.x + screen2.x) / 2;
                const y = (screen1.y + screen2.y) / 2;
                o.element.style('left', `${x}px`);
                o.element.style('top', `${y}px`);
                let opacity = 1;
                const fade = 500;
                if (elapsed < fade) opacity = elapsed / fade;
                else if (elapsed > GAME_SETTINGS.TEXT_SNIPPET_DURATION - fade)
                    opacity = (GAME_SETTINGS.TEXT_SNIPPET_DURATION - elapsed) / fade;
                o.element.style('opacity', opacity);
                return true;
            }
            o.element.remove();
            return false;
        });
    }

    p.mousePressed = () => {
        console.log("mousePressed event fired at X:", p.mouseX, "Y:", p.mouseY);
        
        if (p.getAudioContext().state !== 'running') {
            console.log("AudioContext state is:", p.getAudioContext().state, "- Attempting to resume.");
            p.getAudioContext().resume().then(() => {
                console.log("AudioContext successfully resumed on click!");
                tryInitSynth(); // Attempt to initialize synth now
            }).catch(e => {
                console.error("AudioContext resume failed on click:", e);
            });
        } else {
            // console.log("AudioContext already running.");
            tryInitSynth(); // Still try, in case it failed earlier but context is now running
        }

        if (infoPanel && infoPanel.elt && infoPanel.style('display') !== 'none' &&
            p.mouseX < infoPanel.elt.offsetWidth + 20 && p.mouseY < infoPanel.elt.offsetHeight + 20) {
             console.log("Clicked on info panel, ignoring for bead selection.");
             return;
        }

        let clickedBead = null;
        let minZ = Infinity;

        for (const bead of beads) {
            if (bead.isMouseOver()) { 
                const screenPos = bead.getScreenPosition();
                if (screenPos.z < minZ && screenPos.z >= 0) { // ensure bead is in front
                    minZ = screenPos.z;
                    clickedBead = bead;
                }
            }
        }

        if (clickedBead) {
            console.log("Clicked bead ID:", clickedBead.id, clickedBead.config.name);
            handleBeadSelection(clickedBead);
        } else {
            console.log("No bead clicked at this position / or bead behind camera.");
        }
    };
    p.touchStarted = p.mousePressed; // Make touch use the same logic for now

    function handleBeadSelection(bead) {
        if (selectedBeads.includes(bead)) {
            bead.setSelected(false);
            selectedBeads = selectedBeads.filter(b => b !== bead);
            return;
        }

        bead.setSelected(true);
        selectedBeads.push(bead);

        if (selectedBeads.length === 2) {
            createLink(selectedBeads[0], selectedBeads[1]);
            selectedBeads.forEach(b => b.setSelected(false));
            selectedBeads = [];
        }
    }

    function createLink(bead1, bead2) {
        const linkExists = links.some(l => 
            (l.bead1 === bead1 && l.bead2 === bead2) || (l.bead1 === bead2 && l.bead2 === bead1)
        );
        if (linkExists) return;

        links.push({ bead1, bead2 });
        linkedCount++;
        if (linkedCountDisplay) linkedCountDisplay.html(linkedCount);

        triggerMultimediaReveal(bead1, bead2); // This will use 'synth'

        if (linkedCount >= GAME_SETTINGS.MAX_LINKS_BEFORE_RESET) {
            console.log("Max links reached. Resetting game.");
            setTimeout(resetGame, GAME_SETTINGS.LINK_EFFECT_DURATION + 1000);
        }
    }

    function triggerMultimediaReveal(bead1, bead2) {
        if (!isMuted && synth && audioContextReady) { // Check synth and audioContextReady
            console.log("Playing sound with synth.");
            const notes = [60, 64, 67, 72, 76];
            const note1 = notes[Math.floor(p.random(notes.length))];
            synth.play(p.midiToFreq(note1), 0.6, 0, 0.5);
        } else if (!isMuted) {
            console.warn("Synth not ready or muted, no sound played.");
        }

        activeVisualEffects.push({ start: p.millis(), bead1, bead2 });
        const discipline1 = DISCIPLINES[bead1.disciplineType];
        const discipline2 = DISCIPLINES[bead2.disciplineType];
        const textToShow = p.random(discipline1.textPool) + "<br><br>... resonates with ...<br><br>" + p.random(discipline2.textPool);
        const textElement = p.createElement('div', textToShow);
        textElement.addClass('text-snippet');
        textElement.parent(textOverlayContainer); 
        activeTextOverlays.push({
            start: p.millis(),
            bead1,
            bead2,
            element: textElement
        });
    }

    function toggleMute() {
        isMuted = !isMuted;
        if (muteButton) muteButton.html(isMuted ? 'Unmute' : 'Mute');
    }
    p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
    };
};

new p5(sketch);
