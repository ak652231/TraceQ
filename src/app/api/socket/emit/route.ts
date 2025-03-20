import { getSocketIO } from "../../../lib/socket"
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const body = await req.json()
    const { event, data } = body
    
    if (!event || !data) {
      return NextResponse.json({ error: "Event and data are required" }, { status: 400 })
    }
    
    try {
      const io = getSocketIO()
      
      if (data.userId) {
        console.log("Emitting to userId:", data.userId)
        io.to(data.userId).emit(event, data)
      } else {
        io.emit(event, data)
      }
      
      return NextResponse.json({ message: "Event emitted successfully" }, { status: 200 })
    } catch (err) {
      console.error("Socket.IO not available:", err.message)
      return NextResponse.json({ error: "Socket.IO not available" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error emitting socket event:", error)
    return NextResponse.json({ error: "Failed to emit socket event" }, { status: 500 })
  }
}