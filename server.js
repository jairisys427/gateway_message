const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');

// The hosting provider (like Railway) will set the PORT environment variable.
// We use it, or default to 4000 for local development.
const PORT = process.env.PORT || 4000;

// This variable will hold the active connection to our Android device.
let androidGatewaySocket = null;

//=================================================
// 1. CREATE HTTP SERVER & EXPRESS APP
//=================================================
const app = express();
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Enable JSON body parsing

// --- API Routes ---

// A simple health check for the API server itself
app.get('/', (req, res) => {
  res.send('JairiSys SMS Gateway Backend is running!');
});

// An endpoint to check if the Android gateway is currently connected
app.get('/api/gateway-status', (req, res) => {
  if (androidGatewaySocket && androidGatewaySocket.readyState === 1) { // 1 means OPEN
    res.status(200).json({ status: 'connected', message: 'Android SMS Gateway is connected.' });
  } else {
    res.status(404).json({ status: 'disconnected', message: 'Android SMS Gateway is not connected.' });
  }
});

// The main endpoint to send an SMS
app.post('/api/send-sms', async (req, res) => {
  const { number, message } = req.body;

  if (!number || !message) {
    return res.status(400).json({ success: false, error: 'Phone number and message are both required.' });
  }
  
  // Check if the gateway is actually connected before proceeding
  if (!androidGatewaySocket || androidGatewaySocket.readyState !== 1) {
    console.error('[X] SMS Request Failed: Android gateway is not connected.');
    return res.status(503).json({ success: false, error: 'Service Unavailable: The Android gateway is not connected.' });
  }

  console.log(`[+] Received request to send SMS to: ${number}`);
  console.log(`[*] Forwarding job to Android gateway via WebSocket...`);

  // Create a unique ID for this job to track the response from the phone
  const jobId = `sms_${Date.now()}`;
  const jobPayload = {
    type: 'send_sms',
    id: jobId,
    number: number,
    message: message,
  };

  // This Promise will resolve when the phone sends back a status for our specific job
  const waitForGatewayResponse = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Gateway did not respond within 15 seconds.'));
    }, 15000); // 15-second timeout

    // Define a specific listener for this job
    const responseListener = (data) => {
      try {
        const response = JSON.parse(data);
        // We only care about messages that match our job ID
        if (response.id === jobId) {
          clearTimeout(timeout);
          androidGatewaySocket.removeListener('message', responseListener); // Clean up listener
          if (response.status === 'success') {
            resolve(response);
          } else {
            reject(new Error(response.details || 'Gateway reported an unspecified error.'));
          }
        }
      } catch (e) { /* Ignore non-JSON or unrelated messages */ }
    };
    
    // Attach the listener to the socket
    androidGatewaySocket.on('message', responseListener);
  });

  try {
    // Send the job payload to the connected Android device
    androidGatewaySocket.send(JSON.stringify(jobPayload));
    
    // Wait for the promise to resolve or reject
    const gatewayResponse = await waitForGatewayResponse;

    console.log(`[✔] Job ${jobId} completed successfully. Phone says:`, gatewayResponse.details);
    res.status(200).json({ success: true, details: gatewayResponse.details });

  } catch (error) {
    console.error(`[X] Job ${jobId} failed. Reason:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create the main HTTP server using the Express app
const server = http.createServer(app);

//=================================================
// 2. ATTACH WEBSOCKET SERVER TO THE HTTP SERVER
//=================================================
// This is the key change: we attach the WebSocket server to our existing HTTP server.
// They will now share the same port.
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  console.log('[WS] A client connected.');
  
  if (androidGatewaySocket) {
      console.log('[WS] Another client tried to connect, rejecting.');
      ws.close(1013, 'Another gateway is already connected.'); // 1013 = Try again later
      return;
  }
  
  androidGatewaySocket = ws;
  console.log('[WS] ✅ Android Gateway has been registered as the active sender.');

  ws.on('message', (message) => {
    console.log('[WS] Received message from gateway -> %s', message);
  });

  ws.on('close', () => {
    console.log('[WS] ❌ Android Gateway disconnected.');
    androidGatewaySocket = null; // Clear the socket so we know it's gone
  });

  ws.on('error', (error) => {
    console.error('[WS] WebSocket error:', error);
    if (androidGatewaySocket === ws) {
        androidGatewaySocket = null;
    }
  });
});

// Start the combined server
server.listen(PORT, () => {
  console.log(`🚀 Server (API & WebSocket) listening on port ${PORT}`);
});