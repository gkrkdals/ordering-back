import { Injectable } from "@nestjs/common";
import admin, { messaging } from "firebase-admin";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "@src/entities/user.entity";
import { Not, Repository } from "typeorm";
import Message = messaging.Message;
import { PermissionEnum } from "@src/types/enum/PermissionEnum";
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FirebaseService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    if (admin.apps.length === 0) {
      try {
        const fullPath = path.join(__dirname, '../../firebase-cert.json');
        const data = fs.readFileSync(fullPath, 'utf8');
        const serviceAccount = JSON.parse(data);

        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: serviceAccount.project_id,
            clientEmail: serviceAccount.client_email,
            privateKey: serviceAccount.private_key,
          })
        });
      } catch (e) {
        console.error('Error reading JSON file: ', e);
        throw new Error('Failed to read JSON file');
      }
    }
  }

  async fcm(token: string, type: string, message: string) {
    const payload: Message = {
      token,
      data: {
        type,
        message,
      }
    };

    return await admin
      .messaging()
      .send(payload);
  }

  async newOrder() {
    const usersWithToken = await this.userRepository.findBy([
      { fcmToken: Not(null) },
      { fcmToken: Not('') }
    ]);

    console.log(usersWithToken.map(user => user.fcmToken));

    for (const user of usersWithToken) {
      await this.fcm(user.fcmToken, "new_order", "new_order.mp3");
    }
  }

  async cookingStarted() {
    const usersWithToken = await this.userRepository.findBy([
      { fcmToken: Not(null) },
      { fcmToken: Not('') }
    ]);

    for (const user of usersWithToken) {
      await this.fcm(user.fcmToken, "cooking_started", "cooking_started.mp3");
    }
  }

  async cookingExceeded() {
    const usersWithToken = await this.userRepository.findBy([
      { fcmToken: Not(null) },
      { fcmToken: Not('') }
    ]);

    for (const user of usersWithToken) {
      await this.fcm(user.fcmToken, "cooking_exceeded", "cooking_exceeded.mp3");
    }
  }

  async newDelivery() {
    const usersWithToken = await this.userRepository.findBy([
      { permission: Not(PermissionEnum.Cook), fcmToken: Not(null) },
      { permission: Not(PermissionEnum.Cook), fcmToken: Not('') }
    ]);

    for (const user of usersWithToken) {
      await this.fcm(user.fcmToken, "new_delivery", "new_delivery.mp3");
    }
  }

  async deliverDelayed() {
    const usersWithToken = await this.userRepository.findBy([
      { permission: Not(PermissionEnum.Cook), fcmToken: Not(null) },
      { permission: Not(PermissionEnum.Cook), fcmToken: Not('') }
    ]);

    for (const user of usersWithToken) {
      await this.fcm(user.fcmToken, "deliver_delayed", "deliver_delayed.mp3");
    }
  }

  async newDishDisposal() {
    const usersWithToken = await this.userRepository.findBy([
      { permission: Not(PermissionEnum.Cook), fcmToken: Not(null) },
      { permission: Not(PermissionEnum.Cook), fcmToken: Not('') }
    ]);

    for (const user of usersWithToken) {
      await this.fcm(user.fcmToken, "new_dish_disposal", "new_dish_disposal.mp3");
    }
  }

  async clearAlarm() {
    const usersWithToken = await this.userRepository.findBy([
      { fcmToken: Not(null) },
      { fcmToken: Not('') }
    ]);

    for (const user of usersWithToken) {
      await this.fcm(user.fcmToken, "clear_alarm", "");
    }
  }
}