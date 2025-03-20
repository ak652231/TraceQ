import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const lat = parseFloat(searchParams.get("lat") || "0");
        const lng = parseFloat(searchParams.get("lng") || "0");

        if (isNaN(lat) || isNaN(lng)) {
            return NextResponse.json({ error: "Invalid latitude or longitude" }, { status: 400 });
        }

        const policeOfficers = await prisma.policeDetails.findMany({
            select: { id: true,userId:true, fullName: true, lat: true, lng: true, badgeId: true }
        });

        if (policeOfficers.length === 0) {
            return NextResponse.json({ message: "No police officers found" }, { status: 204 });
        }

        let nearestOfficer = null;
        let minDistance = Infinity;

        for (const officer of policeOfficers) {
            const distance = haversineDistance(lat, lng, officer.lat, officer.lng);
            if (distance < minDistance) {
                minDistance = distance;
                nearestOfficer = officer;
            }
        }

        return NextResponse.json({ nearestOfficer, distance: minDistance });

    } catch (error) {
        console.error("Error finding nearest police officer:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// Haversine formula to calculate distance
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (angle: number) => (Math.PI * angle) / 180;
    const R = 6371; // Earth's radius in km

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
