export const DISCIPLINES = {
    PHILOSOPHY: { 
        name: "Philosophy", 
        color: [100, 80, 180], // Deep purple
        size: 25, 
        textPool: [
            "The only true wisdom is in knowing you know nothing. - Socrates",
            "Man is condemned to be free. - Sartre",
            "He who has a why to live can bear almost any how. - Nietzsche"
        ] 
    },
    MUSIC: { 
        name: "Music", 
        color: [60, 120, 220], // Vibrant blue
        size: 30, 
        textPool: [
            "Music expresses that which cannot be said and on which it is impossible to be silent. - Victor Hugo",
            "Without music, life would be a mistake. - Nietzsche",
            "Where words fail, music speaks. - Hans Christian Andersen"
        ] 
    },
    MATHEMATICS: { 
        name: "Mathematics", 
        color: [255, 190, 0], // Golden yellow
        size: 20, 
        textPool: [
            "Mathematics is the music of reason. - James Joseph Sylvester",
            "The only way to learn mathematics is to do mathematics. - Paul Halmos",
            "God created the integers; all else is the work of man. - Kronecker"
        ] 
    },
    PHYSICS: { 
        name: "Physics", 
        color: [0, 180, 180], // Teal
        size: 28, 
        textPool: [
            "Imagination is more important than knowledge. - Albert Einstein",
            "The universe is under no obligation to make sense to you. - Neil deGrasse Tyson",
            "What we observe is not nature itself, but nature exposed to our method of questioning. - Heisenberg"
        ] 
    },
    LITERATURE: { 
        name: "Literature", 
        color: [200, 50, 80], // Crimson
        size: 26, 
        textPool: [
            "All the world's a stage, and all the men and women merely players. - Shakespeare",
            "The unexamined life is not worth living. - Socrates (via Plato)", // Often attributed, good for lit context
            "It is a far, far better thing that I do, than I have ever done. - Dickens"
        ]  
    },
    VISUAL_ARTS: { 
        name: "Visual Arts", 
        color: [255, 120, 30], // Orange
        size: 32, 
        textPool: [
            "Every child is an artist. The problem is how to remain an artist once he grows up. - Picasso",
            "Art washes away from the soul the dust of everyday life. - Picasso",
            "Color is my day-long obsession, joy and torment. - Monet"
        ] 
    },
    COMPUTER_SCIENCE: { 
        name: "Computer Science", 
        color: [50, 200, 100], // Emerald
        size: 22, 
        textPool: [
            "The computer was born to solve problems that did not exist before. - Bill Gates", // A bit ironic, but fits
            "Programs must be written for people to read, and only incidentally for machines to execute. - Abelson & Sussman",
            "The question of whether a computer can think is no more interesting than the question of whether a submarine can swim. - Dijkstra"
        ] 
    },
};

export const GAME_SETTINGS = {
    NUM_BEADS: 50, // Target 50-75
    SCENE_BOUNDS: 350, // How far beads can be placed from origin
    MAX_LINKS_BEFORE_RESET: 8,
    INITIAL_CAMERA_DISTANCE: 800,
    CAMERA_DRIFT_FRAMES: 120, // Approx 2 seconds at 60fps
    TEXT_SNIPPET_DURATION: 4000, // ms
    LINK_EFFECT_DURATION: 2000, // ms for visual burst
};
