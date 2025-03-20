import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const token = searchParams.get("token");

        if (!token) {
            return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/auth/error?error=InvalidToken`);
        }

        console.log("JWT_SECRET:", process.env.NEXT_PUBLIC_JWT_SECRET);
        const decoded = jwt.verify(token, process.env.NEXT_PUBLIC_JWT_SECRET);

        const response = NextResponse.redirect(`${process.env.NEXTAUTH_URL}/`);
        response.cookies.set("sessionToken", token, {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 24 * 60 * 60, // 24 hours
            path: "/",
        });

        return response;
    } catch (error) {
        console.error("Verification error:", error);
        return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/auth/error?error=VerificationFailed`);
    }
}
