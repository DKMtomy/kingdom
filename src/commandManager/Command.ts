import { Player } from '@minecraft/server';
import { CommandSchema, CommandOptions, CommandCallback, InferSchemaType, SubcommandOptions } from './types';
import { CommandError } from './CommandError';

export class Command<T extends CommandSchema = any> {
  public subcommands: Map<string, Command<any>> = new Map();

  constructor(
    public name: string,
    public options: CommandOptions<T>,
    private callback: CommandCallback<T>
  ) {
    if (options.subcommands) {
      for (const [subName, subOptions] of Object.entries(options.subcommands)) {
        this.subcommands.set(subName, new Command(subName, subOptions, subOptions.callback));
      }
    }
  }

  get schema(): T | undefined {
    return this.options.schema;
  }

  async execute(player: Player, args: string[]): Promise<void> {
    if (this.subcommands.size > 0 && args.length > 0) {
      const subcommandName = args[0].toLowerCase();
      const subcommand = this.subcommands.get(subcommandName);
      if (subcommand) {
        return subcommand.execute(player, args.slice(1));
      }
    }

    const parsedArgs = this.parseArgs(args);
    await this.callback(player, parsedArgs);
  }

  private parseArgs(args: string[]): InferSchemaType<T> {
    const parsedArgs: any = {};
    const schema = this.schema;
    if (!schema) return parsedArgs;

    Object.entries(schema).forEach(([key, typeOrTuple], index) => {
      const [type, isOptional] = Array.isArray(typeOrTuple) ? typeOrTuple : [typeOrTuple, false];
      const value = args[index];

      if (value === undefined) {
        if (!isOptional) {
          throw new CommandError(`Missing required argument: ${key}`);
        }
        return;
      }

      try {
        parsedArgs[key] = type.parse(value);
      } catch (error: any) {
        throw new CommandError(`Invalid ${type.name} for argument '${key}': ${error.message}`);
      }
    });

    return parsedArgs;
  }

  public generateUsage(prefix: string): string {
    if (this.options.usage) return this.options.usage;

    const mainUsage = this.generateMainUsage(prefix);
    const subcommandUsage = this.generateSubcommandUsage(prefix);

    return [mainUsage, ...subcommandUsage].join('\n');
  }

  private generateMainUsage(prefix: string): string {
    const args = Object.entries(this.schema || {}).map(([key, typeOrTuple]) => {
      const [type, isOptional] = Array.isArray(typeOrTuple) ? typeOrTuple : [typeOrTuple, false];
      return isOptional ? `[${key}: ${type.name}]` : `<${key}: ${type.name}>`;
    });

    return `${prefix}${this.name} ${args.join(' ')}`;
  }

  private generateSubcommandUsage(prefix: string): string[] {
    if (this.subcommands.size === 0) return [];

    return Array.from(this.subcommands.values()).map(subcommand => {
      const subArgs = Object.entries(subcommand.schema || {}).map(([key, typeOrTuple]) => {
        const [type, isOptional] = Array.isArray(typeOrTuple) ? typeOrTuple : [typeOrTuple, false];
        return isOptional ? `[${key}: ${type.name}]` : `<${key}: ${type.name}>`;
      });

      return `${prefix}${this.name} ${subcommand.name} ${subArgs.join(' ')}`;
    });
  }
}
