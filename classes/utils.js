import Point from './point.js';
import Segment from './segment.js';
import Line from './line.js';
import Circle from './circle.js';
import { Text } from './text.js';

export function findMidpoint(ctx, pointA, pointB) {
    console.log({ ctx: ctx, pointA: pointA, pointB: pointB });
    return new Point(
        ctx,
        (pointA.x + pointB.x) / 2,
        (pointA.y + pointB.y) / 2
    );
}

export function getLastTwoPoints(drawings) {
    const drawingsReversed = drawings.slice().reverse();
    const points = [];
    for (const drawing of drawingsReversed) {
        if (drawing instanceof Point) {
            points.push(drawing);
        }
        if (points.length === 2) {
            return points;
        }
    }
    return points;
}

export function getCloserPoint(drawings, point) {
    let minDistance = Infinity;
    let closerPoint = null;
    let allDistances = [];

    for (const drawing of drawings) {
        if (drawing instanceof Point) {
            const distance = Math.sqrt(
                Math.pow(point.x - drawing.x, 2) +
                Math.pow(point.y - drawing.y, 2)
            );
            allDistances.push(distance);
        } else if (drawing instanceof Segment) {
            const point1 = drawing.point1;
            const point2 = drawing.point2;

            const distancePoint1 = Math.sqrt(
                Math.pow(point.x - point1.x, 2) +
                Math.pow(point.y - point1.y, 2)
            );

            const distancePoint2 = Math.sqrt(
                Math.pow(point.x - point2.x, 2) +
                Math.pow(point.y - point2.y, 2)
            );

            const distance = Math.min(distancePoint1, distancePoint2);
            allDistances.push(distance);
        } else if (drawing instanceof Line) {
            const point1 = drawing.point1;
            const point2 = drawing.point2;

            const distancePoint1 = Math.sqrt(
                Math.pow(point.x - point1.x, 2) +
                Math.pow(point.y - point1.y, 2)
            );

            const distancePoint2 = Math.sqrt(
                Math.pow(point.x - point2.x, 2) +
                Math.pow(point.y - point2.y, 2)
            );

            const distance = Math.min(distancePoint1, distancePoint2);
            allDistances.push(distance);
        } else if (drawing instanceof Circle) {
            const distance = Math.abs(Math.sqrt(
                Math.pow(point.x - drawing.x, 2) +
                Math.pow(point.y - drawing.y, 2)
            ) - drawing.radius);
            allDistances.push(distance);
        } else if (drawing instanceof Text) {
            const distance = Math.sqrt(
                Math.pow(point.x - drawing.x, 2) +
                Math.pow(point.y - drawing.y, 2)
            );
            allDistances.push(distance);
        }
    }

    // console.log({ allDistances: allDistances });
    // Get closer point of allDistances
    const minDistanceIndex = allDistances.indexOf(Math.min(...allDistances));
    closerPoint = drawings[minDistanceIndex];

    return closerPoint;
}

export function getCloserText(drawings, point) {
    let minDistance = Infinity;
    let closerText = null;
    let allDistances = [];

    for (const drawing of drawings) {
        if (drawing instanceof Text) {
            // alert(drawing.text);
            const distance = Math.sqrt(
                Math.pow(point.x - drawing.x, 2) +
                Math.pow(point.y - drawing.y, 2)
            );
            allDistances.push(distance);
        }
    }

    // console.log({ allDistances: allDistances });
    // Get closer point of allDistances
    const minDistanceIndex = allDistances.indexOf(Math.min(...allDistances));
    closerText = drawings[minDistanceIndex];

    return closerText;
}

export function getCloserSegment(drawings, x, y, tolerance = 20) {
    console.log('getCloserSegment - Recherche parmi', drawings.length, 'dessins');
    let closestSegment = null;
    let minDistance = tolerance;

    for (const drawing of drawings) {
        console.log('Type de dessin:', drawing.constructor.name);
        if (drawing instanceof Segment) {
            console.log('Segment trouvé, calcul de la distance...');
            const distance = drawing.distanceToPoint({ x, y });
            console.log('Distance au segment:', distance);
            if (distance < minDistance) {
                minDistance = distance;
                closestSegment = drawing;
                console.log('Nouveau segment le plus proche trouvé!');
            }
        }
    }

    return closestSegment;
}

export function getDistance(point1, point2) {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

export async function exportCanvas(canvas, type) {
    const link = document.createElement("a");

    console.log({ canvas: canvas });

    console.log({ type: type });
    switch (type) {
        case "png":
            const tmpCanvas = document.createElement('canvas');
            const ctx = tmpCanvas.getContext('2d');
            tmpCanvas.width = canvas[0].canvas.width;
            tmpCanvas.height = canvas[0].canvas.height * canvas.length;
            let y = 0;

            canvas.forEach(page => {
                ctx.drawImage(page.canvas, 0, y);
                y += page.canvas.height;
            });
            link.download = "dessin.png";
            link.href = tmpCanvas.toDataURL();
            break;
        case "pdf":
            const pdfDoc = await PDFLib.PDFDocument.create();

            for (let i = 0; i < canvas.length; i++) {
                const single = canvas[i];
                const singleCanvas = canvas[i].canvas;
                const pngImage = await pdfDoc.embedPng(singleCanvas.toDataURL());

                const page = pdfDoc.addPage([singleCanvas.width, singleCanvas.height]);
                page.drawImage(pngImage, {
                    x: 0,
                    y: 0,
                    width: singleCanvas.width,
                    height: singleCanvas.height,
                });

                for (const drawing of single.drawings) {
                    if (drawing instanceof Text) {
                        const { x, y, text, fontSize = 20, fontFamily = 'Helvetica', color = '#000000' } = drawing;

                        const pdfFont = await pdfDoc.embedFont(PDFLib.StandardFonts[fontFamily]);
                        page.drawText(text, {
                            x: x,
                            y: single.canvas.height - y,  // Inverser Y pour correspondre à l'origine en haut à gauche
                            size: fontSize,
                            font: pdfFont,
                            color: PDFLib.rgb(...hexToRgb(color))
                        });
                    }
                }
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: "application/pdf" });
            link.download = "dessin.pdf";
            link.href = URL.createObjectURL(blob);
            break;
        case "json":
            const drawings = [];
            canvas.forEach(page => {
                drawings.push(page.drawings);
            });
            link.download = "dessin.json";
            link.href = URL.createObjectURL(new Blob([JSON.stringify(drawings)], { type: "application/json" }));
            break;
    }

    console.log({ link: link });
    link.click();
}

function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    return [
        (bigint >> 16) & 255 / 255,
        (bigint >> 8) & 255 / 255,
        bigint & 255 / 255
    ];
}

export function zoomCanvas(canvas, zoom) {
    canvas.style.transform = `scale(${zoom + 1})`;
}

export function unzoomCanvas(canvas) {
    canvas.style.transform = `scale(1)`;
}