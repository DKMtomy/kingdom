import { Entity as IEntity } from '@minecraft/server';

class Entity {
  #entity: IEntity;

  public constructor(entity: IEntity) {
    this.#entity = entity;
  }

  public get entity(): IEntity {
    return this.#entity;
  }

  public get id(): string {
    return this.#entity.id;
  }

  public get typeId(): string {
    return this.#entity.typeId;
  }

  public setName(name: string): void {
    this.#entity.nameTag = name;
  }
}

export { Entity };
