import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
  try {
    const sessionToken = (await cookies()).get("sessionToken")?.value; 

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

    if (!missingPersonId) {
      return NextResponse.json({ error: "Missing person ID is required" }, { status: 400 })
    }

    const missingPerson = await prisma.missingPerson.findUnique({
      where: {
        id: missingPersonId,
        userId,
      },
    })

    if (!missingPerson) {
      return NextResponse.json({ error: "Missing person not found or not owned by user" }, { status: 404 })
    }

    const sightingReports = await prisma.sightingReport.findMany({
      where: {
        missingPersonId,
        showUser: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        missingPersonId: true,
        sightingDate: true,
        sightingTime: true,
        appearanceNotes: true,
        behaviorNotes: true,
        identifyingMarks: true,
        reporterPhoto: true,
        status: true,
        createdAt: true,
        showUser: true,
        verifiedByFamily: true,
      },
    })

    console.log(sightingReports)
    return NextResponse.json(sightingReports)
  } catch (error) {
    console.error("Error fetching sighting reports:", error)
    return NextResponse.json({ error: "Failed to fetch sighting reports" }, { status: 500 })
  }
}

