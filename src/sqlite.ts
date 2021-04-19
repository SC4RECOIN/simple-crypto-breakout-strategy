import {createConnection, Connection} from 'typeorm';
import {Candle} from './entity/candle';
import {chunk} from './utils';
import 'reflect-metadata';

export type DataBaseEntity = Candle;

class SQLiteDB {
  connection: Connection;

  static async getConnection(): Promise<SQLiteDB> {
    const db = new SQLiteDB();
    await db.connect();
    return db;
  }

  async connect() {
    try {
      this.connection = await createConnection({
        type: 'sqlite',
        database: 'data.sqlite',
        entities: [Candle],
        logging: false,
      });

      await this.connection.synchronize();
    } catch (e) {
      console.log(`Error connecting to sqlite: ${e}`);
    }
  }

  async save(items: DataBaseEntity[]): Promise<number[]> {
    const entityIDs = [];
    try {
      // chunk large arrays
      for (const entities of chunk(items, 500)) {
        const candles = await this.connection.manager.save(entities);
        entityIDs.push(...candles.map(c => c.id));
      }
    } catch (e) {
      console.error(`There was an error saving to sqlite: ${e}`);
    }

    return entityIDs;
  }

  async getCandles(query: {symbol: string}): Promise<Candle[]> {
    const repository = this.connection.getRepository(Candle);
    return await repository.find(query);
  }
}

export default SQLiteDB;
