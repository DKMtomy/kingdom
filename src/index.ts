import { BlockComponentStepOnEvent, Player as IPlayer ,BlockCustomComponent, BlockInventoryComponent, BlockPermutation, Dimension, Entity, EquipmentSlot, system, world, Vector3, Vector2 } from '@minecraft/server';
import { Client } from './client/index.js';
import './poly.js';
import { Player } from './Player/Player.js';
import { ColorCodes } from './types/colorCodes.js';
import { MinecraftBlockTypes } from './types/minecraftBlockTypes.js';
import { InventoryManager } from './duels/index.js';
import { EnhancedActionFormData } from './kingdom/form.js';

const client = new Client('WKD', '1.0.0');

client.before('kingdomInvite', async (event) => {
  //check if the player is already in a kingdom
  const kingdom = await client.kingdomManager.isInKingdom(event.player);

  // if (kingdom) {
  //   client.sendMessage(`${event.player.player.name} zit al in een kingdom!`, event.inviter.player);
  //   return;
  // }

  //check if the player is already invited to the kingdom
  const invite = await client.kingdomManager.isInvitedToKingdom(event.player, event.kingdom.name);

  if (invite) {
    client.sendMessage(
      `${event.player.player.name} is al uitgenodigd voor dit kingdom!`,
      event.inviter.player
    );
    return;
  }

  //insert the invite into the database
  client.kingdomClient
    .insertOne('kingdoms', 'invites', {
      player: event.player.name,
      kingdom: event.kingdom.name,
      date: Date.now(),
      inviter: event.inviter.name,
    })
    .then((result) => {
      client.sendMessage(
        `Je hebt ${event.player.player} uitgenodigd voor ${event.kingdom.name}!`,
        event.inviter.player
      );
    });
});

world.afterEvents.playerSpawn.subscribe((event) => {
  //early return if the player is not initial spawn
  if (!event.initialSpawn) return;

  console.log(`Player ${event.player.name} has spawned!`);

  const player = new Player(event.player);
});

//a map so we can make a 1 sec cooldown for the compass so we store the playername and the last time they used the compass
const compassCooldown = new Map<string, number>();

world.beforeEvents.itemUse.subscribe((event) => {
  //early return if the item is not a compass
  if (event.itemStack.typeId != 'minecraft:compass') return;

  const lastUsed = compassCooldown.get(event.source.name);

  //early return if the player is on cooldown
  if (lastUsed && lastUsed + 1000 > Date.now()) return;

  console.log(`Player ${event.source.name} used item ${event.itemStack.typeId}`);
  if (event.itemStack.typeId != 'minecraft:compass') return;

  system.run(() => {
    const form = new EnhancedActionFormData('§y§r§gWKD');

    form.addButton('§gKingdom menu\n§7Open het kingdom menu', undefined ,(player) => client.kingdomForm.showKingdomForm(new Player(event.source)));
    form.addButton('§gWarps\n§7Open het warp menu', undefined ,(player) => client.warpManager.warpForm(new Player(event.source)));

    form.show(event.source);
  })

  compassCooldown.set(event.source.name, Date.now());
});


world.beforeEvents.chatSend.subscribe((event) => {
  if (event.message === 'test') {
    system.run(() => {
      const player = new Player(event.sender);
      client.inventoryManager.sortInventory(player);
    });
  }

  if (event.message === 'test2') {
    system.run(() => {
      const player = new Player(event.sender);

      client.inventoryManager.restoreEquipmentAndHotbar(player);
      client.inventoryManager.restoreInventory(player);
    });
  }
})

world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
  if (event.target.typeId !== "minecraft:armor_stand") return;

  event.cancel = true;

  const player = new Player(event.player);

  client.kingdomForm.invitesForm(player);
})

class EnterKingdom implements BlockCustomComponent {
  // Define the borders of each country (3D box boundaries)
  private countries: { [key: string]: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number; } } = {
    "tyksa": { minX: 0, maxX: 100, minY: 0, maxY: 100, minZ: 0, maxZ: 100 },
    "CountryB": { minX: 101, maxX: 200, minY: 0, maxY: 100, minZ: 101, maxZ: 201 },
    // Add more countries with their respective coordinates
  };

  constructor() {
    this.onStepOn = this.onStepOn.bind(this);
  }

  onStepOn(e: BlockComponentStepOnEvent): void {
    const player = e.entity as IPlayer;

    // Get the player's head location and rotation
    const headLocation = player.getHeadLocation();
    const rotation = player.getRotation();

    // Calculate the direction the player is looking in
    const direction = this.getDirectionFromRotation(rotation);

    // Perform a raycast or line projection to find which country the player is looking at
    const countryLookingAt = this.getCountryFromDirection(headLocation, direction);

    if (countryLookingAt) {
      this.notifyPlayerLookingAt(player, countryLookingAt);
    }
  }

  // Convert rotation (yaw, pitch) to a 3D direction vector
  getDirectionFromRotation(rotation: Vector2): Vector3 {
    const yaw = rotation.y; // Horizontal angle
    const pitch = rotation.x; // Vertical angle

    // Convert degrees to radians
    const yawRad = (yaw * Math.PI) / 180;
    const pitchRad = (pitch * Math.PI) / 180;

    // Calculate direction vector based on yaw and pitch
    const x = -Math.sin(yawRad) * Math.cos(pitchRad);
    const y = -Math.sin(pitchRad);
    const z = Math.cos(yawRad) * Math.cos(pitchRad);

    return { x, y, z };
  }

  // Perform raycasting or line projection to determine the country being looked at
  getCountryFromDirection(start: Vector3, direction: Vector3): string | null {
    // Define how far we want to project the line (e.g., 100 units in the direction)
    const projectionDistance = 100;

    // Calculate the projected point in the direction the player is looking
    const endPoint = {
      x: start.x + direction.x * projectionDistance,
      y: start.y + direction.y * projectionDistance,
      z: start.z + direction.z * projectionDistance,
    };

    // Check if the end point falls within any country's borders
    for (const country in this.countries) {
      const borders = this.countries[country];

      if (
        endPoint.x >= borders.minX && endPoint.x <= borders.maxX &&
        endPoint.y >= borders.minY && endPoint.y <= borders.maxY &&
        endPoint.z >= borders.minZ && endPoint.z <= borders.maxZ
      ) {
        return country;
      }
    }

    // Return null if the player is not looking at any defined country
    return null;
  }

  // Notify the player which country they are looking at
  notifyPlayerLookingAt(player: IPlayer, country: string): void {
    client.sendMessage(`welkom in ${country}`, player);
  }
}



world.beforeEvents.worldInitialize.subscribe(initEvent => {
  initEvent.blockComponentRegistry.registerCustomComponent('wkd:enterKingdom', new EnterKingdom());
});
