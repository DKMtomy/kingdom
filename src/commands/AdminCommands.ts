import { EffectType, Player, Vector3 } from '@minecraft/server';
import { CommandTypes } from '../commandManager/CommandTypes';
import { SubcommandOptions } from '../commandManager/types';
import { Client } from '../client/Client';
import { Command,BaseCommand } from './BaseCommand';
import { CommandHandler } from '../commandManager/index';
import { PermissionBits } from '../permissionManager/index';

const convertToDate = (duration: number): string => {
  const date = new Date(Date.now() + duration);

  // Convert to Europe/Bucharest timezone
  const utcDate = date.getTime() + (date.getTimezoneOffset() * 6000);
  const bucharestOffset = 3 * 60 * 60 * 1000; // Bucharest is UTC+3
  const bucharestDate = new Date(utcDate + bucharestOffset);

  // Format the date as DD/MM/YYYY
  const day = String(bucharestDate.getDate()).padStart(2, '0');
  const month = String(bucharestDate.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const year = bucharestDate.getFullYear();

  return `${day}/${month}/${year}`;
}

export class AdminCommands extends BaseCommand {
  constructor(protected client: Client) {
    super(client);
  }

  @Command({
    description: 'Manage players',
    category: 'Admin',
    permission: (player: Player) => CommandHandler.client.permissions.hasPlayerPermission(player, PermissionBits.Ban),
    subcommands: {
      ban: {
        description: 'Ban a player',
        schema: {
          player: CommandTypes.Player,
          reason: [CommandTypes.String, true],
        },
        callback: async (issuer: Player, { player, reason }: { player: Player; reason?: string }) => {
          try {
            await CommandHandler.client.sendMessage(`Banned player ${player.name} ${reason ? `for: ${reason}` : ''}`, issuer);
          } catch (error) {
            await CommandHandler.client.sendMessage(`Failed to ban player ${player.name}`, issuer);
          }
        },
      } as SubcommandOptions<{ player: typeof CommandTypes.Player; reason: [typeof CommandTypes.String, true] }>,

      kick: {
        description: 'Kick a player',
        schema: {
          player: CommandTypes.Player,
          reason: [CommandTypes.String, true],
        },
        callback: async (issuer: Player, { player, reason }: { player: Player; reason?: string }) => {
          try {
            player.runCommandAsync(`kick "${player.name}" ${reason ? `"${reason}"` : ''}`);
            await CommandHandler.client.sendMessage(`Kicked player ${player.name} ${reason ? `for: ${reason}` : ''}`, issuer);
          } catch (error) {
            await CommandHandler.client.sendMessage(`Failed to kick player ${player.name}`, issuer);
          }
        },
      } as SubcommandOptions<{ player: typeof CommandTypes.Player; reason: [typeof CommandTypes.String, true] }>,

      mute : {
        description: 'Mute a player',
        schema: {
          player: CommandTypes.Player,
          duration: [CommandTypes.Duration, true],
          reason: [CommandTypes.String, true],
        },
        callback: async (player: Player, args: { player: Player; duration?: number ;reason?: string }) => {
          const duration = args.duration ? args.duration : Number.MAX_SAFE_INTEGER;
          const muteDurationMs = duration * 1000;
          const muteTag = `mute_${muteDurationMs}_${args.reason}`;

          player.addTag(muteTag);
          await CommandHandler.client.sendMessage(`Muted player ${player.name} for ${args.reason}`, player);
          await CommandHandler.client.sendMessage(`You have been muted by ${player.name} until ${convertToDate(muteDurationMs)}`, args.player);

        },
      } as SubcommandOptions<{ player: typeof CommandTypes.Player; reason: [typeof CommandTypes.String, true] }>,
    },
  })
  player(player: Player, args: any) {
    player.sendMessage('§cPlease specify a subcommand');
    this.client.commandHandler.showCommandHelp(player, 'player');
  }

  @Command({
    description: 'teleport',
    aliases: ['tp'],
    category: 'Admin',
    permission: (player: Player) => CommandHandler.client.permissions.hasPlayerPermission(player, PermissionBits.Teleport),
    subcommands: {
      cords: {
        description: 'Teleport to coords or teleport another player to coords',
        schema: {
          cords: CommandTypes.Vec3,
          target: [CommandTypes.Player, true],
        },
        callback: async (player: Player, args: { coords: Vector3, target?: Player}) => {
          //teleport the player to the coords and if a player is specified, teleport the player to the coords
          args.target ? args.target.teleport(args.coords) : player.teleport(args.coords);
          CommandHandler.client.sendMessage(`Teleported ${player.name} to ${args.coords}`, player);
        },
      } as SubcommandOptions,
      player: {
        description: 'Teleport to another player',
        schema: {
          target: CommandTypes.Player,
        },
        callback: async (player: Player, args: {target: Player}) => {
          //teleport the player to the target player
          player.teleport(args.target.location);
          CommandHandler.client.sendMessage(`Teleported ${player.name} to ${args.target.name}`, player);
        },
      } as SubcommandOptions,
    },
  })
  teleport(player: Player, args: any) {
    player.sendMessage('§cPlease specify a subcommand');
    this.client.commandHandler.showCommandHelp(player, 'teleport');
  }

  @Command({
    description: 'Vanish',
    category: 'Admin',
    permission: (player: Player) => CommandHandler.client.permissions.hasPlayerPermission(player, PermissionBits.Vanish),
  })
  vanish(player: Player) {
    if (player.hasTag("vanished"))
    {
      player.removeEffect("minecraft:invisibility");
      player.removeTag("vanished");
      CommandHandler.client.sendMessage(`You are now visible`, player);
    }
    else
    {
      player.addEffect("minecraft:invisibility", 999999, {
        amplifier: 1,
        showParticles: false,
      });
      player.addTag("vanished");
      CommandHandler.client.sendMessage(`You are now invisible`, player);
    }
  }
}
