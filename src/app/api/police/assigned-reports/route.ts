import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
  try {
    // Get the session token from cookies
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

    const assignedReports = await prisma.missingPerson.findMany({
      where: {
        handledByPoliceId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(assignedReports)
  } catch (error) {
    console.error("Error fetching assigned reports:", error)
    return NextResponse.json({ error: "Failed to fetch assigned reports" }, { status: 500 })
  }
}

