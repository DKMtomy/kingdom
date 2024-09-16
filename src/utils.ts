import {
  world,
  Player,
  Entity,
  Vector3,
  ItemStack,
  BlockRaycastOptions,
  EntityRaycastOptions,
  Dimension,
  system,
  BlockType,
  EntityQueryOptions,
  Block,
} from '@minecraft/server';

export class McUtils {
  /**
   * Get a player by their name.
   * @param name The name of the player.
   * @returns The player object or undefined if not found.
   */
  static getPlayerByName(name: string): Player | undefined {
    return world.getAllPlayers().find((player) => player.name === name);
  }

  /**
   * Get all entities of a specific type within a radius of a location.
   * @param location The center location.
   * @param radius The search radius.
   * @param entityType The type of entity to search for.
   * @returns An array of matching entities.
   */
  static getEntitiesNear(location: Vector3, radius: number, entityType: string): Entity[] {
    return world.getDimension('overworld').getEntities({
      location: location,
      maxDistance: radius,
      type: entityType,
    });
  }

  /**
   * Teleport a player to a specific location.
   * @param player The player to teleport.
   * @param location The destination location.
   */
  static teleportPlayer(player: Player, location: Vector3): void {
    player.teleport(location);
  }

  /**
   * Give an item to a player.
   * @param player The player to give the item to.
   * @param itemType The type of item to give.
   * @param amount The amount of the item to give.
   */
  static giveItem(player: Player, itemType: string, amount: number): void {
    const inv = player.getComponent('inventory');
    if (!inv)
      return console.error(`failed to give item to player ${player.name} the inv is undefiend`);

    inv.container?.addItem(new ItemStack(itemType, amount));
  }

  /**
   * Check if a location is safe for a player (not in a block).
   * @param location The location to check.
   * @returns True if the location is safe, false otherwise.
   */
  static isSafeLocation(location: Vector3): boolean {
    const block = world.getDimension('overworld').getBlock(location);
    if (!block) return false;
    return block.permutation.matches('minecraft:air');
  }

  /**
   * Get a random location within a radius of a center point.
   * @param center The center location.
   * @param radius The maximum radius.
   * @returns A random location within the specified radius.
   */
  static getRandomLocation(center: Vector3, radius: number): Vector3 {
    const x = center.x + (Math.random() * 2 - 1) * radius;
    const y = center.y + (Math.random() * 2 - 1) * radius;
    const z = center.z + (Math.random() * 2 - 1) * radius;
    return { x, y, z };
  }

  /**
   * Format a number of ticks into a human-readable time string.
   * @param ticks The number of ticks.
   * @returns A formatted time string.
   */
  static formatTicksToTime(ticks: number): string {
    const seconds = Math.floor(ticks / 20);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }

  /**
   * Check if two locations are within a certain distance of each other.
   * @param loc1 The first location.
   * @param loc2 The second location.
   * @param distance The maximum distance.
   * @returns True if the locations are within the specified distance, false otherwise.
   */
  static isWithinDistance(loc1: Vector3, loc2: Vector3, distance: number): boolean {
    const dx = loc1.x - loc2.x;
    const dy = loc1.y - loc2.y;
    const dz = loc1.z - loc2.z;
    return dx * dx + dy * dy + dz * dz <= distance * distance;
  }

  /**
   * Get the block that a player is looking at.
   * @param player The player to check.
   * @param maxDistance The maximum distance to check.
   * @returns The block the player is looking at, or null if none found.
   */
  static getTargetBlock(player: Player, maxDistance: number): Block | undefined {
    const raycastOptions: BlockRaycastOptions = {
      maxDistance: maxDistance,
    };
    return player.getBlockFromViewDirection(raycastOptions)?.block;
  }

  /**
   * Get the entity that a player is looking at.
   * @param player The player to check.
   * @param maxDistance The maximum distance to check.
   * @returns The entity the player is looking at, or null if none found.
   */
  static getTargetEntity(player: Player, maxDistance: number): Entity | null {
    const raycastOptions: EntityRaycastOptions = {
      maxDistance: maxDistance,
    };
    return player.getEntitiesFromViewDirection(raycastOptions)[0].entity || null;
  }

