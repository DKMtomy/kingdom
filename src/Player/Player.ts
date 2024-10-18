import { Entity } from '../Entity/index';
import { Container, Dimension, EntityEquippableComponent, EntityInventoryComponent, EquipmentSlot, Player as IPlayer, ItemStack, Vector3, world } from '@minecraft/server';

class Player extends Entity {
  #player: IPlayer;
  #equip: EntityEquippableComponent | undefined;
  #apiRequest: boolean = false;

  constructor(player: IPlayer) {
    super(player);
    this.#player = player;
    // Cache the equip component for better performance
    this.#equip = player.getComponent(EntityEquippableComponent.componentId);
  }

  get player(): IPlayer {
    return this.#player;
  }

  get hasApiRequest(): boolean {
    return this.#apiRequest;
  }

  get nameTag(): string {
    return this.#player.nameTag;
  }

  get position(): Vector3 {
    return this.#player.location;
  }

  get name(): string {
    return this.#player.name;
  }

  get container(): Container | undefined {
    return this.#player.getComponent(EntityInventoryComponent.componentId)?.container;
  }

  get Armor(): ItemStack[] | undefined {
    // Use the cached equip component
    if (!this.#equip) return;

    const items: ItemStack[] = [];

    // Use a for loop instead of for...in for performance
    for (let i = 0; i < Object.keys(EquipmentSlot).length; i++) {
      const slot = Object.values(EquipmentSlot)[i];

      if (slot === EquipmentSlot.Mainhand) continue;

      let item = this.#equip.getEquipment(slot);

      if (item) items.push(item);
    }

    return items;
  }

  get Equipable(): EntityEquippableComponent | undefined {
    // Return the cached component
    return this.#equip;
  }

  public warp(location: Vector3, dimension: string): void {
    const dim = world.getDimension(dimension);

    if (!dim) return;

    this.#player.teleport(location, {
      dimension: dim,
    });
  }

  sendMessage(message: string): void {
    this.#player.sendMessage(message);
  }
}

export { Player };
