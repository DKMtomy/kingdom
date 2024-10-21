import { BlockComponentStepOnEvent, Player as IPlayer, BlockCustomComponent, Vector3, Vector2, system, world } from '@minecraft/server';
import { Client } from './client/index.js';
import './poly.js';
import { Player } from './Player/Player.js';
import { EnhancedActionFormData } from './kingdom/form.js';
import { AdminCommands } from './commands/AdminCommands.js';
import { PermissionBits, Role } from './permissionManager/permissionManager.js';

const client = new Client('WKD', '1.0.0');

// Use a Set for faster lookups
const compassCooldown = new Set<string>();

client.before('kingdomInvite', async (event) => {
  const { player, inviter, kingdom } = event;

  // Removed commented-out code

  const invite = await client.kingdomManager.isInvitedToKingdom(player, kingdom.name);

  if (invite) {
    client.sendMessage(`${player.player.name} is al uitgenodigd voor dit kingdom!`, inviter.player);
    return;
  }

  try {
    await client.kingdomClient.insertOne('kingdoms', 'invites', {
      player: player.name,
      kingdom: kingdom.name,
      date: Date.now(),
      inviter: inviter.name,
    });
    client.sendMessage(`Je hebt ${player.player} uitgenodigd voor ${kingdom.name}!`, inviter.player);
  } catch (error) {
    console.error('Error inserting invite:', error);
  }
});

world.beforeEvents.itemUse.subscribe((event) => {
  if (event.itemStack.typeId !== 'minecraft:compass') return;

  const playerName = event.source.name;
  if (compassCooldown.has(playerName)) return;

  compassCooldown.add(playerName);
  system.runTimeout(() => compassCooldown.delete(playerName), 20);

  system.run(() => {
    const form = new EnhancedActionFormData('§y§r§gWKD');
    form.addButton('§gKingdom menu\n§7Open het kingdom menu', undefined, (player) =>
      client.kingdomForm.showKingdomForm(new Player(event.source)));
    form.addButton('§gWarps\n§7Open het warp menu', undefined, (player) =>
      client.warpManager.warpForm(new Player(event.source)));
    form.show(event.source);
  });
});

world.beforeEvents.playerPlaceBlock.subscribe((event) => {
  let loc = client.claimManager.getClaimAt(event.block.location);

  if (!loc) return console.log('No claim found');

  event.player.sendMessage(`§cJe kan hier niet bouwen, dit is een claim van ${loc.kingdomId}`);
  event.cancel = true;
})

world.beforeEvents.playerBreakBlock.subscribe((event) => {
  let loc = client.claimManager.getClaimAt(event.block.location);

  if (!loc) return console.log('No claim found');

  event.player.sendMessage(`§cJe kan hier niet breken, dit is een claim van ${loc.kingdomId}`);
  event.cancel = true;
})

world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  let loc = client.claimManager.getClaimAt(event.block.location);

  if (!loc) return console.log('No claim found');

  event.player.sendMessage(`§cJe kan hier niet interacten, dit is een claim van ${loc.kingdomId}`);
  event.cancel = true;
});

world.beforeEvents.explosion.subscribe((event) => {
  let blocks = event.getImpactedBlocks();
  let blocksToKeep = blocks.filter((block) => {
    let loc = client.claimManager.getClaimAt(block.location);
    return !loc;
  });
  event.setImpactedBlocks(blocksToKeep);
});

world.beforeEvents.chatSend.subscribe((event) => {
  const player = new Player(event.sender);

  switch (event.message) {
    case 'test':
      system.run(() => client.inventoryManager.sortInventory(player));
      break;
    case 'test2':
      system.run(() => {
        client.inventoryManager.restoreEquipmentAndHotbar(player);
        client.inventoryManager.restoreInventory(player);
      });
      break;

      case 'test3':
        system.run(() => {
          client.permissions.assignRole(event.sender, Role.Admin);
        })
        break;

        case 'test4':
          break;
  }
});

world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
  if (event.target.typeId !== "minecraft:armor_stand") return;
  event.cancel = true;
  client.kingdomForm.invitesForm(new Player(event.player));
});

class EnterKingdom implements BlockCustomComponent {
  private countries: Record<string, { min: Vector3, max: Vector3 }> = {
    "tyksa": { min: { x: 0, y: 0, z: 0 }, max: { x: 100, y: 100, z: 100 } },
    "CountryB": { min: { x: 101, y: 0, z: 101 }, max: { x: 200, y: 100, z: 201 } },
  };

  onStepOn(e: BlockComponentStepOnEvent): void {
    const player = e.entity as IPlayer;
    const headLocation = player.getHeadLocation();
    const direction = this.getDirectionFromRotation(player.getRotation());
    const countryLookingAt = this.getCountryFromDirection(headLocation, direction);
    if (countryLookingAt) {
      client.sendMessage(`welkom in ${countryLookingAt}`, player);
    }
  }

  private getDirectionFromRotation({ x: pitch, y: yaw }: Vector2): Vector3 {
    const yawRad = (yaw * Math.PI) / 180;
    const pitchRad = (pitch * Math.PI) / 180;
    return {
      x: -Math.sin(yawRad) * Math.cos(pitchRad),
      y: -Math.sin(pitchRad),
      z: Math.cos(yawRad) * Math.cos(pitchRad)
    };
  }

  private getCountryFromDirection(start: Vector3, direction: Vector3): string | null {
    const projectionDistance = 100;
    const endPoint = {
      x: start.x + direction.x * projectionDistance,
      y: start.y + direction.y * projectionDistance,
      z: start.z + direction.z * projectionDistance,
    };

    for (const [country, borders] of Object.entries(this.countries)) {
      if (
        endPoint.x >= borders.min.x && endPoint.x <= borders.max.x &&
        endPoint.y >= borders.min.y && endPoint.y <= borders.max.y &&
        endPoint.z >= borders.min.z && endPoint.z <= borders.max.z
      ) {
        return country;
      }
    }
    return null;
  }
}

world.beforeEvents.worldInitialize.subscribe(initEvent => {
  initEvent.blockComponentRegistry.registerCustomComponent('wkd:enterKingdom', new EnterKingdom());
});


new AdminCommands(client);
