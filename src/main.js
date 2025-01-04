class ChessGame {
    constructor() {
        this.game = new Chess();
        this.board = document.getElementById('board');
        this.statusElement = document.getElementById('status');
        this.gestureElement = document.getElementById('gesture');
        this.selectedSquare = null;
        this.possibleMoves = [];
        this.lastGesture = null;
        this.gestureTimeout = null;

        this.initializeBoard();
        this.initializeGestureDetection();
    }

    initializeBoard() {
        // Create board squares
        for (let i = 0; i < 64; i++) {
            const square = document.createElement('div');
            const row = Math.floor(i / 8);
            const col = i % 8;
            const isWhite = (row + col) % 2 === 0;

            square.className = `square ${isWhite ? 'white' : 'black'}`;
            square.setAttribute('data-square', this.indexToSquare(i));
            this.board.appendChild(square);
        }

        this.updateBoard();
    }

    indexToSquare(index) {
        const row = 8 - Math.floor(index / 8);
        const col = String.fromCharCode('a'.charCodeAt(0) + (index % 8));
        return `${col}${row}`;
    }

    updateBoard() {
        // Clear all pieces
        const squares = this.board.querySelectorAll('.square');
        squares.forEach(square => {
            square.innerHTML = '';
            square.classList.remove('highlighted', 'selected');
        });

        // Add pieces
        for (let i = 0; i < 64; i++) {
            const square = this.indexToSquare(i);
            const piece = this.game.get(square);
            if (piece) {
                const squareElement = this.board.querySelector(`[data-square="${square}"]`);
                const pieceElement = document.createElement('div');
                pieceElement.className = 'piece';
                pieceElement.style.backgroundImage = `url('https://lichess1.org/assets/piece/cburnett/${piece.color}${piece.type.toUpperCase()}.svg')`;
                squareElement.appendChild(pieceElement);
            }
        }

        // Highlight selected square and possible moves
        if (this.selectedSquare) {
            const selectedElement = this.board.querySelector(`[data-square="${this.selectedSquare}"]`);
            selectedElement.classList.add('selected');

            this.possibleMoves.forEach(move => {
                const moveElement = this.board.querySelector(`[data-square="${move.to}"]`);
                moveElement.classList.add('highlighted');
            });
        }

        // Update status
        this.updateStatus();
    }

    updateStatus() {
        let status = '';
        if (this.game.in_checkmate()) {
            status = `Schaakmat! ${this.game.turn() === 'w' ? 'Zwart' : 'Wit'} wint!`;
        } else if (this.game.in_draw()) {
            status = 'Remise!';
        } else {
            status = `${this.game.turn() === 'w' ? 'Wit' : 'Zwart'} aan zet`;
            if (this.game.in_check()) {
                status += ' (Schaak!)';
            }
        }
        this.statusElement.textContent = status;
    }

    initializeGestureDetection() {
        const videoElement = document.getElementById('input_video');
        const canvasElement = document.getElementById('output_canvas');
        const canvasCtx = canvasElement.getContext('2d');

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

        hands.onResults((results) => {
            canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                // Draw hand landmarks
                drawConnectors(canvasCtx, results.multiHandLandmarks[0], HAND_CONNECTIONS,
                    {color: '#00FF00', lineWidth: 2});
                drawLandmarks(canvasCtx, results.multiHandLandmarks[0],
                    {color: '#FF0000', lineWidth: 1});

                // Detect gesture
                const gesture = this.detectGesture(results.multiHandLandmarks[0]);
                this.handleGesture(gesture);
            }
        });

        const camera = new Camera(videoElement, {
            onFrame: async () => {
                await hands.send({image: videoElement});
            },
            width: 640,
            height: 480
        });

        camera.start();
    }

    detectGesture(landmarks) {
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const palmBase = landmarks[0];

        // Vinger positie relatief tot palm
        const fingerHeight = indexTip.y - palmBase.y;

        // Afstand tussen duim en wijsvinger
        const pinchDistance = Math.hypot(
            thumbTip.x - indexTip.x,
            thumbTip.y - indexTip.y,
            thumbTip.z - indexTip.z
        );

        if (fingerHeight < -0.15) return 'SELECT';  // Hand omhoog
        if (fingerHeight > 0.15) return 'PLACE';    // Hand omlaag
        if (pinchDistance < 0.1) return 'GRAB';     // Knijpbeweging

        return 'NONE';
    }

    handleGesture(gesture) {
        // Voorkom te snelle gesture updates
        if (this.gestureTimeout) return;
        if (gesture === this.lastGesture) return;

        this.gestureElement.textContent = `Gedetecteerd gebaar: ${gesture}`;
        this.lastGesture = gesture;

        switch (gesture) {
            case 'SELECT':
                this.handleSelectGesture();
                break;
            case 'GRAB':
                this.handleGrabGesture();
                break;
            case 'PLACE':
                this.handlePlaceGesture();
                break;
        }

        this.gestureTimeout = setTimeout(() => {
            this.gestureTimeout = null;
        }, 500);
    }

    handleSelectGesture() {
        // Implementeer cursor beweging en selectie logica
        // Voor demo: selecteer een random legaal zet
        if (!this.selectedSquare) {
            const moves = this.game.moves({ verbose: true });
            if (moves.length > 0) {
                const move = moves[Math.floor(Math.random() * moves.length)];
                this.selectedSquare = move.from;
                this.possibleMoves = this.game.moves({
                    square: this.selectedSquare,
                    verbose: true
                });
                this.updateBoard();
            }
        }
    }

    handleGrabGesture() {
        // Bevestig selectie
        if (this.selectedSquare) {
            // Voor demo: highlighten van mogelijke zetten
            this.updateBoard();
        }
    }

    handlePlaceGesture() {
        // Voer zet uit
        if (this.selectedSquare && this.possibleMoves.length > 0) {
            // Voor demo: kies random legale zet
            const move = this.possibleMoves[
                Math.floor(Math.random() * this.possibleMoves.length)
                ];

            this.game.move(move);
            this.selectedSquare = null;
            this.possibleMoves = [];
            this.updateBoard();
        }
    }
}

// Start het spel
document.addEventListener('DOMContentLoaded', () => {
    new ChessGame();
});