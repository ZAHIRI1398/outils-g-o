export default class Circle {
  constructor(ctx, center, radius) {
    this.ctx = ctx;
    this.center = center;
    this.radius = radius;
  }

  draw() {
    this.ctx.beginPath();
    this.ctx.arc(this.center.x, this.center.y, this.radius, 0, 2 * Math.PI);
    this.ctx.strokeStyle = 'black';
    this.ctx.stroke();
    this.ctx.closePath();
  }

  isPointNear(x, y, tolerance = 5) {
    const distanceToCenter = Math.sqrt(
      Math.pow(x - this.center.x, 2) + Math.pow(y - this.center.y, 2)
    );
    return Math.abs(distanceToCenter - this.radius) < tolerance;
  }

  distanceToPoint(point) {
    // Distance entre le point et le centre, moins le rayon
    const distanceToCenter = Math.sqrt(
      Math.pow(point.x - this.center.x, 2) + 
      Math.pow(point.y - this.center.y, 2)
    );
    return Math.abs(distanceToCenter - this.radius);
  }

  isNear(point) {
    return this.distanceToPoint(point) < 20;
  }
}