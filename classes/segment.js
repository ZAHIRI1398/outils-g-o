import { Text } from "./text.js";

export default class Segment {
  constructor(ctx, point1, point2) {
    this.ctx = ctx;
    this.point1 = point1;
    this.point2 = point2;
    this.middleFind = false;
  }

  isPointNear(x, y, tolerance = 5) {
    return this.distanceToPoint({ x, y }) < tolerance;
  }

  draw() {
    // Dessiner le segment
    this.ctx.beginPath();
    this.ctx.moveTo(this.point1.x, this.point1.y);
    this.ctx.lineTo(this.point2.x, this.point2.y);
    this.ctx.strokeStyle = 'black';
    this.ctx.stroke();
    
    // Si on a trouvé le milieu, le marquer
    if (this.middleFind) {
      const midX = (this.point1.x + this.point2.x) / 2;
      const midY = (this.point1.y + this.point2.y) / 2;
      
      this.ctx.beginPath();
      this.ctx.arc(midX, midY, 3, 0, 2 * Math.PI);
      this.ctx.fillStyle = 'red';
      this.ctx.fill();
    }
  }

  findMiddle() {
    console.log('Marquage du milieu du segment');
    this.middleFind = true;
    this.draw();
  }

  getLength() {
    const dx = this.point2.x - this.point1.x;
    const dy = this.point2.y - this.point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  setLength(length) {
    // Calculer la longueur actuelle
    const dx = this.point2.x - this.point1.x;
    const dy = this.point2.y - this.point1.y;
    const currentLength = Math.sqrt(dx * dx + dy * dy);
    
    // Calculer le ratio pour la nouvelle longueur
    const ratio = length / currentLength;
    
    // Mettre à jour les coordonnées du point2
    this.point2.x = this.point1.x + dx * ratio;
    this.point2.y = this.point1.y + dy * ratio;
  }

  distanceToPoint(point) {
    console.log('Calcul de la distance au point:', point);
    const x = point.x;
    const y = point.y;
    const x1 = this.point1.x;
    const y1 = this.point1.y;
    const x2 = this.point2.x;
    const y2 = this.point2.y;

    // Calculer la distance du point au segment
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;

    if (len_sq !== 0) param = dot / len_sq;

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;
    const distance = Math.sqrt(dx * dx + dy * dy);
    console.log('Distance calculée:', distance);
    return distance;
  }
}
