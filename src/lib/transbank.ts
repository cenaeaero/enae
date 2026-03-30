import { WebpayPlus, Options, IntegrationApiKeys, IntegrationCommerceCodes, Environment } from "transbank-sdk";

const isProduction = process.env.TBK_ENVIRONMENT === "production";

const commerceCode = isProduction
  ? process.env.TBK_COMMERCE_CODE!
  : IntegrationCommerceCodes.WEBPAY_PLUS;

const apiKey = isProduction
  ? process.env.TBK_API_KEY!
  : IntegrationApiKeys.WEBPAY;

const environment = isProduction
  ? Environment.Production
  : Environment.Integration;

const tx = new WebpayPlus.Transaction(
  new Options(commerceCode, apiKey, environment)
);

export async function createTransaction(
  amount: number,
  buyOrder: string,
  sessionId: string,
  returnUrl: string
) {
  const response = await tx.create(buyOrder, sessionId, amount, returnUrl);
  return {
    token: response.token,
    url: response.url,
  };
}

export async function confirmTransaction(token: string) {
  const response = await tx.commit(token);
  return {
    vci: response.vci,
    amount: response.amount,
    status: response.status,
    buyOrder: response.buy_order,
    sessionId: response.session_id,
    cardNumber: response.card_detail?.card_number,
    transactionDate: response.transaction_date,
    authorizationCode: response.authorization_code,
    paymentTypeCode: response.payment_type_code,
    responseCode: response.response_code,
    installmentsNumber: response.installments_number,
  };
}
