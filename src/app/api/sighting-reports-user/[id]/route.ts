import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"

const prisma = new PrismaClient()

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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

    const sightingId = params.id

    const sightingReport = await prisma.sightingReport.findUnique({
      where: {
        id: sightingId,
        
      },
      include: {
        missingPerson: {
          select: {
            userId: true,
          },
        
        },
        verifiedBy: true,
      },
    })
    console.log(sightingReport)
    if (!sightingReport) {
      return NextResponse.json({ error: "Sighting report not found" }, { status: 404 })
    }

    if (sightingReport.missingPerson.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized to view this sighting report" }, { status: 403 })
    }

    const sanitizedReport = {
      id: sightingReport.id,
      missingPersonId: sightingReport.missingPersonId,
      sightingDate: sightingReport.sightingDate,
      sightingTime: sightingReport.sightingTime,
      appearanceNotes: sightingReport.appearanceNotes,
      behaviorNotes: sightingReport.behaviorNotes,
      identifyingMarks: sightingReport.identifyingMarks,
      reporterPhoto: sightingReport.reporterPhoto,
      status: sightingReport.status,
      createdAt: sightingReport.createdAt,
      showUser: sightingReport.showUser,
    }

    return NextResponse.json(sanitizedReport)
  } catch (error) {
    console.error("Error fetching sighting report:", error)
    return NextResponse.json({ error: "Failed to fetch sighting report" }, { status: 500 })
  }
}

