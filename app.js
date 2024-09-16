const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const upload = document.getElementById('upload');
const exportJsonButton = document.getElementById('export-json');
const deleteModeButton = document.getElementById('delete-mode');
const brightnessIncreaseButton = document.getElementById('brightness-increase');
const brightnessDecreaseButton = document.getElementById('brightness-decrease');
const contrastIncreaseButton = document.getElementById('contrast-increase');
const contrastDecreaseButton = document.getElementById('contrast-decrease');
const lineNameInput = document.getElementById('line-name');
const lineColorInput = document.getElementById('line-color');

let img = new Image();
let lines = [];
let deleteMode = false;
let brightness = 1;
let contrast = 1;
let isResizing = false;
let isDragging = false;
let startX, startY;
let selectedLine = null;
let currentLine = null;
let nextLineId = 1;

upload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
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

    const x = e.offsetX;
    const y = e.offsetY;

    selectedLine = lines.find(line => isNearLineEnd(x, y, line));

    if (selectedLine) {
        startX = x;
        startY = y;
        isResizing = isNearPoint(x, y, selectedLine.endX, selectedLine.endY);
        isDragging = !isResizing;
        lineNameInput.value = selectedLine.name || '';
        lineColorInput.value = selectedLine.color || '#000000';
    } else {
        currentLine = { 
            id: nextLineId++, 
            startX: x, 
            startY: y, 
            endX: x, 
            endY: y, 
            name: lineNameInput.value, 
            color: lineColorInput.value 
        };
        isDragging = true;
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (deleteMode) return;

    const x = e.offsetX;
    const y = e.offsetY;

    if (isResizing && selectedLine) {
        selectedLine.endX = x;
        selectedLine.endY = y;
        drawImage();
        drawLines();
    } else if (isDragging && currentLine) {
        currentLine.endX = x;
        currentLine.endY = y;
        drawImage();
        drawLines();
    } else if (selectedLine && isDragging) {
        const dx = x - startX;
        const dy = y - startY;
        selectedLine.startX += dx;
        selectedLine.startY += dy;
        selectedLine.endX += dx;
        selectedLine.endY += dy;
        startX = x;
        startY = y;
        drawImage();
        drawLines();
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (deleteMode) return;

    if (currentLine) {
        currentLine.endX = e.offsetX;
        currentLine.endY = e.offsetY;
        lines.push(currentLine);
        currentLine = null;
        drawImage();
        drawLines();
    }

    if (selectedLine) {
        isResizing = false;
        isDragging = false;
    }
});

// Line editing inputs
lineNameInput.addEventListener('input', () => {
    if (currentLine) {
        currentLine.name = lineNameInput.value;
    } else if (selectedLine) {
        selectedLine.name = lineNameInput.value;
    }
});

lineColorInput.addEventListener('input', () => {
    if (currentLine) {
        currentLine.color = lineColorInput.value;
    } else if (selectedLine) {
        selectedLine.color = lineColorInput.value;
    }
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
        length: Math.round(Math.sqrt(Math.pow(line.endX - line.startX, 2) + Math.pow(line.endY - line.startY, 2))),
        name: line.name,
        color: line.color
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
    lines.forEach(line => {
        ctx.strokeStyle = line.color || '#000000'; // Use line color
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.moveTo(line.startX, line.startY);
        ctx.lineTo(line.endX, line.endY);
        ctx.stroke();
        ctx.fillText(`ID: ${line.id}, ${line.name || 'Line'}, Length: ${Math.round(Math.sqrt(Math.pow(line.endX - line.startX, 2) + Math.pow(line.endY - line.startY, 2)))} px`, line.startX + 5, line.startY - 5);
    });
}

function isNearLineEnd(x, y, line) {
    return isNearPoint(x, y, line.startX, line.startY) || isNearPoint(x, y, line.endX, line.endY);
}

function isNearPoint(x, y, px, py) {
    const tolerance = 5;
    return Math.sqrt(Math.pow(x - px, 2) + Math.pow(y - py, 2)) <= tolerance;
}

function updateLineIds() {
    // Reassign IDs to lines and adjust the nextLineId
    lines.forEach((line, index) => {
        line.id = index + 1;
    });
    nextLineId = lines.length + 1; // Update nextLineId for new lines
}
