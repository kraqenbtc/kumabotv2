const crypto = require('crypto-js');
const { v1: uuidv1 } = require('uuid');
const { ethers } = require('ethers');
const config = require('./config');

/**
 * Generate UUID v1 nonce for API requests
 * @returns {string} UUID v1 nonce
 */
function generateNonce() {
  return uuidv1();
}

/**
 * Create HMAC signature for API requests
 * @param {string} payload - Request payload to sign
 * @returns {string} Hex-encoded HMAC signature
 */
function createHmacSignature(payload) {
  return crypto.HmacSHA256(payload, config.apiSecret).toString(crypto.enc.Hex);
}

/**
 * Convert UUID nonce to uint128 value as specified in the API docs
 * @param {string} nonceUUID - The UUID v1 nonce string
 * @returns {string} - The uint128 representation as a string
 */
function convertNonceToUint128(nonceUUID) {
  // Remove hyphens and convert to BigInt
  const nonceAsInt = BigInt('0x' + nonceUUID.replace(/-/g, ''));
  // Limit to uint128 (mask with 2^128 - 1)
  const mask = (BigInt(1) << BigInt(128)) - BigInt(1);
  const nonceAsUint128 = nonceAsInt & mask;
  return nonceAsUint128.toString();
}

/**
 * Create an EIP-712 wallet signature for trade endpoints
 * @param {object} domain - The EIP-712 domain data
 * @param {object} types - The EIP-712 types
 * @param {object} message - The message to sign
 * @returns {Promise<string>} - The wallet signature with 0x prefix
 */
async function signTypedData(domain, types, message) {
  if (!config.privateKey) {
    throw new Error('Private key is required for wallet signatures');
  }

  // Create a wallet instance with the private key
  const wallet = new ethers.Wallet(config.privateKey);
  
  // Sign the typed data - ethers v6 uses signTypedData instead of _signTypedData
  let signature;
  try {
    // Try ethers v6 method
    signature = await wallet.signTypedData(domain, types, message);
  } catch (error) {
    console.error('Error using signTypedData:', error);
    // Fall back to ethers v5 method
    signature = await wallet._signTypedData(domain, types, message);
  }
  
  return signature;
}

/**
 * Generate wallet signature for associating a wallet
 * @param {object} parameters - Request parameters
 * @returns {Promise<string>} - Wallet signature
 */
async function signWalletAssociation(parameters) {
  // EIP-712 domain data according to docs
  const domain = {
    name: 'Kuma',
    version: '1.0.0',
    chainId: config.chainId,
    verifyingContract: config.exchangeContractAddress
  };

  // Type definition for WalletAssociation
  const types = {
    WalletAssociation: [
      { name: 'nonce', type: 'uint128' },
      { name: 'wallet', type: 'address' }
    ]
  };
  
  // Convert nonce to uint128
  const nonceUint128 = convertNonceToUint128(parameters.nonce);
  
  // Create the message object
  const message = {
    nonce: nonceUint128,
    wallet: parameters.wallet
  };
  
  return signTypedData(domain, types, message);
}

/**
 * Generate wallet signature for creating an order
 * @param {object} parameters - Order parameters
 * @returns {Promise<string>} - Wallet signature
 */
async function signOrder(parameters) {
  // EIP-712 domain data
  const domain = {
    name: 'Kuma',
    version: '1.0.0',
    chainId: config.chainId,
    verifyingContract: config.exchangeContractAddress
  };

  // Type definition for Order according to docs
  const types = {
    Order: [
      { name: 'nonce', type: 'uint128' },
      { name: 'wallet', type: 'address' },
      { name: 'marketSymbol', type: 'string' },
      { name: 'orderType', type: 'uint8' },
      { name: 'orderSide', type: 'uint8' },
      { name: 'quantity', type: 'string' },
      { name: 'limitPrice', type: 'string' },
      { name: 'triggerPrice', type: 'string' },
      { name: 'triggerType', type: 'uint8' },
      { name: 'callbackRate', type: 'string' },
      { name: 'conditionalOrderId', type: 'uint128' },
      { name: 'isReduceOnly', type: 'bool' },
      { name: 'timeInForce', type: 'uint8' },
      { name: 'selfTradePrevention', type: 'uint8' },
      { name: 'isLiquidationAcquisitionOnly', type: 'bool' },
      { name: 'delegatedPublicKey', type: 'address' },
      { name: 'clientOrderId', type: 'string' }
    ]
  };
  
  // Convert nonce to uint128
  const nonceUint128 = convertNonceToUint128(parameters.nonce);
  
  // Convert string enum values to integers
  const orderType = convertOrderTypeToEnum(parameters.type);
  const orderSide = parameters.side === 'buy' ? 0 : 1;
  const triggerType = parameters.triggerType ? convertTriggerTypeToEnum(parameters.triggerType) : 0;
  const timeInForce = parameters.timeInForce ? convertTimeInForceToEnum(parameters.timeInForce) : 0;
  const selfTradePrevention = parameters.selfTradePrevention ? convertSelfTradePreventionToEnum(parameters.selfTradePrevention) : 0;
  
  // Create message parameters exactly as specified in the docs
  const message = {
    nonce: nonceUint128,
    wallet: parameters.wallet,
    marketSymbol: parameters.market,
    orderType: orderType,
    orderSide: orderSide,
    quantity: parameters.quantity || '0.00000000',
    limitPrice: parameters.price || '0.00000000',
    triggerPrice: parameters.triggerPrice || '0.00000000',
    triggerType: triggerType,
    callbackRate: '0.00000000', // Always 0 for regular orders
    conditionalOrderId: 0, // Always 0 for regular orders
    isReduceOnly: parameters.reduceOnly || false,
    timeInForce: timeInForce,
    selfTradePrevention: selfTradePrevention,
    isLiquidationAcquisitionOnly: false, // Always false for API orders
    delegatedPublicKey: '0x0000000000000000000000000000000000000000', // Not used in public API
    clientOrderId: parameters.clientOrderId || ''
  };
  
  const signature = await signTypedData(domain, types, message);
  return signature;
}

