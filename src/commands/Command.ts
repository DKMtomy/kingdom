// Command.ts
import { Player } from '@minecraft/server';
import { CommandCallback, CommandOptions, CommandSchema, InferSchemaType } from '../types/index';

export class Command<T extends CommandSchema> {
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
