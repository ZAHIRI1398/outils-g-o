import Point from './point.js';
import Line from './line.js';
import Segment from './segment.js';

export default class Parallele {
  constructor(ctx) {
    this.ctx = ctx;
    this.referenceLine = null;
    this.clickPoint = null;
  }

  handleClick(x, y, drawings) {
    const point = new Point(this.ctx, x, y);

    if (!this.referenceLine) {
      // Premier clic : chercher une ligne ou un segment proche
      this.referenceLine = Parallele.findReferenceLine(drawings, point);
      this.clickPoint = point;
      return null;
    } else {
      // Deuxième clic : créer la parallèle
      const newLine = Parallele.createParallelLine(this.ctx, this.referenceLine, point);
      this.referenceLine = null;
      this.clickPoint = null;
      return newLine;
    }
    return null;
  }

  static findReferenceLine(drawings, point, radius = 10) {
    for (const drawing of drawings) {
      if ((drawing instanceof Line || drawing instanceof Segment) && 
          drawing.isPointNear(point.x, point.y, radius)) {
        return drawing;
      }
    }
    return null;
  }

  static createParallelLine(ctx, referenceLine, point) {
    if (!referenceLine || !point) return null;

    // Obtenir le vecteur directeur de la ligne de référence
    let dx = referenceLine.point2.x - referenceLine.point1.x;
    let dy = referenceLine.point2.y - referenceLine.point1.y;

    // Normaliser le vecteur
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return null;

    dx = dx / length;
    dy = dy / length;

    // Créer une nouvelle ligne parallèle passant par le point
    const point1 = point;
    const point2 = new Point(
      ctx,
      point.x + dx * 1000,
      point.y + dy * 1000
    );

    return new Line(ctx, point1, point2);
  }
}
