import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('recent_job')
export class RecentJob {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_code' })
  orderCode: number;

  @Column({ name: 'order_status_code'})
  orderStatusCode: number;

  @Column()
  status: number;

  @Column()
  manager: number;

}