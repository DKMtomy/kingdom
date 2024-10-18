import { Client } from '../client/Client';
import { CommandSchema, CommandOptions, CommandCallback, CommandHandler } from '../commandManager/index';

export function Command<T extends CommandSchema>(options: CommandOptions<T>) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    if (!target.constructor._commands) {
      target.constructor._commands = [];
    }
    target.constructor._commands.push({
      name: propertyKey,
      options,
      method: descriptor.value,
    });
  };
}

export abstract class BaseCommand {
  static _commands: Array<{
    name: string;
    options: CommandOptions<any>;
    method: CommandCallback<any>;
  }>;

  constructor(protected client: Client) {
    this.registerCommands();
  }

  private registerCommands() {
    const commands = (this.constructor as typeof BaseCommand)._commands;
    if (commands) {
      for (const command of commands) {
        CommandHandler.getInstance(this.client).register(
          command.name,
          command.options,
          command.method.bind(this)
        );
      }
    }
  }
}
