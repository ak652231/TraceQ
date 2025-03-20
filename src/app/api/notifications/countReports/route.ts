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
      userId = decoded.id
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const url = new URL(req.url)
    const missingPersonId = url.searchParams.get("missingPersonId")
    const sightingReportId = url.searchParams.get("sightingReportId")

    const whereClause: any = {
      userId,
      isRead: false,
    }

    if (missingPersonId) {
      whereClause.missingPersonId = missingPersonId
    }

    if (sightingReportId) {
      whereClause.sightingReportId = sightingReportId
    }

    const count = await prisma.notification.count({
      where: whereClause,
    })

    return NextResponse.json({ count })
  } catch (error) {
    console.error("Error fetching notification count:", error)
    return NextResponse.json({ error: "Failed to fetch notification count" }, { status: 500 })
  }
}

