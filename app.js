const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const upload = document.getElementById('upload');
const exportJsonButton = document.getElementById('export-json');
const deleteModeButton = document.getElementById('delete-mode');
const brightnessIncreaseButton = document.getElementById('brightness-increase');
const brightnessDecreaseButton = document.getElementById('brightness-decrease');
const contrastIncreaseButton = document.getElementById('contrast-increase');
const contrastDecreaseButton = document.getElementById('contrast-decrease');

let img = new Image();
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

    startX = e.offsetX;
    startY = e.offsetY;
    currentLineId = { id: nextLineId++, startX, startY, line: null };
});

canvas.addEventListener('mousemove', (e) => {
    if (deleteMode || currentLineId === null) return;

    const endX = e.offsetX;
    const endY = e.offsetY;
    drawImage();
    drawLines();
    ctx.beginPath();
    ctx.moveTo(currentLineId.startX, currentLineId.startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
});

canvas.addEventListener('mouseup', (e) => {
    if (deleteMode || currentLineId === null) return;

    const endX = e.offsetX;
    const endY = e.offsetY;
    const lineLength = Math.sqrt(Math.pow(endX - currentLineId.startX, 2) + Math.pow(endY - currentLineId.startY, 2));
    lines.push({
        id: currentLineId.id,
        startX: currentLineId.startX,
        startY: currentLineId.startY,
        endX: endX,
        endY: endY,
        length: lineLength
    });
    currentLineId = null;
    drawImage();
    drawLines();
});

canvas.addEventListener('click', (e) => {
    if (!deleteMode) return;

    const x = e.offsetX;
    const y = e.offsetY;
    const tolerance = 5;

    lines = lines.filter(line => {
        const { startX, startY, endX, endY } = line;
        const distanceToLine = Math.abs((endY - startY) * x - (endX - startX) * y + endX * startY - endY * startX) / Math.sqrt(Math.pow(endY - startY, 2) + Math.pow(endX - startX, 2));
        return distanceToLine > tolerance;
    });

    // Update IDs after deletion
    updateLineIds();
    drawImage();
    drawLines();
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
        start: { x: Math.round(line.startX), y: Math.round(line.startY) },
        end: { x: Math.round(line.endX), y: Math.round(line.endY) },
        length: Math.round(line.length)
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
    ctx.drawImage(img, 0, 0, img.width, img.height);
    ctx.filter = 'none'; // Reset filter for further drawing
}

function drawLines() {
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'red';
    ctx.fillStyle = 'yellow';
    lines.forEach(line => {
        ctx.beginPath();
        ctx.moveTo(line.startX, line.startY);
        ctx.lineTo(line.endX, line.endY);
        ctx.stroke();
        ctx.fillText(`ID: ${line.id}, Length: ${Math.round(line.length)} px`, line.startX + 5, line.startY - 5);
    });
}


function updateLineIds() {
    // Reassign IDs to lines and adjust the nextLineId
    lines.forEach((line, index) => {
        line.id = index + 1;
    });
    nextLineId = lines.length + 1; // Update nextLineId for new lines
}

