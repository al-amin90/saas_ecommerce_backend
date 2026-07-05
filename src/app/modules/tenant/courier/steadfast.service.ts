import axios from "axios";
import { getTenantModel } from "../../../utils/getTenantModel";
import { IDeliveryMethod } from "../deliveryMethod/deliveryMethod.interface";

const STEADFAST_BASE_URL = "https://portal.packzy.com/api/v1";

// ── Credentials from DeliveryMethod ──────────────────────────────────────────

const getSteadfastCredentials = async (subdomain: string) => {
  const DeliveryMethod = await getTenantModel<IDeliveryMethod>(
    subdomain,
    "DeliveryMethod",
  );
  const method = await DeliveryMethod.findOne({
    type: "STEDFAST",
    isActive: true,
  });

  if (!method) throw new Error("Steadfast delivery method not configured");

  return {
    apiKey: method.clientId,
    secretKey: method.clientSecret,
  };
};

// ── Create Order ──────────────────────────────────────────────────────────────

const createSingleSteadfastOrder = async (
  subdomain: string,
  order: {
    invoice: string;
    recipient_name: string;
    recipient_phone: string;
    recipient_address: string;
    cod_amount: number;
    note?: string;
  },
) => {
  const { apiKey, secretKey } = await getSteadfastCredentials(subdomain);

  let phone = order.recipient_phone.replace(/[^0-9]/g, "");
  if (!phone.startsWith("88")) {
    phone = `88${phone}`;
  }

  const payload = {
    ...order,
    recipient_phone: phone,
  };

  console.log(`📦 Sending single order: ${order.invoice}`);
  console.log("Payload:", JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(
      `${STEADFAST_BASE_URL}/create_order`,
      payload,
      {
        headers: {
          "Api-Key": apiKey,
          "Secret-Key": secretKey,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      },
    );

    // LOG THE COMPLETE RESPONSE
    console.log(`📦 Complete response for ${order.invoice}:`);
    console.log("Response Status:", response.status);
    console.log("Response Headers:", JSON.stringify(response.headers, null, 2));
    console.log("Response Data:", JSON.stringify(response.data, null, 2));

    return response.data;
  } catch (error: any) {
    console.error(`❌ Failed to send order ${order.invoice}:`);
    console.error("Error Message:", error.message);
    console.error("Error Response:", error.response?.data);
    console.error("Error Status:", error.response?.status);
    throw error;
  }
};

// ── Bulk Create Orders ────────────────────────────────────────────────────────

const createBulkSteadfastOrders = async (
  subdomain: string,
  orders: {
    invoice: string;
    recipient_name: string;
    recipient_phone: string;
    recipient_address: string;
    cod_amount: number;
    note?: string;
  }[],
) => {
  const { apiKey, secretKey } = await getSteadfastCredentials(subdomain);

  console.log("apiKey", apiKey);
  console.log("secretKey", secretKey);

  const payload = {
    data: orders,
  };

  const response = await axios.post(
    `${STEADFAST_BASE_URL}/create_order/bulk-order`,
    payload,
    {
      headers: {
        "Api-Key": apiKey,
        "Secret-Key": secretKey,
        "Content-Type": "application/json",
      },
    },
  );

  return response.data;
};

// ── Track by Tracking Code ────────────────────────────────────────────────────

const trackByTrackingCode = async (subdomain: string, trackingCode: string) => {
  const { apiKey, secretKey } = await getSteadfastCredentials(subdomain);

  const response = await axios.get(
    `${STEADFAST_BASE_URL}/status_by_trackingcode/${trackingCode}`,
    {
      headers: {
        "Api-Key": apiKey,
        "Secret-Key": secretKey,
      },
    },
  );

  return response.data;
};

// ── Track by Invoice ──────────────────────────────────────────────────────────

const trackByInvoice = async (subdomain: string, invoice: string) => {
  const { apiKey, secretKey } = await getSteadfastCredentials(subdomain);

  const response = await axios.get(
    `${STEADFAST_BASE_URL}/status_by_invoice/${invoice}`,
    {
      headers: {
        "Api-Key": apiKey,
        "Secret-Key": secretKey,
      },
    },
  );

  return response.data;
};

// ── Check Balance ─────────────────────────────────────────────────────────────

const checkSteadfastBalance = async (subdomain: string) => {
  const { apiKey, secretKey } = await getSteadfastCredentials(subdomain);

  const response = await axios.get(`${STEADFAST_BASE_URL}/get_balance`, {
    headers: {
      "Api-Key": apiKey,
      "Secret-Key": secretKey,
    },
  });

  return response.data;
};

export const steadfastService = {
  createSingleSteadfastOrder,
  createBulkSteadfastOrders,
  trackByTrackingCode,
  trackByInvoice,
  checkSteadfastBalance,
};
