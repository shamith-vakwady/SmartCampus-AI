from fastapi import WebSocket
from typing import Dict, List, Set
import json

class ConnectionManager:
    def __init__(self):
        # Store dashboard connections
        self.dashboards: Set[WebSocket] = set()
        # Store camera connections by client_id
        self.cameras: Dict[str, WebSocket] = {}

    # --- Dashboard WebSockets ---
    async def connect_dashboard(self, websocket: WebSocket):
        await websocket.accept()
        self.dashboards.add(websocket)
        print(f"Dashboard client connected. Active: {len(self.dashboards)}")

    def disconnect_dashboard(self, websocket: WebSocket):
        self.dashboards.discard(websocket)
        print(f"Dashboard client disconnected. Active: {len(self.dashboards)}")

    async def broadcast_dashboard(self, message: dict):
        # Convert message to JSON string
        data = json.dumps(message)
        disconnected = []
        for connection in self.dashboards:
            try:
                await connection.send_text(data)
            except Exception:
                disconnected.append(connection)
                
        for connection in disconnected:
            self.dashboards.discard(connection)

    # --- Camera WebSockets ---
    async def connect_camera(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.cameras[client_id] = websocket
        print(f"Camera client '{client_id}' connected. Active: {len(self.cameras)}")

    def disconnect_camera(self, client_id: str):
        if client_id in self.cameras:
            del self.cameras[client_id]
            print(f"Camera client '{client_id}' disconnected. Active: {len(self.cameras)}")

    async def send_camera_result(self, client_id: str, message: dict):
        if client_id in self.cameras:
            try:
                await self.cameras[client_id].send_text(json.dumps(message))
            except Exception:
                self.disconnect_camera(client_id)

# Singleton Instance
manager = ConnectionManager()
