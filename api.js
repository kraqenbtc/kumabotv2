const axios = require('axios');
const querystring = require('querystring');
const config = require('./config');
const auth = require('./auth');

/**
 * Kuma API client
 */
class KumaApi {
  constructor() {
    this.baseUrl = config.apiUrl;
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.walletAddress = config.walletAddress;
  }

  /**
   * Make a GET request to the Kuma API
   * @param {string} endpoint - API endpoint
   * @param {object} params - Request parameters
   * @param {boolean} needsAuth - Whether the endpoint requires authentication
   * @returns {Promise<object>} - API response
   */
  async get(endpoint, params = {}, needsAuth = false) {
    try {
      let headers = {};
      
      if (needsAuth) {
        // Add nonce if not provided
        if (!params.nonce) {
          params.nonce = auth.generateNonce();
        }
        
        // Stringify parameters for HMAC signing
        const stringifiedParams = querystring.stringify(params);
        
        // Create HMAC signature
        const signature = auth.createHmacSignature(stringifiedParams);
        
        // Set authentication headers
        headers = {
          'KUMA-API-KEY': this.apiKey,
          'KUMA-HMAC-SIGNATURE': signature
        };
      }
      
      // Make the API request
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        params,
        headers
      });
      
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Make a POST request to the Kuma API
   * @param {string} endpoint - API endpoint
   * @param {object} params - Request parameters
   * @param {boolean} needsWalletSignature - Whether the endpoint requires a wallet signature
   * @returns {Promise<object>} - API response
   */
  async post(endpoint, params = {}, needsWalletSignature = false) {
    try {
      // Add nonce if not provided
      if (!params.nonce) {
        params.nonce = auth.generateNonce();
      }
      
      let requestBody = {};
      
      if (needsWalletSignature) {
        // For security, ensure wallet address is set
        if (!params.wallet) {
          params.wallet = this.walletAddress;
        }
        
        // Create wallet signature
        const signature = await auth.signWalletAssociation({
          nonce: params.nonce,
          wallet: params.wallet
        });
        
        // Format request body with parameters and signature
        requestBody = {
          parameters: params,
          signature
        };
      } else {
        requestBody = params;
      }
      
      // Stringify request body for HMAC signing
      const stringifiedBody = JSON.stringify(requestBody);
      
      // Create HMAC signature
      const hmacSignature = auth.createHmacSignature(stringifiedBody);
      
      // Set headers
      const headers = {
        'KUMA-API-KEY': this.apiKey,
        'KUMA-HMAC-SIGNATURE': hmacSignature,
        'Content-Type': 'application/json'
      };
      
      // Make the API request
      const response = await axios.post(`${this.baseUrl}${endpoint}`, requestBody, {
        headers
      });
      
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Make a DELETE request to the Kuma API
   * @param {string} endpoint - API endpoint
   * @param {object} params - Request parameters
   * @param {boolean} needsWalletSignature - Whether the endpoint requires a wallet signature
   * @returns {Promise<object>} - API response
   */
  async delete(endpoint, params = {}, needsWalletSignature = false) {
    try {
      // Add nonce if not provided
      if (!params.nonce) {
        params.nonce = auth.generateNonce();
      }
      
      let requestBody = {};
      
      if (needsWalletSignature) {
        // For security, ensure wallet address is set
        if (!params.wallet) {
          params.wallet = this.walletAddress;
        }
        
        // Create wallet signature for orders
        const signature = await auth.signWalletAssociation({
          nonce: params.nonce,
          wallet: params.wallet
        });
        
        // Format request body with parameters and signature
        requestBody = {
          parameters: params,
          signature
        };
      } else {
        requestBody = params;
      }
      
      // Stringify request body for HMAC signing
      const stringifiedBody = JSON.stringify(requestBody);
      
      // Create HMAC signature
      const hmacSignature = auth.createHmacSignature(stringifiedBody);
      
      // Set headers
      const headers = {
        'KUMA-API-KEY': this.apiKey,
        'KUMA-HMAC-SIGNATURE': hmacSignature,
        'Content-Type': 'application/json'
      };
      
      // Make the API request
      const response = await axios.delete(`${this.baseUrl}${endpoint}`, {
        data: requestBody,
        headers
      });
      
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Handle API errors
   * @param {Error} error - Error object
   */
  handleError(error) {
    if (error.response) {
      // The request was made and the server responded with an error
      console.error('API Error Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        config: {
          method: error.response.config.method,
          url: error.response.config.url,
          headers: error.response.config.headers,
          data: error.response.config.data ? JSON.parse(error.response.config.data) : null
        }
      });
      throw new Error(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('API Request Error - No Response:', {
        request: error.request,
        config: error.config
      });
      throw new Error('No response received from API');
    } else {
      // Something happened in setting up the request
      console.error('API Setup Error:', error.message);
      throw error;
    }
  }

  /**
   * Check API connectivity
   * @returns {Promise<object>} - Ping response
   */
  async ping() {
    return this.get('/ping');
  }

  /**
   * Get server time
   * @returns {Promise<object>} - Time response
   */
  async getTime() {
    return this.get('/time');
  }

  /**
   * Get basic exchange information
   * @returns {Promise<object>} - Exchange information
   */
  async getExchangeInfo() {
    return this.get('/exchange');
  }

  /**
   * Get market information
   * @param {string} market - Optional market symbol
   * @returns {Promise<object>} - Market information
   */
  async getMarkets(market = '') {
    const params = market ? { market } : {};
    return this.get('/markets', params);
  }

  /**
   * Associate a wallet with the API account
   * @returns {Promise<object>} - Wallet association response
   */
  async associateWallet() {
    return this.post('/wallets', {
      nonce: auth.generateNonce(),
      wallet: this.walletAddress
    }, true);
  }

  /**
   * Get wallet information
   * @param {boolean} includePositions - Whether to include position data
   * @returns {Promise<object>} - Wallet information
   */
  async getWallets(includePositions = true) {
    return this.get('/wallets', {
      nonce: auth.generateNonce(),
      wallet: this.walletAddress,
      includePositions
    }, true);
  }

  /**
   * Get wallet positions
   * @param {string} market - Optional market symbol
   * @returns {Promise<object>} - Position information
   */
  async getPositions(market = '') {
    const params = {
      nonce: auth.generateNonce(),
      wallet: this.walletAddress
    };
    
    if (market) {
      params.market = market;
    }
    
    return this.get('/positions', params, true);
  }

  /**
   * Create a new order
   * @param {object} orderParams - Order parameters
   * @returns {Promise<object>} - Order response
   */
  async createOrder(orderParams) {
    try {
      // Prepare parameters
      const params = {
        nonce: auth.generateNonce(),
        wallet: this.walletAddress,
        ...orderParams
      };
      
      // Generate the wallet signature for the order
      const signature = await auth.signOrder(params);
      
      // Format request body with parameters and signature
      const requestBody = {
        parameters: params,
        signature
      };
      
      // Create HMAC signature for request
      const hmacSignature = auth.createHmacSignature(JSON.stringify(requestBody));
      
      // Set headers
      const headers = {
        'KUMA-API-KEY': this.apiKey,
        'KUMA-HMAC-SIGNATURE': hmacSignature,
        'Content-Type': 'application/json'
      };
      
      // Make the API request
      const response = await axios.post(`${this.baseUrl}/orders`, requestBody, {
        headers
      });
      
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        console.error('API Error creating order:', JSON.stringify(error.response.data, null, 2));
        throw new Error(JSON.stringify(error.response.data));
      } else {
        console.error('Unknown error creating order:', error.message);
        throw error;
      }
    }
  }

  /**
   * Get open or past orders
   * @param {object} params - Query parameters
   * @returns {Promise<array>} - Orders
   */
  async getOrders(params = {}) {
    const queryParams = {
      nonce: auth.generateNonce(),
      wallet: this.walletAddress,
      ...params
    };
    
    return this.get('/orders', queryParams, true);
  }

  /**
   * Cancel orders by id, client id, or all orders for a market
   * @param {object} params - Cancel parameters
   * @returns {Promise<array>} - Canceled orders
   */
  async cancelOrders(params = {}) {
    const cancelParams = {
      nonce: auth.generateNonce(),
      wallet: this.walletAddress,
      ...params
    };
    
    // Use order cancellation specific signature
    const signature = await auth.signOrderCancellation(cancelParams);
    
    // Format request body with parameters and signature
    const requestBody = {
      parameters: cancelParams,
      signature
    };
    
    // Stringify request body for HMAC signing
    const stringifiedBody = JSON.stringify(requestBody);
    
    // Create HMAC signature
    const hmacSignature = auth.createHmacSignature(stringifiedBody);
    
    // Set headers
    const headers = {
      'KUMA-API-KEY': this.apiKey,
      'KUMA-HMAC-SIGNATURE': hmacSignature,
      'Content-Type': 'application/json'
    };
    
    // Make the API request
    const response = await axios.delete(`${this.baseUrl}/orders`, {
      data: requestBody,
      headers
    });
    
    return response.data;
  }

  /**
   * Get ticker data for a market
   * @param {string} market - Market symbol
   * @returns {Promise<object>} - Ticker data
   */
  async getTicker(market) {
    return this.get('/tickers', { market });
  }

  /**
   * Get order book data for a market
   * @param {string} market - Market symbol
   * @param {number} level - Order book level (1 or 2)
   * @param {number} limit - Number of price levels to return
   * @returns {Promise<object>} - Order book data
   */
  async getOrderBook(market, level = 1, limit = 50) {
    return this.get('/orderbook', { market, level, limit });
  }

  /**
   * Get WebSocket authentication token for private subscriptions
   * @returns {Promise<string>} - wsToken string
   */
  async getWsToken() {
    const params = {
      nonce: require('./auth').generateNonce(),
      wallet: this.walletAddress
    };
    const headers = {
      'KUMA-API-KEY': this.apiKey,
      'KUMA-HMAC-SIGNATURE': require('./auth').createHmacSignature(require('querystring').stringify(params))
    };
    const response = await require('axios').get(`${this.baseUrl}/wsToken`, { params, headers });
    return response.data.token;
  }
}

module.exports = new KumaApi(); 