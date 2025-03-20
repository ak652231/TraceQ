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

    const sightingId = params.id
    const { action, notes } = await req.json()

    if (action !== "CONFIRMED" && action !== "DENIED") {
      return NextResponse.json({ error: "Invalid action. Must be CONFIRMED or DENIED" }, { status: 400 })
    }
console.log("good till update")
    const sightingReport = await prisma.sightingReport.update({
      where: {
        id: sightingId,
      },
      data:{
        verifiedByFamily: action === "CONFIRMED"
        ? true
        : false,
      }
    })

    const familyInteraction = await prisma.familyInteraction.upsert({
      where: {
        sightingReportId: sightingId,
      },
      update: {
        response: action,
        notes: notes || null,
      },
      create: {
        sightingReportId: sightingId,
        response: action,
        notes: notes || null,
      },
    })

    console.log(sightingReport,sightingReport.verifiedByPoliceId)
    let notification;
    if (sightingReport.verifiedByPoliceId) {
      notification= await prisma.notification.create({
        data: {
          userId: sightingReport.verifiedByPoliceId,
          sightingReportId: sightingId,
          missingPersonId: sightingReport.missingPersonId,
          type: "FAMILY_ACTION_UPDATE",
          message:
            action === "CONFIRMED"
              ? "Family has confirmed this sighting report."
              : "Family has denied this sighting report.",
        },
      })
    }

    try {
      const socketRes = await fetch(`${process.env.NEXTAUTH_URL}/api/socket/emit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: "notification",
          data: {
            userId: sightingReport.verifiedByPoliceId,
            sightingReportId : sightingReport.id,
            missingPersonId: sightingReport.missingPersonId,
            action,
            notification: {
              id: notification.id,
              type: "FAMILY_ACTION_UPDATE",
              message:
            action === "CONFIRMED"
              ? "Family has confirmed this sighting report."
              : "Family has denied this sighting report.",
              createdAt: notification.createdAt,
            },
          },
        }),
      })

      if (!socketRes.ok) {
        console.error("Failed to emit socket event")
      }
    } catch (socketError) {
      console.error("Socket error:", socketError)
    }
    return NextResponse.json({ success: true, familyInteraction })
  } catch (error) {
    console.error("Error processing family action:", error)
    return NextResponse.json({ error: "Failed to process family action" }, { status: 500 })
  }
}

