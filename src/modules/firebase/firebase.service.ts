import { Injectable } from "@nestjs/common";
import * as fs from 'fs';
import * as path from 'path';
import { messaging } from "firebase-admin";
import { cert, initializeApp } from "firebase-admin/app";

@Injectable()
export class FirebaseService {
  constructor() {
    try {
      const fullPath = path.join(__dirname, '../../../firebase-cert.json');
      const data = fs.readFileSync(fullPath, 'utf8');
      const serviceAccount = JSON.parse(data);

      initializeApp({
        credential: cert({
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

  async newOrder() {
    await this.fcm("새로운 주문", "새로운 주문이 있습니다.", "new_order", 'all');
  }

  async cookingStarted() {
    await this.fcm("조리 시작", "조리가 시작되었습니다.", "cooking_started", 'all');
  }

  async cookingExceeded() {
    await this.fcm("조리시간 초과", "조리시간이 초과되었습니다.", "cooking_exceeded", 'cook');
  }

  async newDelivery() {
    await this.fcm("새로운 배달", "새로운 배달이 있습니다.", "new_delivery", 'manager');
  }

  async deliverDelayed() {
    await this.fcm("배달시간 초과", "배달시간이 초과되었습니다.", "deliver_delayed", 'manager');
  }

  async newDishDisposal() {
    await this.fcm("새로운 그릇수거", "새로운 그릇수거가 있습니다.", "new_dish_disposal", 'manager');
  }

  private async fcm(title: string, body: string, sound: string, topic: string) {
    const result = await messaging().send({
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
          tag: "order"
        },
        priority: "high",
        ttl: 1000 * 60
      },
    })

    console.log(`successfully sent message: ${result}`);
  }

  async subscribeToTopic(token: string, topic: string) {
    try {
      await messaging().subscribeToTopic(token, topic);
    } catch (e) {
      console.log(`error while subscribing to topic: ${e}`);
    }
  }

  async unsubscribeFromTopic(token: string, topic: string) {
    try {
      await messaging().unsubscribeFromTopic(token, topic);
    } catch (e) {
      console.log(`error while unsubscribing from topic: ${e}`);
    }
  }
}