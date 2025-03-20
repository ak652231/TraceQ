import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const EARTH_RADIUS_KM = 6371;

const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const toRadians = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLng / 2) ** 2;
  
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get('lat') || '');
  const lng = parseFloat(searchParams.get('lng') || '');
  const radius = parseFloat(searchParams.get('radius') || '50');
  const search = searchParams.get('search') || '';
  const gender = searchParams.get('gender');
  const minAge = parseInt(searchParams.get('minAge') || '0');
  const maxAge = parseInt(searchParams.get('maxAge') || '100');
  const dateRange = searchParams.get('dateRange');

  const whereClause: any = {
    AND: [
      { fullName: { contains: search, mode: 'insensitive' } },
      { age: { gte: minAge, lte: maxAge } }
    ]
  };

  if (gender && gender !== 'all') whereClause.AND.push({ gender });


  if (dateRange !== 'all') {
    const now = new Date();
    let startDate;
    const refDate = new Date(now); 
    if (dateRange === 'week') startDate = new Date(refDate.setDate(refDate.getDate() - 7));
    if (dateRange === 'month') startDate = new Date(refDate.setMonth(refDate.getMonth() - 1));
    if (dateRange === 'year') startDate = new Date(refDate.setFullYear(refDate.getFullYear() - 1));

    if (startDate) whereClause.AND.push({ lastSeenDate: { gte: startDate } });
}

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'Invalid location data' }, { status: 400 });
  }

  let persons = await prisma.missingPerson.findMany({ where: whereClause });

  // Calculate distances and filter by radius
  persons = persons
    .map(person => ({
      ...person,
      distance: parseFloat(haversineDistance(lat, lng, person.lat, person.lng).toFixed(2))
    }))
    .filter(person => person.distance <= radius)
    .sort((a, b) => a.distance - b.distance); 

  return NextResponse.json(persons);
}
