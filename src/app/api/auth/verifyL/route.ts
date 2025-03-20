import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get("sessionToken").value; 
        console.log("Token:", token);
        if (!token) {
            return NextResponse.json({ isValid: false, error: "No token found" }, { status: 401 });
        }

        const decoded = jwt.verify(token, process.env.NEXT_PUBLIC_JWT_SECRET!);

        return NextResponse.json({ isValid: true, userId: decoded.id });
    } catch (error) {
        return NextResponse.json({ isValid: false, error: "Invalid or expired token" }, { status: 401 });
    }
}
