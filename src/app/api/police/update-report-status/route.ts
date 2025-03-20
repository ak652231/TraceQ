import { NextRequest, NextResponse } from "next/server";
import { PoliceActionType } from "@prisma/client";
import { prisma } from "../../../lib/prisma"; 

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { reportId, status, policeId } = body;

    const policeOfficer = await prisma.policeDetails.findUnique({
      where: { userId: policeId },
    });
    
    if (!policeOfficer) {
      return NextResponse.json(
        { error: "Invalid police officer ID" },
        { status: 400 }
      );
    }

    const sightingReport = await prisma.sightingReport.findUnique({
      where: { id: reportId },
      include: { missingPerson: true }
    });

if(status === "NOTIFIED_FAMILY") {
  await prisma.sightingReport.update({
      where: { id: reportId },
      data: {
        showUser: true,
        isSentVerification: true,
      },
  });
} 

  
    if (!sightingReport) {
      return NextResponse.json(
        { error: "Sighting report not found" },
        { status: 404 }
      );
    }

    const updatedReport = await prisma.sightingReport.update({
      where: { id: reportId },
      data: {
        status: status,
      },
    });

    let actionType: PoliceActionType;
   
    switch (status) {
      case "SENT_TEAM":
        actionType = PoliceActionType.SENT_TEAM;
        break;
      case "SOLVED":
        actionType = PoliceActionType.SOLVED;
        break;
      case "REJECT":
        actionType = PoliceActionType.REJECT;
        break;
      default:
        actionType = PoliceActionType.NOTIFIED_FAMILY;
    }

    const existingAction = await prisma.policeAction.findUnique({
      where: { sightingReportId: reportId },
    });
 
    let policeAction;
     
    if (existingAction) {
      policeAction = await prisma.policeAction.update({
        where: { sightingReportId: reportId },
        data: {
          actionTaken: actionType,
          policeId: policeId, 
        },
      });
    } else {
      policeAction = await prisma.policeAction.create({
        data: {
          sightingReportId: reportId,
          policeId: policeId, 
          actionTaken: actionType,
        },
      });
    }
 
    if (status === "SOLVED") {
      await prisma.missingPerson.update({
        where: { id: sightingReport.missingPersonId },
        data: { status: "Found" },
      });
      
    }
    if (status === "SENT_TEAM") {
      await prisma.missingPerson.update({
        where: { id: sightingReport.missingPersonId },
        data: { status: "Investigating" },
      });
      
    }

    return NextResponse.json(
      {
        message: "Report status updated successfully",
        report: updatedReport,
        action: policeAction,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating report status:", error);
    return NextResponse.json(
      { error: "Failed to update report status" },
      { status: 500 }
    );
  }
}