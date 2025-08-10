## 📡 JairiSys Gateway Message Service

This is a **Node.js backend service** that enables sending SMS messages through an Android device acting as a gateway. It uses **Express** for API routing and **WebSocket** for real-time communication with the Android client.

---

### 🌐 Live Demo

[https://gatewaymessage-production.up.railway.app](https://gatewaymessage-production.up.railway.app)

---

### 📦 Features

* ✅ REST API to send SMS messages
* 📱 Real-time communication with Android via WebSocket
* 🔐 Connection management to ensure only one Android client is active
* 🔄 Status endpoint to verify gateway availability
* ⚙️ Easily deployable on platforms like [Railway](https://railway.app)

---

### 🧑‍💻 Tech Stack

* **Node.js**
* **Express.js**
* **WebSocket (ws)**
* **Railway (Deployment)**
* **CORS**

---

### 🚀 Endpoints

#### **GET /**

Basic health check.
**Response:**

```json
"JairiSys SMS Gateway Backend is running!"
```

---

#### **GET /api/gateway-status**

Check if the Android device is currently connected.
**Response (Connected):**

```json
{
  "status": "connected",
  "message": "Android SMS Gateway is connected."
}
```

**Response (Disconnected):**

```json
{
  "status": "disconnected",
  "message": "Android SMS Gateway is not connected."
}
```

---

#### **POST /api/send-sms**

Send an SMS via the Android gateway.

**Request Body:**

```json
{
  "number": "+1234567890",
  "message": "Hello from the backend!"
}
```

**Response (Success):**

```json
{
  "success": true,
  "details": "SMS sent successfully"
}
```

**Response (Failure):**

```json
{
  "success": false,
  "error": "The Android gateway is not connected."
}
```

---

### 🔌 WebSocket Behavior

* Only **one Android device** can be connected at a time.
* The device listens for `send_sms` jobs and returns success/failure responses with a matching `jobId`.

---

### 📁 Project Structure

```
gateway_message/
├── index.js         # Main server (API + WebSocket)
├── package.json     # Node.js dependencies
└── README.md        # Project documentation
```

---

### 🧪 How to Run Locally

1. Clone the repo:

   ```bash
   git clone https://github.com/jairisys427/gateway_message.git
   cd gateway_message
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the server:

   ```bash
   node index.js
   ```

4. The server will be available at `http://localhost:4000` unless `PORT` is set.

---

### 🚨 Requirements for Android Gateway

* WebSocket client must:

  * Connect to the same port
  * Listen for `send_sms` messages
  * Respond with job `id`, `status`, and `details`

---

### 📄 License

MIT — Free to use and modify for any purpose.
