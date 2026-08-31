import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { employeeId, idCardLast4, firstName, lastName, phone, station, timeSlot, date: dateParam } = await request.json();

    if (!employeeId || !idCardLast4 || !firstName || !lastName || !phone || !station || !timeSlot || !dateParam) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const date = new Date(dateParam);
    date.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateParam);
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Verify clinic is open on that date (outside transaction — read-only, low contention)
    const setting = await prisma.clinicSetting.findFirst({
      where: { date: { gte: date, lte: endOfDay } },
    });

    if (!setting) {
      return NextResponse.json({ error: 'Clinic is not open on that date' }, { status: 400 });
    }

    // 2. Verify patient identity (outside transaction — read-only)
    let existingPatient = await prisma.patient.findUnique({ where: { employeeId } });
    if (existingPatient && existingPatient.idCardLast4 !== idCardLast4) {
      return NextResponse.json({ error: 'Invalid ID Card digits for this Employee ID' }, { status: 400 });
    }

    // 3. Use an interactive transaction to atomically:
    //    a) Re-check slot capacity
    //    b) Find/create patient
    //    c) Create queue entry
    //    SQLite serialises writes so concurrent bookings wait in line and each
    //    sees the true count before inserting — preventing overbooking.
    try {
      const queue = await prisma.$transaction(async (tx) => {
        // Re-check capacity inside the transaction (authoritative check)
        const queuesInSlot = await tx.queue.count({
          where: {
            date: { gte: date, lte: endOfDay },
            timeSlot,
            status: { not: 'CANCELLED' },
          },
        });

        if (queuesInSlot >= setting.bedsCount) {
          throw new Error('SLOT_FULL');
        }

        // Find or create patient inside transaction
        let patient = await tx.patient.findUnique({ where: { employeeId } });
        if (!patient) {
          patient = await tx.patient.create({
            data: { employeeId, idCardLast4, firstName, lastName, phone, station },
          });
        } else {
          // Check if patient already has an active queue across ANY date
          const activeQueue = await tx.queue.findFirst({
            where: { 
              patientId: patient.id,
              status: { not: 'CANCELLED' }
            }
          });

          if (activeQueue) {
            throw new Error('ALREADY_BOOKED_ANY_DATE');
          }

          // Update patient info if it changed
          patient = await tx.patient.update({
            where: { id: patient.id },
            data: { firstName, lastName, phone, station },
          });
        }

        // Create queue entry — @@unique([date, patientId]) prevents duplicate booking
        const newQueue = await tx.queue.create({
          data: { timeSlot, date, patientId: patient.id },
        });

        return newQueue;
      });

      return NextResponse.json(queue, { status: 201 });
    } catch (e: any) {
      if (e.message === 'SLOT_FULL') {
        return NextResponse.json({ error: 'รอบเวลานี้เต็มแล้ว กรุณาเลือกรอบอื่น' }, { status: 400 });
      }
      if (e.message === 'ALREADY_BOOKED_ANY_DATE') {
        return NextResponse.json({ error: 'คุณมีคิวที่จองไว้แล้ว (1 สิทธิ/คน) หากต้องการจองใหม่ กรุณายกเลิกคิวเดิมก่อน' }, { status: 400 });
      }
      if (e.code === 'P2002') {
        return NextResponse.json({ error: 'คุณมีคิวที่จองไว้แล้ว (1 สิทธิ/คน)' }, { status: 400 });
      }
      throw e;
    }
  } catch (error) {
    console.error('Failed to create queue', error);
    return NextResponse.json({ error: 'Failed to create queue' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const idCardLast4 = searchParams.get('idCardLast4');
    const dateParam = searchParams.get('date');

    // For admin: return all queues for a given date (or today if no date given)
    // For patient: return their own queues filtered by date
    const whereClause: any = {};

    if (dateParam) {
      const targetDate = new Date(dateParam);
      targetDate.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      whereClause.date = { gte: targetDate, lte: endOfDay };
    }

    if (employeeId && idCardLast4) {
      whereClause.patient = { employeeId, idCardLast4 };
      // For patient check, if no specific date is given, only show today and future queues
      if (!dateParam) {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        whereClause.date = { gte: startOfToday };
      }
    } else if (!dateParam) {
      // For admin default view, show today's queues
      const targetDate = new Date();
      targetDate.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      whereClause.date = { gte: targetDate, lte: endOfDay };
    }

    const queues = await prisma.queue.findMany({
      where: whereClause,
      include: { patient: true },
      orderBy: { timeSlot: 'asc' },
    });

    return NextResponse.json(queues);
  } catch (error) {
    console.error('Failed to fetch queues', error);
    return NextResponse.json({ error: 'Failed to fetch queues' }, { status: 500 });
  }
}
