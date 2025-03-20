import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { sightingReportId } = body

    console.log("mark read entered");
    console.log("sightingReport", sightingReportId);
    if (!sightingReportId) {
      return NextResponse.json({ error: "Sighting ID is required" }, { status: 400 })
    }
    const notification = await prisma.notification.updateMany({
      where: {
        sightingReportId: sightingReportId,
      },
      data: {
        isRead: true,
      },
    })

    return NextResponse.json({ message: "Notification marked as read", notification }, { status: 200 })
  } catch (error) {
    console.error("Error marking notification as read:", error)
    return NextResponse.json({ error: "Failed to mark notification as read" }, { status: 500 })
  }
}

