const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const upload = document.getElementById('upload');
const zoomInButton = document.getElementById('zoom-in');
const zoomOutButton = document.getElementById('zoom-out');
const exportJsonButton = document.getElementById('export-json');
const deleteModeButton = document.getElementById('delete-mode');
const brightnessIncreaseButton = document.getElementById('brightness-increase');
const brightnessDecreaseButton = document.getElementById('brightness-decrease');
const contrastIncreaseButton = document.getElementById('contrast-increase');
const contrastDecreaseButton = document.getElementById('contrast-decrease');

let img = new Image();
let zoomScale = 1;
let lines = [];
let deleteMode = false;
let brightness = 1;
let contrast = 1;
let startX, startY;
let currentLineId = null;
let nextLineId = 1;

upload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = function(event) {
        img.src = event.target.result;
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            drawImage();
        };
    };
    reader.readAsDataURL(file);
});

canvas.addEventListener('mousedown', (e) => {
    if (deleteMode) return;
    
    startX = e.offsetX / zoomScale;
    startY = e.offsetY / zoomScale;
    currentLineId = { id: nextLineId++, startX, startY, line: null };
});

canvas.addEventListener('mousemove', (e) => {
    if (deleteMode || currentLineId === null) return;

    const endX = e.offsetX / zoomScale;
    const endY = e.offsetY / zoomScale;
    drawImage();
    drawLines();
    ctx.beginPath();
    ctx.moveTo(currentLineId.startX * zoomScale, currentLineId.startY * zoomScale);
    ctx.lineTo(endX * zoomScale, endY * zoomScale);
    ctx.stroke();
});

canvas.addEventListener('mouseup', (e) => {
    if (deleteMode || currentLineId === null) return;

    const endX = e.offsetX / zoomScale;
    const endY = e.offsetY / zoomScale;
    const lineLength = Math.sqrt(Math.pow(endX - currentLineId.startX, 2) + Math.pow(endY - currentLineId.startY, 2));
    lines.push({
        id: currentLineId.id,
        startX: currentLineId.startX * zoomScale,
        startY: currentLineId.startY * zoomScale,
        endX: endX * zoomScale,
        endY: endY * zoomScale,
        length: lineLength * zoomScale
    });
    currentLineId = null;
    drawLines();
});

canvas.addEventListener('click', (e) => {
    if (!deleteMode) return;

    const x = e.offsetX / zoomScale;
    const y = e.offsetY / zoomScale;
    const tolerance = 5;

    lines = lines.filter(line => {
        const { startX, startY, endX, endY } = line;
        const distanceToLine = Math.abs((endY - startY) * x - (endX - startX) * y + endX * startY - endY * startX) / Math.sqrt(Math.pow(endY - startY, 2) + Math.pow(endX - startX, 2));
        return distanceToLine > tolerance;
    });
    
    drawLines();
});

zoomInButton.addEventListener('click', () => {
    zoomScale *= 1.2;
    drawImage();
});

zoomOutButton.addEventListener('click', () => {
    zoomScale /= 1.2;
    drawImage();
});

deleteModeButton.addEventListener('click', () => {
    deleteMode = !deleteMode;
    deleteModeButton.textContent = deleteMode ? 'Disable Eraser Mode' : 'Enable Eraser Mode';
});

brightnessIncreaseButton.addEventListener('click', () => {
    brightness += 0.1;
    drawImage();
});

brightnessDecreaseButton.addEventListener('click', () => {
    brightness = Math.max(0, brightness - 0.1);
    drawImage();
});

contrastIncreaseButton.addEventListener('click', () => {
    contrast += 0.1;
    drawImage();
});

contrastDecreaseButton.addEventListener('click', () => {
    contrast = Math.max(0, contrast - 0.1);
    drawImage();
});

exportJsonButton.addEventListener('click', () => {
    const linesData = { lines: lines.map(line => ({
        id: line.id,
        start: { x: Math.round(line.startX / zoomScale), y: Math.round(line.startY / zoomScale) },
        end: { x: Math.round(line.endX / zoomScale), y: Math.round(line.endY / zoomScale) },
        length: Math.round(line.length / zoomScale)
    })) };
    const blob = new Blob([JSON.stringify(linesData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'annotations.json';
    a.click();
    URL.revokeObjectURL(url);
});

function drawImage() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply brightness and contrast
    ctx.filter = `brightness(${brightness}) contrast(${contrast})`;
    ctx.drawImage(img, 0, 0, img.width * zoomScale, img.height * zoomScale);
    ctx.filter = 'none'; // Reset filter for further drawing
}

function drawLines() {
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'red';
    lines.forEach(line => {
        ctx.beginPath();
        ctx.moveTo(line.startX, line.startY);
        ctx.lineTo(line.endX, line.endY);
        ctx.stroke();
        ctx.fillStyle = 'black';
        ctx.fillText(`ID: ${line.id}, Length: ${Math.round(line.length)} px`, line.startX + 5, line.startY - 5);
    });
}
