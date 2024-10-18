import { Player } from '@minecraft/server';
import { CommandArgumentType } from './CommandTypes';

export type CommandSchema = Record<string, CommandArgumentType | [CommandArgumentType, boolean]>;

export type InferSchemaType<T extends CommandSchema> = {
  [K in keyof T]: T[K] extends [CommandArgumentType, boolean]
    ? ReturnType<T[K][0]['parse']> | undefined
    : T[K] extends CommandArgumentType
      ? ReturnType<T[K]['parse']>
      : never;
};

export type CommandCallback<T extends CommandSchema = any> = (
  player: Player,
  args: InferSchemaType<T>
) => void | Promise<void>;

export interface CommandOptions<T extends CommandSchema = any> {
  aliases?: string[];
  description: string;
  usage?: string;
  schema?: T;
  category?: string;
  subcommands?: Record<string, SubcommandOptions<T>>;
}

export interface SubcommandOptions<T extends CommandSchema = any> {
  description: string;
  usage?: string;
  schema?: T;
  callback: CommandCallback<T>;
}
