import Point from './point.js';
import Line from './line.js';
import Circle from './circle.js';
import Segment from './segment.js';
import Parallele from './parallele.js';
import Perpendiculaire from './perpendiculaire.js';
import { Text } from './text.js';
import Angle from './angle.js';
import Polygon from './polygon.js';
import {
  findMidpoint,
  getCloserSegment,
} from './utils.js';

export class CanvasPage {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.drawings = [];
    this.activeTool = null;
    this.startPoint = null;
    this.vertex = null;
    this.currentPolygon = null;
    this.referenceLine = null;
    this.perpendicularPoint = null;
    this.parallele = null;
    this.cirlePoints = [];
    this.backgroundImage = null;
    this.pdfContext = null;
    this.textTool = null;
    this.fillColor = null;

    // Créer un canvas de fond pour le PDF
    this.pdfCanvas = document.createElement('canvas');
    this.pdfCanvas.width = canvas.width;
    this.pdfCanvas.height = canvas.height;
    this.pdfContext = this.pdfCanvas.getContext('2d');

    // Lier les méthodes
    this.handleClick = this.handleClick.bind(this);
    
    // Ajouter les écouteurs d'événements
    this.canvas.addEventListener('click', this.handleClick);
  }

  // Méthode pour dessiner le PDF
  drawPDF(pdfContext) {
    this.pdfContext.clearRect(0, 0, this.pdfCanvas.width, this.pdfCanvas.height);
    this.pdfContext.drawImage(pdfContext.canvas, 0, 0);
    this.redraw();
  }

  // Méthode pour redessiner tout
  redraw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.pdfContext) {
      this.ctx.drawImage(this.pdfCanvas, 0, 0);
    }
    this.drawings.forEach(drawing => drawing.draw());
    if (this.textTool) {
      this.textTool.draw();
    }
  }

  setActiveTool(tool) {
    console.log('Définition de l\'outil actif:', tool);
    this.activeTool = tool;
    if (tool === 'text') {
      if (!this.textTool) {
        this.textTool = new Text(this.canvas, this.ctx);
      }
    }
  }

  setFillColor(color) {
    this.fillColor = color;
  }

  handleClick(event) {
    const rect = this.canvas.getBoundingClientRect();
    const mousePos = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    if (!this.activeTool) return;

    switch (this.activeTool) {
      case 'fill':
        // Chercher le polygone à remplir
        for (let i = this.drawings.length - 1; i >= 0; i--) {
          const drawing = this.drawings[i];
          if (drawing instanceof Polygon && drawing.isComplete) {
            if (drawing.isPointInside(mousePos.x, mousePos.y)) {
              const fillColorPicker = document.getElementById('fill-color-picker');
              const fillColor = fillColorPicker ? fillColorPicker.value : '#000000';
              drawing.setFillColor(fillColor);
              this.redraw();
              break;
            }
          }
        }
        break;

      case 'polygon':
        if (!this.currentPolygon || this.currentPolygon.isComplete) {
          // Créer un nouveau polygone si on n'en a pas ou si le précédent est terminé
          this.currentPolygon = new Polygon(this.ctx);
          this.drawings.push(this.currentPolygon);
        }

        if (this.currentPolygon.points.length >= 3 && 
            this.currentPolygon.isNearFirstPoint(mousePos)) {
          this.currentPolygon.complete();
          // Important : mettre currentPolygon à null pour pouvoir en créer un nouveau
          this.currentPolygon = null;
        } else {
          this.currentPolygon.addPoint(mousePos);
        }
        break;

      case 'milieu':
        console.log('Recherche du segment le plus proche...');
        console.log('Nombre de dessins:', this.drawings.length);
        this.drawings.forEach((drawing, index) => {
          console.log(`Dessin ${index}:`, drawing instanceof Segment ? 'Segment' : drawing.constructor.name);
        });
        
        const closestSegment = getCloserSegment(this.drawings, mousePos.x, mousePos.y);
        console.log('Segment trouvé:', closestSegment);
        
        if (closestSegment) {
          console.log('Calcul du milieu...');
          const midX = (closestSegment.point1.x + closestSegment.point2.x) / 2;
          const midY = (closestSegment.point1.y + closestSegment.point2.y) / 2;
          const midPoint = new Point(this.ctx, midX, midY);
          midPoint.draw();
          this.drawings.push(midPoint);
          closestSegment.findMiddle();
          console.log('Milieu marqué!');
        }
        break;

      case 'text':
        if (this.textTool) {
          this.textTool.handleClick(event);
        }
        break;

      case 'point':
        const point = new Point(this.ctx, mousePos.x, mousePos.y);
        point.draw();
        this.drawings.push(point);
        break;

      case 'segment':
        console.log('Outil segment - startPoint:', this.startPoint);
        if (!this.startPoint) {
          this.startPoint = new Point(this.ctx, mousePos.x, mousePos.y);
          this.startPoint.draw();
          this.drawings.push(this.startPoint);
          console.log('Premier point créé:', this.startPoint);
        } else {
          const endPoint = new Point(this.ctx, mousePos.x, mousePos.y);
          endPoint.draw();
          const segment = new Segment(this.ctx, this.startPoint, endPoint);
          segment.draw();
          this.drawings.push(endPoint);
          this.drawings.push(segment);
          console.log('Segment créé:', segment);
          this.startPoint = null;
        }
        break;

      case 'segment-known':
        if (!this.startPoint) {
          this.startPoint = new Point(this.ctx, mousePos.x, mousePos.y);
          this.startPoint.draw();
          this.drawings.push(this.startPoint);
          // Demander la longueur
          const length = parseFloat(prompt("Entrez la longueur du segment (en cm):"));
          if (length && !isNaN(length)) {
            this.segmentLength = length * 37.795; // Conversion cm vers pixels
          } else {
            this.startPoint = null;
          }
        } else if (this.segmentLength) {
          const angle = Math.atan2(mousePos.y - this.startPoint.y, mousePos.x - this.startPoint.x);
          const endX = this.startPoint.x + Math.cos(angle) * this.segmentLength;
          const endY = this.startPoint.y + Math.sin(angle) * this.segmentLength;
          const endPoint = new Point(this.ctx, endX, endY);
          endPoint.draw();
          const segment = new Segment(this.ctx, this.startPoint, endPoint);
          segment.draw();
          this.drawings.push(endPoint);
          this.drawings.push(segment);
          this.startPoint = null;
          this.segmentLength = null;
        }
        break;

      case 'droite':
        if (!this.startPoint) {
          this.startPoint = new Point(this.ctx, mousePos.x, mousePos.y);
          this.startPoint.draw();
          this.drawings.push(this.startPoint);
        } else {
          const endPoint = new Point(this.ctx, mousePos.x, mousePos.y);
          endPoint.draw();
          const line = new Line(this.ctx, this.startPoint, endPoint);
          line.draw();
          this.drawings.push(endPoint);
          this.drawings.push(line);
          this.startPoint = null;
        }
        break;

      case 'parallele':
        if (!this.referenceLine) {
          const clickPoint = new Point(this.ctx, mousePos.x, mousePos.y);
          let closestLine = null;
          let minDistance = Infinity;
          
          for (const drawing of this.drawings) {
            if (drawing instanceof Line || drawing instanceof Segment) {
              const distance = drawing.distanceToPoint(clickPoint);
              if (distance < minDistance) {
                minDistance = distance;
                closestLine = drawing;
              }
            }
          }
          
          if (closestLine && minDistance < 20) {
            this.referenceLine = closestLine;
          }
        } else {
          // Créer une ligne parallèle
          const dx = this.referenceLine.point2.x - this.referenceLine.point1.x;
          const dy = this.referenceLine.point2.y - this.referenceLine.point1.y;
          
          // Point de départ de la nouvelle ligne
          const startPoint = new Point(this.ctx, mousePos.x, mousePos.y);
          
          // Point final de la nouvelle ligne (même direction que la ligne de référence)
          const endPoint = new Point(this.ctx, mousePos.x + dx, mousePos.y + dy);
          
          // Créer et dessiner la ligne parallèle
          const line = new Line(this.ctx, startPoint, endPoint);
          startPoint.draw();
          endPoint.draw();
          line.draw();
          
          this.drawings.push(startPoint);
          this.drawings.push(endPoint);
          this.drawings.push(line);
          
          this.referenceLine = null;
        }
        break;

      case 'perpendiculaire':
        if (!this.referenceLine) {
          const clickPoint = new Point(this.ctx, mousePos.x, mousePos.y);
          let closestLine = null;
          let minDistance = Infinity;
          
          for (const drawing of this.drawings) {
            if (drawing instanceof Line || drawing instanceof Segment) {
              const distance = drawing.distanceToPoint(clickPoint);
              if (distance < minDistance) {
                minDistance = distance;
                closestLine = drawing;
              }
            }
          }
          
          if (closestLine && minDistance < 20) {
            this.referenceLine = closestLine;
          }
        } else {
          // Créer une ligne perpendiculaire
          const dx = this.referenceLine.point2.x - this.referenceLine.point1.x;
          const dy = this.referenceLine.point2.y - this.referenceLine.point1.y;
          
          // Calculer le vecteur perpendiculaire (-dy, dx)
          const perpDx = -dy;
          const perpDy = dx;
          
          // Point de départ de la nouvelle ligne
          const startPoint = new Point(this.ctx, mousePos.x, mousePos.y);
          
          // Point final de la nouvelle ligne (direction perpendiculaire)
          const endPoint = new Point(this.ctx, mousePos.x + perpDx, mousePos.y + perpDy);
          
          // Créer et dessiner la ligne perpendiculaire
          const line = new Line(this.ctx, startPoint, endPoint);
          startPoint.draw();
          endPoint.draw();
          line.draw();
          
          this.drawings.push(startPoint);
          this.drawings.push(endPoint);
          this.drawings.push(line);
          
          this.referenceLine = null;
        }
        break;

      case 'angle':
        if (!this.startPoint) {
          // Premier clic : point de départ
          this.startPoint = new Point(this.ctx, mousePos.x, mousePos.y);
          this.startPoint.draw();
          this.drawings.push(this.startPoint);
        } else if (!this.vertex) {
          // Deuxième clic : sommet
          this.vertex = new Point(this.ctx, mousePos.x, mousePos.y);
          this.vertex.draw();
          this.drawings.push(this.vertex);
          
          // Demander l'angle
          const angleDegrees = parseFloat(prompt("Entrez l'angle en degrés:"));
          if (!isNaN(angleDegrees)) {
            const angle = new Angle(this.ctx, this.startPoint, this.vertex, angleDegrees);
            angle.draw();
            this.drawings.push(angle);
          }
          
          // Réinitialiser les points
          this.startPoint = null;
          this.vertex = null;
        }
        break;

      case 'compas':
        if (this.cirlePoints.length === 0) {
          const center = new Point(this.ctx, mousePos.x, mousePos.y);
          center.draw();
          this.cirlePoints.push(center);
        } else if (this.cirlePoints.length === 1) {
          const radius = Math.sqrt(
            Math.pow(mousePos.x - this.cirlePoints[0].x, 2) +
            Math.pow(mousePos.y - this.cirlePoints[0].y, 2)
          );
          const circle = new Circle(this.ctx, this.cirlePoints[0], radius);
          circle.draw();
          this.drawings.push(circle);
          this.cirlePoints = [];
        }
        break;

      case 'compas-known':
        if (!this.startPoint) {
          this.startPoint = new Point(this.ctx, mousePos.x, mousePos.y);
          this.startPoint.draw();
          this.drawings.push(this.startPoint);
          // Demander le rayon
          const radius = parseFloat(prompt("Entrez le rayon du cercle (en cm):"));
          if (radius && !isNaN(radius)) {
            const circle = new Circle(this.ctx, this.startPoint, radius * 37.795); // Conversion cm vers pixels
            circle.draw();
            this.drawings.push(circle);
          }
          this.startPoint = null;
        }
        break;

      case 'new':
        const closerSegment = getCloserSegment(this.drawings, new Point(this.ctx, mousePos.x, mousePos.y));
        if (closerSegment instanceof Segment) {
          const midpoint = findMidpoint(this.ctx, closerSegment.point1, closerSegment.point2);
          midpoint.draw();
          this.drawings.push(midpoint);
        }
        break;

      case 'gomme':
        const clickPoint = { x: mousePos.x, y: mousePos.y };
        const tolerance = 10;
        let elementErased = false;
        
        // Vérifier d'abord le texte
        if (this.textTool) {
          const textIndex = this.textTool.isPointNear(clickPoint.x, clickPoint.y);
          if (textIndex !== -1) {
            this.textTool.removeText(textIndex);
            this.redraw();
            elementErased = true;
          }
        }

        // Si aucun texte n'a été effacé, vérifier les autres éléments
        if (!elementErased) {
          for (let i = this.drawings.length - 1; i >= 0; i--) {
            const drawing = this.drawings[i];
            
            // Pour les points
            if (drawing instanceof Point) {
              const dx = drawing.x - clickPoint.x;
              const dy = drawing.y - clickPoint.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance < tolerance) {
                this.drawings.splice(i, 1);
                this.redraw();
                break;
              }
            }
            
            // Pour les segments
            else if (drawing instanceof Segment) {
              if (drawing.isPointNear(clickPoint.x, clickPoint.y)) {
                this.drawings.splice(i, 1);
                this.redraw();
                break;
              }
            }
            
            // Pour les droites
            else if (drawing instanceof Line) {
              if (drawing.isPointNear(clickPoint.x, clickPoint.y, tolerance)) {
                this.drawings.splice(i, 1);
                this.redraw();
                break;
              }
            }
            
            // Pour les angles
            else if (drawing instanceof Angle) {
              // Vérifier si le clic est près du sommet
              const dVertex = Math.sqrt(
                Math.pow(drawing.vertex.x - clickPoint.x, 2) + 
                Math.pow(drawing.vertex.y - clickPoint.y, 2)
              );
              
              // Vérifier si le clic est près des lignes de l'angle
              const dStart = Math.sqrt(
                Math.pow(drawing.startPoint.x - clickPoint.x, 2) + 
                Math.pow(drawing.startPoint.y - clickPoint.y, 2)
              );
              
              const dEnd = Math.sqrt(
                Math.pow(drawing.endPoint.x - clickPoint.x, 2) + 
                Math.pow(drawing.endPoint.y - clickPoint.y, 2)
              );
              
              if (dVertex < tolerance || dStart < tolerance || dEnd < tolerance) {
                this.drawings.splice(i, 1);
                this.redraw();
                break;
              }
            }
            
            // Pour les cercles
            else if (drawing instanceof Circle) {
              // Vérifier si le clic est près du cercle
              if (drawing.isPointNear(clickPoint.x, clickPoint.y, tolerance)) {
                this.drawings.splice(i, 1);
                this.redraw();
                break;
              }
              
              // Vérifier aussi si le clic est près du centre
              const distanceToCenter = Math.sqrt(
                Math.pow(drawing.center.x - clickPoint.x, 2) + 
                Math.pow(drawing.center.y - clickPoint.y, 2)
              );
              
              if (distanceToCenter < tolerance) {
                this.drawings.splice(i, 1);
                this.redraw();
                break;
              }
            }
            
            // Pour les polygones
            else if (drawing instanceof Polygon) {
              if (drawing.isPointNear(clickPoint.x, clickPoint.y, tolerance)) {
                this.drawings.splice(i, 1);
                this.redraw();
                break;
              }
            }
          }
        }
        break;

      default:
        console.log('Outil non reconnu:', this.activeTool);
    }
  }

  getMousePos(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  processClick(mousePos) {
    console.log('Traitement du clic avec l\'outil:', this.activeTool);

    switch (this.activeTool) {
      case "point":
        console.log('Création d\'un point');
        const point = new Point(this.ctx, mousePos.x, mousePos.y);
        point.draw();
        this.drawings.push(point);
        break;

      case "segment":
        this.handleSegmentTool(mousePos);
        break;

      case "segment-known":
        this.handleSegmentKnownTool(mousePos);
        break;

      case "droite":
        this.handleLineTool(mousePos);
        break;

      case "parallele":
        if (!this.parallele) {
          this.parallele = new Parallele(this.ctx);
        }
        const result = this.parallele.handleClick(mousePos.x, mousePos.y, this.drawings);
        if (result) {
          result.draw();
          this.drawings.push(result);
        }
        break;

      case "perpendiculaire":
        this.handlePerpendicularTool(mousePos);
        break;

      case "compas":
        this.handleCompassTool(mousePos);
        break;

      case "compas-known":
        this.handleKnownCompassTool(mousePos);
        break;

      case "gomme":
        this.handleEraserTool(mousePos);
        break;

      case "new":
        const closerSegment = getCloserSegment(
          this.drawings,
          new Point(this.ctx, mousePos.x, mousePos.y)
        );
        if (closerSegment instanceof Segment) {
          const midpoint = findMidpoint(
            this.ctx,
            closerSegment.point1,
            closerSegment.point2
          );
          const newPoint = new Point(this.ctx, midpoint.x, midpoint.y);
          newPoint.draw();
          this.drawings.push(newPoint);
        }
        break;

      default:
        console.log('Outil non reconnu:', this.activeTool);
    }
  }

  handleSegmentTool(mousePos) {
    console.log('segment');
    if (this.startPoint === null) {
      const point = new Point(this.ctx, mousePos.x, mousePos.y);
      point.draw();
      this.startPoint = point;
    } else {
      const point = new Point(this.ctx, mousePos.x, mousePos.y);
      point.draw();
      const segment = new Segment(this.ctx, this.startPoint, point);
      segment.draw();
      this.drawings.push(segment);
      this.startPoint = null;
    }
  }

  handleLineTool(mousePos) {
    console.log('droite');
    if (this.startPoint === null) {
      const point = new Point(this.ctx, mousePos.x, mousePos.y);
      point.draw();
      this.startPoint = point;
    } else {
      const point = new Point(this.ctx, mousePos.x, mousePos.y);
      point.draw();
      const line = new Line(this.ctx, this.startPoint, point);
      line.draw();
      this.drawings.push(line);
      this.startPoint = null;
    }
  }

  handlePerpendicularTool(mousePos) {
    console.log('perpendiculaire');
    const point = new Point(this.ctx, mousePos.x, mousePos.y);
    
    if (!this.referenceLine) {
      // Première étape : trouver une ligne de référence
      this.referenceLine = Perpendiculaire.findReferenceLine(this.drawings, point);
      if (this.referenceLine) {
        // Sauvegarder temporairement le point de clic
        this.perpendicularPoint = point;
        point.draw();
        this.drawings.push(point);
        // Mettre en surbrillance la ligne de référence
        this.redraw();
        this.ctx.save();
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 2;
        this.referenceLine.draw();
        this.ctx.restore();
      }
    } else {
      // Deuxième étape : créer la perpendiculaire
      const perpLine = Perpendiculaire.createPerpendicularLine(
        this.ctx,
        this.referenceLine,
        point
      );
      
      if (perpLine) {
        point.draw();
        this.drawings.push(point);
        perpLine.draw();
        this.drawings.push(perpLine);
        this.referenceLine = null;
        this.perpendicularPoint = null;
        this.redraw();
      }
    }
  }

  handleCompassTool(mousePos) {
    console.log('compas');
    if (this.cirlePoints.length === 0) {
      const center = new Point(this.ctx, mousePos.x, mousePos.y);
      center.draw();
      this.cirlePoints.push(center);
    } else if (this.cirlePoints.length === 1) {
      const radius = Math.sqrt(
        Math.pow(mousePos.x - this.cirlePoints[0].x, 2) +
        Math.pow(mousePos.y - this.cirlePoints[0].y, 2)
      );
      const circle = new Circle(this.ctx, this.cirlePoints[0], radius);
      circle.draw();
      this.drawings.push(circle);
      this.cirlePoints = [];
    }
  }

  handleKnownCompassTool(mousePos) {
    console.log('Utilisation du compas à rayon connu');
    const radius = parseFloat(document.getElementById('cercle-radius').value) * window.cmToPx;
    
    if (isNaN(radius)) {
      console.error('Rayon invalide');
      return;
    }

    const center = new Point(this.ctx, mousePos.x, mousePos.y);
    center.draw();
    const circle = new Circle(this.ctx, center, radius);
    circle.draw();
    this.drawings.push(circle);
  }

  handleSegmentKnownTool(mousePos) {
    console.log('Création d\'un segment de longueur connue');
    const length = parseFloat(document.getElementById('segment-length').value) * window.cmToPx;
    
    if (isNaN(length)) {
      console.error('Longueur invalide');
      return;
    }

    if (!this.startPoint) {
      this.startPoint = new Point(this.ctx, mousePos.x, mousePos.y);
      this.startPoint.draw();
      return;
    }

    // Calculer la direction du segment
    const dx = mousePos.x - this.startPoint.x;
    const dy = mousePos.y - this.startPoint.y;
    const currentLength = Math.sqrt(dx * dx + dy * dy);
    
    // Normaliser et ajuster à la longueur désirée
    const scale = length / currentLength;
    const endX = this.startPoint.x + dx * scale;
    const endY = this.startPoint.y + dy * scale;
    
    const endPoint = new Point(this.ctx, endX, endY);
    endPoint.draw();
    const segment = new Segment(this.ctx, this.startPoint, endPoint);
    segment.draw();
    
    this.drawings.push(segment);
    this.startPoint = null;
  }

  handleEraserTool(mousePos) {
    console.log('Utilisation de la gomme');
    const radius = 10; // Rayon de la zone de suppression
    
    // Trouver les éléments à supprimer
    const drawingsToRemove = [];
    for (const drawing of this.drawings) {
      if (drawing instanceof Point) {
        const distance = Math.sqrt(
          Math.pow(drawing.x - mousePos.x, 2) + 
          Math.pow(drawing.y - mousePos.y, 2)
        );
        if (distance <= radius) {
          drawingsToRemove.push(drawing);
        }
      }
      
      // Pour les segments
      else if (drawing instanceof Segment || drawing instanceof Line) {
        if (drawing.isPointNear(mousePos.x, mousePos.y)) {
          drawingsToRemove.push(drawing);
        }
      }
      
      // Pour les angles
      else if (drawing instanceof Angle) {
        // Vérifier si le clic est près du sommet
        const dVertex = Math.sqrt(
          Math.pow(drawing.vertex.x - mousePos.x, 2) + 
          Math.pow(drawing.vertex.y - mousePos.y, 2)
        );
        
        // Vérifier si le clic est près des lignes de l'angle
        const dStart = Math.sqrt(
          Math.pow(drawing.startPoint.x - mousePos.x, 2) + 
          Math.pow(drawing.startPoint.y - mousePos.y, 2)
        );
        
        const dEnd = Math.sqrt(
          Math.pow(drawing.endPoint.x - mousePos.x, 2) + 
          Math.pow(drawing.endPoint.y - mousePos.y, 2)
        );
        
        if (dVertex < radius || dStart < radius || dEnd < radius) {
          drawingsToRemove.push(drawing);
        }
      }
      
      // Pour le texte
      else if (drawing instanceof Text) {
        const textX = drawing.x;
        const textY = drawing.y;
        const dx = textX - mousePos.x;
        const dy = textY - mousePos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < radius) {
          drawingsToRemove.push(drawing);
        }
      }
      
      // Pour les cercles
      else if (drawing instanceof Circle) {
        // Vérifier si le clic est près du cercle
        if (drawing.isPointNear(mousePos.x, mousePos.y, radius)) {
          drawingsToRemove.push(drawing);
        }
        
        // Vérifier aussi si le clic est près du centre
        const distanceToCenter = Math.sqrt(
          Math.pow(drawing.center.x - mousePos.x, 2) + 
          Math.pow(drawing.center.y - mousePos.y, 2)
        );
        
        if (distanceToCenter < radius) {
          drawingsToRemove.push(drawing);
        }
      }
      
      // Pour les polygones
      else if (drawing instanceof Polygon) {
        if (drawing.isPointNear(mousePos.x, mousePos.y, radius)) {
          drawingsToRemove.push(drawing);
        }
      }
    }
    
    // Supprimer les éléments trouvés
    if (drawingsToRemove.length > 0) {
      this.drawings = this.drawings.filter(drawing => !drawingsToRemove.includes(drawing));
      this.redraw();
    }
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawings = [];
    this.startPoint = null;
  }
}

