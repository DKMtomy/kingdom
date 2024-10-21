import { Player } from "@minecraft/server";
import { Client } from "../client/Client";

enum PermissionBits {
  None = 0,
  Read = 1 << 0,
  Write = 1 << 1,
  Delete = 1 << 2,
  Admin = 1 << 3,
  Kick = 1 << 4,
  Ban = 1 << 5,
  Mute = 1 << 6,
  Vanish = 1 << 7,
  Teleport = 1 << 8,
}

enum Role {
  Member = 0,
  Mod = 1,
  Admin = 2,
  Dev = 3,
}

const rolePermissions: { [key in Role]: PermissionBits } = initializeRolePermissions();

function initializeRolePermissions(): { [key in Role]: PermissionBits } {
  return {
    [Role.Member]: PermissionBits.None,
    [Role.Mod]: PermissionBits.Kick | PermissionBits.Mute | PermissionBits.Teleport,
    [Role.Admin]: PermissionBits.Ban | PermissionBits.Vanish | (PermissionBits.Kick | PermissionBits.Mute | PermissionBits.Teleport),
    [Role.Dev]: PermissionBits.Admin,
  };
}

class PermissionManager {
  constructor(protected client: Client) {}

  public hasPermission(role: Role, permission: PermissionBits): boolean {
    return (rolePermissions[role] & permission) === permission;
  }

  public getRole(player: Player): Role {
    const roleMap = new Map<string, Role>([
      ["member", Role.Member],
      ["mod", Role.Mod],
      ["admin", Role.Admin],
      ["dev", Role.Dev]
    ]);

    const roleTag = player.getTags().find(tag => tag.startsWith("role:"))?.substring(5)?.toLowerCase() ?? "";
    return roleMap.get(roleTag) ?? Role.Member;
  }

  public hasPlayerPermission(player: Player, permission: PermissionBits): boolean {
    const role = this.getRole(player);
    console.log(`Player ${player.name} has role ${Role[role]}`);
    const result = this.hasPermission(role, permission);
    console.log(`Permission check for ${PermissionBits[permission]}: ${result}`);
    return result;
  }

  // New method to assign a role to a player
  public assignRole(player: Player, role: Role): void {
    player.getTags().filter(tag => tag.startsWith("role:")).forEach(tag => player.removeTag(tag));
    player.addTag(`role:${Role[role].toLowerCase()}`);
  }

  // New method to remove a role from a player
  public removeRole(player: Player): void {
    player.getTags().filter(tag => tag.startsWith("role:")).forEach(tag => player.removeTag(tag));
  }

  // New method to log permission checks
  private logPermissionCheck(player: Player, permission: PermissionBits, result: boolean): void {
    console.log(`Player ${player.name} permission check for ${PermissionBits[permission]}: ${result}`);
  }
}


export { PermissionManager, PermissionBits, Role };
