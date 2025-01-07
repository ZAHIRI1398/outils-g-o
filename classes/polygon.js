export default class Polygon {
    constructor(ctx) {
        this.ctx = ctx;
        this.points = [];
        this.isComplete = false;
        this.fillColor = null;
    }

    addPoint(point) {
        // Ne pas ajouter de points si le polygone est complet
        if (this.isComplete) return;
        
        this.points.push(point);
        this.draw();
    }

    setFillColor(color) {
        this.fillColor = color;
        this.draw();
    }

    draw() {
        if (this.points.length < 2) return;

        this.ctx.beginPath();
        this.ctx.moveTo(this.points[0].x, this.points[0].y);
        
        for (let i = 1; i < this.points.length; i++) {
            this.ctx.lineTo(this.points[i].x, this.points[i].y);
        }

        if (this.isComplete) {
            this.ctx.closePath();
            if (this.fillColor) {
                this.ctx.fillStyle = this.fillColor;
                this.ctx.fill();
            }
        }

        this.ctx.strokeStyle = '#000000';
        this.ctx.stroke();
    }

    isNearFirstPoint(point) {
        if (this.points.length === 0) return false;
        const firstPoint = this.points[0];
        const distance = Math.sqrt(
            Math.pow(point.x - firstPoint.x, 2) + 
            Math.pow(point.y - firstPoint.y, 2)
        );
        return distance < 10;
    }

    complete() {
        if (this.points.length >= 3) {
            this.isComplete = true;
            this.draw();
        }
    }

    isPointInside(x, y) {
        if (!this.isComplete || this.points.length < 3) return false;

        let inside = false;
        for (let i = 0, j = this.points.length - 1; i < this.points.length; j = i++) {
            const xi = this.points[i].x, yi = this.points[i].y;
            const xj = this.points[j].x, yj = this.points[j].y;

            const intersect = ((yi > y) !== (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }

        return inside;
    }
}
