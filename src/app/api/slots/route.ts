import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date'); // expected: "YYYY-MM-DD"
    const station = searchParams.get('station') || 'HDQ-สำนักงานใหญ่';

    if (!dateParam) {
      return NextResponse.json({ error: 'date parameter is required' }, { status: 400 });
    }

    const date = new Date(dateParam);
    date.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateParam);
    endOfDay.setHours(23, 59, 59, 999);

    const setting = await prisma.clinicSetting.findFirst({
      where: { 
        date: { gte: date, lte: endOfDay },
        station: station
      },
    });

    if (!setting || !setting.isOpen) {
      return NextResponse.json([]);
    }

    const now = new Date();
    if (setting.bookingStartDate && now < new Date(setting.bookingStartDate)) {
      return NextResponse.json([]);
    }
    if (setting.bookingEndDate && now > new Date(setting.bookingEndDate)) {
      return NextResponse.json([]);
    }

    // Generate all slots
    const slots = [];
    let [h, m] = setting.startTime.split(':').map(Number);
    const [endH, endM] = setting.endTime.split(':').map(Number);

    let currentMins = h * 60 + m;
    const endMins = endH * 60 + endM;

    let breakStartMins = 720; // Default 12:00
    let breakEndMins = 780; // Default 13:00

    if (setting.breakStartTime && setting.breakEndTime) {
      const [bsH, bsM] = setting.breakStartTime.split(':').map(Number);
      breakStartMins = bsH * 60 + bsM;
      const [beH, beM] = setting.breakEndTime.split(':').map(Number);
      breakEndMins = beH * 60 + beM;
    }

    while (currentMins + setting.slotDuration <= endMins) {
      const slotH = Math.floor(currentMins / 60).toString().padStart(2, '0');
      const slotM = (currentMins % 60).toString().padStart(2, '0');

      const nextMins = currentMins + setting.slotDuration;
      const nextH = Math.floor(nextMins / 60).toString().padStart(2, '0');
      const nextM = (nextMins % 60).toString().padStart(2, '0');

      // Check if slot overlaps with break time
      // The slot is invalid if it starts before break ends AND ends after break starts
      const isLunchBreak = (currentMins < breakEndMins) && (nextMins > breakStartMins);
      
      if (!isLunchBreak) {
        slots.push(`${slotH}:${slotM} - ${nextH}:${nextM}`);
      }
      currentMins = nextMins;
    }

    // Count bookings per slot on that date
    const queues = await prisma.queue.findMany({
      where: {
        date: { gte: date, lte: endOfDay },
        status: { not: 'CANCELLED' },
      },
    });

    const slotCounts: Record<string, number> = {};
    queues.forEach((q) => {
      slotCounts[q.timeSlot] = (slotCounts[q.timeSlot] || 0) + 1;
    });

    const availableSlots = slots.map((slot) => {
      const booked = slotCounts[slot] || 0;
      return {
        time: slot,
        available: booked < setting.bedsCount,
        capacity: setting.bedsCount,
        booked,
      };
    });

    return NextResponse.json(availableSlots);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to get slots' }, { status: 500 });
  }
}
