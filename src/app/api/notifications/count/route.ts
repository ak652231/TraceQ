import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken";

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("sessionToken")?.value

    console.log("Token:", token);
    if (!token) {
      return NextResponse.json({ isValid: false, error: "No token found" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.NEXT_PUBLIC_JWT_SECRET!);
    const userId = decoded.id

    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    })

    return NextResponse.json({ count }, { status: 200 })
  } catch (error) {
    console.error("Error fetching notification count:", error)
    return NextResponse.json({ error: "Failed to fetch notification count" }, { status: 500 })
  }
}