  /**
   * Create a cube of blocks around a center point.
   * @param center The center point of the cube.
   * @param radius The radius of the cube.
   * @param blockType The type of block to use.
   * @param dimension The dimension to create the cube in.
   */
  static createBlockCube(
    center: Vector3,
    radius: number,
    blockType: BlockType,
    dimension: Dimension
  ): void {
    for (let x = -radius; x <= radius; x++) {
      for (let y = -radius; y <= radius; y++) {
        for (let z = -radius; z <= radius; z++) {
          const blockLoc = {
            x: Math.floor(center.x + x),
            y: Math.floor(center.y + y),
            z: Math.floor(center.z + z),
          };
          dimension.getBlock(blockLoc)!.setType(blockType);
        }
      }
    }
  }

  /**
   * Create a sphere of blocks around a center point.
   * @param center The center point of the sphere.
   * @param radius The radius of the sphere.
   * @param blockType The type of block to use.
   * @param dimension The dimension to create the sphere in.
   */
  static createBlockSphere(
    center: Vector3,
    radius: number,
    blockType: BlockType,
    dimension: Dimension
  ): void {
    for (let x = -radius; x <= radius; x++) {
      for (let y = -radius; y <= radius; y++) {
        for (let z = -radius; z <= radius; z++) {
          if (x * x + y * y + z * z <= radius * radius) {
            const blockLoc = {
              x: Math.floor(center.x + x),
              y: Math.floor(center.y + y),
              z: Math.floor(center.z + z),
            };
            dimension.getBlock(blockLoc)!.setType(blockType);
          }
        }
      }
    }
  }

  /**
   * Launch an entity in the direction it's facing.
   * @param entity The entity to launch.
   * @param power The power of the launch (blocks per second).
   */
  static launchEntity(entity: Entity, power: number): void {
    const rotation = entity.getRotation();
    const rads = { x: (rotation.x * Math.PI) / 180, y: (rotation.y * Math.PI) / 180 };
    const vel = {
      x: -Math.sin(rads.y) * Math.cos(rads.x) * power,
      y: -Math.sin(rads.x) * power,
      z: Math.cos(rads.y) * Math.cos(rads.x) * power,
    };
    entity.applyImpulse(vel);
  }

