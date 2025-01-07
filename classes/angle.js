export default class Angle {
    constructor(ctx, startPoint, vertex, angle) {
        this.ctx = ctx;
        this.startPoint = startPoint;
        this.vertex = vertex;
        this.angleDegrees = angle;
        this.endPoint = this.calculateEndPoint();
    }

    calculateEndPoint() {
        // Calculer l'angle initial (entre le point de départ et le sommet)
        const dx = this.startPoint.x - this.vertex.x;
        const dy = this.startPoint.y - this.vertex.y;
        const startAngle = Math.atan2(dy, dx);
        
        // Convertir l'angle en radians et l'ajouter à l'angle initial
        const angleRadians = (this.angleDegrees * Math.PI) / 180;
        const finalAngle = startAngle + angleRadians;
        
        // Calculer la distance entre le sommet et le point de départ
        const radius = Math.sqrt(dx * dx + dy * dy);
        
        // Calculer les coordonnées du point final
        const endX = this.vertex.x + radius * Math.cos(finalAngle);
        const endY = this.vertex.y + radius * Math.sin(finalAngle);
        
        return { x: endX, y: endY };
    }

    draw() {
        // Dessiner les lignes de l'angle
        this.ctx.beginPath();
        this.ctx.moveTo(this.vertex.x, this.vertex.y);
        this.ctx.lineTo(this.startPoint.x, this.startPoint.y);
        this.ctx.moveTo(this.vertex.x, this.vertex.y);
        this.ctx.lineTo(this.endPoint.x, this.endPoint.y);
        this.ctx.strokeStyle = 'black';
        this.ctx.stroke();

        // Dessiner l'arc de l'angle
        const radius = 20; // Rayon de l'arc
        const dx1 = this.startPoint.x - this.vertex.x;
        const dy1 = this.startPoint.y - this.vertex.y;
        const startAngle = Math.atan2(dy1, dx1);
        const endAngle = startAngle + (this.angleDegrees * Math.PI) / 180;

        this.ctx.beginPath();
        this.ctx.arc(this.vertex.x, this.vertex.y, radius, startAngle, endAngle);
        this.ctx.stroke();

        // Afficher la valeur de l'angle
        const midAngle = startAngle + (this.angleDegrees * Math.PI) / 360;
        const textX = this.vertex.x + (radius + 10) * Math.cos(midAngle);
        const textY = this.vertex.y + (radius + 10) * Math.sin(midAngle);
        
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = 'black';
        this.ctx.fillText(`${this.angleDegrees}°`, textX, textY);
    }
}
