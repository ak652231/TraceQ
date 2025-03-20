// app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { Role } from "@prisma/client";
import { createHash } from "crypto";
import nodemailer from "nodemailer";
import { v2 as cloudinary } from 'cloudinary';

const prisma = new PrismaClient();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
        subject: `Sign in to ${new URL(process.env.NEXTAUTH_URL || '').host}`,
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
        const formData = await req.formData();

        const name = formData.get("name") as string;
        const email = formData.get("email") as string;
        const phone = formData.get("phone") as string;
        var role = formData.get("role") as Role;

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        let tempId = existingUser?.id || `temp_${Date.now()}`;
        if (role === "user") role = "police";
        let tempUserData: any = {
            name,
            email,
            phone,
            role,
        };

        if (role === "police") {
            const dateOfBirth = new Date(formData.get("dateOfBirth") as string);
            const badgeId = formData.get("badgeId") as string;
            const rank = formData.get("designation") as string;
            const station = formData.get("policeStation") as string;
            const department = formData.get("department") as string;
            const district = formData.get("district") as string;
            const state = formData.get("state") as string;
            const lat = parseFloat(formData.get("lat") as string);
            const lng = parseFloat(formData.get("lng") as string);

            const idFrontPath = formData.get("idCardFront");
            const idBackPath = formData.get("idCardBack");


            tempUserData.policeDetails = {
                fullName: name,
                email,
                phone,
                dob: dateOfBirth,
                badgeId,
                rank,
                department,
                station,
                lat,
                lng,
                district,
                state,
                idFront: idFrontPath,
                idBack: idBackPath,
                verified: false,
            };
        }

        const pendingRegistrationData = JSON.stringify(tempUserData);

        const token = generateVerificationToken();

        await prisma.verificationToken.deleteMany({
            where: { identifier: email },
        });

        await prisma.verificationToken.create({
            data: {
                identifier: email,
                token,
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            },
        });

        const verificationUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify?token=${token}&email=${encodeURIComponent(email)}&data=${encodeURIComponent(pendingRegistrationData)}`;

        await sendMagicLinkEmail(email, verificationUrl);

        return NextResponse.json({
            message: "Sign up successful. Check your email for the magic link.",
            status: 201,
        });

    } catch (error) {
        console.error("Signup error:", error);
        return NextResponse.json(
            { message: "Failed to create user", error: String(error) },
            { status: 500 }
        );
    }
}

function generateVerificationToken(): string {
    return createHash("sha256")
        .update(`${Math.random().toString(36)}${Date.now().toString(36)}`)
        .digest("hex");
}