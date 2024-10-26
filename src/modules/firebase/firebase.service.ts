import { Injectable } from "@nestjs/common";
import admin from "firebase-admin";
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FirebaseService {
  constructor() {
    try {
      const fullPath = path.join(__dirname, '../../../firebase-cert.json');
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

  private ALL = ['manager', 'rider', 'cook'];
  private MANAGER = ['manager', 'rider'];
  private COOK = ['cook'];

  async newOrder() {
    await this.fcm("새로운 주문", "새로운 주문이 있습니다.", "new_order", this.ALL);
  }

  async cookingStarted() {
    await this.fcm("조리 시작", "조리가 시작되었습니다.", "cooking_started", this.ALL);
  }

  async cookingExceeded() {
    await this.fcm("조리시간 초과", "조리시간이 초과되었습니다.", "cooking_exceeded", this.COOK);
  }

  async newDelivery() {
    await this.fcm("새로운 배달", "새로운 배달이 있습니다.", "new_delivery", this.MANAGER);
  }

  async deliverDelayed() {
    await this.fcm("배달시간 초과", "배달시간이 초과되었습니다.", "deliver_delayed", this.MANAGER);
  }

  async newDishDisposal() {
    await this.fcm("새로운 그릇수거", "새로운 그릇수거가 있습니다.", "new_dish_disposal", this.MANAGER);
  }

  private async fcm(title: string, body: string, sound: string, topics: string[]) {
    for (const topic of topics) {
      await admin.messaging().send({
        topic,
        notification: {
          title,
          body,
        },
        android: {
          notification: {
            channelId: sound,
            title,
            body,
            priority: "high",
            sound,
          }
        }
      })
    }

    // await admin.messaging().send(payload);
  }


}