  /**
   * Create a line of particles between two points.
   * @param start The start point of the line.
   * @param end The end point of the line.
   * @param particleType The type of particle to use.
   * @param dimension The dimension to create the particles in.
   * @param density The number of particles per block.
   */
  static createParticleLine(
    start: Vector3,
    end: Vector3,
    particleType: string,
    dimension: Dimension,
    density: number = 2
  ): void {
    const distance = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2) + Math.pow(end.z - start.z, 2)
    );
    const steps = Math.floor(distance * density);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const particleLoc = {
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t,
        z: start.z + (end.z - start.z) * t,
      };
      dimension.spawnParticle(particleType, particleLoc);
    }
  }

  /**
   * Find the nearest player to a given location.
   * @param location The location to search from.
   * @param dimension The dimension to search in.
   * @returns The nearest player, or null if none found.
   */
  static findNearestPlayer(location: Vector3, dimension: Dimension): Player | null {
    let nearestPlayer: Player | null = null;
    let nearestDistance = Infinity;
    for (const player of dimension.getPlayers()) {
      const distance = McUtils.getDistance(location, player.location);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestPlayer = player;
      }
    }
    return nearestPlayer;
  }

  /**
   * Get the distance between two points.
   * @param point1 The first point.
   * @param point2 The second point.
   * @returns The distance between the two points.
   */
  static getDistance(point1: Vector3, point2: Vector3): number {
    return Math.sqrt(
      Math.pow(point2.x - point1.x, 2) +
        Math.pow(point2.y - point1.y, 2) +
        Math.pow(point2.z - point1.z, 2)
    );
  }

  /**
   * Create a delayed task.
   * @param callback The function to call after the delay.
   * @param delayTicks The number of ticks to wait before calling the function.
   */
  static delayedTask(callback: () => void, delayTicks: number): void {
    system.runTimeout(callback, delayTicks);
  }

  /**
   * Create a repeating task.
   * @param callback The function to call repeatedly.
   * @param intervalTicks The number of ticks between each call.
   * @returns A function that can be called to stop the repeating task.
   */
  static repeatingTask(callback: () => void, intervalTicks: number): () => void {
    const runId = system.runInterval(callback, intervalTicks);
    return () => system.clearRun(runId);
  }

  /**
   * Apply a potion effect to a player.
   * @param player The player to apply the effect to.
   * @param effectType The type of effect to apply.
   * @param duration The duration of the effect in seconds.
   * @param amplifier The amplifier of the effect.
   */
  static applyEffect(
    player: Player,
    effectType: string,
    duration: number,
    amplifier: number
  ): void {
    player.addEffect(effectType, duration * 20, { amplifier: amplifier });
  }

  /**
   * Create an explosion.
   * @param location The location of the explosion.
   * @param dimension The dimension to create the explosion in.
   * @param power The power of the explosion.
   * @param breaksBlocks Whether the explosion should break blocks.
   */
  static createExplosion(
    location: Vector3,
    dimension: Dimension,
    power: number,
    breaksBlocks: boolean
  ): void {
    dimension.createExplosion(location, power, { breaksBlocks: breaksBlocks });
  }

  /**
   * Get all entities of a specific type in a dimension.
   * @param entityType The type of entity to search for.
   * @param dimension The dimension to search in.
   * @returns An array of matching entities.
   */
  static getAllEntitiesOfType(entityType: string, dimension: Dimension): Entity[] {
    const query: EntityQueryOptions = {
      type: entityType,
    };
    return dimension.getEntities(query);
  }

  /**
   * Set a block to a specific type.
   * @param location The location of the block.
   * @param blockType The type of block to set.
   * @param dimension The dimension the block is in.
   */
  static setBlock(location: Vector3, blockType: BlockType, dimension: Dimension): void {
    dimension.getBlock(location)!.setType(blockType);
  }

  /**
   * Create a floating text display.
   * @param location The location to display the text.
   * @param text The text to display.
   * @param dimension The dimension to display the text in.
   */
  static createFloatingText(location: Vector3, text: string, dimension: Dimension): void {
    dimension.spawnEntity('minecraft:armor_stand', location).nameTag = text;
  }

  /**
   * Get all players within a certain radius of a location.
   * @param location The center location.
   * @param radius The radius to search within.
   * @param dimension The dimension to search in.
   * @returns An array of players within the specified radius.
   */
  static getPlayersInRadius(location: Vector3, radius: number, dimension: Dimension): Player[] {
    return dimension.getPlayers({
      location: location,
      maxDistance: radius,
    });
  }

  /**
   * Clear all items from a player's inventory.
   * @param player The player whose inventory to clear.
   */
  static clearInventory(player: Player): void {
    const inventory = player.getComponent('inventory')!.container;
    if (!inventory) return;
    for (let i = 0; i < inventory.size; i++) {
      inventory.setItem(i, undefined);
    }
  }

  /**
   * Create a countdown timer that executes a callback when finished.
   * @param seconds The number of seconds to count down.
   * @param onTick A callback function to run each second, receives the current count.
   * @param onComplete A callback function to run when the countdown is complete.
   * @returns A function that can be called to stop the countdown.
   */
  static createCountdown(
    seconds: number,
    onTick: (count: number) => void,
    onComplete: () => void
  ): () => void {
    let count = seconds;
    const runId = system.runInterval(() => {
      if (count > 0) {
        onTick(count);
        count--;
      } else {
        system.clearRun(runId);
        onComplete();
      }
    }, 20);
    return () => system.clearRun(runId);
  }

  /**
   * Create a temporary platform under a player.
   * @param player The player to create the platform for.
   * @param blockType The type of block to use for the platform.
   * @param radius The radius of the platform.
   * @param duration The duration in seconds before the platform disappears.
   */
  static createTemporaryPlatform(
    player: Player,
    blockType: BlockType,
    radius: number,
    duration: number
  ): void {
    const center = player.location;
    const dimension = player.dimension;
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        if (x * x + z * z <= radius * radius) {
          const blockLoc = {
            x: Math.floor(center.x + x),
            y: Math.floor(center.y - 1),
            z: Math.floor(center.z + z),
          };
          const originalBlock = dimension.getBlock(blockLoc);
          dimension.getBlock(blockLoc)!.setType(blockType);
          McUtils.delayedTask(() => {
            dimension.getBlock(blockLoc)!.setType(originalBlock!.type);
          }, duration * 20);
        }
      }
    }
  }
}

export function formatDateToCustomString(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);

  return `${day}-${month}-${year}`;
}
