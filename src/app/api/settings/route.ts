import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET: return all upcoming clinic settings (available service dates)
export async function GET() {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const settings = await prisma.clinicSetting.findMany({
      where: {
        date: {
          gte: startOfDay,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to fetch settings', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const dateStr = data.date;

    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);

    const station = data.station || 'HDQ-สำนักงานใหญ่';

    // Since we changed schema to @@unique([date, station]), we need to find by compound unique
    const setting = await prisma.clinicSetting.findUnique({
      where: {
        date_station: {
          date: date,
          station: station
        }
      }
    });

    let bookingStartDate = null;
    let bookingEndDate = null;
    if (data.bookingStartDate) {
      bookingStartDate = new Date(data.bookingStartDate);
      bookingStartDate.setHours(0, 0, 0, 0);
    }
    if (data.bookingEndDate) {
      bookingEndDate = new Date(data.bookingEndDate);
      bookingEndDate.setHours(23, 59, 59, 999);
    }

    if (setting) {
      await prisma.clinicSetting.update({
        where: { id: setting.id },
        data: {
          startTime: data.startTime,
          endTime: data.endTime,
          breakStartTime: data.breakStartTime || "12:00",
          breakEndTime: data.breakEndTime || "13:00",
          slotDuration: parseInt(data.slotDuration),
          bedsCount: parseInt(data.bedsCount),
          bookingStartDate,
          bookingEndDate
        }
      });
    } else {
      await prisma.clinicSetting.create({
        data: {
          date: date,
          station: station,
          startTime: data.startTime,
          endTime: data.endTime,
          breakStartTime: data.breakStartTime || "12:00",
          breakEndTime: data.breakEndTime || "13:00",
          slotDuration: parseInt(data.slotDuration),
          bedsCount: parseInt(data.bedsCount),
          bookingStartDate,
          bookingEndDate
        }
      });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Failed to update settings', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    await prisma.clinicSetting.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to delete setting', error);
    return NextResponse.json({ error: 'Failed to delete setting' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, isOpen } = await request.json();
    await prisma.clinicSetting.update({
      where: { id },
      data: { isOpen }
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to update setting', error);
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 });
  }
}
