export default class Line {
    constructor(ctx, point1, point2) {
        this.ctx = ctx;
        this.point1 = point1;
        this.point2 = point2;
        this.x1 = point1.x;
        this.y1 = point1.y;
        this.x2 = point2.x;
        this.y2 = point2.y;
    }

    calcSlope() {
        return (this.y2 - this.y1) / (this.x2 - this.x1);
    }

    draw() {
        // Calculer la pente et l'ordonnée à l'origine
        const slope = this.calcSlope();
        const yIntercept = this.y1 - slope * this.x1;

        // Calculer les points d'intersection avec les bords du canvas
        const canvas = this.ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;

        // Points d'intersection avec les bords verticaux
        const leftY = slope * 0 + yIntercept;
        const rightY = slope * width + yIntercept;

        // Points d'intersection avec les bords horizontaux
        const topX = (0 - yIntercept) / slope;
        const bottomX = (height - yIntercept) / slope;

        // Trouver les deux points d'intersection qui sont dans les limites du canvas
        let points = [];
        if (leftY >= 0 && leftY <= height) points.push({x: 0, y: leftY});
        if (rightY >= 0 && rightY <= height) points.push({x: width, y: rightY});
        if (topX >= 0 && topX <= width) points.push({x: topX, y: 0});
        if (bottomX >= 0 && bottomX <= width) points.push({x: bottomX, y: height});

        // S'assurer qu'on a deux points pour tracer la ligne
        if (points.length >= 2) {
            this.ctx.beginPath();
            this.ctx.moveTo(points[0].x, points[0].y);
            this.ctx.lineTo(points[1].x, points[1].y);
            this.ctx.strokeStyle = 'blue';
            this.ctx.stroke();
        }
    }

    isPointNear(x, y, tolerance = 5) {
        // Pour une droite infinie, on utilise la distance point-droite
        const A = this.y2 - this.y1;
        const B = this.x1 - this.x2;
        const C = this.x2 * this.y1 - this.x1 * this.y2;
        
        // Distance = |Ax + By + C| / sqrt(A² + B²)
        const distance = Math.abs(A * x + B * y + C) / Math.sqrt(A * A + B * B);
        
        return distance < tolerance;
    }

    distanceToPoint(point) {
        // Calculer la distance d'un point à une droite
        const x0 = point.x;
        const y0 = point.y;
        const x1 = this.point1.x;
        const y1 = this.point1.y;
        const x2 = this.point2.x;
        const y2 = this.point2.y;

        const numerator = Math.abs((y2-y1)*x0 - (x2-x1)*y0 + x2*y1 - y2*x1);
        const denominator = Math.sqrt(Math.pow(y2-y1, 2) + Math.pow(x2-x1, 2));
        
        return numerator / denominator;
    }

    isNear(point) {
        return this.distanceToPoint(point) < 20;
    }
}