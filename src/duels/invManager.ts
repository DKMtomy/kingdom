import {
  BlockInventoryComponent,
  BlockPermutation,
  EntityEquippableComponent,
  EquipmentSlot,
  ItemStack,
  system,
  world
} from '@minecraft/server';
import { Player } from '../Player/Player';
import { Client } from '../client';
import { MinecraftBlockTypes } from '../types/minecraftBlockTypes';

class InventoryManager {
  #client: Client;

  constructor(client: Client) {
    this.#client = client;
  }

  // Optimized function to create and fill a chest with items from a range of slots
  private createAndFillChest(player: Player,startSlot: number, endSlot: number, heightOffset: number = 2): void {
    const playerPos = player.position;
    const chestLocation = { x: playerPos.x, y: playerPos.y + heightOffset, z: playerPos.z };
    const chest = world.getDimension('overworld').getBlock(chestLocation);

    if (!chest) return;

    chest.setPermutation(BlockPermutation.resolve(MinecraftBlockTypes.Chest));
    const chestInventory = chest.getComponent(BlockInventoryComponent.componentId)?.container;

    if (!chestInventory) return;

    for (let i = startSlot; i <= endSlot; i++) {
      const item = player.container?.getItem(i);
      if (item) {
        chestInventory.setItem(i - startSlot, item);
        player.container?.setItem(i, undefined);
      }
    }
  }

  // Optimized function to transfer armor to a chest
  private transferArmor(player: Player): void {
    const playerPos = player.position;
    const chestLocation = { x: playerPos.x, y: playerPos.y + 2, z: playerPos.z };
    const chest = world.getDimension('overworld').getBlock(chestLocation);

    if (!chest) return;

    const chestInventory = chest.getComponent(BlockInventoryComponent.componentId)?.container;

    if (!chestInventory) return;

    const armor = player.Armor;
    if (!armor) return;

    let slotIndex = 18; // Starting slot in the chest for armor

    for (const item of armor) {
      chestInventory.setItem(slotIndex, item);
      player.container?.setItem(slotIndex, undefined);

      // Use a switch statement for more efficient type checking
      switch (true) {
        case item.typeId.includes('helmet'):
          player.Equipable?.setEquipment(EquipmentSlot.Head, undefined);
          break;
        case item.typeId.includes('chestplate'):
          player.Equipable?.setEquipment(EquipmentSlot.Chest, undefined);
          break;
        case item.typeId.includes('leggings'):
          player.Equipable?.setEquipment(EquipmentSlot.Legs, undefined);
          break;
        case item.typeId.includes('boots'):
          player.Equipable?.setEquipment(EquipmentSlot.Feet, undefined);
          break;
        case item.typeId.includes('shield'):
          player.Equipable?.setEquipment(EquipmentSlot.Offhand, undefined);
          break;
      }

      slotIndex++;
    }
  }

  // Public method to handle the entire inventory sorting process
  public sortInventory(player: Player): void {
    this.createAndFillChest(player,0, 8);
    this.createAndFillChest(player,9, 35, 3);
    this.transferArmor(player);

    this.#client.sendMessage('Your inventory has been sorted into chests!', player.player);
  }

  public restoreEquipmentAndHotbar(player: Player): void {
    const playerPos = player.position;
    const chestLocation = { x: playerPos.x, y: playerPos.y + 2, z: playerPos.z };
    const chest = world.getDimension('overworld').getBlock(chestLocation);

    if (!chest) return;

    const chestInventory = chest.getComponent(BlockInventoryComponent.componentId)?.container;

    if (!chestInventory) return;

    // Restore equipment
    for (let i = 18; i <= 25; i++) {
      const item = chestInventory.getItem(i);
      if (item) {
        this.equipItem(player,item, i - 18); // Pass the slot index relative to the armor slots
        chestInventory.setItem(i, undefined);
      }
    }

    // Restore hotbar
    for (let i = 0; i <= 8; i++) {
      const item = chestInventory.getItem(i);
      if (item) {
        player.container?.setItem(i, item);
        chestInventory.setItem(i, undefined);
      }
    }
    chest.setPermutation(BlockPermutation.resolve(MinecraftBlockTypes.Air));
  }

  public restoreInventory(player: Player): void {
    const playerPos = player.position;
    const chestLocation2 = { x: playerPos.x, y: playerPos.y + 3, z: playerPos.z };

    const chest2 = world.getDimension('overworld').getBlock(chestLocation2);

    if (!chest2) return;

    const chestInventory2 = chest2.getComponent(BlockInventoryComponent.componentId)?.container;

    if (!chestInventory2) return;

    // Restore inventory slots 9-35
    for (let i = 0; i <= 26; i++) {
      const item = chestInventory2.getItem(i);
      if (item) {
        player.container?.setItem(i + 9, item);
        chestInventory2.setItem(i, undefined);
      }
    }
    chest2.setPermutation(BlockPermutation.resolve(MinecraftBlockTypes.Air));
  }

  private equipItem(player: Player, item: ItemStack, slotIndex: number): void {
    const equippableComponent = player.Equipable;
    if (!equippableComponent) return;

    switch (slotIndex) {
      case 0:
        equippableComponent.setEquipment(EquipmentSlot.Head, item);
        break;
      case 1:
        equippableComponent.setEquipment(EquipmentSlot.Chest, item);
        break;
      case 3:
        equippableComponent.setEquipment(EquipmentSlot.Legs, item);
        break;
      case 2:
        equippableComponent.setEquipment(EquipmentSlot.Feet, item);
        break;
      case 4:
        equippableComponent.setEquipment(EquipmentSlot.Offhand, item);
        break;
    }
  }
}

export { InventoryManager };
