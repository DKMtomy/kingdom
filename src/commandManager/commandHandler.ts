import { world, ChatSendBeforeEvent, Player } from '@minecraft/server';
import { Client } from '../client/Client';
import { Command } from './Command';
import { CommandSchema, CommandOptions, CommandCallback } from './types';
import { CommandTypes } from './CommandTypes';
import { CommandError } from './CommandError';

export class CommandHandler {
  private static instance: CommandHandler;
  public static client: Client;
  private commands: Map<string, Command<any>> = new Map();
  private prefix: string = '!';

  private constructor(private client: Client) {
    world.beforeEvents.chatSend.subscribe(this.handleChat.bind(this));
    this.initHelp();
  }

  public static getInstance(client: Client): CommandHandler {
    CommandHandler.client = client;
    if (!CommandHandler.instance) {
      CommandHandler.instance = new CommandHandler(client);
    }
    return CommandHandler.instance;
  }

  public register<T extends CommandSchema>(
    name: string,
    options: CommandOptions<T>,
    callback: CommandCallback<T>
  ): void {
    const command = new Command(name, options, callback);
    this.commands.set(name.toLowerCase(), command);

    if (options.aliases) {
      for (const alias of options.aliases) {
        this.commands.set(alias.toLowerCase(), command);
      }
    }
  }

  private async handleChat(event: ChatSendBeforeEvent): Promise<void> {
    const { message, sender } = event;
    if (!message.startsWith(this.prefix)) return;

    const args = message.slice(this.prefix.length).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    const command = this.commands.get(commandName);
    if (!command) {
      await this.client.sendMessage(`§cCommand not found: ${commandName}`, sender);
      event.cancel = true;
      return;
    }

    event.cancel = true;

    try {
      await command.execute(sender, args);
    } catch (error) {
      if (error instanceof CommandError) {
        await this.client.sendMessage(`§c${error.message}`, sender);
        if (error.usage) {
          await this.client.sendMessage(`§7Usage: ${error.usage}`, sender);
        }
      } else {
        await this.client.sendMessage(
          `§cAn unexpected error occurred while executing the command.`,
          sender
        );
        console.error(`Error executing command ${commandName}:`, error);
      }
    }
  }

  private initHelp() {
    this.register(
      'help',
      {
        description: 'Get help on all registered commands',
        aliases: ['h'],
        schema: {
          command: [CommandTypes.String, true],
        },
      },
      async (player, args) => {
        if (args.command) {
          await this.showCommandHelp(player, args.command);
        } else {
          await this.showAllCommandsHelp(player);
        }
      }
    );
  }

  private async showCommandHelp(player: Player, commandName: string) {
    const command = this.commands.get(commandName.toLowerCase());
    if (command) {
      const usage = command.generateUsage(this.prefix);
      const aliases = command.options.aliases
        ? `§7Aliases: §f${command.options.aliases.join(', ')}`
        : '';

      const message = [
        `§6§l${command.name.toUpperCase()}`,
        `§r§7${command.options.description}`,
        '',
        '§tUSAGE:',
        ...usage.split('\n').map(line => `  §f${line}`),
        '',
        aliases,
        '',
        `§7Category: §f${command.options.category || 'Miscellaneous'}`,
      ].filter(Boolean).join('\n');

      await this.client.sendMessage(message, player);
    } else {
      await this.client.sendMessage(`§c§lCommand not found: §r§7${commandName}`, player);
    }
  }

  private async showAllCommandsHelp(player: Player) {
    const uniqueCommands = new Set(this.commands.values());
    const categories: Record<string, Command<any>[]> = {};

    for (const cmd of uniqueCommands) {
      const category = cmd.options.category || 'Miscellaneous';
      if (!categories[category]) categories[category] = [];
      categories[category].push(cmd);
    }

    const helpMessages = Object.entries(categories).map(([category, cmds]) => {
      const commandList = cmds
        .map((cmd) => `  §6${cmd.name}: §f${cmd.options.description}`)
        .join('\n');
      return `§9${category}:\n${commandList}`;
    });

    const fullHelpMessage = [
      '§9Available commands:',
      ...helpMessages,
      `\n§7Use '${this.prefix}help <command>' for more information on a specific command.`,
    ].join('\n\n');

    await this.client.sendMessage(fullHelpMessage, player);
  }

  public setPrefix(prefix: string): void {
    this.prefix = prefix;
  }

  public generateUsage(command: Command<any>): string {
    if (command.options.usage) return command.options.usage;

    const args = Object.entries(command.schema || {}).map(([key, typeOrTuple]) => {
      const [type, isOptional] = Array.isArray(typeOrTuple) ? typeOrTuple : [typeOrTuple, false];

      return isOptional ? `[${key}: ${type.name}]` : `<${key}: ${type.name}>`;
    });

    return `${this.prefix}${command.name} ${args.join(' ')}`;
  }
}
