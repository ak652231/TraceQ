import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("sessionToken")?.value
    console.log("Token in notif:", sessionToken)
    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let userId: string
    try {
      const decoded = jwt.verify(sessionToken, process.env.NEXT_PUBLIC_JWT_SECRET!) as { userId: string }
      userId = decoded.userId
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const url = new URL(req.url)
    const missingPersonId = url.searchParams.get("missingPersonId")
    const sightingReportId = url.searchParams.get("sightingReportId")

    const whereClause: any = {
      userId,
    }

    if (missingPersonId) {
      whereClause.missingPersonId = missingPersonId
    }

    if (sightingReportId) {
      whereClause.sightingReportId = sightingReportId
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        type: true,
        message: true,
        isRead: true,
        createdAt: true,
        sightingReportId: true,
        missingPersonId: true,
      },
    })

    return NextResponse.json({ notifications })
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
  }
}

