// File: /app/api/missing-persons/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function GET(request: NextRequest, context: { params: { id?: string } }) {
    try {
      const { id: missingPersonId } = await context.params; 
  
      if (!missingPersonId) {
        return NextResponse.json(
          { error: "Missing person ID is required" },
          { status: 400 }
        );
      }
      
      const missingPerson = await prisma.missingPerson.findUnique({
        where: { id: missingPersonId },
      });
  
      if (!missingPerson) {
        return NextResponse.json(
          { error: "Missing person not found" },
          { status: 404 }
        );
      }
      const missingPersonWithSightings = await prisma.missingPerson.findUnique({
        where: { id: missingPersonId },
        include: { 
          sightingReports: {
            include: {
              verifiedBy: true,
            }
          }
        }
      });
      
      
      console.log(missingPersonWithSightings);
      
      return NextResponse.json(missingPerson);
    } catch (error) {
      console.error("Error fetching missing person:", error);
      return NextResponse.json(
        { error: "Failed to fetch missing person" },
        { status: 500 }
      );
    } finally {
      await prisma.$disconnect();
    }
  }
  