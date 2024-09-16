import { ColorCodes } from './colorCodes';
import KingdomRanks from './kingdomRanks';

export interface DBResponse<T> {
  documents: T[];
}

export interface KingdomData {
  name: string;
  color: ColorCodes;
  king: string;
  members: KingdomMember[];
}

export interface inviteData {
  player: string;
  kingdom: string;
  date: number;
  inviter: string;
}

export interface KingdomMember {
  name: string;
  role: KingdomRanks;
}

export enum KingdomAction {
  InsertOne = 'insertOne',
  FindOne = 'findOne',
  Find = 'find',
  UpdateOne = 'updateOne',
  UpdateMany = 'updateMany',
  DeleteOne = 'deleteOne',
  DeleteMany = 'deleteMany',
}
