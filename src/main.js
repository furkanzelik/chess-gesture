const chess = new Chess();

const canvas = document.getElementById('chessboard');
const ctx = canvas.getContext('2d');
const boardSize = 8;
const tileSize = canvas.width / boardSize;
const {HAND_CONNECTIONS} = window;
const {drawConnectors, drawLandmarks} = window;


let recordings = {
    "select": [],
    "move": [],
    "cancel": []
};
let isRecording = false;
let currentGesture = null;

// Draw board function
function drawBoard() {
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            const isLight = (row + col) % 2 === 0;
            ctx.fillStyle = isLight ? '#eee' : '#444';
            ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
        }
    }
}


const handCanvas = document.getElementById('handCanvas');
const handCtx = handCanvas.getContext('2d');
const webcam = document.getElementById('webcam');


const hands = new Hands({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});


hands.onResults(onResults);


const camera = new Camera(webcam, {
    onFrame: async () => {
        await hands.send({image: webcam});
    },
    width: 400,
    height: 300
});

function updateCanvasSize() {
    handCanvas.width = webcam.offsetWidth;
    handCanvas.height = webcam.offsetHeight;
}


// Handle MediaPipe results
function onResults(results) {
    // Clear canvas
    handCtx.clearRect(0, 0, handCanvas.width, handCanvas.height);


    handCtx.save();
    handCtx.drawImage(results.image, 0, 0, handCanvas.width, handCanvas.height);
    handCtx.restore();


    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        // Debug log om te zien of we landmarks detecteren
        console.log("Hand detected:", results.multiHandLandmarks[0].length);

        for (const landmarks of results.multiHandLandmarks) {
            // Teken de verbindingen tussen landmarks
            drawConnectors(
                handCtx,
                landmarks,
                HAND_CONNECTIONS,
                {color: '#00FF00', lineWidth: 2}
            );

            // Teken de landmarks zelf
            drawLandmarks(
                handCtx,
                landmarks,
                {color: '#FF0000', radius: 5, lineWidth: 2}
            );


            if (isRecording && currentGesture) {
                recordings[currentGesture].push([...landmarks]);


                handCtx.font = '20px Arial';
                handCtx.fillStyle = 'red';
                handCtx.fillText('Recording: ' + currentGesture, 10, 30);
            }
        }
    }
}

// Button functions
function createRecordingButtons() {
    const buttonContainer = document.getElementById('button-container');

    Object.keys(recordings).forEach(gesture => {
        const recordButton = document.createElement('button');
        recordButton.textContent = `Record ${gesture}`;
        recordButton.addEventListener('click', () => startRecording(gesture));
        buttonContainer.appendChild(recordButton);
    });

    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save Data';
    saveButton.addEventListener('click', saveRecordings);
    buttonContainer.appendChild(saveButton);
}


function startRecording(gesture) {
    if (isRecording) {
        console.log('Already recording!');
        return;
    }

    isRecording = true;
    currentGesture = gesture;
    console.log(`Started recording ${gesture}`);

    setTimeout(() => {
        isRecording = false;
        currentGesture = null;
        console.log(`Stopped recording ${gesture}`);
    }, 3000);
}

function saveRecordings() {
    const dataStr = JSON.stringify(recordings);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'hand-gestures.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}


function init() {
    createRecordingButtons();
    drawBoard();
    camera.start().then(() => {
        console.log('Camera started');
        updateCanvasSize();
    });
}

// Start the application
init();