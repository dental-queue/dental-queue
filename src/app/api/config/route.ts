import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const configs = await prisma.systemConfig.findMany();
    const configMap: Record<string, string> = {};
    configs.forEach(c => {
      configMap[c.key] = c.value;
    });

    // Provide defaults if missing
    return NextResponse.json({
      PROJECT_NAME: configMap['PROJECT_NAME'] || 'หน่วยทันตกรรมเคลื่อนที่',
      CREATOR_NAME: configMap['CREATOR_NAME'] || '',
      ADMIN_PASSWORD: configMap['ADMIN_PASSWORD'] || 'admin1234',
    });
  } catch (error) {
    console.error('Failed to fetch config', error);
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const updates = Object.keys(data).map(key => 
      prisma.systemConfig.upsert({
        where: { key },
        update: { value: data[key] },
        create: { key, value: data[key] },
      })
    );

    await prisma.$transaction(updates);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to update config', error);
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}
