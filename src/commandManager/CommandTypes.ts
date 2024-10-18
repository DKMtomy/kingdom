import { world, Player } from '@minecraft/server';

export abstract class CommandArgumentType {
  abstract name: string;
  abstract parse(value: string): any;
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
    if (!value.startsWith('"') || !value.endsWith('"')) {
      throw new Error(`Player name '${value}' must be enclosed in double quotes`);
    }

    const playerName = value.slice(1, -1); // Remove the surrounding double quotes
    const player = world.getAllPlayers().find((p) => p.name.toLowerCase() === playerName.toLowerCase());

    if (!player) {
      throw new Error(`Player '${playerName}' not found`);
    }

    return player;
  }
}

export const CommandTypes = {
  String: new StringType(),
  Number: new NumberType(),
  Boolean: new BooleanType(),
  Player: new PlayerType(),
};
