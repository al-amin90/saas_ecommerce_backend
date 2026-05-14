// src/modules/courier/pathao.service.ts

import axios from "axios";
import NodeCache from "node-cache";
import config from "../../../config";

const tokenCache = new NodeCache({ stdTTL: 432000 });

interface PathaoToken {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token: string;
}

interface PathaoOrderResponse {
  message: string;
  type: string;
  code: number;
  data: {
    consignment_id: string;
    merchant_order_id: string;
    order_status: string;
    delivery_fee: number;
  };
}

class PathaoService {
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private username: string;
  private password: string;
  private environment: "sandbox" | "live";

  constructor(environment: "sandbox" | "live" = "sandbox") {
    this.environment = environment;

    // ✅ Config থেকে পাই
    if (environment === "sandbox") {
      this.baseUrl = config.pathao_sandbox.base_url!;
      this.clientId = config.pathao_sandbox.client_id!;
      this.clientSecret = config.pathao_sandbox.client_secret!;
      this.username = config.pathao_sandbox.username!;
      this.password = config.pathao_sandbox.password!;

      console.log("🔧 Pathao Service initialized (SANDBOX)");
    } else {
      this.baseUrl = config.pathao_live.base_url!;
      this.clientId = config.pathao_live.client_id!;
      this.clientSecret = config.pathao_live.client_secret!;
      this.username = config.pathao_live.username!;
      this.password = config.pathao_live.password!;

      console.log("🔧 Pathao Service initialized (LIVE)");
    }

    this.validateConfig();
  }

  // ✅ Config validation
  private validateConfig(): void {
    if (!this.baseUrl || !this.clientId || !this.clientSecret) {
      throw new Error(
        `Pathao ${this.environment} credentials not configured properly`,
      );
    }
  }

  // ✅ Step 1: Access Token আনি
  async getAccessToken(): Promise<string> {
    try {
      // Cache থেকে check করি
      const cachedToken = tokenCache.get<string>("pathao_access_token");
      if (cachedToken) {
        console.log("✅ Using cached access token");
        return cachedToken;
      }

      console.log(`🔐 Getting new access token from ${this.environment}...`);

      const response = await axios.post<PathaoToken>(
        `${this.baseUrl}/aladdin/api/v1/issue-token`,
        {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: "password",
          username: this.username,
          password: this.password,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 10000,
        },
      );

      const { access_token, expires_in } = response.data;

      console.log("✅ Access token received!");
      console.log(`Token expires in: ${expires_in} seconds`);

      // Cache এ store করি (10 min পরে refresh)
      tokenCache.set("pathao_access_token", access_token, expires_in - 600);

      return access_token;
    } catch (error: any) {
      console.error("❌ Failed to get access token:");
      console.error(error.response?.data || error.message);
      throw new Error("Failed to authenticate with Pathao");
    }
  }

  // ✅ Step 2: Order Pathao এ পাঠাই
  async createOrder(
    storeId: number,
    merchantOrderId: string,
    recipientName: string,
    recipientPhone: string,
    recipientAddress: string,
    itemQuantity: number,
    itemWeight: number,
    amountToCollect: number,
    specialInstruction?: string,
    itemDescription?: string,
  ): Promise<PathaoOrderResponse> {
    try {
      const accessToken = await this.getAccessToken();

      console.log("📦 Creating order in Pathao (" + this.environment + ")...");
      console.log({
        storeId,
        merchantOrderId,
        recipientName,
        recipientPhone,
        recipientAddress,
        itemQuantity,
        itemWeight,
        amountToCollect,
      });

      const response = await axios.post<PathaoOrderResponse>(
        `${this.baseUrl}/aladdin/api/v1/orders`,
        {
          store_id: storeId,
          merchant_order_id: merchantOrderId,
          recipient_name: recipientName,
          recipient_phone: recipientPhone,
          recipient_address: recipientAddress,
          delivery_type: 48,
          item_type: 2,
          special_instruction: specialInstruction || "Handle with care",
          item_quantity: itemQuantity,
          item_weight: itemWeight.toString(),
          item_description: itemDescription || "Order from online store",
          amount_to_collect: amountToCollect,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          timeout: 10000,
        },
      );

      console.log("✅ Order created successfully in Pathao!");
      console.log("Consignment ID:", response.data.data.consignment_id);
      console.log("Delivery Fee:", response.data.data.delivery_fee);

      return response.data;
    } catch (error: any) {
      console.error("❌ Failed to create order in Pathao:");
      console.error(error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message || "Failed to create order in Pathao",
      );
    }
  }

  // ✅ Step 3: Order Status ট্র্যাক করি
  async getOrderStatus(consignmentId: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();

      console.log(`📍 Tracking order: ${consignmentId}`);

      const response = await axios.get(
        `${this.baseUrl}/aladdin/api/v1/orders/${consignmentId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          timeout: 10000,
        },
      );

      console.log("✅ Order status retrieved");

      return response.data;
    } catch (error: any) {
      console.error("❌ Failed to get order status:");
      console.error(error.response?.data || error.message);
      throw error;
    }
  }

  // ✅ Verify Webhook Signature
  static verifyWebhookSignature(payload: any, signature: string): boolean {
    const crypto = require("crypto");
    const webhookSecret = config.webhook_secret;

    if (!webhookSecret) {
      console.error("❌ WEBHOOK_SECRET not configured");
      return false;
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(JSON.stringify(payload))
      .digest("hex");

    return signature === expectedSignature;
  }
}

export default PathaoService;
