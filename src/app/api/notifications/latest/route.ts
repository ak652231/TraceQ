import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const sessionToken = cookieStore.get("sessionToken")?.value

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
    const sightingReportId = url.searchParams.get("sightingReportId")

    if (!sightingReportId) {
      return NextResponse.json({ error: "Sighting report ID is required" }, { status: 400 })
    }

    const latestNotification = await prisma.notification.findFirst({
      where: {
        userId,
        sightingReportId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        message: true,
      },
    })

    return NextResponse.json(latestNotification || { message: "" })
  } catch (error) {
    console.error("Error fetching latest notification:", error)
    return NextResponse.json({ error: "Failed to fetch latest notification" }, { status: 500 })
  }
}

