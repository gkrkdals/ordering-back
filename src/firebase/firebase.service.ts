import { Injectable } from "@nestjs/common";
import admin, { messaging } from "firebase-admin";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "@src/entities/user.entity";
import { Not, Repository } from "typeorm";
import { PermissionEnum } from "@src/types/enum/PermissionEnum";
import * as fs from 'fs';
import * as path from 'path';
import Message = messaging.Message;

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

  async fcm(token: string, title: string, body: string, sound: string) {
    const payload: Message = {
      token,
      notification: {
        title,
        body,
      },
      android: {
        notification: {
          channelId: sound,
          title,
          body,
          priority: "max",
          sound
        }
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
      await this.fcm(user.fcmToken, "새로운 주문", "새로운 주문이 있습니다.", "new_order");
    }
  }

  async cookingStarted() {
    const usersWithToken = await this.userRepository.findBy([
      { fcmToken: Not(null) },
      { fcmToken: Not('') }
    ]);

    for (const user of usersWithToken) {
      await this.fcm(user.fcmToken, "조리 시작", "조리가 시작되었습니다.", "cooking_started");
    }
  }

  async cookingExceeded() {
    const usersWithToken = await this.userRepository.findBy([
      { permission: PermissionEnum.Cook, fcmToken: Not(null) },
      { permission: PermissionEnum.Cook, fcmToken: Not('') }
    ]);

    for (const user of usersWithToken) {
      await this.fcm(user.fcmToken, "조리시간 초과", "조리시간이 초과되었습니다.", "cooking_exceeded");
    }
  }

  async newDelivery() {
    const usersWithToken = await this.userRepository.findBy([
      { permission: Not(PermissionEnum.Cook), fcmToken: Not(null) },
      { permission: Not(PermissionEnum.Cook), fcmToken: Not('') }
    ]);

    for (const user of usersWithToken) {
      await this.fcm(user.fcmToken, "새로운 배달", "새로운 배달이 있습니다.", "new_delivery");
    }
  }

  async deliverDelayed() {
    const usersWithToken = await this.userRepository.findBy([
      { permission: Not(PermissionEnum.Cook), fcmToken: Not(null) },
      { permission: Not(PermissionEnum.Cook), fcmToken: Not('') }
    ]);

    for (const user of usersWithToken) {
      await this.fcm(user.fcmToken, "배달시간 초과", "배달시간이 초과되었습니다.", "deliver_delayed");
    }
  }

  async newDishDisposal() {
    const usersWithToken = await this.userRepository.findBy([
      { permission: Not(PermissionEnum.Cook), fcmToken: Not(null) },
      { permission: Not(PermissionEnum.Cook), fcmToken: Not('') }
    ]);

    for (const user of usersWithToken) {
      await this.fcm(user.fcmToken, "새로운 그릇수거", "새로운 그릇수거가 있습니다.", "new_dish_disposal");
    }
  }
}