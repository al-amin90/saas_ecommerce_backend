// src/modules/courier/pathao.service.ts

import axios from "axios";
import NodeCache from "node-cache";
import config from "../../../config";
import { getTenantModel } from "../../../utils/getTenantModel";
import { IDeliveryMethod } from "../deliveryMethod/deliveryMethod.interface";

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

  constructor(
    environment: "sandbox" | "live" = "sandbox",
    public subdomain: string,
  ) {
    this.environment = environment;
    this.subdomain = subdomain;

    // ✅ Config থেকে পাই
    if (environment === "sandbox") {
      this.baseUrl = config.pathao_sandbox.base_url!;
      this.clientId = config.pathao_sandbox.client_id!;
      this.clientSecret = config.pathao_sandbox.client_secret!;
      this.username = config.pathao_sandbox.username!;
      this.password = config.pathao_sandbox.password!;

      console.log("🔧 Pathao Service initialized (SANDBOX)");
    } else {
      // live এ placeholder — init() এ overwrite হবে
      this.baseUrl = config.pathao_live.base_url!;
      this.clientId = "";
      this.clientSecret = "";
      this.username = "";
      this.password = "";
    }
  }

  async init(): Promise<this> {
    if (this.environment === "live") {
      const DeliveryMethod = await getTenantModel<IDeliveryMethod>(
        this.subdomain,
        "DeliveryMethod",
      );

      const deliveryMethod = await DeliveryMethod.findOne({ type: "PATHAO" });

      if (!deliveryMethod) {
        throw new Error("Pathao delivery method not configured");
      }

      this.clientId = deliveryMethod.clientId!;
      this.clientSecret = deliveryMethod.clientSecret!;
      this.username = deliveryMethod.clientEmail!;
      this.password = deliveryMethod.clientPassword!;

      console.log("🔧 Pathao Service initialized (LIVE)");

      this.validateConfig();
    }

    return this;
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
    const webhookSecret = config.webhook_secret;

    if (!webhookSecret) {
      console.error("❌ WEBHOOK_SECRET not configured");
      return false;
    }

    return signature === webhookSecret;
  }

  // src/modules/courier/pathao.service.ts (নতুন method যোগ করি)

  // ✅ Sandbox এ Store তৈরি করি
  async createStore(
    name: string,
    contactName: string,
    contactNumber: string,
    address: string,
    cityId: number = 1, // Dhaka
    zoneId: number = 1,
    areaId: number = 1,
  ): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();

      console.log(`📍 Creating store in ${this.environment}...`);

      const response = await axios.post(
        `${this.baseUrl}/aladdin/api/v1/stores`,
        {
          name,
          contact_name: contactName,
          contact_number: contactNumber,
          secondary_contact: contactNumber,
          otp_number: contactNumber,
          address,
          city_id: cityId,
          zone_id: zoneId,
          area_id: areaId,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          timeout: 10000,
        },
      );

      console.log("✅ Store created successfully!");
      console.log("Response:", response.data);

      return response.data;
    } catch (error: any) {
      console.error("❌ Failed to create store:");
      console.error(error.response?.data || error.message);
      throw error;
    }
  }

  // ✅ সব available cities পাই
  async getCities(): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();

      console.log("📍 Fetching cities...");

      const response = await axios.get(
        `${this.baseUrl}/aladdin/api/v1/cities`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          timeout: 10000,
        },
      );

      console.log("✅ Cities retrieved:");
      console.log(response.data);

      return response.data;
    } catch (error: any) {
      console.error("❌ Failed to fetch cities:");
      console.error(error.response?.data || error.message);
      throw error;
    }
  }

  // ✅ City দিয়ে zones পাই
  async getZones(cityId: number): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();

      console.log(`📍 Fetching zones for city ${cityId}...`);

      const response = await axios.get(
        `${this.baseUrl}/aladdin/api/v1/zones?city_id=${cityId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          timeout: 10000,
        },
      );

      console.log("✅ Zones retrieved:");
      console.log(response.data);

      return response.data;
    } catch (error: any) {
      console.error("❌ Failed to fetch zones:");
      console.error(error.response?.data || error.message);
      throw error;
    }
  }

  // ✅ Zone দিয়ে areas পাই
  async getAreas(zoneId: number): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();

      console.log(`📍 Fetching areas for zone ${zoneId}...`);

      const response = await axios.get(
        `${this.baseUrl}/aladdin/api/v1/areas?zone_id=${zoneId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          timeout: 10000,
        },
      );

      console.log("✅ Areas retrieved:");
      console.log(response.data);

      return response.data;
    } catch (error: any) {
      console.error("❌ Failed to fetch areas:");
      console.error(error.response?.data || error.message);
      throw error;
    }
  }
}

export default PathaoService;
