import { Player, world } from '@minecraft/server';
import { Emitter } from '../events/index';
import { CustomEventMap } from '../types';
import { McUtils } from '../utils';
import { KingdomClient } from '../Database/Database';
import { KingdomManager } from '../kingdom/KingdomManager';
import { KingdomForm } from '../kingdom/KingdomForm';
import { InventoryManager } from '../duels/invManager';
import { WarpManager } from '../kingdom/warps';
import { CommandHandler } from '../commandManager/index';
import { PermissionManager } from '../permissionManager/index';
import { ClaimManager } from '../claimManager/claimManager';

class Client extends Emitter<CustomEventMap> {
  #name: string;
  #version: string;
  #prefix: string = '§7[§tWKD§7]§r';
  readonly #developer: string;
  static readonly utils = McUtils;
  readonly kingdomClient = new KingdomClient();
  readonly kingdomManager = new KingdomManager(this);
  readonly kingdomForm = new KingdomForm(this);
  readonly inventoryManager = new InventoryManager(this);
  readonly warpManager = new WarpManager(this);
  readonly commandHandler = CommandHandler.getInstance(this);
  readonly permissions = new PermissionManager(this);
  readonly claimManager = new ClaimManager(this);

  public constructor(name: string, version: string) {
    super();
    this.#name = name;
    this.#version = version;
    this.#developer = 'Vekqi';
  }

  public get name(): string {
    return this.#name;
  }

  public set name(value: string) {
    this.#name = value;
  }

  public get version(): string {
    return this.#version;
  }

  public set version(value: string) {
    this.#version = value;
  }

  public get developer(): string {
    return this.#developer;
  }

  public get utils(): typeof McUtils {
    return Client.utils;
  }

  public sendMessage(message: string, player?: Player): void {
    if (!player) {
      return world.sendMessage(`${this.#prefix} §7${message}`);
    }

    return player?.sendMessage(`${this.#prefix} §7${message}`);
  }
}

export { Client };
