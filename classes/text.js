export class Text {
    constructor(canvas, context) {
        this.canvas = canvas;
        this.context = context;
        this.isEditing = false;
        this.currentInput = null;
        this.texts = [];
    }

    handleClick(event) {
        if (this.isEditing) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Créer un input temporaire
        const input = document.createElement('input');
        input.type = 'text';
        input.style.position = 'absolute';
        input.style.left = (event.clientX) + 'px';
        input.style.top = (event.clientY) + 'px';
        input.style.zIndex = '1000';
        input.style.font = '20px Arial';
        input.style.border = '1px solid black';
        input.style.padding = '2px';
        input.style.backgroundColor = 'white';

        document.body.appendChild(input);
        input.focus();

        this.isEditing = true;
        this.currentInput = input;

        // Gérer la validation du texte
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const text = input.value;
                if (text) {
                    this.context.font = '20px Arial';
                    this.context.fillStyle = 'black';
                    this.context.fillText(text, x, y);
                    
                    // Sauvegarder le texte
                    this.texts.push({
                        x: x,
                        y: y,
                        text: text
                    });
                }
                document.body.removeChild(input);
                this.isEditing = false;
                this.currentInput = null;
            }
        });

        // Gérer la perte de focus
        input.addEventListener('blur', () => {
            if (this.isEditing) {
                document.body.removeChild(input);
                this.isEditing = false;
                this.currentInput = null;
            }
        });
    }

    // Nouvelle méthode pour vérifier si un point est près d'un texte
    isPointNear(x, y, tolerance = 10) {
        for (let i = 0; i < this.texts.length; i++) {
            const text = this.texts[i];
            const distance = Math.sqrt(
                Math.pow(text.x - x, 2) + 
                Math.pow(text.y - y, 2)
            );
            if (distance < tolerance) {
                return i; // Retourne l'index du texte trouvé
            }
        }
        return -1; // Retourne -1 si aucun texte n'est trouvé
    }

    // Nouvelle méthode pour supprimer un texte
    removeText(index) {
        if (index >= 0 && index < this.texts.length) {
            this.texts.splice(index, 1);
            return true;
        }
        return false;
    }

    handleMouseMove(event) {
        if (this.currentInput) {
            const rect = this.canvas.getBoundingClientRect();
            this.currentInput.style.left = (event.clientX) + 'px';
            this.currentInput.style.top = (event.clientY) + 'px';
        }
    }

    handleMouseDown(event) {
        // Gérer le clic de la souris si nécessaire
    }

    handleMouseUp(event) {
        // Gérer le relâchement de la souris si nécessaire
    }

    // Pour redessiner tous les textes
    draw() {
        this.texts.forEach(text => {
            this.context.font = '20px Arial';
            this.context.fillStyle = 'black';
            this.context.fillText(text.text, text.x, text.y);
        });
    }
}