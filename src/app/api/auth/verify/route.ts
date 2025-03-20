import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { Role } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const token = searchParams.get("token");
    const email = searchParams.get("email");
    const encodedData = searchParams.get("data");
    
    if (!token || !email || !encodedData) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/auth/error?error=InvalidVerification`
      );
    }
    
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token,
        identifier: email,
        expires: {
          gt: new Date(),
        },
      },
    });
    
    if (!verificationToken) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/auth/error?error=ExpiredToken`
      );
    }
    
    let userData;
    try {
      userData = JSON.parse(decodeURIComponent(encodedData));
    } catch (error) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/auth/error?error=InvalidData`
      );
    }
    if(userData.role=="user" || userData.role=="police")   userData.role="police";
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        name: userData.name,
        phone: userData.phone,
        role: userData.role as Role,
        emailVerified: new Date(),
      },
      create: {
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        role: userData.role as Role,
        emailVerified: new Date(),
      },
    });
    
    if ((userData.role === "user"|| userData.role=="police") && userData.policeDetails) {
      await prisma.policeDetails.upsert({
        where: { userId: user.id },
        update: {
          fullName: userData.policeDetails.fullName,
          email: userData.policeDetails.email,
          phone: userData.policeDetails.phone,
          dob: new Date(userData.policeDetails.dob),
          badgeId: userData.policeDetails.badgeId,
          rank: userData.policeDetails.rank,
          department: userData.policeDetails.department,
          district: userData.policeDetails.district,
          station: userData.policeDetails.station,
          lat: userData.policeDetails.lat,
          lng: userData.policeDetails.lng,
          state: userData.policeDetails.state,
          idFront: userData.policeDetails.idFront,
          idBack: userData.policeDetails.idBack,
          verified: false, // Admin will verify later
        },
        create: {
          fullName: userData.policeDetails.fullName,
          email: userData.policeDetails.email,
          phone: userData.policeDetails.phone,
          dob: new Date(userData.policeDetails.dob),
          badgeId: userData.policeDetails.badgeId,
          rank: userData.policeDetails.rank,
          department: userData.policeDetails.department,
          district: userData.policeDetails.district,
          station: userData.policeDetails.station,
          lat: userData.policeDetails.lat,
          lng: userData.policeDetails.lng,
          state: userData.policeDetails.state,
          idFront: userData.policeDetails.idFront,
          idBack: userData.policeDetails.idBack,
          verified: false,
      
          user: {
            connect: { id: user.id }, // This will set `userId` automatically
          },
        },
      });
      
    }
    
await prisma.verificationToken.delete({
    where: {
      token,
    },
  });
  
    
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/`
    );
    
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/auth/error?error=VerificationFailed`
    );
  }
}
