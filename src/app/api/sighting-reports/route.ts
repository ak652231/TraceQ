import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
    console.log("API called");
  try {
    
    console.log("API called");
    const body = await req.json(); 

    const {
      reportedByUserId,
      verifiedByPoliceId,
      sightingDate,
      sightingTime,
      sightingLat,
      sightingLng,
      sightingName,
      locationDetails,
      appearanceNotes,
      behaviorNotes,
      identifyingMarks,
      reporterPhoto,
      seenWith,
      missingPersonId,
      originalPhoto,
      analysis,
      reporterHeat,
      originalHeat,
      matchPercentage,
      status,
    } = body;


    if (!reportedByUserId || !sightingDate || !sightingTime || !sightingLat || !sightingLng || !reporterPhoto) {
      return Response.json({ message: "Missing required fields" }, { status: 400 });
    }

    const sightingReport = await prisma.sightingReport.create({
      data: {
        sightingDate: new Date(sightingDate),
        sightingTime,
        sightingLat: parseFloat(sightingLat),
        sightingLng: parseFloat(sightingLng),
        sightingName,
        locationDetails,
        appearanceNotes,
        behaviorNotes,
        identifyingMarks,
        reporterPhoto,
        originalPhoto,
        reporterHeat,
        originalHeat,
        matchPercentage,
        seenWith,
        analysis: analysis || "Pending",
        status: status || "Pending",
        missingPerson: {
          connect: { id: missingPersonId }
        },
        reporter: {
          connect: { id: reportedByUserId }
        },
        ...(verifiedByPoliceId ? {
          verifiedBy: {
            connect: { userId: verifiedByPoliceId }
          }
        } : {})
      }
    });
    
    return Response.json(
      { message: "Sighting report submitted successfully", sightingReport },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error submitting sighting report:", error);
    return Response.json({ message: "Internal Server Error", error: error.message }, { status: 500 });
  }
}
