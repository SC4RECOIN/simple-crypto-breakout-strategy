import {Entity, Column, PrimaryGeneratedColumn} from 'typeorm';

@Entity()
export class Candle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ts: number;

  @Column('double')
  open: number;

  @Column('double')
  close: number;

  @Column('double')
  low: number;

  @Column('double')
  high: number;

  @Column('double')
  volume: number;
}
