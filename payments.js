// payments.js
// Wraps the eSewa and Khalti payment gateway APIs. Defaults below point at
// their SANDBOX/TEST endpoints — swap the *_BASE_URL / product code env
// vars to go live later, no code changes needed.

const crypto = require('crypto');

// ===================== Khalti =====================

const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY; // from test-admin.khalti.com > Settings > Keys
const KHALTI_BASE_URL = process.env.KHALTI_BASE_URL || 'https://dev.khalti.com/api/v2/epayment';

// Kicks off a Khalti payment. Amount comes in as NPR (rupees); Khalti's API
// wants paisa (rupees * 100).
async function initiateKhaltiPayment({
  amount,
  purchaseOrderId,
  purchaseOrderName,
  returnUrl,
  websiteUrl,
  customerName,
  customerEmail,
}) {
  if (!KHALTI_SECRET_KEY) {
    throw new Error('KHALTI_SECRET_KEY is not set in .env');
  }

  const response = await fetch(`${KHALTI_BASE_URL}/initiate/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${KHALTI_SECRET_KEY}`,
    },
    body: JSON.stringify({
      return_url: returnUrl,
      website_url: websiteUrl,
      amount: Math.round(amount * 100), // rupees -> paisa
      purchase_order_id: purchaseOrderId,
      purchase_order_name: purchaseOrderName,
      customer_info: {
        name: customerName || 'Kam User',
        email: customerEmail || undefined,
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Khalti initiate failed:', data);
    throw new Error(data.detail || 'Khalti payment initiation failed.');
  }

  // data: { pidx, payment_url, expires_at, expires_in }
  return data;
}

// Confirms a payment's real status directly with Khalti (never trust the
// query string alone on the callback route).
async function lookupKhaltiPayment(pidx) {
  if (!KHALTI_SECRET_KEY) {
    throw new Error('KHALTI_SECRET_KEY is not set in .env');
  }

  const response = await fetch(`${KHALTI_BASE_URL}/lookup/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${KHALTI_SECRET_KEY}`,
    },
    body: JSON.stringify({ pidx }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Khalti lookup failed:', data);
    throw new Error(data.detail || 'Khalti payment lookup failed.');
  }

  // data: { pidx, total_amount, status, transaction_id, fee, refunded }
  return data;
}

// ===================== eSewa =====================

// eSewa's published sandbox test values. Live merchants get their own
// product code + secret key when they register — put those in .env then.
const ESEWA_PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE || 'EPAYTEST';
const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q';
const ESEWA_FORM_URL = process.env.ESEWA_FORM_URL || 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';
const ESEWA_STATUS_URL = process.env.ESEWA_STATUS_URL || 'https://rc.esewa.com.np/api/epay/transaction/status/';

function esewaSignature(message) {
  return crypto.createHmac('sha256', ESEWA_SECRET_KEY).update(message).digest('base64');
}

// Builds the hidden-field form the frontend needs to POST (auto-submit) to
// eSewa's checkout page.
function buildEsewaForm({ amount, transactionUuid, successUrl, failureUrl }) {
  const taxAmount = 0;
  const productServiceCharge = 0;
  const productDeliveryCharge = 0;
  const totalAmount = amount + taxAmount + productServiceCharge + productDeliveryCharge;

  const signedFieldNames = 'total_amount,transaction_uuid,product_code';
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${ESEWA_PRODUCT_CODE}`;
  const signature = esewaSignature(message);

  return {
    formAction: ESEWA_FORM_URL,
    fields: {
      amount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      transaction_uuid: transactionUuid,
      product_code: ESEWA_PRODUCT_CODE,
      product_service_charge: productServiceCharge,
      product_delivery_charge: productDeliveryCharge,
      success_url: successUrl,
      failure_url: failureUrl,
      signed_field_names: signedFieldNames,
      signature,
    },
  };
}

// eSewa's success redirect includes ?data=<base64 JSON>. Decode it and
// verify its signature before trusting anything in it.
function verifyEsewaCallback(base64Data) {
  if (!base64Data) return null;

  let payload;
  try {
    const json = Buffer.from(base64Data, 'base64').toString('utf-8');
    payload = JSON.parse(json);
  } catch (err) {
    console.error('eSewa callback: bad base64/JSON', err);
    return null;
  }

  const { signed_field_names, signature } = payload;
  if (!signed_field_names || !signature) return null;

  const message = signed_field_names
    .split(',')
    .map((field) => `${field}=${payload[field]}`)
    .join(',');

  const expectedSignature = esewaSignature(message);
  if (expectedSignature !== signature) {
    console.error('eSewa callback: signature mismatch');
    return null;
  }

  return payload; // includes transaction_uuid, status, total_amount, transaction_code, etc.
}

// Re-confirms the transaction status directly with eSewa's status-check
// endpoint (the source of truth — don't rely on the callback alone).
async function checkEsewaStatus({ totalAmount, transactionUuid }) {
  const params = new URLSearchParams({
    product_code: ESEWA_PRODUCT_CODE,
    total_amount: totalAmount,
    transaction_uuid: transactionUuid,
  });

  const response = await fetch(`${ESEWA_STATUS_URL}?${params.toString()}`);
  const data = await response.json();

  if (!response.ok) {
    console.error('eSewa status check failed:', data);
    return { status: 'FAILED' };
  }

  // data: { product_code, transaction_uuid, total_amount, status, ref_id }
  return data;
}

module.exports = {
  buildEsewaForm,
  verifyEsewaCallback,
  checkEsewaStatus,
  initiateKhaltiPayment,
  lookupKhaltiPayment,
};