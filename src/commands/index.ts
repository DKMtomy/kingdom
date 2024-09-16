import { world, Player, ChatSendBeforeEvent } from '@minecraft/server';
import { Client } from '../client';

type CommandArgument = string | number | boolean | Player;

type InferArgType<T extends CommandArgumentType> = T extends StringType
  ? string
  : T extends NumberType
    ? number
    : T extends BooleanType
      ? boolean
      : T extends PlayerType
        ? Player
        : never;

type InferSchemaType<T extends CommandSchema> = {
  [K in keyof T]: T[K] extends [CommandArgumentType, boolean]
    ? InferArgType<T[K][0]> | undefined
    : T[K] extends CommandArgumentType
      ? InferArgType<T[K]>
      : never;
};

type CommandCallback<T extends CommandSchema> = (
  player: Player,
  args: InferSchemaType<T>
) => void | Promise<void>;

interface CommandSchema {
  [key: string]: CommandArgumentType | [CommandArgumentType, boolean];
}

interface CommandOptions<T extends CommandSchema> {
  aliases?: string[];
  description: string;
  usage?: string;
  schema?: T;
}

class Command<T extends CommandSchema> {
  constructor(
    public name: string,
    public options: CommandOptions<T>,
    private callback: CommandCallback<T>
  ) {}

  get schema(): T | undefined {
    return this.options.schema;
  }

  async execute(player: Player, args: InferSchemaType<T>): Promise<void> {
    await this.callback(player, args);
  }
}

class CommandHandler {
  private commands: Map<string, Command<any>> = new Map();
  private prefix: string = '!';
  private client: Client;

  constructor(client: Client) {
    world.beforeEvents.chatSend.subscribe(this.handleChat.bind(this));
    this.initHelp();
    this.client = client;
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
          const command = this.commands.get(args.command.toLowerCase());
          if (command) {
            const usage = this.generateUsage(command);
            await this.client.sendMessage(
              `§6${command.name}: §f${command.options.description}\n§7Usage: ${usage}`,
              player
            );
          } else {
            await this.client.sendMessage(`§cCommand not found: ${args.command}`, player);
          }
        } else {
          const uniqueCommands = new Set(this.commands.values());
          const helpMessage = Array.from(uniqueCommands)
            .map((cmd) => `§6${cmd.name}: \n§f${cmd.options.description}\n`)
            .join('\n');
          await this.client.sendMessage(`§9Available commands:\n${helpMessage}`, player);
        }
      }
    );
  }

  register<T extends CommandSchema>(
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

  setPrefix(prefix: string): void {
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

abstract class CommandArgumentType {
  abstract name: string;
  abstract parse(value: string): CommandArgument;
}

class StringType extends CommandArgumentType {
  name = 'string';
  parse(value: string): string {
    return value;
  }
}

class NumberType extends CommandArgumentType {
  name = 'number';
  parse(value: string): number {
    const num = Number(value);
    if (isNaN(num)) {
      throw new Error(`'${value}' is not a valid number`);
    }
    return num;
  }
}

class BooleanType extends CommandArgumentType {
  name = 'boolean';
  parse(value: string): boolean {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    throw new Error(`'${value}' is not a valid boolean (use 'true' or 'false')`);
  }
}

class PlayerType extends CommandArgumentType {
  name = 'player';
  parse(value: string): Player {
    const player = world.getAllPlayers().find((p) => p.name.toLowerCase() === value.toLowerCase());
    if (!player) {
      throw new Error(`Player '${value}' not found`);
    }
    return player;
  }
}

const CommandTypes = {
  String: new StringType(),
  Number: new NumberType(),
  Boolean: new BooleanType(),
  Player: new PlayerType(),
};

class CommandError extends Error {
  constructor(
    message: string,
    public usage?: string
  ) {
    super(message);
    this.name = 'CommandError';
  }
}

export { CommandHandler, CommandTypes };
