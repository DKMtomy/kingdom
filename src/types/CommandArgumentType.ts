// CommandArgumentType.ts
import { Player, world } from "@minecraft/server";
import { CommandArgument } from "./commandHandler";

export abstract class CommandArgumentType {
    abstract name: string;
    abstract parse(value: string): CommandArgument;
}

export class StringType extends CommandArgumentType {
    name = "string";
    parse(value: string): string {
        return value;
    }
}

export class NumberType extends CommandArgumentType {
    name = "number";
    parse(value: string): number {
        const num = Number(value);
        if (isNaN(num)) {
            throw new Error(`'${value}' is not a valid number`);
        }
        return num;
    }
}

export class BooleanType extends CommandArgumentType {
    name = "boolean";
    parse(value: string): boolean {
        if (value.toLowerCase() === "true") return true;
        if (value.toLowerCase() === "false") return false;
        throw new Error(`'${value}' is not a valid boolean (use 'true' or 'false')`);
    }
}

export class PlayerType extends CommandArgumentType {
    name = "player";
    parse(value: string): Player {
        const player = world.getAllPlayers().find(p => p.name.toLowerCase() === value.toLowerCase());
        if (!player) {
            throw new Error(`Player '${value}' not found`);
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
