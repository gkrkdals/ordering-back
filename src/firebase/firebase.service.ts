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

  async fcm(token: string, title: string, message: string) {
    const payload: Message = {
      token,
      notification: {
        title: title,
        body: message,
      },
      data: {
        body: message,
      }
    };

    return await admin
      .messaging()
      .send(payload);
  }

  async newOrder() {
    console.log("new order");
    const usersWithToken = await this.userRepository.findBy([
      { fcmToken: Not(null) },
      { fcmToken: Not('') }
    ]);

    console.log(usersWithToken.map(user => user.fcmToken));

    for (const user of usersWithToken) {
      await this.fcm(user.fcmToken, "새로운 주문", "새로운 주문이 있습니다.");
    }
  }

  async cookingStarted() {
    const usersWithToken = await this.userRepository.findBy([
      { fcmToken: Not(null) },
      { fcmToken: Not('') }
    ]);

    for (const user of usersWithToken) {
      await this.fcm(user.fcmToken, "조리 시작", "조리가 시작되었습니다.");
    }
  }

  async cookingExceeded() {
    const usersWithToken = await this.userRepository.findBy([
      { fcmToken: Not(null) },
      { fcmToken: Not('') }
    ]);

    for (const user of usersWithToken) {
      await this.fcm(user.fcmToken, "조리시간 초과", "조리시간이 초과되었습니다.");
    }
  }

  async newDelivery() {
    const usersWithToken = await this.userRepository.findBy([
      { permission: Not(PermissionEnum.Cook), fcmToken: Not(null) },
      { permission: Not(PermissionEnum.Cook), fcmToken: Not('') }
    ]);

    for (const user of usersWithToken) {
      await this.fcm(user.fcmToken, "새로운 배달", "새로운 배달 항목이 있습니다.");
    }
  }

  async deliverDelayed() {
    const usersWithToken = await this.userRepository.findBy([
      { permission: Not(PermissionEnum.Cook), fcmToken: Not(null) },
      { permission: Not(PermissionEnum.Cook), fcmToken: Not('') }
    ]);

    for (const user of usersWithToken) {
      await this.fcm(user.fcmToken, "배달시간 초과", "배달시간이 초과되었습니다.");
    }
  }

  async newDishDisposal() {
    const usersWithToken = await this.userRepository.findBy([
      { permission: Not(PermissionEnum.Cook), fcmToken: Not(null) },
      { permission: Not(PermissionEnum.Cook), fcmToken: Not('') }
    ]);

    for (const user of usersWithToken) {
      await this.fcm(user.fcmToken, "새로운 그릇수거", "새로운 그릇수거가 있습니다.");
    }
  }
}