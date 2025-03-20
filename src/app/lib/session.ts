import { PrismaClient } from '@prisma/client';
import { prisma } from './prisma';

interface UserSession {
  id: string;
  role: string;
}

export async function getUserFromSession(sessionToken: string): Promise<UserSession | null> {
  try {
    const session = await prisma.session.findUnique({
      where: {
        sessionToken,
      },
      include: {
        user: true,
      },
    });
    
    if (!session || new Date() > session.expires) {
      return null;
    }
    
    return {
      id: session.user.id,
      role: session.user.role,
    };
  } catch (error) {
    console.error('Error getting user from session:', error);
    return null;
  }finally {
    await prisma.$disconnect();
  }
}