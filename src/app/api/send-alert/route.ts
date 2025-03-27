import { NextResponse } from 'next/server';
import twilio from 'twilio';

// Initialize Twilio client
const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

interface AlertRequest {
    message: string;
    channels: string[];
    recipients?: string[];
}

export async function POST(request: Request) {
    try {
        const { message, channels, recipients = [] }: AlertRequest = await request.json();
        const results = [];

        // Get default recipients from environment if none provided
        const defaultRecipients = process.env.NEXT_OF_KIN_PHONES?.split(',') || [];
        const allRecipients = [...new Set([...recipients, ...defaultRecipients])];

        if (allRecipients.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No recipients specified' },
                { status: 400 }
            );
        }

        // Send SMS if requested
        // if (channels.includes('sms')) {
        //     for (const phone of allRecipients) {
        //         try {
        //             const smsResult = await client.messages.create({
        //                 body: message,
        //                 from: process.env.TWILIO_PHONE_NUMBER,
        //                 to: phone
        //             });
        //             results.push({
        //                 channel: 'sms',
        //                 recipient: phone,
        //                 success: true,
        //                 sid: smsResult.sid
        //             });
        //         } catch (error) {
        //             console.error(`SMS sending failed to ${phone}:`, error);
        //             results.push({
        //                 channel: 'sms',
        //                 recipient: phone,
        //                 success: false,
        //                 error: error instanceof Error ? error.message : 'Unknown error'
        //             });
        //         }
        //     }
        // }

        // Send WhatsApp if requested
        if (channels.includes('whatsapp')) {
            for (const phone of allRecipients) {
                try {
                    const whatsappResult = await client.messages.create({
                        body: message,
                        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
                        to: `whatsapp:${phone}`
                    });
                    results.push({
                        channel: 'whatsapp',
                        recipient: phone,
                        success: true,
                        sid: whatsappResult.sid
                    });
                } catch (error) {
                    console.error(`WhatsApp sending failed to ${phone}:`, error);
                    results.push({
                        channel: 'whatsapp',
                        recipient: phone,
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (error) {
        console.error('Alert sending failed:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 