import { ActionFormData, MessageFormData } from '@minecraft/server-ui';
import { Client } from '../client';
import { Player } from '../Player/index';
import { EnhancedActionFormData, EnhancedModalFormData } from './form';
import { world } from '@minecraft/server';
import { DBResponse, inviteData, KingdomData } from '../types/Kingdom';
import { formatDateToCustomString } from '../utils';
import KingdomRanks from '../types/kingdomRanks';

class KingdomForm {
  readonly #client: Client;
  constructor(client: Client) {
    this.#client = client;
  }

  public async showKingdomForm(player: Player): Promise<void> {
    console.log('Showing kingdom form');

    this.#client.sendMessage('Fetching data even geduld aub...', player.player);

    const kingdom = await (
      await this.#client.kingdomManager.GetKingdomByPlayer(player)
    ).documents[0];

    if (!kingdom) console.log('No kingdom found');
    console.log(kingdom);

    console.log(player.name);
    console.log(kingdom.king);

    if (player.name != kingdom.king) return;

    const form = new EnhancedActionFormData(
      `§y§r§gBeheer ${kingdom.name}`,
      `§7Welkom bij het beheer van §g${kingdom.name}§7, maak hier je keuzes.`
    )
      .addButton('§gnodig uit \n§7nodig iemand uit', undefined, (player) =>
        this.invite(new Player(player), kingdom)
      )
      .addButton('§gverwijder \n§7verwijder een speler', undefined, (player) =>
        this.kick(new Player(player), kingdom)
      )
      .addButton('§granks \n§7geef ranks aan je leden', undefined, (player) =>
        this.ranks(new Player(player))
      );

    form.show(player.player);
  }

  //custom methods for invite, kick, ranks
  public async invite(player: Player, kingdom: KingdomData): Promise<void> {
    console.log('Inviting player');
    //make a new modal action form
    const form = new EnhancedModalFormData('§y§rInvite Player');

    let players = world.getPlayers().map((player) => player.name);

    let kingdomMemeber = kingdom.members.map((member) => member.name);

    players = players.filter((player) => !kingdomMemeber.includes(player));

    //add a dropdown field with the label 'Player'
    form.addDropdown('Player', players);

    form.show(player.player).then((response) => {
      if (!response) return;

      const playerName = response['Player'];

      const invitedPlayer = world.getPlayers().find((player) => player.name === playerName);

      if (!invitedPlayer) {
        this.#client.sendMessage('Speler niet gevonden', player.player);
        return;
      }

      this.#client.emit('kingdomInvite', {
        player: new Player(invitedPlayer),
        kingdom: kingdom,
        date: Date.now(),
        inviter: player,
      });
    });
  }

  public async kick(player: Player, kingdom: KingdomData): Promise<void> {
    const form = new EnhancedModalFormData('§y§rKick Player');

    let players = kingdom.members.map((member) => member.name);

    form.addDropdown('Player', players);

    form.show(player.player).then((response) => {
      if (!response) return;

      const playerName = response['Player'];

      const kickedPlayer = kingdom.members.find((player) => player.name === playerName);

      if (!kickedPlayer) {
        this.#client.sendMessage('Speler niet gevonden', player.player);
        return;
      }

      let updatedMembers = kingdom.members.filter((member) => member.name !== playerName);

      //remove the player from the kingdom in the database
      this.#client.kingdomClient
        .updateOne('kingdoms', 'kingdoms', { king: kingdom.king }, { members: updatedMembers })
        .then((result) => {
          this.#client.sendMessage('Speler verwijderd', player.player);
        });
    });
  }

  public async ranks(player: Player): Promise<void> {
    if(!player) return;

    let rank = await this.#client.kingdomManager.getPlayerRank(player) || KingdomRanks.Citizen;

    if (rank != KingdomRanks.King && rank != KingdomRanks.Duke) {
      this.#client.sendMessage('Je hebt geen toegang tot deze actie', player.player);
      return;
    }

    const form = new EnhancedModalFormData('§y§rRanks');

    let kingdom = await this.#client.kingdomManager.GetKingdomByPlayer(player);

    let players = kingdom.documents[0].members.map((member) => member.name);

    if (players.length == 0) return this.#client.sendMessage('Er zijn geen leden in het kingdom', player.player);

    form.addDropdown('Player', players);
    const filteredRanks = Object.values(KingdomRanks).filter(rank => rank != KingdomRanks.King && rank != KingdomRanks.Duke);
    form.addDropdown('Rank', filteredRanks);

    form.show(player.player).then((response) => {
      if (!response) return;

      const playerName = response['Player'] as string;
      const newRank = response['Rank'] as string;

      const rank = KingdomRanks[newRank as keyof typeof KingdomRanks];

      const TargetPlayer = world.getPlayers().find((player) => player.name === playerName);

      if (!player) {
        this.#client.sendMessage('Speler niet gevonden', player);
        return;
      }

      //@ts-expect-error
      this.#client.kingdomManager.giveRank(new Player(TargetPlayer), rank);

      this.#client.sendMessage(`Rank van ${playerName} is aangepast naar ${newRank}`, player.player);
  });
}

  public async invitesForm(player: Player): Promise<void> {
    //show a form with all the invites the player has

    const invites = await this.#client.kingdomManager.GetInvitesByPlayer(player);

    const form = new EnhancedActionFormData(
      '§y§r§gInvites',
      `§7Je hebt ${invites.documents.length} invites`
    );


    if (invites.documents.length === 0) {
      this.#client.sendMessage('Je hebt geen uitnodigingen', player.player);
      return;
    }

    invites.documents.forEach((invite: inviteData) => {
      const formattedDate = formatDateToCustomString(new Date(invite.date));

      form.addButton(`§p${invite.kingdom} \n§7${formattedDate}`, undefined, (player) => {
        //show a message form
        const messageForm = new MessageFormData();
        messageForm.title(`§y§rInvite van ${invite.inviter}`);
        messageForm.body(
          `Je bent uitgenodigd voor ${invite.kingdom} door ${invite.inviter}\n wil je accepteren?`
        );
        messageForm.button1('§aAccepteer');
        messageForm.button2('§cWeiger');

        //@ts-expect-error
        messageForm.show(player).then((response) => {
          if (response.selection == 0) this.acceptInvite(new Player(player), invite);
        });
      });
    });

    form.show(player.player);
  }

  public async acceptInvite(player: Player, invite: inviteData): Promise<void> {
    //remove the invite from the database
    this.#client.kingdomClient
      .deleteOne('kingdoms', 'invites', { player: player.name, kingdom: invite.kingdom })
      .then(async (result) => {
        this.#client.sendMessage('Uitnodiging geaccepteerd', player.player);

        let data: DBResponse<KingdomData> = await this.#client.kingdomClient.findOne<
          DBResponse<KingdomData>
        >('kingdoms', 'kingdoms', { king: invite.inviter });

        let kingdom = data.documents[0];

        let updatedMembers = kingdom.members;

        updatedMembers.push({ name: player.name, role: KingdomRanks.Citizen });

        //update the kingdom with the new member
        this.#client.kingdomClient
          .updateOne('kingdoms', 'kingdoms', { king: kingdom.king }, { members: updatedMembers })
          .then((result) => {
            this.#client.sendMessage('Je bent toegevoegd aan het kingdom', player.player);
          });
      });
  }
}

export { KingdomForm };
