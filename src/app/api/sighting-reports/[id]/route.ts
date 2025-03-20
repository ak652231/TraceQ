import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const reportId = await context.params.id; 

    if (!reportId) {
      return NextResponse.json(
        { message: "Missing report ID" },
        { status: 400 }
      );
    }

    const url = new URL(req.url);
    const policeId = url.searchParams.get("policeId");

    const sightingReport = await prisma.sightingReport.findUnique({
        where: {
          id: reportId,
        },
        include: {
          missingPerson: true,
          reporter: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          verifiedBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
          familyInteractions: true,
          policeActions: true, 
        },
      });
      
    if (!sightingReport) {
      return NextResponse.json(
        { message: "Sighting report not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(sightingReport);
  } catch (error) {
    console.error("Error fetching sighting report:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: (error as Error).message },
      { status: 500 }
    );
  }
}
