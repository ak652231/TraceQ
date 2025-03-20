import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const newReport = await prisma.MissingPerson.create({
      data: {
        fullName: body.fullName,
        age: parseInt(body.age),
        gender: body.gender,
        photo: body.photo,
        behavioralTraits: body.behavioralTraits || null,  
        healthConditions: body.healthConditions || null, 

        lastSeenLocation: body.lastSeenLocation,
        lastSeenDate: new Date(body.lastSeenDate),
        lastSeenTime: body.lastSeenTime,
        lat:  parseFloat(body.lat) ,
        lng:  parseFloat(body.lng) ,

        height: parseFloat(body.height) ,
        heightUnit: body.heightUnit || "cm",
        weight:parseFloat(body.weight),
        weightUnit: body.weightUnit || "kg",
        hairColor: body.hairColor ,
        eyeColor: body.eyeColor ,
        clothingWorn: body.clothingWorn ,
        identifyingMarks: body.identifyingMarks || null, 
        additionalPhotos: body.additionalPhotos || [],  

        reporterName: body.reporterName,
        relationship: body.relationship,
        mobileNumber: body.mobileNumber,
        emailAddress: body.emailAddress || null,  
        handledByPoliceId: body.handledByPoliceId || null, 
        aadhaarImage: body.aadhaarImage,
        userId: body.userId,
      },
    });

    return NextResponse.json({ success: true, data: newReport }, { status: 201 });
  } catch (error) {
    console.error("Error creating missing person report:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
