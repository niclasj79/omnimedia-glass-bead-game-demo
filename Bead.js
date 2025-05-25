// Bead.js
export class Bead {
    constructor(p, id, disciplineType, config) {
        this.p = p;
        this.id = id;
        this.disciplineType = disciplineType;
        this.config = config;

        this.basePos = p.createVector(
            p.random(-GAME_SETTINGS.SCENE_BOUNDS, GAME_SETTINGS.SCENE_BOUNDS),
            p.random(-GAME_SETTINGS.SCENE_BOUNDS, GAME_SETTINGS.SCENE_BOUNDS),
            p.random(-GAME_SETTINGS.SCENE_BOUNDS, GAME_SETTINGS.SCENE_BOUNDS)
        );
        if (this.basePos.mag() < GAME_SETTINGS.SCENE_BOUNDS * 0.3) {
            this.basePos.normalize().mult(GAME_SETTINGS.SCENE_BOUNDS * p.random(0.3, 1.0));
        }

        this.pos = this.basePos.copy();
        this.size = this.config.size;
        this.baseColor = p.color(...this.config.color);
        this.currentColor = this.baseColor;
        this.isSelected = false;

        this.floatOffset = p.random(p.TWO_PI);
        this.floatSpeed = p.random(0.01, 0.03);
        this.floatAmplitude = p.random(5, 15);
        this.rotationAngle = p.random(p.TWO_PI);
        this.rotationSpeed = p.random(-0.005, 0.005);
    }

    update() { /* ... same as before ... */ }
    display() { /* ... same as before ... */ }
    setSelected(state) { /* ... same as before ... */ }

    getScreenPosition() {
        // Defensive check for valid position values
        if (this.pos == null || typeof this.pos.x !== 'number' || typeof this.pos.y !== 'number' || typeof this.pos.z !== 'number' ||
            isNaN(this.pos.x) || isNaN(this.pos.y) || isNaN(this.pos.z)) {
            console.error(`Bead ${this.id} has invalid or null position:`, this.pos);
            return this.p.createVector(-1000, -1000, 1000); // Return default off-screen
        }

        // Check if this.p and its methods exist BEFORE calling them
        if (!this.p || typeof this.p.screenX !== 'function' || typeof this.p.screenY !== 'function' || typeof this.p.screenZ !== 'function') {
            console.error(`Bead ${this.id}: p5 instance (this.p) or screenX/Y/Z methods are not available.`);
            // console.log("this.p is:", this.p);
            // if(this.p) {
            //     console.log("typeof this.p.screenX:", typeof this.p.screenX);
            // }
            return this.p.createVector(-1000, -1000, 1000); // Return default off-screen
        }
        
        return this.p.createVector(
            this.p.screenX(this.pos.x, this.pos.y, this.pos.z),
            this.p.screenY(this.pos.x, this.pos.y, this.pos.z),
            this.p.screenZ(this.pos.x, this.pos.y, this.pos.z)
        );
    }

    isMouseOver() {
        const screenPos = this.getScreenPosition();
        // If screenPos is the default off-screen vector due to an error above, this check will fail.
        if (screenPos.x === -1000 && screenPos.y === -1000) {
            return false; // Error occurred in getScreenPosition
        }

        if (screenPos.z < 0 || screenPos.z > 1) {
            return false;
        }

        let clickRadius = this.size * 2.0; // Kept increased radius for testing
        let d = this.p.dist(this.p.mouseX, this.p.mouseY, screenPos.x, screenPos.y);

        if (d < clickRadius) {
            console.log(`%c Bead ${this.id} (${this.config.name}) IS MOUSE OVER! (dist: ${d.toFixed(1)}, radius: ${clickRadius.toFixed(1)})`, "color: lightgreen; font-weight: bold;");
            return true;
        }
        return false;
    }
}
import { GAME_SETTINGS } from './config.js'; // Keep this import
