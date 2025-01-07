import Line from './line.js';
import Segment from './segment.js';
import Point from './point.js';

export default class Perpendiculaire {
  constructor(ctx) {
    this.ctx = ctx;
    this.referenceLine = null;
  }

  static findReferenceLine(drawings, point, radius = 10) {
    // Trouver la ligne ou le segment le plus proche
    for (const drawing of drawings) {
      if ((drawing instanceof Line || drawing instanceof Segment) && 
          drawing.isPointNear(point.x, point.y, radius)) {
        return drawing;
      }
    }
    return null;
  }

  static createPerpendicularLine(ctx, referenceLine, clickPoint) {
    if (!referenceLine || !clickPoint) return null;

    // Calculer le point de projection sur la ligne de référence
    let projectionPoint;
    const dx = referenceLine.point2.x - referenceLine.point1.x;
    const dy = referenceLine.point2.y - referenceLine.point1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) return null;

    // Normaliser le vecteur directeur
    const dirX = dx / length;
    const dirY = dy / length;

    // Calculer le vecteur du point1 au point de clic
    const vectorX = clickPoint.x - referenceLine.point1.x;
    const vectorY = clickPoint.y - referenceLine.point1.y;

    // Calculer la projection
    const dot = vectorX * dirX + vectorY * dirY;
    
    // Point de projection
    projectionPoint = new Point(ctx,
      referenceLine.point1.x + dirX * dot,
      referenceLine.point1.y + dirY * dot
    );

    // Vecteur perpendiculaire normalisé
    const perpDirX = -dirY;
    const perpDirY = dirX;

    // Créer la ligne perpendiculaire
    return new Line(ctx, projectionPoint, clickPoint);
  }
}
