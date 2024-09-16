// CommandHandler.ts
import { world, ChatSendBeforeEvent, Player } from '@minecraft/server';
import { Client } from '../client/Client';
import { Command } from './Command';
import {
  CommandSchema,
  CommandOptions,
  CommandTypes,
  CommandCallback,
  CommandArgumentType,
} from '../types/index';
import { CommandError } from './CommandError';

export class CommandHandler {
  private commands: Map<string, Command<any>> = new Map();
  private prefix: string = '!';
  private client: Client;

  constructor(client: Client) {
    this.client = client;
    world.beforeEvents.chatSend.subscribe(this.handleChat.bind(this));
    this.initHelp();
  }

  public initHelp(name: string = 'help') {
    this.register(
      name,
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
      const usage = this.generateUsage(command);
      const aliases = command.options.aliases
        ? `\n§7Aliases: ${command.options.aliases.join(', ')}`
        : '';
      const message = [
        `§6${command.name}:`,
        `§f${command.options.description}`,
        `§7Usage: ${usage}${aliases}`,
      ].join('\n');
      await this.client.sendMessage(message, player);
    } else {
      await this.client.sendMessage(`§cCommand not found: ${commandName}`, player);
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
      const parsedArgs = this.parseArgs(args, command, command.schema);
      await command.execute(sender, parsedArgs);
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

  private parseArgs(
    args: string[],
    command: Command<any>,
    schema?: CommandSchema
  ): Record<string, any> {
    if (!schema) return {};

    const parsedArgs: Record<string, any> = {};
    const schemaEntries = Object.entries(schema);

    for (let i = 0; i < schemaEntries.length; i++) {
      const [key, typeOrTuple] = schemaEntries[i];
      const value = args[i];

      let type: CommandArgumentType;
      let isOptional = false;

      if (Array.isArray(typeOrTuple)) {
        [type, isOptional] = typeOrTuple;
      } else {
        type = typeOrTuple;
      }

      if (value === undefined) {
        if (isOptional) {
          continue;
        } else {
          const usage = this.generateUsage(command);
          throw new CommandError(`Missing required argument: ${key}`, usage);
        }
      }

      try {
        parsedArgs[key] = type.parse(value);
      } catch (error: any) {
        const usage = this.generateUsage(command);
        throw new CommandError(
          `Invalid ${type.name} for argument '${key}': ${error.message}`,
          usage
        );
      }
    }

    return parsedArgs;
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
