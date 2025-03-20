import { type NextRequest, NextResponse } from "next/server"
import { NotificationType } from "@prisma/client"
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, sightingReportId, missingPersonId, type, message, status } = body

    if (!userId || !sightingReportId || !missingPersonId || !type || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        sightingReportId,
        missingPersonId,
        type: type as NotificationType,
        message,
        isRead: false,
      },
      include: { 
        sightingReport: true, 
        missingPerson: true
      }
    })
    console.log(notification)
    try {
      const socketRes = await fetch(`${process.env.NEXTAUTH_URL}/api/socket/emit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: "notification",
          data: {
            userId,
            newStatus: status,
            sightingReportId,
            missingPersonId,
            notification
          },
        }),
      })

      if (!socketRes.ok) {
        console.error("Failed to emit socket event")
      }
    } catch (socketError) {
      console.error("Socket error:", socketError)
    }

    return NextResponse.json({ message: "Notification created successfully", notification }, { status: 201 })
  } catch (error) {
    console.error("Error creating notification:", error)
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 })
  }
}

