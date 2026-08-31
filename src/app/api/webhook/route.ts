import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Respond to LINE's webhook verification
    if (body.events.length === 0) {
      return NextResponse.json({ message: 'OK' });
    }

    const event = body.events[0];
    const replyToken = event.replyToken;
    const lineUserId = event.source.userId;

    if (event.type === 'message' && event.message.type === 'text') {
      const text = event.message.text.trim();

      // Check if message is a binding command
      if (text.startsWith('ผูกบัญชี')) {
        const parts = text.split(' ');
        if (parts.length >= 2) {
          const employeeId = parts[1];

          // Find patient by employee ID
          const patient = await prisma.patient.findUnique({
            where: { employeeId },
          });

          if (patient) {
            // Update patient with LINE User ID
            await prisma.patient.update({
              where: { id: patient.id },
              data: { lineUserId },
            });

            await sendLineReply(replyToken, `ผูกบัญชีสำเร็จ! 👋\nสวัสดีคุณ ${patient.firstName} ${patient.lastName}\nระบบจะแจ้งเตือนเมื่อถึงคิวของคุณผ่านทางแชทนี้ครับ`);
          } else {
            await sendLineReply(replyToken, '❌ ไม่พบรหัสพนักงานนี้ในระบบ\nกรุณาจองคิวผ่านเว็บไซต์ก่อนทำการผูกบัญชีครับ');
          }
        } else {
          await sendLineReply(replyToken, '❌ รูปแบบไม่ถูกต้อง\nกรุณาพิมพ์: ผูกบัญชี [รหัสพนักงาน]\nเช่น: ผูกบัญชี 03021');
        }
      } else {
        // Default message or ignore
        // We can just ignore other messages so it doesn't spam
      }
    }

    return NextResponse.json({ message: 'OK' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook Error' }, { status: 500 });
  }
}

async function sendLineReply(replyToken: string, text: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.error('Missing LINE_CHANNEL_ACCESS_TOKEN');
    return;
  }

  try {
    await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        replyToken: replyToken,
        messages: [{ type: 'text', text: text }],
      }),
    });
  } catch (error) {
    console.error('Failed to send LINE reply', error);
  }
}