export class CanvasManager {
  constructor(container) {
    if (!container) {
      throw new Error('Container invalide');
    }
    this.container = container;
    this.pages = [];
    this.currentPage = null;
    this._currentTool = null;
    console.log('CanvasManager initialisé');
  }

  addPage(width, height) {
    console.log('Ajout d\'une nouvelle page...');
    console.log('Dimensions demandées:', width, 'x', height);

    if (!width || !height) {
      console.error('Dimensions invalides');
      return null;
    }

    // Créer le canvas avec les dimensions spécifiées
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width);
    canvas.height = Math.round(height);
    
    // Appliquer les styles
    canvas.style.border = '1px solid black';
    canvas.style.marginBottom = '10px';
    canvas.style.display = 'block';
    canvas.style.width = Math.round(width) + 'px';
    canvas.style.height = Math.round(height) + 'px';
    
    // Ajouter le canvas au container
    this.container.appendChild(canvas);

    try {
      const ctx = canvas.getContext('2d');
      const page = new CanvasPage(canvas, ctx);
      this.pages.push(page);
      
      // Si c'est la première page ou si aucune page courante n'est définie
      if (!this.currentPage || this.pages.length === 1) {
        this.setCurrentPage(page);
      }
      
      // Si un outil est déjà sélectionné, l'appliquer à la nouvelle page
      if (this._currentTool) {
        console.log('Application de l\'outil courant à la nouvelle page:', this._currentTool);
        page.setActiveTool(this._currentTool);
      }
      
      console.log('Page ajoutée avec succès, nombre total de pages:', this.pages.length);
      return page;
    } catch (error) {
      console.error('Erreur lors de la création de la page:', error);
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      return null;
    }
  }

  getCurrentPage() {
    return this.currentPage;
  }

  setCurrentPage(page) {
    if (this.pages.includes(page)) {
      this.currentPage = page;
      
      if (this._currentTool) {
        console.log('Application de l\'outil courant à la nouvelle page courante:', this._currentTool);
        this.currentPage.setActiveTool(this._currentTool);
      }
      
      console.log('Page courante mise à jour');
      return true;
    }
    console.error('Page invalide');
    return false;
  }

  setCurrentTool(toolName) {
    console.log('CanvasManager: définition de l\'outil courant:', toolName);
    this._currentTool = toolName;
    
    if (this.currentPage) {
      console.log('Application de l\'outil à la page courante:', toolName);
      this.currentPage.setActiveTool(toolName);
    }
  }

  get currentTool() {
    return this._currentTool;
  }

  removePage() {
    if (this.pages.length === 0) {
      console.log('Aucune page à supprimer');
      return;
    }

    const lastPage = this.pages[this.pages.length - 1];
    if (lastPage.canvas.parentNode) {
      lastPage.canvas.parentNode.removeChild(lastPage.canvas);
    }
    
    this.pages.pop();
    
    if (this.currentPage === lastPage) {
      this.currentPage = this.pages.length > 0 ? this.pages[this.pages.length - 1] : null;
      console.log('Page courante mise à jour après suppression');
    }
    
    console.log('Page supprimée, nombre de pages restantes:', this.pages.length);
  }

  removeAllPages(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '';
      this.pages = [];
      this.currentPage = null;
      console.log('Toutes les pages ont été supprimées');
    }
  }

  getPageAtPosition(x, y) {
    for (const page of this.pages) {
      const rect = page.canvas.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return page;
      }
    }
    return null;
  }
}
