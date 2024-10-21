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

/**
 * The `ClaimManager` class is responsible for managing land claims within a kingdom.
 * It handles adding, removing, and querying claims, as well as maintaining a spatial index
 * for efficient lookup of claims based on their location.
 *
 * @class ClaimManager
 * @private
 */
class ClaimManager {
  private client: Client;
  private claims: Map<string, Claim> = new Map();
  private spatialIndex: Map<string, Set<string>> = new Map();
  private readonly indexResolution: number = 16;

  /**
   * @constructor
   * @param {Client} client - The client instance used for communication.
   */
  constructor(client: Client) {
    this.client = client;
    this.loadClaims();
  }

  /**
   * @method addClaim
   * @param {string} kingdomId - The ID of the kingdom to which the claim belongs.
   * @param {Vector2D[]} outline - The outline of the claim as an array of 2D vectors.
   * @returns {string} - The unique ID of the newly added claim.
   */
  public addClaim(kingdomId: string, outline: Vector2D[]): string {
    const id = this.generateUniqueId();
    const bounds = this.calculateBounds(outline);
    const claim: Claim = { id, kingdomId, outline, bounds };

    this.claims.set(id, claim);
    this.updateSpatialIndex(claim);
    this.saveClaims();

    return id;
  }

  /**
   * @method removeClaim
   * @param {string} id - The ID of the claim to be removed.
   * @returns {boolean} - True if the claim was successfully removed, false otherwise.
   */
  public removeClaim(id: string): boolean {
    const claim = this.claims.get(id);
    if (!claim) return false;

    this.removeFromSpatialIndex(claim);
    this.claims.delete(id);
    this.saveClaims();
    return true;
  }

  /**
   * @method getClaimAt
   * @param {Vector3} point - The 3D point to check for a claim.
   * @returns {Claim | null} - The claim at the specified point, or null if no claim exists.
   */
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

  /**
   * @method getAdjacentClaims
   * @param {string} claimId - The ID of the claim for which to find adjacent claims.
   * @returns {Claim[]} - An array of adjacent claims.
   */
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

  /**
   * @method isPointInClaim
   * @private
   * @param {Vector2D} point - The 2D point to check.
   * @param {Claim} claim - The claim to check against.
   * @returns {boolean} - True if the point is within the claim, false otherwise.
   */
  private isPointInClaim(point: Vector2D, claim: Claim): boolean {
    if (!this.isPointInBounds(point, claim.bounds)) return false;
    return this.isPointInsidePolygon(point, claim.outline);
  }

  /**
   * @method isPointInBounds
   * @private
   * @param {Vector2D} point - The 2D point to check.
   * @param {Claim['bounds']} bounds - The bounds of the claim.
   * @returns {boolean} - True if the point is within the bounds, false otherwise.
   */
  private isPointInBounds(point: Vector2D, bounds: Claim['bounds']): boolean {
    return (
      point.x >= bounds.minX && point.x <= bounds.maxX &&
      point.z >= bounds.minZ && point.z <= bounds.maxZ
    );
  }

  /**
   * @method isPointInsidePolygon
   * @private
   * @param {Vector2D} point - The 2D point to check.
   * @param {Vector2D[]} polygon - The polygon to check against.
   * @returns {boolean} - True if the point is inside the polygon, false otherwise.
   */
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

  /**
   * @method calculateBounds
   * @private
   * @param {Vector2D[]} outline - The outline of the claim.
   * @returns {Claim['bounds']} - The calculated bounds of the claim.
   */
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

  /**
   * @method updateSpatialIndex
   * @private
   * @param {Claim} claim - The claim to update in the spatial index.
   */
  private updateSpatialIndex(claim: Claim): void {
    const cellKeys = this.getCellKeysForClaim(claim);
    for (const cellKey of cellKeys) {
      if (!this.spatialIndex.has(cellKey)) {
        this.spatialIndex.set(cellKey, new Set());
      }
      this.spatialIndex.get(cellKey)!.add(claim.id);
    }
  }

  /**
   * @method removeFromSpatialIndex
   * @private
   * @param {Claim} claim - The claim to remove from the spatial index.
   */
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

  /**
   * @method getCellKeysForClaim
   * @private
   * @param {Claim} claim - The claim for which to get cell keys.
   * @returns {string[]} - An array of cell keys that the claim occupies.
   */
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

  /**
   * @method getCellKey
   * @private
   * @param {Vector3} point - The point for which to get the cell key.
   * @returns {string} - The cell key.
   */
  private getCellKey(point: Vector3): string {
    const cellX = Math.floor(point.x / this.indexResolution);
    const cellZ = Math.floor(point.z / this.indexResolution);
    return `${cellX}:${cellZ}`;
  }

  /**
   * @method areClaimsAdjacent
   * @private
   * @param {Claim} claimA - The first claim.
   * @param {Claim} claimB - The second claim.
   * @returns {boolean} - True if the claims are adjacent, false otherwise.
   */
  private areClaimsAdjacent(claimA: Claim, claimB: Claim): boolean {
    return (
      claimA.bounds.maxX >= claimB.bounds.minX &&
      claimA.bounds.minX <= claimB.bounds.maxX &&
      claimA.bounds.maxZ >= claimB.bounds.minZ &&
      claimA.bounds.minZ <= claimB.bounds.maxZ
    );
  }

  /**
   * @method generateUniqueId
   * @private
   * @returns {string} - A unique identifier.
   */
  private generateUniqueId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
