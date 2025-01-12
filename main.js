class CanvasManager {
    constructor() {
        console.log('Début de l\'initialisation de CanvasManager');
        this.pdfDoc = null;
        this.currentFile = null;
        this.currentScale = 1.5;
        this.currentTool = null;
        this.isDrawing = false;
        this.startPoint = null;
        this.selectedLine = null;
        this.selectedMidpoint = null;
        this.polygonSides = 3;
        this.fillColor = '#ffffff';
        this.fillOpacity = 0.5;
        this.currentPolygonPoints = [];
        this.eraserRadius = 10; // Rayon de la gomme en pixels
        this.container = document.getElementById('pdf-container');
        this.pageInput = document.getElementById('page-input');
        this.totalPagesSpan = document.getElementById('total-pages');
        this.zoomLevelSpan = document.getElementById('zoom-level');
        this.drawingLayers = new Map(); // Stocke les canvas de dessin par numéro de page
        this.shapes = new Map(); // Stocke les formes par numéro de page
        this.PIXELS_PER_CM = 37.8; // 96 DPI = 37.8 pixels/cm
        
        if (!this.container) {
            throw new Error('Conteneur PDF non trouvé');
        }

        // Écouter les changements de page
        this.pageInput.addEventListener('change', () => {
            const pageNum = parseInt(this.pageInput.value);
            this.goToPage(pageNum);
        });

        console.log('CanvasManager initialisé avec succès');
    }

    pixelsToCm(pixels) {
        return pixels / this.PIXELS_PER_CM;
    }

    formatDistance(pixels) {
        const cm = this.pixelsToCm(pixels);
        return `${cm.toFixed(1)} cm`;
    }

    createDrawingLayer(pageNumber, pageContainer) {
        console.log('Création du layer de dessin pour la page', pageNumber);
        // Créer un nouveau canvas de dessin pour la page
        const drawingCanvas = document.createElement('canvas');
        const pageRect = pageContainer.getBoundingClientRect();
        
        drawingCanvas.width = pageRect.width;
        drawingCanvas.height = pageRect.height;
        drawingCanvas.style.position = 'absolute';
        drawingCanvas.style.top = '0';
        drawingCanvas.style.left = '0';
        drawingCanvas.style.pointerEvents = 'none';
        
        // Ajouter le canvas à la page
        pageContainer.style.position = 'relative';
        pageContainer.appendChild(drawingCanvas);
        
        // Stocker le canvas et son contexte
        this.drawingLayers.set(pageNumber, {
            canvas: drawingCanvas,
            context: drawingCanvas.getContext('2d')
        });

        // Ajouter les gestionnaires d'événements à la page
        pageContainer.addEventListener('mousedown', (e) => this.handleMouseDown(e, pageNumber));
        pageContainer.addEventListener('mousemove', (e) => this.handleMouseMove(e, pageNumber));
        pageContainer.addEventListener('mouseup', (e) => this.handleMouseUp(e, pageNumber));
    }

    setTool(tool) {
        console.log('Outil sélectionné:', tool);
        this.currentTool = tool;
        this.selectedLine = null; // Réinitialiser la ligne sélectionnée
        this.container.style.cursor = 'crosshair';
        document.querySelectorAll('.submenu').forEach(menu => {
            menu.style.display = 'none';
        });
        
        // Afficher/masquer les options appropriées
        const polygonSidesDiv = document.getElementById('polygon-sides');
        if (polygonSidesDiv) {
            polygonSidesDiv.style.display = tool === 'polygon' ? 'block' : 'none';
        }
    }

    setPolygonSides(sides) {
        this.polygonSides = Math.max(3, parseInt(sides));
    }

    setFillColor(color) {
        console.log('Nouvelle couleur:', color);
        this.fillColor = color;
        this.redrawShapes(this.currentPage);
    }

    setFillOpacity(opacity) {
        console.log('Nouvelle opacité:', opacity);
        this.fillOpacity = opacity / 100;
        this.redrawShapes(this.currentPage);
    }

    getFillStyle(color, opacity) {
        // Convertir la couleur hex en RGB
        const r = parseInt(color.substr(1,2), 16);
        const g = parseInt(color.substr(3,2), 16);
        const b = parseInt(color.substr(5,2), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    async handleMouseDown(event, pageNumber) {
        if (!this.currentTool) return;

        const drawingLayer = this.drawingLayers.get(pageNumber);
        if (!drawingLayer) return;

        const canvas = drawingLayer.canvas;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const point = { x, y };

        if (this.currentTool === 'midpoint') {
            // Pour l'outil milieu, on cherche la ligne la plus proche
            const nearestLine = this.findNearestLine(point, pageNumber);
            if (nearestLine && this.getDistance(point, nearestLine) < 10) {
                const midpoint = this.getMidpoint(nearestLine.start, nearestLine.end);
                const shapes = this.shapes.get(pageNumber) || [];
                shapes.push({
                    type: 'point',
                    start: midpoint,
                    end: midpoint,
                    isMidpoint: true,
                    parentLine: nearestLine
                });
                this.shapes.set(pageNumber, shapes);
                this.redrawShapes(pageNumber);
            }
            return;
        }

        if (this.currentTool === 'parallel' || this.currentTool === 'perpendicular') {
            if (!this.selectedLine) {
                // Première étape : sélectionner une ligne de référence
                const nearestLine = this.findNearestLine(point, pageNumber);
                if (nearestLine && this.getDistance(point, nearestLine) < 10) {
                    this.selectedLine = nearestLine;
                    this.redrawShapes(pageNumber); // Pour mettre en évidence la ligne sélectionnée
                }
            } else {
                // Deuxième étape : placer la nouvelle ligne
                this.isDrawing = true;
                this.startPoint = point;
            }
        } else if (this.currentTool === 'freepolygon') {
            if (!this.currentPolygonPoints.length) {
                // Premier point du polygone
                this.currentPolygonPoints.push(point);
                this.isDrawing = true;
            } else {
                // Vérifier si on ferme le polygone
                const firstPoint = this.currentPolygonPoints[0];
                const distance = Math.sqrt(
                    Math.pow(point.x - firstPoint.x, 2) +
                    Math.pow(point.y - firstPoint.y, 2)
                );
                
                if (distance < 10 && this.currentPolygonPoints.length >= 3) {
                    // Fermer le polygone
                    const shapes = this.shapes.get(pageNumber) || [];
                    shapes.push({
                        type: 'freepolygon',
                        points: [...this.currentPolygonPoints],
                        fillColor: this.fillColor,
                        fillOpacity: this.fillOpacity
                    });
                    this.shapes.set(pageNumber, shapes);
                    this.currentPolygonPoints = [];
                    this.isDrawing = false;
                } else {
                    // Ajouter un nouveau point
                    this.currentPolygonPoints.push(point);
                }
            }
            this.redrawShapes(pageNumber);
            return;
        } else if (this.currentTool === 'eraser') {
            const shapeIndex = this.findShapeAtPoint(point, pageNumber);
            if (shapeIndex !== -1) {
                const shapes = this.shapes.get(pageNumber);
                shapes.splice(shapeIndex, 1);
                this.shapes.set(pageNumber, shapes);
                this.redrawShapes(pageNumber);
            }
            return;
        } else if (this.currentTool === 'writeText') {
            const text = prompt("Entrez votre texte :");
            if (text) {
                const shapes = this.shapes.get(pageNumber) || [];
                shapes.push({
                    type: 'text',
                    text: text,
                    x: x,
                    y: y,
                    fontSize: 16,
                    color: '#000000'
                });
                this.shapes.set(pageNumber, shapes);
                this.redrawShapes(pageNumber);
            }
            return;
        } else if (this.currentTool === 'readText') {
            try {
                console.log('Tentative de lecture du texte à la position:', x, y);
                const page = await this.pdfDoc.getPage(pageNumber);
                const viewport = page.getViewport({ scale: this.currentScale });
                
                // Extraire le texte de la page
                const textContent = await page.getTextContent();
                console.log('Contenu texte trouvé:', textContent.items.length, 'éléments');
                
                // Trouver le texte le plus proche du clic
                let closestText = [];
                const DETECTION_RADIUS = 150; // pixels
                
                // Convertir les coordonnées du clic en coordonnées PDF
                const clickY = viewport.height - y;
                
                for (const item of textContent.items) {
                    // Convertir les coordonnées du texte
                    const itemX = item.transform[4] * viewport.scale;
                    const itemY = viewport.height - (item.transform[5] * viewport.scale);
                    
                    const distance = Math.sqrt(
                        Math.pow(x - itemX, 2) + 
                        Math.pow(clickY - itemY, 2)
                    );
                    
                    console.log('Texte trouvé:', item.str, 'à', itemX, itemY, 'distance:', distance);
                    
                    if (distance < DETECTION_RADIUS) {
                        closestText.push({
                            text: item.str,
                            distance: distance,
                            y: itemY // Pour trier par position verticale
                        });
                    }
                }
                
                if (closestText.length > 0) {
                    // Trier d'abord par position verticale pour garder l'ordre de lecture
                    closestText.sort((a, b) => b.y - a.y);
                    
                    // Prendre tous les textes trouvés dans le rayon
                    const text = closestText.map(item => item.text).join(' ');
                    console.log('Textes trouvés:', text);
                    alert(text);
                } else {
                    alert('Aucun texte trouvé à cet endroit. Essayez de cliquer plus près du texte.');
                    console.log('Aucun texte trouvé aux coordonnées:', x, y);
                }
            } catch (error) {
                console.error('Erreur lors de la lecture du texte:', error);
                alert('Erreur lors de la lecture du texte. Veuillez réessayer.');
            }
            return;
        } else {
            this.isDrawing = true;
            this.startPoint = point;
        }
    }

    handleMouseMove(event, pageNumber) {
        const drawingLayer = this.drawingLayers.get(pageNumber);
        if (!drawingLayer) return;

        const canvas = drawingLayer.canvas;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const currentPoint = { x, y };

        const context = drawingLayer.context;

        // Si on a une ligne sélectionnée pour parallèle/perpendiculaire, montrer l'aperçu
        if ((this.currentTool === 'parallel' || this.currentTool === 'perpendicular') && this.selectedLine) {
            // Redessiner pour effacer l'ancien aperçu
            this.redrawShapes(pageNumber);
            
            // Dessiner la ligne sélectionnée en surbrillance
            context.beginPath();
            context.strokeStyle = 'blue';
            context.lineWidth = 2;
            context.moveTo(this.selectedLine.start.x, this.selectedLine.start.y);
            context.lineTo(this.selectedLine.end.x, this.selectedLine.end.y);
            context.stroke();

            // Dessiner l'aperçu de la nouvelle ligne
            context.beginPath();
            context.strokeStyle = 'rgba(0, 0, 255, 0.5)';
            context.lineWidth = 2;
            if (this.currentTool === 'parallel') {
                this.drawParallelLineFromReference(this.selectedLine, currentPoint, context);
            } else {
                this.drawPerpendicularLineFromReference(this.selectedLine, currentPoint, context);
            }
            context.stroke();
            return;
        }

        if (this.currentTool === 'freepolygon' && this.currentPolygonPoints.length > 0) {
            this.redrawShapes(pageNumber);
            context.strokeStyle = 'blue';
            context.lineWidth = 2;
            this.drawFreePolygon(context, [...this.currentPolygonPoints, currentPoint]);
            return;
        }

        // Pour les autres outils, continuer comme avant
        if (!this.isDrawing || !this.currentTool) return;
        
        // Effacer le canvas et redessiner toutes les formes
        this.redrawShapes(pageNumber);
        
        // Dessiner la forme en cours
        context.beginPath();
        context.strokeStyle = 'blue';
        context.lineWidth = 2;

        let radius;
        switch (this.currentTool) {
            case 'polygon':
                this.drawPolygon(context, this.startPoint, currentPoint);
                break;
            case 'circle':
                radius = Math.sqrt(
                    Math.pow(currentPoint.x - this.startPoint.x, 2) +
                    Math.pow(currentPoint.y - this.startPoint.y, 2)
                );
                context.arc(this.startPoint.x, this.startPoint.y, radius, 0, 2 * Math.PI);
                break;
            case 'line':
                context.moveTo(this.startPoint.x, this.startPoint.y);
                context.lineTo(currentPoint.x, currentPoint.y);
                break;
            case 'measure':
                context.moveTo(this.startPoint.x, this.startPoint.y);
                context.lineTo(currentPoint.x, currentPoint.y);
                const distance = Math.sqrt(
                    Math.pow(currentPoint.x - this.startPoint.x, 2) +
                    Math.pow(currentPoint.y - this.startPoint.y, 2)
                );
                const midX = (this.startPoint.x + currentPoint.x) / 2;
                const midY = (this.startPoint.y + currentPoint.y) / 2;
                context.font = '12px Arial';
                context.fillStyle = 'blue';
                context.fillText(this.formatDistance(distance), midX + 5, midY - 5);
                break;
        }
        context.stroke();
    }

    handleMouseUp(event, pageNumber) {
        if (!this.isDrawing || !this.currentTool) return;

        const drawingLayer = this.drawingLayers.get(pageNumber);
        if (!drawingLayer) return;

        const canvas = drawingLayer.canvas;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const endPoint = { x, y };

        // Créer et stocker la nouvelle forme
        if (this.currentTool === 'parallel' || this.currentTool === 'perpendicular') {
            if (this.selectedLine) {
                const newLine = {
                    type: 'line',
                    start: this.startPoint,
                    end: endPoint,
                    referenceLine: this.selectedLine,
                    lineType: this.currentTool
                };
                const shapes = this.shapes.get(pageNumber) || [];
                shapes.push(newLine);
                this.shapes.set(pageNumber, shapes);
                this.selectedLine = null; // Réinitialiser la ligne sélectionnée
            }
        } else {
            const shape = {
                type: this.currentTool,
                start: this.startPoint,
                end: endPoint
            };
            const shapes = this.shapes.get(pageNumber) || [];
            shapes.push(shape);
            this.shapes.set(pageNumber, shapes);
        }

        if (this.currentTool === 'polygon') {
            const shapes = this.shapes.get(pageNumber) || [];
            shapes.push({
                type: 'polygon',
                start: this.startPoint,
                end: endPoint,
                sides: this.polygonSides
            });
            this.shapes.set(pageNumber, shapes);
        }

        this.isDrawing = false;
        this.startPoint = null;
        this.redrawShapes(pageNumber);
    }

    getMidpoint(start, end) {
        return {
            x: (start.x + end.x) / 2,
            y: (start.y + end.y) / 2
        };
    }

    findNearestMidpoint(point, pageNumber) {
        const shapes = this.shapes.get(pageNumber) || [];
        let nearestMidpoint = null;
        let minDistance = 10; // Distance maximale de sélection en pixels

        shapes.forEach(shape => {
            if (shape.type === 'line' || shape.type === 'measure') {
                const midpoint = this.getMidpoint(shape.start, shape.end);
                const distance = Math.sqrt(
                    Math.pow(point.x - midpoint.x, 2) +
                    Math.pow(point.y - midpoint.y, 2)
                );
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestMidpoint = {
                        point: midpoint,
                        parentShape: shape
                    };
                }
            }
        });

        return nearestMidpoint;
    }

    redrawShapes(pageNumber) {
        const drawingLayer = this.drawingLayers.get(pageNumber);
        if (!drawingLayer) return;

        const context = drawingLayer.context;
        const canvas = drawingLayer.canvas;
        
        // Effacer le canvas
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Redessiner toutes les formes
        const shapes = this.shapes.get(pageNumber) || [];
        shapes.forEach(shape => {
            context.beginPath();
            context.strokeStyle = shape === this.selectedLine ? 'blue' : 'black';
            context.lineWidth = 2;

            switch (shape.type) {
                case 'point':
                    if (shape.isMidpoint) {
                        // Point milieu en rouge avec un cercle plus grand
                        context.fillStyle = 'red';
                        context.arc(shape.start.x, shape.start.y, 4, 0, 2 * Math.PI);
                        context.fill();
                        // Ajouter un petit label "M"
                        context.fillStyle = 'blue';
                        context.font = '12px Arial';
                        context.fillText('M', shape.start.x + 8, shape.start.y - 8);
                    } else {
                        context.fillStyle = 'black';
                        context.arc(shape.start.x, shape.start.y, 3, 0, 2 * Math.PI);
                        context.fill();
                    }
                    break;
                case 'line':
                    if (shape.lineType === 'parallel') {
                        this.drawParallelLineFromReference(shape.referenceLine, shape.end, context);
                    } else if (shape.lineType === 'perpendicular') {
                        this.drawPerpendicularLineFromReference(shape.referenceLine, shape.end, context);
                    } else {
                        context.moveTo(shape.start.x, shape.start.y);
                        context.lineTo(shape.end.x, shape.end.y);
                    }
                    break;
                case 'circle':
                    const radius = Math.sqrt(
                        Math.pow(shape.end.x - shape.start.x, 2) +
                        Math.pow(shape.end.y - shape.start.y, 2)
                    );
                    // Dessiner le cercle
                    context.arc(shape.start.x, shape.start.y, radius, 0, 2 * Math.PI);
                    context.stroke();
                    
                    // Marquer le centre
                    context.beginPath();
                    context.fillStyle = 'red';
                    context.arc(shape.start.x, shape.start.y, 3, 0, 2 * Math.PI);
                    context.fill();
                    
                    // Ajouter le label "C" pour le centre
                    context.fillStyle = 'blue';
                    context.font = '12px Arial';
                    context.fillText('C', shape.start.x + 8, shape.start.y - 8);
                    
                    // Afficher le rayon en cm
                    const radiusCm = this.formatDistance(radius);
                    context.fillText(`r = ${radiusCm}`, 
                        (shape.start.x + shape.end.x) / 2 + 10, 
                        (shape.start.y + shape.end.y) / 2 + 10
                    );
                    break;
                case 'measure':
                    context.moveTo(shape.start.x, shape.start.y);
                    context.lineTo(shape.end.x, shape.end.y);
                    const distance = Math.sqrt(
                        Math.pow(shape.end.x - shape.start.x, 2) +
                        Math.pow(shape.end.y - shape.start.y, 2)
                    );
                    const midpoint = this.getMidpoint(shape.start, shape.end);
                    context.font = '12px Arial';
                    context.fillStyle = 'blue';
                    context.fillText(this.formatDistance(distance), midpoint.x + 5, midpoint.y - 5);
                    context.strokeStyle = 'blue';
                    break;
                case 'polygon':
                    this.drawPolygon(context, shape.start, shape.end);
                    break;
                case 'freepolygon':
                    this.drawFreePolygon(context, shape.points, shape.fillColor, shape.fillOpacity);
                    break;
                case 'text':
                    context.font = `${shape.fontSize}px Arial`;
                    context.fillStyle = shape.color;
                    context.fillText(shape.text, shape.x, shape.y);
                    break;
            }
            context.stroke();
        });
    }

    findNearestLine(point, pageNumber) {
        const shapes = this.shapes.get(pageNumber) || [];
        let nearestLine = null;
        let minDistance = Infinity;

        shapes.forEach(shape => {
            if (shape.type === 'line') {
                const distance = this.getDistance(point, shape);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestLine = shape;
                }
            }
        });

        return nearestLine;
    }

    getDistance(point, line) {
        const A = line.start;
        const B = line.end;
        const P = point;

        const AB = { x: B.x - A.x, y: B.y - A.y };
        const AP = { x: P.x - A.x, y: P.y - A.y };
        const AB_squared = AB.x * AB.x + AB.y * AB.y;
        
        if (AB_squared === 0) {
            return Math.sqrt(AP.x * AP.x + AP.y * AP.y);
        }

        const t = Math.max(0, Math.min(1, (AP.x * AB.x + AP.y * AB.y) / AB_squared));
        const projection = {
            x: A.x + t * AB.x,
            y: A.y + t * AB.y
        };

        return Math.sqrt(
            Math.pow(P.x - projection.x, 2) +
            Math.pow(P.y - projection.y, 2)
        );
    }

    drawParallelLineFromReference(referenceLine, point, context) {
        const dx = referenceLine.end.x - referenceLine.start.x;
        const dy = referenceLine.end.y - referenceLine.start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        context.moveTo(point.x, point.y);
        context.lineTo(point.x + dx, point.y + dy);
        
        // Ajouter des marques de parallélisme
        this.drawParallelMarks(context, point, dx, dy);
        this.drawParallelMarks(context, { x: point.x + dx, y: point.y + dy }, -dx, -dy);
    }

    drawParallelMarks(context, point, dx, dy) {
        const markLength = 10;
        const angle = Math.atan2(dy, dx);
        const perpAngle = angle + Math.PI / 2;
        
        for (let i = -1; i <= 1; i++) {
            const x = point.x + i * 5;
            const y = point.y + i * 5 * dy/dx;
            context.moveTo(x, y);
            context.lineTo(
                x + markLength * Math.cos(perpAngle),
                y + markLength * Math.sin(perpAngle)
            );
        }
    }

    drawPerpendicularLineFromReference(referenceLine, point, context) {
        const dx = referenceLine.end.x - referenceLine.start.x;
        const dy = referenceLine.end.y - referenceLine.start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        // Calculer le vecteur perpendiculaire
        const perpDx = -dy;
        const perpDy = dx;
        
        // Normaliser le vecteur perpendiculaire à la même longueur que la ligne de référence
        const scale = length / Math.sqrt(perpDx * perpDx + perpDy * perpDy);
        
        context.moveTo(point.x, point.y);
        context.lineTo(point.x + perpDx * scale, point.y + perpDy * scale);
        
        // Ajouter le symbole d'angle droit
        this.drawRightAngleSymbol(context, point, dx, dy);
    }

    drawRightAngleSymbol(context, point, dx, dy) {
        const size = 15;
        const angle = Math.atan2(dy, dx);
        
        // Dessiner un petit carré pour indiquer l'angle droit
        context.moveTo(point.x, point.y);
        context.lineTo(
            point.x + size * Math.cos(angle),
            point.y + size * Math.sin(angle)
        );
        context.lineTo(
            point.x + size * (Math.cos(angle) - Math.sin(angle)),
            point.y + size * (Math.sin(angle) + Math.cos(angle))
        );
        context.lineTo(
            point.x - size * Math.sin(angle),
            point.y + size * Math.cos(angle)
        );
        context.lineTo(point.x, point.y);
    }

    drawPolygon(context, start, end) {
        const sideLength = Math.sqrt(
            Math.pow(end.x - start.x, 2) +
            Math.pow(end.y - start.y, 2)
        );
        
        // Calculer l'angle du premier côté par rapport à l'horizontale
        const baseAngle = Math.atan2(end.y - start.y, end.x - start.x);
        
        // Calculer les points du polygone
        const points = [start];
        const angleStep = (2 * Math.PI) / this.polygonSides;
        
        for (let i = 1; i < this.polygonSides; i++) {
            const angle = baseAngle + i * angleStep;
            const x = points[i-1].x + sideLength * Math.cos(angle);
            const y = points[i-1].y + sideLength * Math.sin(angle);
            points.push({ x, y });
        }

        // Dessiner le polygone
        context.beginPath();
        context.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            context.lineTo(points[i].x, points[i].y);
        }
        context.closePath();
        
        // Remplir le polygone
        if (this.fillColor && this.fillOpacity > 0) {
            context.fillStyle = this.getFillStyle(this.fillColor, this.fillOpacity);
            context.fill();
        }
        context.stroke();

        // Afficher la mesure sur chaque côté
        for (let i = 0; i < points.length; i++) {
            const nextIndex = (i + 1) % points.length;
            const midX = (points[i].x + points[nextIndex].x) / 2;
            const midY = (points[i].y + points[nextIndex].y) / 2;
            
            context.font = '12px Arial';
            context.fillStyle = 'blue';
            context.fillText(this.formatDistance(sideLength), midX + 5, midY - 5);
        }

        return points;
    }

    drawFreePolygon(context, points, fillColor, fillOpacity) {
        if (!points || points.length < 2) return;

        context.beginPath();
        context.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            if (points[i] && points[i].x !== undefined && points[i].y !== undefined) {
                context.lineTo(points[i].x, points[i].y);
            }
        }

        if (points.length >= 3) {
            context.closePath();
            
            // Remplir le polygone
            if (fillColor && fillOpacity > 0) {
                context.fillStyle = this.getFillStyle(fillColor, fillOpacity);
                context.fill();
            }
        }
        
        context.stroke();

        // Afficher les mesures des côtés
        for (let i = 0; i < points.length; i++) {
            const nextIndex = (i + 1) % points.length;
            if (i === points.length - 1 && !this.isDrawing) continue;
            
            if (!points[i] || !points[nextIndex]) continue;
            
            const sideLength = Math.sqrt(
                Math.pow(points[nextIndex].x - points[i].x, 2) +
                Math.pow(points[nextIndex].y - points[i].y, 2)
            );
            
            const midX = (points[i].x + points[nextIndex].x) / 2;
            const midY = (points[i].y + points[nextIndex].y) / 2;
            
            context.font = '12px Arial';
            context.fillStyle = 'blue';
            context.fillText(this.formatDistance(sideLength), midX + 5, midY - 5);
        }
    }

    findShapeAtPoint(point, pageNumber) {
        const shapes = this.shapes.get(pageNumber) || [];
        for (let i = shapes.length - 1; i >= 0; i--) {
            const shape = shapes[i];
            if (this.isPointInShape(point, shape)) {
                return i;
            }
        }
        return -1;
    }

    findTextAtPoint(point, pageNumber) {
        const shapes = this.shapes.get(pageNumber) || [];
        for (const shape of shapes) {
            if (shape.type === 'text') {
                const context = this.drawingLayers.get(pageNumber).context;
                context.font = `${shape.fontSize}px Arial`;
                const metrics = context.measureText(shape.text);
                const height = shape.fontSize; // Approximation de la hauteur
                
                // Vérifier si le point est dans le rectangle du texte
                if (point.x >= shape.x && 
                    point.x <= shape.x + metrics.width &&
                    point.y >= shape.y - height &&
                    point.y <= shape.y) {
                    return shape;
                }
            }
        }
        return null;
    }

    isPointInShape(point, shape) {
        switch (shape.type) {
            case 'point':
                const distance = Math.sqrt(
                    Math.pow(point.x - shape.start.x, 2) +
                    Math.pow(point.y - shape.start.y, 2)
                );
                return distance <= this.eraserRadius;
            
            case 'line':
                return this.isPointNearLine(point, shape.start, shape.end);
            
            case 'circle':
                // Calculer la distance entre le point et le centre du cercle
                const center = shape.start;
                const radius = Math.sqrt(
                    Math.pow(shape.end.x - shape.start.x, 2) +
                    Math.pow(shape.end.y - shape.start.y, 2)
                );
                const distanceToCenter = Math.sqrt(
                    Math.pow(point.x - center.x, 2) +
                    Math.pow(point.y - center.y, 2)
                );
                return Math.abs(distanceToCenter - radius) <= this.eraserRadius;
            
            case 'text':
                // Obtenir le contexte pour mesurer le texte
                const context = this.drawingLayers.get(1).context; // On utilise le premier contexte disponible
                context.font = `${shape.fontSize}px Arial`;
                const metrics = context.measureText(shape.text);
                const textWidth = metrics.width;
                const textHeight = shape.fontSize;

                // Vérifier si le point est près du texte
                const textDistance = Math.min(
                    // Distance au rectangle du texte
                    Math.abs(point.x - shape.x),
                    Math.abs(point.x - (shape.x + textWidth)),
                    Math.abs(point.y - shape.y),
                    Math.abs(point.y - (shape.y - textHeight))
                );
                return textDistance <= this.eraserRadius;
            
            case 'polygon':
            case 'freepolygon':
                const points = shape.type === 'polygon' ? 
                    this.calculatePolygonPoints(shape) : 
                    shape.points;
                return this.isPointInPolygon(point, points);
            
            default:
                return false;
        }
    }

    calculatePolygonPoints(shape) {
        const sideLength = Math.sqrt(
            Math.pow(shape.end.x - shape.start.x, 2) +
            Math.pow(shape.end.y - shape.start.y, 2)
        );
        
        const baseAngle = Math.atan2(shape.end.y - shape.start.y, shape.end.x - shape.start.x);
        const points = [shape.start];
        const angleStep = (2 * Math.PI) / shape.sides;
        
        for (let i = 1; i < shape.sides; i++) {
            const angle = baseAngle + i * angleStep;
            const x = points[i-1].x + sideLength * Math.cos(angle);
            const y = points[i-1].y + sideLength * Math.sin(angle);
            points.push({ x, y });
        }
        
        return points;
    }

    isPointNearLine(point, start, end) {
        const A = point.x - start.x;
        const B = point.y - start.y;
        const C = end.x - start.x;
        const D = end.y - start.y;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) {
            param = dot / lenSq;
        }
        
        let xx, yy;
        
        if (param < 0) {
            xx = start.x;
            yy = start.y;
        } else if (param > 1) {
            xx = end.x;
            yy = end.y;
        } else {
            xx = start.x + param * C;
            yy = start.y + param * D;
        }
        
        const dx = point.x - xx;
        const dy = point.y - yy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance <= this.eraserRadius;
    }

    isPointInPolygon(point, points) {
        // D'abord vérifier si le point est près d'un des segments
        for (let i = 0; i < points.length; i++) {
            const start = points[i];
            const end = points[(i + 1) % points.length];
            if (this.isPointNearLine(point, start, end)) {
                return true;
            }
        }

        // Ensuite vérifier si le point est à l'intérieur du polygone
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi = points[i].x, yi = points[i].y;
            const xj = points[j].x, yj = points[j].y;
            
            const intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        
        return inside;
    }

    async loadPDF(file) {
        try {
            console.log('Début du chargement du PDF:', file.name);
            this.currentFile = file;
            
            const arrayBuffer = await file.arrayBuffer();
            console.log('Fichier converti en ArrayBuffer');
            
            this.pdfDoc = await pdfjsLib.getDocument(arrayBuffer).promise;
            console.log('PDF chargé avec', this.pdfDoc.numPages, 'pages');
            
            this.totalPagesSpan.textContent = this.pdfDoc.numPages;
            
            this.container.innerHTML = '';
            this.drawingLayers.clear();
            this.shapes.clear();
            
            for (let pageNum = 1; pageNum <= this.pdfDoc.numPages; pageNum++) {
                await this.renderPage(pageNum);
            }
            console.log('Toutes les pages ont été rendues');
        } catch (error) {
            console.error('Erreur lors du chargement du PDF:', error);
            throw error;
        }
    }

    async renderPage(pageNumber) {
        try {
            console.log('Début du rendu de la page', pageNumber);
            
            if (!this.pdfDoc) {
                throw new Error('Aucun document PDF chargé');
            }
            
            if (pageNumber < 1 || pageNumber > this.pdfDoc.numPages) {
                throw new Error('Numéro de page invalide');
            }

            const page = await this.pdfDoc.getPage(pageNumber);
            
            // Créer un conteneur pour la page
            const pageContainer = document.createElement('div');
            pageContainer.className = 'pdf-page';
            pageContainer.id = `page-${pageNumber}`;
            pageContainer.style.marginBottom = '20px';
            
            // Créer un canvas pour la page
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            // Calculer les dimensions
            const viewport = page.getViewport({ scale: this.currentScale });
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            // Ajouter le canvas au conteneur de page
            pageContainer.appendChild(canvas);
            this.container.appendChild(pageContainer);
            
            // Dessiner la page
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            // Créer le layer de dessin pour cette page
            this.createDrawingLayer(pageNumber, pageContainer);
            
            console.log('Page', pageNumber, 'rendue avec succès');
        } catch (error) {
            console.error('Erreur lors du rendu de la page:', error);
            throw error;
        }
    }

    async goToPage(pageNumber) {
        if (!this.pdfDoc) return;
        
        pageNumber = Math.max(1, Math.min(pageNumber, this.pdfDoc.numPages));
        this.pageInput.value = pageNumber;
        
        const pageElement = document.getElementById(`page-${pageNumber}`);
        if (pageElement) {
            pageElement.scrollIntoView({ behavior: 'smooth' });
        }
    }

    async zoom(delta) {
        if (!this.pdfDoc) return;

        const newScale = Math.max(0.5, Math.min(3, this.currentScale + delta));
        if (newScale === this.currentScale) return;

        // Sauvegarder les formes actuelles
        const allShapes = new Map();
        for (const [pageNumber, shapes] of this.shapes.entries()) {
            allShapes.set(pageNumber, [...shapes]);
        }

        // Mettre à jour l'échelle
        const oldScale = this.currentScale;
        this.currentScale = newScale;
        document.getElementById('zoom-level').textContent = `${Math.round(this.currentScale * 100)}%`;

        // Vider les formes actuelles
        this.shapes.clear();
        this.drawingLayers.clear();

        // Recharger les pages avec la nouvelle échelle
        const container = document.getElementById('pdf-container');
        const pages = container.getElementsByClassName('pdf-page');

        for (let i = 0; i < pages.length; i++) {
            const pageNumber = i + 1;
            const page = await this.pdfDoc.getPage(pageNumber);
            const viewport = page.getViewport({ scale: this.currentScale });
            
            // Mettre à jour le canvas PDF
            const pageContainer = pages[i];
            const canvas = pageContainer.getElementsByClassName('pdf-canvas')[0];
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            // Redessiner le PDF
            const context = canvas.getContext('2d');
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            // Recréer le layer de dessin
            const drawingCanvas = pageContainer.getElementsByClassName('drawing-layer')[0];
            drawingCanvas.width = viewport.width;
            drawingCanvas.height = viewport.height;
            
            const drawingContext = drawingCanvas.getContext('2d');
            this.drawingLayers.set(pageNumber, {
                canvas: drawingCanvas,
                context: drawingContext
            });

            // Restaurer les formes avec les nouvelles coordonnées mises à l'échelle
            if (allShapes.has(pageNumber)) {
                const scaleRatio = newScale / oldScale;
                const shapes = allShapes.get(pageNumber).map(shape => {
                    const scaledShape = { ...shape };

                    if (shape.type === 'point') {
                        scaledShape.start = this.scalePoint(shape.start, scaleRatio);
                    } else if (shape.type === 'line' || shape.type === 'circle') {
                        scaledShape.start = this.scalePoint(shape.start, scaleRatio);
                        scaledShape.end = this.scalePoint(shape.end, scaleRatio);
                    } else if (shape.type === 'polygon') {
                        scaledShape.start = this.scalePoint(shape.start, scaleRatio);
                        scaledShape.end = this.scalePoint(shape.end, scaleRatio);
                    } else if (shape.type === 'freepolygon') {
                        scaledShape.points = shape.points.map(p => this.scalePoint(p, scaleRatio));
                    } else if (shape.type === 'text') {
                        scaledShape.x = shape.x * scaleRatio;
                        scaledShape.y = shape.y * scaleRatio;
                    }

                    return scaledShape;
                });
                this.shapes.set(pageNumber, shapes);
                this.redrawShapes(pageNumber);
            }
        }
    }

    scalePoint(point, ratio) {
        return {
            x: point.x * ratio,
            y: point.y * ratio
        };
    }

    async savePDF() {
        if (!this.pdfDoc || !this.currentFile) {
            console.error('Aucun PDF ouvert');
            return;
        }

        try {
            // Charger le PDF original avec pdf-lib
            const pdfBytes = await this.currentFile.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
            
            // Pour chaque page
            for (let pageNum = 1; pageNum <= this.pdfDoc.numPages; pageNum++) {
                const drawingLayer = this.drawingLayers.get(pageNum);
                if (!drawingLayer) continue;

                // Convertir le canvas en PNG
                const imageBytes = await new Promise(resolve => {
                    drawingLayer.canvas.toBlob(async blob => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(new Uint8Array(reader.result));
                        reader.readAsArrayBuffer(blob);
                    }, 'image/png');
                });

                // Incorporer l'image PNG dans le PDF
                const image = await pdfDoc.embedPng(imageBytes);
                
                // Obtenir la page
                const page = pdfDoc.getPage(pageNum - 1);
                const { width, height } = page.getSize();

                // Ajouter l'image des annotations comme une nouvelle couche
                page.drawImage(image, {
                    x: 0,
                    y: 0,
                    width: width,
                    height: height,
                    opacity: 1
                });
            }

            // Sauvegarder le PDF modifié
            const modifiedPdfBytes = await pdfDoc.save();
            const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
            
            // Créer un lien de téléchargement
            const fileName = this.currentFile.name.replace('.pdf', '_with_annotations.pdf');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('PDF sauvegardé avec succès');
        } catch (error) {
            console.error('Erreur lors de la sauvegarde du PDF:', error);
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.container.requestFullscreen().catch(err => {
                console.error('Erreur lors du passage en plein écran:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }
}
