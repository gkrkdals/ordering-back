import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Settings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  big: number | null;

  @Column({ nullable: true })
  sml: number | null;

  @Column()
  name: string;

  @Column({ nullable: true })
  value: number | null;

  @Column({ nullable: true, name: 'string_value' })
  stringValue: string | null;
}