import { world, Player, Vector3 } from '@minecraft/server';

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

class Vec3Type extends CommandArgumentType {
  name = 'vec3';
  parse(value: string): Vector3 {
    const vec = value.split(' ');
    if (vec.length !== 3) {
      throw new Error(`'${value}' is not a valid Vec3`);
    }

    return { x: Number(vec[0]), y: Number(vec[1]), z: Number(vec[2]) };
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

class DurationType extends CommandArgumentType {
  name = 'duration';

  parse(value: string) {
    // Match durations with years, months (mo), weeks, days, hours, minutes, and seconds
    const duration = value.match(/(\d+[ymwodhs])/g);
    if (!duration) {
      throw new Error(`'${value}' is not a valid duration`);
    }
    let total = 0;

    for (const d of duration) {
      // Extract the number and unit from the duration string for example 1y -> 1, y
      const num = parseInt(d);
      const unit = d.replace(num.toString(), '');
      switch (unit) {

        case 'y': // Years
          total += num * 365 * 24 * 60 * 60; // Approximate, doesn't account for leap years
          break;
        case 'mo': // Months
          total += num * 30 * 24 * 60 * 60; // Approximate, assumes 30 days per month
          break;
        case 'w': // Weeks
          total += num * 7 * 24 * 60 * 60;
          break;
        case 'd': // Days
          total += num * 24 * 60 * 60;
          break;
        case 'h': // Hours
          total += num * 60 * 60;
          break;
        case 'm': // Minutes
          total += num * 60;
          break;
        case 's': // Seconds
          total += num;
          break;
        default:
          throw new Error(`Unknown time unit: '${unit}'`);
      }
    }

    return total;
  }
}

export const CommandTypes = {
  String: new StringType(),
  Number: new NumberType(),
  Boolean: new BooleanType(),
  Player: new PlayerType(),
  Duration: new DurationType(),
  Vec3: new Vec3Type(),
};
