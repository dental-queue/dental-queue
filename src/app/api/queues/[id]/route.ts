import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH: Admin updates queue status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { status } = await request.json();
    const resolvedParams = await params;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const updatedQueue = await prisma.queue.update({
      where: { id: resolvedParams.id },
      data: { status },
      include: { patient: true },
    });

    // Send LINE Push Notification if status is IN_PROGRESS
    if (status === 'IN_PROGRESS' && updatedQueue.patient.lineUserId) {
      const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
      if (token) {
        try {
          await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              to: updatedQueue.patient.lineUserId,
              messages: [{
                type: 'text',
                text: `📢 แจ้งเตือนคิวทันตกรรม\nถึงคิวของคุณแล้วครับ!\n\nคิวรอบ: ${updatedQueue.timeSlot}\nสถานี: ${updatedQueue.patient.station}\n\nกรุณามาที่หน่วยทันตกรรมเคลื่อนที่ตอนนี้ได้เลยครับ`
              }],
            }),
          });
        } catch (error) {
          console.error('Failed to send LINE push message', error);
        }
      }
    }

    return NextResponse.json(updatedQueue);
  } catch (error) {
    console.error('Failed to update queue', error);
    return NextResponse.json({ error: 'Failed to update queue' }, { status: 500 });
  }
}

// DELETE: Patient cancels their own queue (must verify identity)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { employeeId, idCardLast4, adminPassword, hardDelete } = await request.json();
    const resolvedParams = await params;

    // Admin hard delete override
    if (adminPassword && hardDelete) {
      const config = await prisma.systemConfig.findUnique({ where: { key: 'ADMIN_PASSWORD' } });
      const correctPassword = config?.value || 'admin1234';
      
      if (adminPassword === correctPassword) {
        await prisma.queue.delete({ where: { id: resolvedParams.id } });
        return NextResponse.json({ success: true, deleted: true });
      } else {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    if (!employeeId || !idCardLast4) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    // Find the queue and verify ownership
    const queue = await prisma.queue.findUnique({
      where: { id: resolvedParams.id },
      include: { patient: true },
    });

    if (!queue) {
      return NextResponse.json({ error: 'Queue not found' }, { status: 404 });
    }

    // Verify identity
    if (queue.patient.employeeId !== employeeId || queue.patient.idCardLast4 !== idCardLast4) {
      return NextResponse.json({ error: 'Identity verification failed' }, { status: 403 });
    }

    // Only allow cancelling WAITING queues
    if (queue.status !== 'WAITING') {
      return NextResponse.json({ error: 'Cannot cancel a queue that is already in progress or completed' }, { status: 400 });
    }

    const cancelled = await prisma.queue.update({
      where: { id: resolvedParams.id },
      data: { status: 'CANCELLED' },
    });

    return NextResponse.json(cancelled);
  } catch (error) {
    console.error('Failed to cancel queue', error);
    return NextResponse.json({ error: 'Failed to cancel queue' }, { status: 500 });
  }
}
