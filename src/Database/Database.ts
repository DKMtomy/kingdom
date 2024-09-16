import { world, Dimension, system } from '@minecraft/server';
import { ColorCodes } from '../types'; // Assuming this is used elsewhere
import { DBResponse, inviteData, KingdomAction, KingdomData } from '../types/Kingdom';

export class KingdomClient {
  private dimension: Dimension;
  private timeout: number = 5000; // 5 seconds

  constructor(dimensionName: string = 'overworld') {
    this.dimension = world.getDimension(dimensionName);
  }

  private async sendEvent(
    action: KingdomAction,
    database: string,
    collection: string,
    data: KingdomData | any
  ): Promise<any> {
    const jsonData = JSON.stringify({
      database, // Include database in the event data
      collection, // Include collection in the event data
      ...data, // Spread the rest of the data
    });
    const command = `scriptevent Kingdom:${action} ${jsonData}`;

    console.log(`Sending event: ${command}`);
    try {
      await this.dimension.runCommandAsync(command);
      return await this.waitForServerResponse(action);
    } catch (error) {
      throw new Error(`Error processing server response: ${error}`);
    }
  }

  private async waitForServerResponse(action: KingdomAction): Promise<any> {
    console.log(`Waiting for server response for action: ${action}`);
    return new Promise((resolve, reject) => {
      const listener = system.afterEvents.scriptEventReceive.subscribe((event) => {
        try {
          const receivedAction = event.id.replace('server:', '');
          if (receivedAction === action) {
            const result = JSON.parse(event.message);
            console.log(`Received server response for action: ${action}`);
            resolve(result);
            system.afterEvents.scriptEventReceive.unsubscribe(listener);
          }
        } catch (error) {
          reject(`Error processing server response: ${error}`);
        }
      });

      system.runTimeout(() => {
        system.afterEvents.scriptEventReceive.unsubscribe(listener);
        reject(`Timed out waiting for server response after ${this.timeout / 1000} seconds`);
      }, this.timeout);
    });
  }

  // Updated methods to include database and collection
  async insertOne(
    database: string,
    collection: string,
    data: KingdomData | inviteData
  ): Promise<any> {
    return await this.sendEvent(KingdomAction.InsertOne, database, collection, data);
  }

  async findOne<T>(
    database: string,
    collection: string,
    filter: Partial<KingdomData> | Partial<inviteData>
  ): Promise<T> {
    return await this.sendEvent(KingdomAction.FindOne, database, collection, filter);
  }

  async find(
    database: string,
    collection: string,
    filter: Partial<KingdomData> | Partial<inviteData>
  ): Promise<any> {
    return await this.sendEvent(KingdomAction.Find, database, collection, filter);
  }

  async updateOne(
    database: string,
    collection: string,
    filter: Partial<KingdomData> | Partial<inviteData>,
    update: Partial<KingdomData> | Partial<inviteData>
  ): Promise<any> {
    return await this.sendEvent(KingdomAction.UpdateOne, database, collection, { filter, update });
  }

  async updateMany(
    database: string,
    collection: string,
    filter: Partial<KingdomData> | Partial<inviteData>,
    update: Partial<KingdomData> | Partial<inviteData>
  ): Promise<any> {
    return await this.sendEvent(KingdomAction.UpdateMany, database, collection, { filter, update });
  }

  async deleteOne(
    database: string,
    collection: string,
    filter: Partial<KingdomData> | Partial<inviteData>
  ): Promise<any> {
    return await this.sendEvent(KingdomAction.DeleteOne, database, collection, filter);
  }

  async deleteMany(
    database: string,
    collection: string,
    filter: Partial<KingdomData> | Partial<inviteData>
  ): Promise<any> {
    return await this.sendEvent(KingdomAction.DeleteMany, database, collection, filter);
  }
}
