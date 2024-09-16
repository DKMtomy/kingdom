import { Vector3 } from "@minecraft/server";
import { Client } from "../client/index";
import { Player } from "../Player/index";
import { EnhancedActionFormData } from "./form";

interface warpData
{
  name: string;
  displayName: string;
  location: Vector3;
  dimension: string;
}

/*
spawn
kdspawn
duels
mineisland
*/

class WarpManager {
  readonly warps: warpData[] = [];

  #client: Client;

  constructor(client:Client)
  {
    this.#client = client;

    this.init();
  }

  public addWarp(name:string, displayName:string ,location:Vector3, dimension:string):void
  {
    this.warps.push({name, displayName ,location, dimension});
  }

  public init():void
  {
    this.addWarp('spawn', "§gSpawn" ,{x:0, y:100, z:0}, 'overworld');
    this.addWarp('kdspawn', "§gKD Spawn" ,{x:0, y:100, z:0}, 'overworld');
    this.addWarp('duels',"§gDuels" ,{x:0, y:100, z:0}, 'overworld');
    this.addWarp('mineisland', "§gMine Island" ,{x:0, y:100, z:0}, 'overworld');
  }

  public getWarp(name:string): warpData | undefined
  {
    return this.warps.find(warp => warp.name === name);
  }

  public getWarps():warpData[]
  {
    return this.warps;
  }

  public warp(player: Player, warp:warpData):void
  {
    player.warp(warp.location, warp.dimension);
  }

  public warpForm(player: Player):void
  {
    const form = new EnhancedActionFormData(
      '§y§r§gWarps',
      '§7Kies een warp om naar toe te gaan.'
    );

    this.warps.forEach(warp => {
      form.addButton(warp.displayName, undefined, (player) => this.warp(new Player(player), warp));
    });

    form.show(player.player);
  }
}


export { WarpManager, warpData };
