import { Vector2D } from "./types";

export class OutlineBuilder {
  private vertices: Vector2D[] = [];

  // Add a vertex to the outline
  public addVertex(x: number, z: number): OutlineBuilder {
    this.vertices.push({ x, z });
    return this;
  }

  public isVertexAlreadyAdded(x: number, z: number): boolean {
    return this.vertices.some(vertex => vertex.x === x && vertex.z === z);
  }

  // Generate filled outline points
  public buildFilledOutline(): Vector2D[] {
    const filledPoints = new Set<string>();

    // Draw lines between vertices
    for (let i = 0; i < this.vertices.length; i++) {
      const start = this.vertices[i];
      const end = this.vertices[(i + 1) % this.vertices.length];
      this.drawLine(start, end, filledPoints);
    }

    // Fill the polygon interior
    return this.fillInsidePolygon(filledPoints);
  }

  private drawLine(start: Vector2D, end: Vector2D, points: Set<string>) {
    const dx = Math.abs(end.x - start.x);
    const dz = Math.abs(end.z - start.z);
    const sx = start.x < end.x ? 1 : -1;
    const sz = start.z < end.z ? 1 : -1;
    let err = dx - dz;

    let x = start.x;
    let z = start.z;

    while (true) {
      points.add(`${x}:${z}`);
      if (x === end.x && z === end.z) break;

      const e2 = err * 2;
      if (e2 > -dz) {
        err -= dz;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        z += sz;
      }
    }
  }

  private fillInsidePolygon(outlinePoints: Set<string>): Vector2D[] {
    const filledPoints = new Set<string>(outlinePoints);
    const outlineArray = Array.from(outlinePoints).map(point => {
      const [x, z] = point.split(":").map(Number);
      return { x, z };
    });

    outlineArray.sort((a, b) => a.z - b.z || a.x - b.x);
    let currentZ = outlineArray[0].z;
    let rowStart: number | null = null;

    for (const { x, z } of outlineArray) {
      if (z !== currentZ) {
        if (rowStart !== null) {
          this.fillRow(currentZ, rowStart, x, filledPoints);
        }
        currentZ = z;
        rowStart = null;
      }

      if (rowStart === null) {
        rowStart = x;
      } else {
        this.fillRow(z, rowStart, x, filledPoints);
        rowStart = null;
      }
    }

    return Array.from(filledPoints).map(point => {
      const [x, z] = point.split(":").map(Number);
      return { x, z };
    });
  }

  private fillRow(z: number, startX: number, endX: number, points: Set<string>) {
    for (let x = startX; x <= endX; x++) {
      points.add(`${x}:${z}`);
    }
  }
}
