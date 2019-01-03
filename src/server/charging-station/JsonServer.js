const webSocketServer = require('websocket').server;
const http = require('http');
const webSocketsServerPort = 8010;
const ChargingStation = require("../../entity/ChargingStation")

class JsonServer {
  async start() {
    // Create Http Server
    const server = http.createServer((request, response) => {
      // Not important for us. We're writing WebSocket server
    });
    // Listen
    server.listen(webSocketsServerPort, () => {
      console.log((new Date()) + " Server is listening on port " + webSocketsServerPort);
    });
    // Create Websocket
    const wsServer = new webSocketServer({
      httpServer: server
    });
    // This callback function is called every time someone
    // tries to connect to the WebSocket server
    wsServer.on('request', (request) => {
      // Get the charger ID
      const chargingStationID = request.httpRequest.url.substring(1);
      // Charger connected
      console.log((new Date()) + ' Connection of charger ' + chargingStationID + '.');
      // Get connection
      const connection = request.accept('ocpp1.6', request.origin);
      // Get the Charger ID
      connection.chargingStationID = chargingStationID;
      // Listen to error
      connection.on('error', (error) => {
        console.log(`## Error ${error}`);
      });
      // Listen to message
      connection.on('message', async (message) => {
        // Get message
        const serverMessage = message.utf8Data;
        // Log
        console.log(`>> Request received: ${serverMessage}`);
        // Parse
        const serverMessageParsed = JSON.parse(serverMessage);
        // Get the command
        const command = serverMessageParsed[2]; 
        // Check Command
        switch (command) {
          // Boot Notification
          case "BootNotification":
            console.log(">> Bootnotif received");
            await this.handleBootNotification(connection.chargingStationID, connection, serverMessageParsed[1], serverMessageParsed[3]);
            break;
          // Heartbeat
          case "Heartbeat":
            console.log(">> Heartbeat received");
            break;
          // Command Unknown
          default:
            console.log(`## Command unknown '${command}' for charging Station '${connection.chargingStationID}'`);
            break;
        }
      });
      // Close
      connection.on('close', () => {
        console.log("Connexion closed");
      });
    });
  }

  async handleBootNotification(chargingStationID, connection, messageID, data) {
    // Set
    data.chargingStationID = chargingStationID;
    // Build Charging Station
    const chargingStation = new ChargingStation(data);
    // Save
    await chargingStation.save();
    // Build Response
    const bootNotificationResponse = {
      status: "Accepted", 
      currentTime: new Date().toISOString(), 
      interval: 60
    }
    // Get the id of the bootnotif
    const response = [3, messageID, bootNotificationResponse];
    // Send
    connection.send(JSON.stringify(response));
    // Log
    console.log(`<< Response sent: ${JSON.stringify(response)}`);
  }
}

module.exports = JsonServer;

