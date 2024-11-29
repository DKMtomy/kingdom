import { Claim } from "./Claim";
import { OutlineBuilder } from "./OutlineBuilder";
import { Client } from "../client/Client";
import { Vector2D, Vector3D } from "./types";

export class ClaimManager {
  private readonly client: Client;
  private readonly claims: Map<string, Claim>;
  private readonly claimCache: Map<string, Claim>; // Cache for frequently accessed claims

  constructor(client: Client) {
    this.client = client;
    this.claims = new Map();
    this.claimCache = new Map();
    this.initializeClaims();
  }

  public async addClaim(kingdomId: string, outlineBuilder: OutlineBuilder): Promise<string> {
    try {
      const outline = outlineBuilder.buildFilledOutline();
      const claimId = this.generateUniqueId();
      const claim: Claim = { id: claimId, kingdomId, outline };

      this.claims.set(claimId, claim);
      this.claimCache.set(claimId, claim);
      await this.saveClaims();

      return claimId;
    } catch (error) {
      console.error('Failed to add claim:', error);
      throw new Error('Failed to add claim');
    }
  }

  public async removeClaim(id: string): Promise<boolean> {
    try {
      const exists = this.claims.delete(id);
      if (exists) {
        this.claimCache.delete(id);
        await this.saveClaims();
      }
      return exists;
    } catch (error) {
      console.error('Failed to remove claim:', error);
      throw new Error('Failed to remove claim');
    }
  }

  public getClaimAt(point: Vector3D): Claim | null {
    const key = `${point.x}:${point.z}`;

    // Check cache first
    const cachedClaim = this.claimCache.get(key);
    if (cachedClaim) return cachedClaim;

    // Use more efficient point-in-polygon check
    for (const claim of this.claims.values()) {
      if (this.isPointInClaim({ x: point.x, z: point.z }, claim)) {
        this.claimCache.set(key, claim); // Cache the result
        return claim;
      }
    }
    return null;
  }

  private isPointInClaim(point: Vector2D, claim: Claim): boolean {
    // Ray casting algorithm for point-in-polygon check
    let inside = false;
    const outline = claim.outline;

    for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
      const xi = outline[i].x, yi = outline[i].z;
      const xj = outline[j].x, yj = outline[j].z;

      const intersect = ((yi > point.z) !== (yj > point.z))
          && (point.x < (xj - xi) * (point.z - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }

    return inside;
  }

  private generateUniqueId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 9);
    return `${timestamp}-${randomStr}`;
  }

  private async saveClaims(): Promise<void> {
    try {
      const claimsArray = Array.from(this.claims.values());
      await this.client.kingdomClient.insertOne("kingdoms", "claims", {
        //@ts-expect-error
        claims: claimsArray,
        lastUpdated: Date.now()
      });
    } catch (error) {
      console.error('Failed to save claims:', error);
      throw new Error('Failed to save claims');
    }
  }

  private async initializeClaims(): Promise<void> {
    try {
      // TODO: Implement loading claims from storage
      // const storedClaims = await this.client.kingdomClient.find("kingdoms", "claims");
      // if (storedClaims) {
      //   storedClaims.forEach(claim => this.claims.set(claim.id, claim));
      // }
    } catch (error) {
      console.error('Failed to initialize claims:', error);
      throw new Error('Failed to initialize claims');
    }
  }

  // Additional utility methods
  public getClaims(): Map<string, Claim> {
    return new Map(this.claims);
  }

  public clearCache(): void {
    this.claimCache.clear();
  }
}
