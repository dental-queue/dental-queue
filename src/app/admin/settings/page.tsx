'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ClinicSetting = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  breakStartTime?: string;
  breakEndTime?: string;
  slotDuration: number;
  bedsCount: number;
  station: string;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<ClinicSetting[]>([]);
  const [date, setDate] = useState('');
  const [station, setStation] = useState('HDQ-สำนักงานใหญ่');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:00');
  const [breakStartTime, setBreakStartTime] = useState('12:00');
  const [breakEndTime, setBreakEndTime] = useState('13:00');
  const [slotDuration, setSlotDuration] = useState('30');
  const [bedsCount, setBedsCount] = useState('3');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // General Settings State
  const [projectName, setProjectName] = useState('หน่วยทันตกรรมเคลื่อนที่');
  const [creatorName, setCreatorName] = useState('');
  const [adminPassword, setAdminPassword] = useState('admin1234');
  const [savingConfig, setSavingConfig] = useState(false);

  const fetchData = async () => {
    try {
      // Fetch clinic schedules
      const res = await fetch('/api/settings');
      const data = await res.json();
      setSettings(Array.isArray(data) ? data : []);

      // Fetch general config
      const confRes = await fetch('/api/config');
      const confData = await confRes.json();
      if (confData.PROJECT_NAME) setProjectName(confData.PROJECT_NAME);
      if (confData.CREATOR_NAME) setCreatorName(confData.CREATOR_NAME);
      if (confData.ADMIN_PASSWORD) setAdminPassword(confData.ADMIN_PASSWORD);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          PROJECT_NAME: projectName,
          CREATOR_NAME: creatorName,
          ADMIN_PASSWORD: adminPassword
        }),
      });
      if (res.ok) alert('บันทึกการตั้งค่าทั่วไปสำเร็จ');
      else alert('เกิดข้อผิดพลาดในการบันทึก');
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, station, startTime, endTime, breakStartTime, breakEndTime, slotDuration, bedsCount }),
      });
      if (res.ok) {
        setDate('');
        fetchData();
        alert('เพิ่มวันให้บริการสำเร็จ');
      } else {
        alert('เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ต้องการลบวันให้บริการนี้ใช่ไหม?')) return;
    try {
      await fetch('/api/settings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      fetchData();
    } catch {
      alert('เกิดข้อผิดพลาด');
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  };

  if (loading) return <div className="p-8">กำลังโหลด...</div>;

  return (
    <main className="bg-slate-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">ตั้งค่าคลินิก</h1>
            <p className="text-slate-500">กำหนดวันที่และเวลาให้บริการ</p>
          </div>
          <Button variant="outline" onClick={() => window.location.href = '/admin'}>
            กลับ Dashboard
          </Button>
        </div>

        {/* Form: General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>ตั้งค่าระบบทั่วไป</CardTitle>
            <CardDescription>ปรับแต่งชื่อโครงการและชื่อผู้จัดทำ</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleConfigSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ชื่อโครงการ (Project Name)</Label>
                  <Input value={projectName} onChange={e => setProjectName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>ชื่อผู้จัดทำ / หมายเหตุ (Creator Name)</Label>
                  <Input value={creatorName} onChange={e => setCreatorName(e.target.value)} placeholder="เช่น แผนกสวัสดิการ..." />
                </div>
                <div className="space-y-2">
                  <Label>รหัสผ่านเข้าหน้า Admin (Admin Password)</Label>
                  <Input value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="รหัสผ่านเริ่มต้น: admin1234" />
                </div>
              </div>
              <Button type="submit" disabled={savingConfig}>
                {savingConfig ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าทั่วไป'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Form: add new date */}
        <Card>
          <CardHeader>
            <CardTitle>เพิ่มวันให้บริการ</CardTitle>
            <CardDescription>กำหนดข้อมูลแล้วกดเพิ่ม สามารถเพิ่มได้หลายวัน</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">วันที่ให้บริการ</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>สำหรับสถานี</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={station}
                    onChange={e => setStation(e.target.value)}
                    required
                  >
                    <option value="HDQ-สำนักงานใหญ่">HDQ-สำนักงานใหญ่</option>
                    <option value="BKK-สุวรรณภูมิ">BKK-สุวรรณภูมิ</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">เวลาเริ่ม</Label>
                  <Input id="startTime" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">เวลาสิ้นสุด</Label>
                  <Input id="endTime" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="breakStartTime">เวลาเริ่มพักเที่ยง</Label>
                  <Input id="breakStartTime" type="time" value={breakStartTime} onChange={e => setBreakStartTime(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="breakEndTime">เวลาสิ้นสุดพักเที่ยง</Label>
                  <Input id="breakEndTime" type="time" value={breakEndTime} onChange={e => setBreakEndTime(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="slotDuration">ระยะเวลาต่อเคส (นาที)</Label>
                  <Input id="slotDuration" type="number" min="1" value={slotDuration} onChange={e => setSlotDuration(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bedsCount">จำนวนเตียง</Label>
                  <Input id="bedsCount" type="number" min="1" value={bedsCount} onChange={e => setBedsCount(e.target.value)} required />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? 'กำลังบันทึก...' : 'เพิ่มวันให้บริการ'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* List of configured dates */}
        <Card>
          <CardHeader>
            <CardTitle>วันที่เปิดให้บริการ</CardTitle>
          </CardHeader>
          <CardContent>
            {settings.length === 0 ? (
              <p className="text-slate-500 text-center py-4">ยังไม่มีวันที่เปิดให้บริการ</p>
            ) : (
              <div className="space-y-3">
                {settings.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                    <div>
                      <p className="font-medium">{formatDate(s.date)}</p>
                      <p className="text-sm font-semibold text-blue-600 mb-1">{s.station || 'HDQ-สำนักงานใหญ่'}</p>
                      <p className="text-sm text-slate-500">
                        เวลาทำการ: {s.startTime} - {s.endTime} | พัก: {s.breakStartTime || '-'} - {s.breakEndTime || '-'} | ทุก {s.slotDuration} นาที | {s.bedsCount} เตียง
                      </p>
                    </div>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(s.id)}>
                      ลบ
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
