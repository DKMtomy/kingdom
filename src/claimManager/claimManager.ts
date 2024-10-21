import { Vector3 } from "@minecraft/server";
import { Client } from "../client/index";

interface Vector2D {
  x: number;
  z: number;
}

interface Claim {
  id: string;
  kingdomId: string;
  outline: Vector2D[];
  bounds: {
    minX: number;
    minZ: number;
    maxX: number;
    maxZ: number;
  };
}

class ClaimManager {
  private client: Client;
  private claims: Map<string, Claim> = new Map();
  private spatialIndex: Map<string, Set<string>> = new Map();
  private readonly indexResolution: number = 16;

  constructor(client: Client) {
    this.client = client;
    this.loadClaims();
  }

  public addClaim(kingdomId: string, outline: Vector2D[]): string {
    const id = this.generateUniqueId();
    const bounds = this.calculateBounds(outline);
    const claim: Claim = { id, kingdomId, outline, bounds };

    this.claims.set(id, claim);
    this.updateSpatialIndex(claim);
    this.saveClaims();

    return id;
  }

  public removeClaim(id: string): boolean {
    const claim = this.claims.get(id);
    if (!claim) return false;

    this.removeFromSpatialIndex(claim);
    this.claims.delete(id);
    this.saveClaims();
    return true;
  }

  public getClaimAt(point: Vector3): Claim | null {
    const cellKey = this.getCellKey(point);
    const potentialClaims = this.spatialIndex.get(cellKey) || new Set();

    for (const claimId of potentialClaims) {
      const claim = this.claims.get(claimId)!;
      if (this.isPointInClaim({x: point.x, z: point.z}, claim)) {
        return claim;
      }
    }

    return null;
  }

  public getAdjacentClaims(claimId: string): Claim[] {
    const claim = this.claims.get(claimId);
    if (!claim) return [];

    const adjacentClaims: Claim[] = [];
    const cellKeys = this.getCellKeysForClaim(claim);

    const checkedClaimIds = new Set<string>();

    for (const cellKey of cellKeys) {
      const claimsInCell = this.spatialIndex.get(cellKey) || new Set();
      for (const potentialClaimId of claimsInCell) {
        if (potentialClaimId !== claimId && !checkedClaimIds.has(potentialClaimId)) {
          checkedClaimIds.add(potentialClaimId);
          const potentialClaim = this.claims.get(potentialClaimId)!;
          if (this.areClaimsAdjacent(claim, potentialClaim)) {
            adjacentClaims.push(potentialClaim);
          }
        }
      }
    }

    return adjacentClaims;
  }

  private isPointInClaim(point: Vector2D, claim: Claim): boolean {
    if (!this.isPointInBounds(point, claim.bounds)) return false;
    return this.isPointInsidePolygon(point, claim.outline);
  }

  private isPointInBounds(point: Vector2D, bounds: Claim['bounds']): boolean {
    return (
      point.x >= bounds.minX && point.x <= bounds.maxX &&
      point.z >= bounds.minZ && point.z <= bounds.maxZ
    );
  }

