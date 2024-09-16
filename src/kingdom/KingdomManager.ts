import { Client } from '../client';
import { Player } from '../Player';
import { DBResponse, inviteData, KingdomData } from '../types/Kingdom';
import KingdomRanks from '../types/kingdomRanks';

class KingdomManager {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  public async ManageKingdom(): Promise<void> {}

  public async GetKingdomByPlayer(player: Player): Promise<DBResponse<KingdomData>> {
    console.log('Getting kingdom by player');

    // Check if player is a king
    const kingdomAsKing = await this.client.kingdomClient.find('kingdoms', 'kingdoms', { king: player.name });

    if (kingdomAsKing.documents.length > 0) {
      return kingdomAsKing;
    }

    // If not a king, fetch all kingdoms and check members
    const allKingdoms = await this.client.kingdomClient.find('kingdoms', 'kingdoms', {});

    const playerKingdom = allKingdoms.documents.find((kingdom: KingdomData) =>
      kingdom.members.some(member => member.name === player.name)
    );

    if (playerKingdom) {
      return {
        ...allKingdoms,
        documents: [playerKingdom]
      };
    }

    // If player is not found in any kingdom
    return {
      ...allKingdoms,
      documents: []
    };
  }



  public async giveRank(player: Player, rank: KingdomRanks): Promise<boolean> {
    try {
      const kingdom = await this.GetKingdomByPlayer(player);
      if (kingdom.documents.length === 0) return false;

      const kingdomData = kingdom.documents[0];

      // If the player is the king, we can't change their rank
      if (kingdomData.king === player.name) return false;

      const memberIndex = kingdomData.members.findIndex(member => member.name === player.name);
      if (memberIndex === -1) return false;

      // Update the member's role
      kingdomData.members[memberIndex].role = rank;

      // Update the kingdom
      const updateResult = await this.client.kingdomClient.updateOne(
        'kingdoms',
        'kingdoms',
        { name: kingdomData.name },
        { members: kingdomData.members }
      );

      return updateResult.modifiedCount > 0;
    } catch (error) {
      console.error('Error giving rank:', error);
      return false;
    }
  }


  public async getPlayerRank(player: Player): Promise<KingdomRanks> {
    try {
      const kingdom = await this.GetKingdomByPlayer(player);

      if (!kingdom || kingdom.documents.length === 0) {
        return KingdomRanks.Citizen;
      }

      const kingdomData = kingdom.documents[0];

      if (kingdomData.king === player.name) {
        return KingdomRanks.King;
      }

      const member = kingdomData.members.find(member => member.name === player.name);
      return member ? member.role : KingdomRanks.Citizen;

    } catch (error) {
      console.error('Error fetching player rank:', error);
      return KingdomRanks.Citizen; // Default to Citizen in case of error
    }
  }


  public async GetInvitesByPlayer(player: Player): Promise<DBResponse<inviteData>> {
    console.log('Getting invites by player');
    return this.client.kingdomClient.find('kingdoms', 'invites', { player: player.name });
  }

  public async isInKingdom(player: Player): Promise<boolean> {
    const result: DBResponse<KingdomData> = await this.client.kingdomClient.find('kingdoms', 'kingdoms', {});

    return result.documents.some(kingdom =>
      kingdom.king === player.name || kingdom.members.some(member => member.name === player.name)
    );
  }

  public async isInvitedToKingdom(player: Player, kingdom: string): Promise<boolean> {
    const result: DBResponse<KingdomData> = await this.client.kingdomClient.find('kingdoms', 'invites', {
      player: player.name,
      kingdom: kingdom
    });

    return result.documents.length > 0;
  }
}

export { KingdomManager };
