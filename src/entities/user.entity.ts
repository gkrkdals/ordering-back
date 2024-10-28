import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  @Column()
  password: string;

  @Column()
  nickname: string;

  @Column()
  permission: number;

  @Column()
  withdrawn: number;

  @Column()
  time: Date;

  @Column({ nullable: true, name: "fcm_token" })
  fcmToken: string | null;
}