  private isPointInsidePolygon(point: Vector2D, polygon: Vector2D[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, zi = polygon[i].z;
      const xj = polygon[j].x, zj = polygon[j].z;

      const intersect = ((zi > point.z) !== (zj > point.z))
          && (point.x < (xj - xi) * (point.z - zi) / (zj - zi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  private calculateBounds(outline: Vector2D[]): Claim['bounds'] {
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;

    for (const point of outline) {
      minX = Math.min(minX, point.x);
      minZ = Math.min(minZ, point.z);
      maxX = Math.max(maxX, point.x);
      maxZ = Math.max(maxZ, point.z);
    }

    return { minX, minZ, maxX, maxZ };
  }

  private updateSpatialIndex(claim: Claim): void {
    const cellKeys = this.getCellKeysForClaim(claim);
    for (const cellKey of cellKeys) {
      if (!this.spatialIndex.has(cellKey)) {
        this.spatialIndex.set(cellKey, new Set());
      }
      this.spatialIndex.get(cellKey)!.add(claim.id);
    }
  }

  private removeFromSpatialIndex(claim: Claim): void {
    const cellKeys = this.getCellKeysForClaim(claim);
    for (const cellKey of cellKeys) {
      const cellClaims = this.spatialIndex.get(cellKey);
      if (cellClaims) {
        cellClaims.delete(claim.id);
        if (cellClaims.size === 0) {
          this.spatialIndex.delete(cellKey);
        }
      }
    }
  }

  private getCellKeysForClaim(claim: Claim): string[] {
    const cellKeys = new Set<string>();
    const { minX, minZ, maxX, maxZ } = claim.bounds;

    const startX = Math.floor(minX / this.indexResolution);
    const startZ = Math.floor(minZ / this.indexResolution);
    const endX = Math.floor(maxX / this.indexResolution);
    const endZ = Math.floor(maxZ / this.indexResolution);

    for (let x = startX; x <= endX; x++) {
      for (let z = startZ; z <= endZ; z++) {
        cellKeys.add(`${x}:${z}`);
      }
    }

    return Array.from(cellKeys);
  }

  private getCellKey(point: Vector3): string {
    const x = Math.floor(point.x / this.indexResolution);
    const z = Math.floor(point.z / this.indexResolution);
    return `${x}:${z}`;
  }

  private areClaimsAdjacent(claim1: Claim, claim2: Claim): boolean {
    // Check if any edge of claim1 intersects with any edge of claim2
    for (let i = 0; i < claim1.outline.length; i++) {
      const start1 = claim1.outline[i];
      const end1 = claim1.outline[(i + 1) % claim1.outline.length];

      for (let j = 0; j < claim2.outline.length; j++) {
        const start2 = claim2.outline[j];
        const end2 = claim2.outline[(j + 1) % claim2.outline.length];

        if (this.doLineSegmentsIntersect(start1, end1, start2, end2)) {
          return true;
        }
      }
    }
    return false;
  }

  private doLineSegmentsIntersect(p1: Vector2D, p2: Vector2D, p3: Vector2D, p4: Vector2D): boolean {
    const d1 = this.direction(p3, p4, p1);
    const d2 = this.direction(p3, p4, p2);
    const d3 = this.direction(p1, p2, p3);
    const d4 = this.direction(p1, p2, p4);

    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
        ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
      return true;
    }

    return d1 === 0 && this.onSegment(p3, p4, p1) ||
           d2 === 0 && this.onSegment(p3, p4, p2) ||
           d3 === 0 && this.onSegment(p1, p2, p3) ||
           d4 === 0 && this.onSegment(p1, p2, p4);
  }

  private direction(p1: Vector2D, p2: Vector2D, p3: Vector2D): number {
    return (p3.x - p1.x) * (p2.z - p1.z) - (p2.x - p1.x) * (p3.z - p1.z);
  }

  private onSegment(p1: Vector2D, p2: Vector2D, p3: Vector2D): boolean {
    return Math.min(p1.x, p2.x) <= p3.x && p3.x <= Math.max(p1.x, p2.x) &&
           Math.min(p1.z, p2.z) <= p3.z && p3.z <= Math.max(p1.z, p2.z);
  }

  private generateUniqueId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private saveClaims(): void {
    const claimsData = JSON.stringify(Array.from(this.claims.entries()));
    // Save claimsData to a file or database
    console.log('Claims saved:', claimsData);
  }

  private loadClaims(): void {
    // Load claims from a file or database
    // For now, we'll use an example claim
    const exampleClaim: Claim = {
      id: "example",
      kingdomId: "kingdom1",
      outline: [
        {x: 41, z: -16}, {x: 40, z: -16}, {x: 39, z: -16}, {x: 38, z: -16},
        {x: 37, z: -16}, {x: 36, z: -17}, {x: 35, z: -17}, {x: 34, z: -17},
        {x: 33, z: -18}, {x: 32, z: -19}, {x: 31, z: -19}, {x: 30, z: -20},
        {x: 29, z: -20}, {x: 28, z: -20}, {x: 28, z: -21}, {x: 28, z: -22},
        {x: 28, z: -23}, {x: 29, z: -24}, {x: 30, z: -25}, {x: 31, z: -25},
        {x: 32, z: -25}, {x: 33, z: -25}, {x: 34, z: -24}, {x: 35, z: -25},
        {x: 36, z: -25}, {x: 38, z: -25}, {x: 37, z: -24}, {x: 39, z: -25},
        {x: 40, z: -25}, {x: 41, z: -25}, {x: 42, z: -24}, {x: 43, z: -23},
        {x: 43, z: -22}, {x: 43, z: -21}, {x: 42, z: -20}, {x: 42, z: -19},
        {x: 42, z: -18}, {x: 42, z: -17}
      ],
      bounds: this.calculateBounds([
        {x: 41, z: -16}, {x: 40, z: -16}, {x: 39, z: -16}, {x: 38, z: -16},
        {x: 37, z: -16}, {x: 36, z: -17}, {x: 35, z: -17}, {x: 34, z: -17},
        {x: 33, z: -18}, {x: 32, z: -19}, {x: 31, z: -19}, {x: 30, z: -20},
        {x: 29, z: -20}, {x: 28, z: -20}, {x: 28, z: -21}, {x: 28, z: -22},
        {x: 28, z: -23}, {x: 29, z: -24}, {x: 30, z: -25}, {x: 31, z: -25},
        {x: 32, z: -25}, {x: 33, z: -25}, {x: 34, z: -24}, {x: 35, z: -25},
        {x: 36, z: -25}, {x: 38, z: -25}, {x: 37, z: -24}, {x: 39, z: -25},
        {x: 40, z: -25}, {x: 41, z: -25}, {x: 42, z: -24}, {x: 43, z: -23},
        {x: 43, z: -22}, {x: 43, z: -21}, {x: 42, z: -20}, {x: 42, z: -19},
        {x: 42, z: -18}, {x: 42, z: -17}
      ])
    };
    this.claims.set(exampleClaim.id, exampleClaim);
    this.updateSpatialIndex(exampleClaim);
  }
}

export { ClaimManager, Claim, Vector2D };
