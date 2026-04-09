const fs = require('fs');
const path = require('path');

const epPath = path.join(__dirname, 'src/modules/writing/data/expectedPaths.json');
let ep = JSON.parse(fs.readFileSync(epPath, 'utf8'));

const Y_TOP = 0.25;
const Y_MID = 0.50;
const Y_BASE = 0.75;
const X_S = 0.55; // Left edge of tracing zone
const W = 0.15; // Width of a letter

// To avoid bezier bulging artifacts, we'll map exact coordinates in tight segments.
// AlphabetTracer will automatically smooth them via makeCurve=true.

const letterA = [
    {x: X_S+W*0.8, y: Y_MID+0.05}, // Start top right
    {x: X_S+W*0.4, y: Y_MID},      // Top dead center (clamped)
    {x: X_S,       y: Y_MID+0.12}, // Left edge
    {x: X_S+W*0.4, y: Y_BASE},     // Bottom dead center (clamped)
    {x: X_S+W*0.8, y: Y_MID+0.12}, // Right edge
    {x: X_S+W*0.8, y: Y_MID+0.05}, // Back to start
    {x: X_S+W*0.8, y: Y_BASE},     // Straight down to baseline
    {x: X_S+W*1.2, y: Y_BASE-0.05} // Tail flick
];

const letterB = [
    {x: X_S,       y: Y_BASE-0.05}, 
    {x: X_S+W*0.6, y: Y_TOP+0.05},  // Tall loop right edge
    {x: X_S+W*0.4, y: Y_TOP},       // Top
    {x: X_S+W*0.2, y: Y_TOP+0.05},  // Left edge of loop
    {x: X_S+W*0.4, y: Y_BASE},      // Bottom baseline
    {x: X_S+W*0.8, y: Y_BASE-0.05}, // U shape curve up
    {x: X_S+W*0.8, y: Y_MID+0.05},  // U shape top
    {x: X_S+W*0.6, y: Y_MID+0.05},  // Loop inward
    {x: X_S+W*1.0, y: Y_MID+0.02}   // Tail flick right
];

const letterC = [
    {x: X_S+W*0.8, y: Y_MID+0.05}, 
    {x: X_S+W*0.4, y: Y_MID},
    {x: X_S,       y: Y_MID+0.12},
    {x: X_S+W*0.4, y: Y_BASE},
    {x: X_S+W*0.9, y: Y_BASE-0.05}
];

const genericLoop = (yTop, yBot) => [
   {x: X_S,       y: Y_BASE-0.05},
   {x: X_S+W*0.5, y: (yTop+Y_BASE)/2},
   {x: X_S+W*0.5, y: yTop},
   {x: X_S+W*0.5, y: yBot},
   {x: X_S+W*0.5, y: Y_BASE},
   {x: X_S+W*1.0, y: Y_BASE-0.05}
];

const dictionary = {
    a: letterA,
    b: letterB,
    c: letterC,
    d: [
        {x: X_S+W*0.8, y: Y_MID+0.05},
        {x: X_S+W*0.4, y: Y_MID},
        {x: X_S,       y: Y_MID+0.12},
        {x: X_S+W*0.4, y: Y_BASE},
        {x: X_S+W*0.8, y: Y_MID+0.12},
        {x: X_S+W*0.8, y: Y_TOP},
        {x: X_S+W*0.8, y: Y_BASE},
        {x: X_S+W*1.2, y: Y_BASE-0.05}
    ],
    e: [
        {x: X_S,       y: Y_BASE-0.05},
        {x: X_S+W*0.8, y: Y_MID+0.1},
        {x: X_S+W*0.4, y: Y_MID},
        {x: X_S,       y: Y_BASE-0.05},
        {x: X_S+W*0.4, y: Y_BASE},
        {x: X_S+W*0.8, y: Y_BASE-0.05}
    ],
    f: genericLoop(Y_TOP, Y_BASE+0.15),
    // Use generic approximations clamped fully for the rest temporarily.
    g: genericLoop(Y_MID, Y_BASE+0.15),
    h: genericLoop(Y_TOP, Y_BASE),
    i: genericLoop(Y_MID, Y_BASE),
    j: genericLoop(Y_MID, Y_BASE+0.15),
    k: genericLoop(Y_TOP, Y_BASE),
    l: genericLoop(Y_TOP, Y_BASE),
    m: genericLoop(Y_MID, Y_BASE),
    n: genericLoop(Y_MID, Y_BASE),
    o: genericLoop(Y_MID, Y_BASE),
    p: genericLoop(Y_MID, Y_BASE+0.15),
    q: genericLoop(Y_MID, Y_BASE+0.15),
    r: genericLoop(Y_MID, Y_BASE),
    s: genericLoop(Y_MID, Y_BASE),
    t: genericLoop(Y_TOP, Y_BASE),
    u: genericLoop(Y_MID, Y_BASE),
    v: genericLoop(Y_MID, Y_BASE),
    w: genericLoop(Y_MID, Y_BASE),
    x: genericLoop(Y_MID, Y_BASE),
    y: genericLoop(Y_MID, Y_BASE+0.15),
    z: genericLoop(Y_MID, Y_BASE+0.15),
};

// Midpoint densification matches exact SVG Path quadratic curve behavior 
function densifyPath(pts, segmentsPerCurve = 10) {
    if (pts.length < 3) return pts;
    
    let path = [];
    path.push(pts[0]);
    
    for (let i = 1; i < pts.length - 1; i++) {
        // SVG Logic: Q controls to p[i], ends at mid(p[i], p[i+1])
        const p0 = i === 1 ? pts[0] : { 
            x: (pts[i-1].x + pts[i].x) / 2, 
            y: (pts[i-1].y + pts[i].y) / 2 
        };
        const p1 = pts[i];
        const p2 = i === pts.length - 2 ? pts[pts.length - 1] : { 
            x: (pts[i].x + pts[i+1].x) / 2, 
            y: (pts[i].y + pts[i+1].y) / 2 
        };
        
        // Sample standard Quadratic Bezier
        for (let t = 0; t <= 1; t += 1/segmentsPerCurve) {
            const mt = 1 - t;
            path.push({
                x: mt*mt*p0.x + 2*mt*t*p1.x + t*t*p2.x,
                y: mt*mt*p0.y + 2*mt*t*p1.y + t*t*p2.y
            });
        }
    }
    path.push(pts[pts.length - 1]);
    return path;
}

const merged = { ...ep };
for (const [key, value] of Object.entries(dictionary)) {
    merged[`cursive_${key}_1`] = densifyPath(value, 15);
}

fs.writeFileSync(epPath, JSON.stringify(merged, null, 2));
console.log('Successfully saved highly dense cursive structures to JSON output bounds.');
