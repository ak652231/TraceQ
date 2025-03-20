// src/app/api/police/sighting-reports/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromSession } from '../../../lib/session';
import Cookies from 'js-cookie';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    
    const { searchParams } = new URL(request.url);
    const policeId = searchParams.get('policeId');
    const missingPersonId = searchParams.get('missingpersonId');

    if (!policeId) {
      return NextResponse.json({ error: 'Police ID is required' }, { status: 400 });
    }

    const whereClause: any = {
      verifiedByPoliceId: policeId,
    };
    
    if (missingPersonId) {
      whereClause.missingPersonId = missingPersonId;
    }
    
    const userWithRole = await prisma.user.findUnique({
      where: { id: policeId },
      include: { police: true },
    });

    if (!userWithRole || userWithRole.role !== 'police' || !userWithRole.police) {
      return NextResponse.json({ error: 'Unauthorized. Must be a police officer' }, { status: 403 });
    }

    const sightingReports = await prisma.sightingReport.findMany({
        where: whereClause,
        include: {
          missingPerson: {
            include: {
              user: true, 
            },
          },
          reporter: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          policeActions: true,
          familyInteractions: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      
    console.log(sightingReports);
    return NextResponse.json(sightingReports);
  } catch (error) {
    console.error('Error fetching sighting reports:', error);
    return NextResponse.json({ error: 'Failed to fetch sighting reports' }, { status: 500 });
  }
}