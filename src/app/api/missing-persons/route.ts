import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
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


  const persons = await prisma.missingPerson.findMany({ where: whereClause });
  return NextResponse.json(persons);
}
