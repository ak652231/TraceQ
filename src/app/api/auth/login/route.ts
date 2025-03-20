import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

async function sendMagicLinkEmail(to: string, url: string) {
    const transport = nodemailer.createTransport({
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        secure: process.env.EMAIL_SERVER_PORT === "465", 
        auth: {
            user: process.env.EMAIL_SERVER_USER,
            pass: process.env.EMAIL_SERVER_PASSWORD,
        },
    });

    await transport.sendMail({
        to,
        from: process.env.EMAIL_FROM,
        subject: `Sign in to ${new URL(process.env.NEXTAUTH_URL || "").host}`,
        text: `Sign in to your account\n\n${url}\n\n`,
        html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333;">Magic Link Sign In</h2>
        <p style="color: #555; font-size: 16px;">Click the button below to sign in to your account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${url}" style="background-color: #4a6cf7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Sign In</a>
        </div>
        <p style="color: #777; font-size: 14px;">If you didn't request this email, you can safely ignore it.</p>
        <p style="color: #999; font-size: 12px;">This link will expire in 24 hours.</p>
      </div>
    `,
    });
}

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json(); 

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                name: user.name, 
                role: user.role, 
            },
            process.env.NEXT_PUBLIC_JWT_SECRET,
            { expiresIn: "24h" }
        );

        const verificationUrl = `${process.env.NEXTAUTH_URL}/api/auth/verifyLogin?token=${token}`;

        await sendMagicLinkEmail(email, verificationUrl);

        return NextResponse.json({
            message: "Login successful. Check your email for the magic link.",
            status: 200,
        });

    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json(
            { message: "Failed to send magic link", error: String(error) },
            { status: 500 }
        );
    }
}
