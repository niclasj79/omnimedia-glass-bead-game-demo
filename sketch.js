import { DISCIPLINES, GAME_SETTINGS } from './config.js';
import { Bead } from './Bead.js';

let beads = [];
let selectedBeads = [];
let links = [];
let activeTextOverlays = []; // { element, creationTime, duration, bead1, bead2 }
let activeVisualEffects = []; // { type, bead1, bead2, creationTime, duration }

let synth;
let isMuted = false;
let linkedCount = 0;

let p5instance; // To make p5 instance available globally for DOM manipulation if needed

// UI Elements
let loadingScreen, infoPanel, disciplineLegend, muteButton, resetButton, linkedCountDisplay, maxLinksDisplay, textOverlayContainer;

// Camera variables
let cam;
let initialDriftComplete = false;
let targetCameraPosition;
let startCameraPosition;

const sketch = (p) => {
    p5instance = p;

    p.preload = () => {
        // p5.sound requires user interaction to start AudioContext on some browsers.
        // This will be handled by the first click.
        // Create synth here, but it might not be usable until after first interaction.
        synth = new p.PolySynth();
    };

    p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL);
        p.pixelDensity(p.min(p.devicePixelRatio, 1.5)); // F7 Mobile requirement
        p.disableFriendlyErrors = true; // Performance

        cam = p.createCamera(); // Use a p5.Camera object for more control
        // Standard orbitControl uses the default camera. 
        // For custom initial animation, we manage the camera ourselves or use orbitControl's internals if possible.
        // p5's orbitControl() is simpler; let's stick to that and set initial state.
        // orbitControl() implicitly creates and manages its own camera state on the default renderer camera.
        // We can set the initial camera position using camera() before the first draw call where orbitControl() acts.
        p.camera(0, 0, GAME_SETTINGS.INITIAL_CAMERA_DISTANCE, 0, 0, 0, 0, 1, 0);
        startCameraPosition = p.createVector(0, 0, GAME_SETTINGS.INITIAL_CAMERA_DISTANCE);
        targetCameraPosition = p.createVector(0, 0, GAME_SETTINGS.INITIAL_CAMERA_DISTANCE / 2); // Closer view


        // Initialize UI elements
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
        resetGame(); // Generates beads and resets state

        // Start audio context on first user gesture (essential for some browsers)
        p.userStartAudio().then(() => {
            console.log("Audio context started.");
        }).catch(e => console.error("Audio context failed to start:", e));

        // Initial "title dissolve" and camera drift setup
        setTimeout(() => {
            if (loadingScreen) loadingScreen.style('opacity', '0');
            setTimeout(() => {
                if (loadingScreen) loadingScreen.style('display', 'none');
                if (infoPanel) infoPanel.style('display', 'block');
            }, 1000); // Match CSS transition
        }, 500); // Small delay before starting fade
    };

    function populateLegend() {
        if (!disciplineLegend) return;
        disciplineLegend.html(''); // Clear existing
        for (const key in DISCIPLINES) {
            const disc = DISCIPLINES[key];
            const li = p.createElement('li');
            const colorBox = p.createElement('span');
            colorBox.addClass('legend-color-box');
            colorBox.style('background-color', `rgb(${disc.color[0]}, ${disc.color[1]}, ${disc.color[2]})`);
            li.child(colorBox);
            li.child(p.createSpan(`${disc.name}`));
            disciplineLegend.child(li);
        }
    }
    
    function initialCameraDrift() {
        if (initialDriftComplete) return;

        let currentFrame = p.frameCount; // Assuming setup runs at frame 0 or 1
        if (currentFrame < GAME_SETTINGS.CAMERA_DRIFT_FRAMES) {
            const lerpAmount = p.map(currentFrame, 0, GAME_SETTINGS.CAMERA_DRIFT_FRAMES, 0, 1);
            const currentCamZ = p.lerp(startCameraPosition.z, targetCameraPosition.z, p.easeOutCubic(lerpAmount));
            p.camera(0, 0, currentCamZ, 0, 0, 0, 0, 1, 0);
        } else {
            initialDriftComplete = true;
            // After drift, enable orbitControl. If orbitControl is called every frame,
            // it will override this. So, we only call orbitControl if drift is complete.
        }
    }

    // Easing function for smoother animation
    p.easeOutCubic = (t) => { return 1 - Math.pow(1 - t, 3); };

    p.draw = () => {
        p.background(30, 30, 40); // Dark blue/grey background

        if (!initialDriftComplete) {
            initialCameraDrift();
        } else {
            p.orbitControl(2,2,0.1); // Enable orbit control after initial drift. Adjust sensitivity.
        }
        
        p.ambientLight(100);
        p.directionalLight(255, 255, 255, 0.5, 0.5, -1); // Main light
        p.pointLight(200, 200, 255, 0, 0, 300); // A subtle fill light

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
        const disciplineKeys = Object.keys(DISCIPLINES);
        for (let i = 0; i < GAME_SETTINGS.NUM_BEADS; i++) {
            const disciplineKey = disciplineKeys[i % disciplineKeys.length]; // Cycle through disciplines
            const bead = new Bead(p, i, disciplineKey, DISCIPLINES[disciplineKey]);
            beads.push(bead);
        }
    }

    function resetGame() {
        generateBeads();
        selectedBeads = [];
        links = [];
        linkedCount = 0;
        initialDriftComplete = false; // Re-trigger camera drift
        p.camera(0, 0, GAME_SETTINGS.INITIAL_CAMERA_DISTANCE, 0, 0, 0, 0, 1, 0); // Reset camera for drift

        if (linkedCountDisplay) linkedCountDisplay.html(linkedCount);
        if (maxLinksDisplay) maxLinksDisplay.html(GAME_SETTINGS.MAX_LINKS_BEFORE_RESET);
        
        // Clear any existing text overlays and visual effects
        if (textOverlayContainer) textOverlayContainer.html('');
        activeTextOverlays = [];
        activeVisualEffects = [];

        console.log("Game Reset");
    }

    function drawLinks() {
        p.strokeWeight(1.5);
        links.forEach(link => {
            const b1 = link.bead1;
            const b2 = link.bead2;
            // Simple line for now, PRD mentions "animated energy line"
            p.stroke(200, 200, 255, 180); // Light blue, semi-transparent
            p.line(b1.pos.x, b1.pos.y, b1.pos.z, b2.pos.x, b2.pos.y, b2.pos.z);
        });
    }

    function handleActiveEffects() {
        // Visual burst effect (simplified: background flash)
        let flashIntensity = 0;
        activeVisualEffects = activeVisualEffects.filter(effect => {
            const age = p.millis() - effect.creationTime;
            if (age > effect.duration) return false;

            if (effect.type === 'burst') {
                // Simple flash: quickly increase then fade
                const progress = age / effect.duration;
                // Make it brighter at the beginning
                flashIntensity = p.max(flashIntensity, p.sin(progress * p.PI) * 80); // Sine wave for smooth flash
            }
            return true;
        });

        if (flashIntensity > 0) {
            p.push();
            // This will draw over everything in screen space
            p.resetMatrix(); // Go to screen coordinates
            p.fill(255, 255, 220, flashIntensity * 0.8); // Yellowish white flash
            p.rect(0, 0, p.width, p.height);
            p.pop();
        }
    }
    
    function updateTextOverlays() {
        const now = p.millis();
        activeTextOverlays.forEach(overlay => {
            const age = now - overlay.creationTime;
            if (age > overlay.duration) {
                overlay.element.style.opacity = '0'; // Start fade out
                setTimeout(() => { 
                    if (overlay.element.parentNode) {
                        overlay.element.parentNode.removeChild(overlay.element);
                    }
                }, 500); // Match CSS transition
            } else if (age < 500) { // Fade in
                overlay.element.style.opacity = '1';
            }

            // Update position (in case beads move, though they mostly float vertically)
            const midPoint3D = p5.Vector.lerp(overlay.bead1.pos, overlay.bead2.pos, 0.5);
            const screenPos = p.createVector(
                p.screenX(midPoint3D.x, midPoint3D.y, midPoint3D.z),
                p.screenY(midPoint3D.x, midPoint3D.y, midPoint3D.z)
            );
            
            // Keep within screen bounds somewhat
            const clampedX = p.constrain(screenPos.x, 50, p.width - 50);
            const clampedY = p.constrain(screenPos.y, 50, p.height - 50);

            overlay.element.style.left = `${clampedX}px`;
            overlay.element.style.top = `${clampedY}px`;
        });
        // Remove faded out overlays from active list
        activeTextOverlays = activeTextOverlays.filter(overlay => (now - overlay.creationTime) <= (overlay.duration + 500));
    }


    p.mousePressed = () => {
        if (p.getAudioContext().state !== 'running') {
            p.getAudioContext().resume();
        }
        
        // Prevent click handling if mouse is over UI elements (simple check)
        if (p.mouseX < (infoPanel?.width || 0) + 20 && p.mouseY < (infoPanel?.height || 0) + 20 && infoPanel?.style('display') !== 'none') {
             return; // Click was on info panel
        }


        let clickedBead = null;
        let minZ = Infinity; // For picking the front-most bead if overlapping

        for (const bead of beads) {
            if (bead.isMouseOver()) {
                const screenPos = bead.getScreenPosition();
                // screenPos.z is depth (0 near, 1 far). Pick bead closer to camera.
                if (screenPos.z < minZ) {
                    minZ = screenPos.z;
                    clickedBead = bead;
                }
            }
        }

        if (clickedBead) {
            handleBeadSelection(clickedBead);
        }
    };
    // Use touchStarted for mobile, often mousePressed works for simple taps too
    p.touchStarted = () => {
        if (p.getAudioContext().state !== 'running') {
            p.getAudioContext().resume();
        }
        // Basic check to avoid conflict with UI elements on touch
        if (infoPanel && p.mouseX < infoPanel.elt.offsetWidth + 20 && p.mouseY < infoPanel.elt.offsetHeight + 20 && infoPanel.style('display') !== 'none') {
            return;
        }
        
        // Simplified touch handling (first touch point)
        // More robust touch handling would iterate p.touches
        if (p.touches.length > 0) {
            // Use mouseX/Y as p5 updates them for touches too
            let clickedBead = null;
            let minZ = Infinity;
            for (const bead of beads) {
                if (bead.isMouseOver()) { // isMouseOver uses p.mouseX/Y
                    const screenPos = bead.getScreenPosition();
                    if (screenPos.z < minZ) {
                        minZ = screenPos.z;
                        clickedBead = bead;
                    }
                }
            }
            if (clickedBead) {
                handleBeadSelection(clickedBead);
            }
        }
        // Prevent default touch behavior like scrolling/zooming page if interacting with canvas
        // return false; // Might be too aggressive if orbitControl needs default behaviors
    };


    function handleBeadSelection(bead) {
        bead.setSelected(!bead.isSelected);

        if (bead.isSelected) {
            if (!selectedBeads.includes(bead)) {
                selectedBeads.push(bead);
            }
        } else {
            selectedBeads = selectedBeads.filter(b => b !== bead);
        }

        if (selectedBeads.length === 2) {
            createLink(selectedBeads[0], selectedBeads[1]);
            selectedBeads.forEach(b => b.setSelected(false));
            selectedBeads = [];
        } else if (selectedBeads.length > 2) {
            // Too many selected, deselect oldest ones, keep last two.
            // Or simpler: deselect all but the current one.
            // For now, just deselect the first one and keep the new one and the one before it.
            // This logic is a bit complex. PRD says "Two active selections auto-draw".
            // A simpler rule: if >2 selected, clear all and select just the new one.
            // Or: the first selected bead is deselected, and the list shifts.
            // Let's follow: if you click a 3rd, the 1st one is deselected.
            const firstSelected = selectedBeads.shift();
            firstSelected.setSelected(false);
        }
    }

    function createLink(bead1, bead2) {
        // Avoid duplicate links (optional, good for robustness)
        const linkExists = links.some(l => 
            (l.bead1 === bead1 && l.bead2 === bead2) || (l.bead1 === bead2 && l.bead2 === bead1)
        );
        if (linkExists) return;

        links.push({ bead1, bead2 });
        linkedCount++;
        if (linkedCountDisplay) linkedCountDisplay.html(linkedCount);

        triggerMultimediaReveal(bead1, bead2);

        if (linkedCount >= GAME_SETTINGS.MAX_LINKS_BEFORE_RESET) {
            // "Bloom" effect is complex. For now, just show a message and reset.
            console.log("Max links reached. Resetting game.");
            setTimeout(resetGame, GAME_SETTINGS.LINK_EFFECT_DURATION + 1000); // Reset after effects
        }
    }

    function triggerMultimediaReveal(bead1, bead2) {
        // 1. Audio Sample (Simplified)
        if (!isMuted && synth) {
            const notes = [60, 64, 67, 72, 76]; // MIDI notes for a pentatonic scale
            const note1 = notes[Math.floor(p.random(notes.length))];
            // const note2 = notes[Math.floor(p.random(notes.length))]; // Could play two notes
            synth.play(p.midiToFreq(note1), 0.6, 0, 0.5); // note, amp, delay, duration
            // synth.play(p.midiToFreq(note2), 0.4, 0.05, 0.5);
        }

        // 2. Shader-driven fractal burst (Simplified: visual effect)
        activeVisualEffects.push({
            type: 'burst',
            bead1: bead1,
            bead2: bead2,
            creationTime: p.millis(),
            duration: GAME_SETTINGS.LINK_EFFECT_DURATION
        });
        
        // 3. Overlay text fragment
        const discipline1 = DISCIPLINES[bead1.disciplineType];
        const discipline2 = DISCIPLINES[bead2.disciplineType];
        const textToShow = p.random(discipline1.textPool) + "<br><br>... resonates with ...<br><br>" + p.random(discipline2.textPool);
        
        const textElement = p.createElement('div', textToShow);
        textElement.addClass('text-snippet');
        textElement.parent(textOverlayContainer); // Add to the specific container

        activeTextOverlays.push({
            element: textElement.elt, // Store the raw DOM element
            creationTime: p.millis(),
            duration: GAME_SETTINGS.TEXT_SNIPPET_DURATION,
            bead1: bead1, // For positioning
            bead2: bead2  // For positioning
        });
    }

    function toggleMute() {
        isMuted = !isMuted;
        muteButton.html(isMuted ? "Unmute" : "Mute");
        if (isMuted) {
            // Stop any ongoing sounds if p5.sound allows (e.g., masterVolume(0))
            // For PolySynth, it stops new notes. Existing ones might finish.
        }
        console.log(isMuted ? "Audio Muted" : "Audio Unmuted");
    }

    p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        // Recalculate camera aspect if necessary, though p5 handles much of this
    };
};

new p5(sketch);
