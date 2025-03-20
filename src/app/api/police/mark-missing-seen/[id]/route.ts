import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"

const prisma = new PrismaClient()

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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

    const reportId = params.id

    const report = await prisma.missingPerson.findUnique({
      where: {
        id: reportId,
        handledByPoliceId: userId,
      },
    })

    if (!report) {
      return NextResponse.json({ error: "Report not found or not assigned to you" }, { status: 404 })
    }

    await prisma.missingPerson.update({
      where: {
        id: reportId,
      },
      data: {
        isSeen: true,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking report as seen:", error)
    return NextResponse.json({ error: "Failed to mark report as seen" }, { status: 500 })
  }
}