/**
 * Generate wallet signature for cancelling orders
 * @param {object} parameters - Cancel parameters
 * @returns {Promise<string>} - Wallet signature
 */
async function signOrderCancellation(parameters) {
  // EIP-712 domain data
  const domain = {
    name: 'Kuma',
    version: '1.0.0',
    chainId: config.chainId,
    verifyingContract: config.exchangeContractAddress
  };
  
  // Convert nonce to uint128
  const nonceUint128 = convertNonceToUint128(parameters.nonce);
  
  let typeName = 'OrderCancellationByWallet';
  let types = {};
  let message = {
    nonce: nonceUint128,
    wallet: parameters.wallet,
    delegatedKey: '0x0000000000000000000000000000000000000000' // Not used in public API
  };
  
  // Determine which type of cancellation is being performed
  if (parameters.orderIds) {
    typeName = 'OrderCancellationByOrderId';
    types = {
      [typeName]: [
        { name: 'nonce', type: 'uint128' },
        { name: 'wallet', type: 'address' },
        { name: 'delegatedKey', type: 'address' },
        { name: 'orderIds', type: 'string[]' }
      ]
    };
    message.orderIds = parameters.orderIds;
  } else if (parameters.market) {
    typeName = 'OrderCancellationByMarketSymbol';
    types = {
      [typeName]: [
        { name: 'nonce', type: 'uint128' },
        { name: 'wallet', type: 'address' },
        { name: 'delegatedKey', type: 'address' },
        { name: 'marketSymbol', type: 'string' }
      ]
    };
    message.marketSymbol = parameters.market;
  } else if (parameters.orderDelegatedKey) {
    typeName = 'OrderCancellationByDelegatedKey';
    types = {
      [typeName]: [
        { name: 'nonce', type: 'uint128' },
        { name: 'wallet', type: 'address' },
        { name: 'delegatedKey', type: 'address' },
        { name: 'orderDelegatedKey', type: 'address' }
      ]
    };
    message.orderDelegatedKey = parameters.orderDelegatedKey;
  } else {
    // Default case - cancel all orders
    types = {
      [typeName]: [
        { name: 'nonce', type: 'uint128' },
        { name: 'wallet', type: 'address' },
        { name: 'delegatedKey', type: 'address' }
      ]
    };
  }
  
  return signTypedData(domain, types, message);
}

/**
 * Convert order type string to enum value
 * @param {string} orderType - Order type string
 * @returns {number} - Enum value
 */
function convertOrderTypeToEnum(orderType) {
  const typeMap = {
    'market': 0,
    'limit': 1,
    'stopLossMarket': 2,
    'stopLossLimit': 3,
    'takeProfitMarket': 4,
    'takeProfitLimit': 5
  };
  
  return typeMap[orderType] || 0;
}

/**
 * Convert trigger type string to enum value
 * @param {string} triggerType - Trigger type string
 * @returns {number} - Enum value
 */
function convertTriggerTypeToEnum(triggerType) {
  const typeMap = {
    'none': 0,
    'last': 1,
    'index': 2
  };
  
  return typeMap[triggerType] || 0;
}

/**
 * Convert time in force string to enum value
 * @param {string} timeInForce - Time in force string
 * @returns {number} - Enum value
 */
function convertTimeInForceToEnum(timeInForce) {
  const typeMap = {
    'gtc': 0, // Good-til-canceled
    'gtx': 1, // Good-til-crossing (post-only)
    'ioc': 2, // Immediate-or-cancel
    'fok': 3  // Fill-or-kill
  };
  
  return typeMap[timeInForce] || 0;
}

/**
 * Convert self-trade prevention string to enum value
 * @param {string} selfTradePrevention - Self-trade prevention string
 * @returns {number} - Enum value
 */
function convertSelfTradePreventionToEnum(selfTradePrevention) {
  const typeMap = {
    'dc': 0, // Decrement and cancel
    'co': 1, // Cancel oldest
    'cn': 2, // Cancel newest
    'cb': 3  // Cancel both
  };
  
  return typeMap[selfTradePrevention] || 0;
}

module.exports = {
  generateNonce,
  createHmacSignature,
  signWalletAssociation,
  signOrder,
  signOrderCancellation,
  convertNonceToUint128
}; 