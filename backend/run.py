import uvicorn
from app.config import PORT

if __name__ == "__main__":
    print(f"Starting Smart Campus Attendance Platform Backend...")
    print(f"Server will be available on the local network. Make sure your devices are on the same Wi-Fi.")
    # Run server on all interfaces (0.0.0.0) so phone camera can connect
    uvicorn.run("app.main:app", host="0.0.0.0", port=PORT, reload=True)
