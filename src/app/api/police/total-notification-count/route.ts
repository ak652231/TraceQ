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

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        role: true,
      },
    })

    if (!user || user.role !== "police") {
      return NextResponse.json({ error: "Unauthorized. Police access only." }, { status: 403 })
    }

    const notificationCount = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    })

    const unseenReportsCount = await prisma.missingPerson.count({
      where: {
        handledByPoliceId: userId,
        isSeen: false,
      },
    })

    const totalCount = notificationCount + unseenReportsCount

    return NextResponse.json({ count: totalCount })
  } catch (error) {
    console.error("Error fetching total notification count:", error)
    return NextResponse.json({ error: "Failed to fetch notification count" }, { status: 500 })
  }
}

