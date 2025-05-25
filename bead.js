export class Bead {
    constructor(p, id, disciplineType, config) {
        this.p = p;
        this.id = id;
        this.disciplineType = disciplineType;
        this.config = config; // The specific discipline config from DISCIPLINES

        this.basePos = p.createVector(
            p.random(-GAME_SETTINGS.SCENE_BOUNDS, GAME_SETTINGS.SCENE_BOUNDS),
            p.random(-GAME_SETTINGS.SCENE_BOUNDS, GAME_SETTINGS.SCENE_BOUNDS),
            p.random(-GAME_SETTINGS.SCENE_BOUNDS, GAME_SETTINGS.SCENE_BOUNDS)
        );
        // Ensure beads are not too close to the center initially for better spread
        if (this.basePos.mag() < GAME_SETTINGS.SCENE_BOUNDS * 0.3) {
            this.basePos.normalize().mult(GAME_SETTINGS.SCENE_BOUNDS * p.random(0.3, 1.0));
        }

        this.pos = this.basePos.copy();
        this.size = this.config.size;
        this.baseColor = p.color(...this.config.color);
        this.currentColor = this.baseColor;
        this.isSelected = false;

        // For animation
        this.floatOffset = p.random(p.TWO_PI);
        this.floatSpeed = p.random(0.01, 0.03);
        this.floatAmplitude = p.random(5, 15);
        this.rotationAngle = p.random(p.TWO_PI);
        this.rotationSpeed = p.random(-0.005, 0.005);
    }

    update() {
        // Floating animation
        let floatY = this.p.sin(this.p.frameCount * this.floatSpeed + this.floatOffset) * this.floatAmplitude;
        this.pos.y = this.basePos.y + floatY;

        // Rotation (visualized by texture or lighting effects, subtle for plain sphere)
        this.rotationAngle += this.rotationSpeed;

        // Color based on selection
        if (this.isSelected) {
            // Pulsating glow effect for selected beads
            const glowFactor = (this.p.sin(this.p.frameCount * 0.1) + 1) / 2 * 50 + 20; // Brighter component
            this.currentColor = this.p.color(
                this.p.min(255, this.p.red(this.baseColor) + glowFactor),
                this.p.min(255, this.p.green(this.baseColor) + glowFactor),
                this.p.min(255, this.p.blue(this.baseColor) + glowFactor)
            );
        } else {
            this.currentColor = this.baseColor;
        }
    }

    display() {
        this.p.push();
        this.p.translate(this.pos.x, this.pos.y, this.pos.z);
        this.p.rotateY(this.rotationAngle); // Subtle rotation

        this.p.fill(this.currentColor);
        if (this.isSelected) {
            this.p.stroke(255, 255, 0); // Yellow outline for selected
            this.p.strokeWeight(2);
        } else {
            this.p.noStroke(); // Or a subtle dark stroke: p.stroke(50); p.strokeWeight(0.5);
        }
        
        this.p.sphere(this.size);
        this.p.pop();
    }

    setSelected(state) {
        this.isSelected = state;
    }

    // Gets 2D screen position of the bead's center
    getScreenPosition() {
        return this.p.createVector(
            this.p.screenX(this.pos.x, this.pos.y, this.pos.z),
            this.p.screenY(this.pos.x, this.pos.y, this.pos.z),
            this.p.screenZ(this.pos.x, this.pos.y, this.pos.z) // z is depth (0 to 1)
        );
    }

    // Check if mouse is over this bead (simplified 2D check)
    isMouseOver() {
        const screenPos = this.getScreenPosition();
        // Check if bead is in front of camera and not clipped by far plane
        if (screenPos.z < 0 || screenPos.z > 1) {
            return false;
        }

        // Approximate screen radius for clicking: size scales inversely with distance (z)
        // This is a rough heuristic; a proper projection of the sphere's radius would be more accurate.
        // For simplicity, we can use a dynamic click radius based on bead size and a factor.
        // The further the bead (larger screenPos.z), the smaller its apparent size.
        // A simpler approach: scale bead.size by a factor and compare in screen space.
        // Let's try a click radius that is somewhat related to its 3D size, adjusted by perspective.
        // A simpler method: use a fixed screen-space radius, or scale the 3D size a bit.
        // p.perspective() sets fovy. Default is PI/3.
        // projected_size = (size * p.height / 2) / (tan(PI/6) * screenPos.z_world_units)
        // screenPos.z is 0-1. We need world Z distance.
        // For now, a simpler heuristic:
        let clickRadius = this.size * 1.5; // Adjust this factor based on feel
        if (this.p.dist(this.p.mouseX, this.p.mouseY, screenPos.x, screenPos.y) < clickRadius) {
            return true;
        }
        return false;
    }
}

// Import GAME_SETTINGS for Bead class usage if needed directly, or pass through constructor
import { GAME_SETTINGS } from './config.js';
