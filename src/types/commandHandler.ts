// types.ts
import { Player } from '@minecraft/server';
import {
  BooleanType,
  CommandArgumentType,
  NumberType,
  PlayerType,
  StringType,
} from './CommandArgumentType';

export type CommandArgument = string | number | boolean | Player;

export type InferArgType<T extends CommandArgumentType> = T extends StringType
  ? string
  : T extends NumberType
    ? number
    : T extends BooleanType
      ? boolean
      : T extends PlayerType
        ? Player
        : never;

export type InferSchemaType<T extends CommandSchema> = {
  [K in keyof T]: T[K] extends [CommandArgumentType, boolean]
    ? InferArgType<T[K][0]> | undefined
    : T[K] extends CommandArgumentType
      ? InferArgType<T[K]>
      : never;
};

export type CommandCallback<T extends CommandSchema> = (
  player: Player,
  args: InferSchemaType<T>
) => void | Promise<void>;

export interface CommandSchema {
  [key: string]: CommandArgumentType | [CommandArgumentType, boolean];
}

export interface CommandOptions<T extends CommandSchema> {
  aliases?: string[];
  description: string;
  usage?: string;
  schema?: T;
  category?: string;
}
