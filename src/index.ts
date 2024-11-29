import { BlockComponentStepOnEvent, Player as IPlayer, BlockCustomComponent, Vector3, Vector2, system, world, EquipmentSlot, EntityEquippableComponent } from '@minecraft/server';
import { Client } from './client/index.js';
import './poly.js';
import { Player } from './Player/Player.js';
import { EnhancedActionFormData } from './kingdom/form.js';
import { AdminCommands } from './commands/AdminCommands.js';
import { PermissionBits, Role } from './permissionManager/permissionManager.js';
import { OutlineBuilder } from './claimManager/OutlineBuilder.js';

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

world.beforeEvents.explosion.subscribe((event) => {
  let blocks = event.getImpactedBlocks();
  let blocksToKeep = blocks.filter((block) => {
    let loc = client.claimManager.getClaimAt(block.location);
    return !loc;
  });
  event.setImpactedBlocks(blocksToKeep);
});

const builder = new OutlineBuilder();

world.beforeEvents.itemUseOn.subscribe((event) => {
  if (event.itemStack.typeId !== 'minecraft:wooden_axe') return;

  const loc = event.block.location;

  if (builder.isVertexAlreadyAdded(loc.x, loc.z)) {
    event.source.sendMessage(`Vertex already added at ${loc.x}, ${loc.z}`);
    return;
  }

  builder.addVertex(loc.x, loc.z);
  event.source.sendMessage(`Added vertex at ${loc.x}, ${loc.z}`);
});

world.beforeEvents.chatSend.subscribe((event) => {
  if (event.message == "claim") {
    const claimId = client.claimManager.addClaim('kingdom', builder);
    event.sender.sendMessage(`Claim added with ID ${claimId}`);
  }
})

world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
  if (event.target.typeId !== "minecraft:armor_stand") return;
  event.cancel = true;
  client.kingdomForm.invitesForm(new Player(event.player));
});

// register the admin commands
new AdminCommands(client);
