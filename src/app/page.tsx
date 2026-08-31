'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type Slot = {
  time: string;
  available: boolean;
  capacity: number;
  booked: number;
};

type AvailableDate = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  slotDuration: number;
  bedsCount: number;
  station?: string;
};

export default function Home() {
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [myQueue, setMyQueue] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Search state
  const [searchEmpId, setSearchEmpId] = useState('');
  const [searchIdCard, setSearchIdCard] = useState('');

  // Form state
  const [employeeId, setEmployeeId] = useState('');
  const [idCardLast4, setIdCardLast4] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [station, setStation] = useState('HDQ-สำนักงานใหญ่');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [systemConfig, setSystemConfig] = useState({
    PROJECT_NAME: 'หน่วยทันตกรรมเคลื่อนที่',
    CREATOR_NAME: ''
  });

  const fetchData = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setAvailableDates(Array.isArray(data) ? data : []);

      const confRes = await fetch('/api/config');
      const confData = await confRes.json();
      setSystemConfig(confData);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchSlots = async (date: string, currentStation: string) => {
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot('');
    try {
      const res = await fetch(`/api/slots?date=${date}&station=${currentStation}`);
      const data = await res.json();
      setSlots(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateSelect = (dateStr: string, currentStation: string) => {
    setSelectedDate(dateStr);
    fetchSlots(dateStr, currentStation);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setSearchError('');
    try {
      const res = await fetch(`/api/queues?employeeId=${searchEmpId}&idCardLast4=${searchIdCard}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setMyQueue(data[0]);
      } else {
        setMyQueue(null);
        setSearchError('ไม่พบคิวของคุณ โปรดตรวจสอบข้อมูลอีกครั้ง');
      }
    } catch (error) {
      setSearchError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) {
      alert('กรุณาเลือกวันที่เข้ารับบริการ');
      return;
    }
    if (!selectedSlot) {
      alert('กรุณาเลือกรอบเวลา');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/queues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          idCardLast4,
          firstName,
          lastName,
          phone,
          station,
          timeSlot: selectedSlot,
          date: selectedDate,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMyQueue({ ...data, timeSlot: selectedSlot, date: selectedDate });
        setIsDialogOpen(false);
        fetchSlots(selectedDate, station);
        alert('จองคิวสำเร็จ!');
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการจองคิว');
      }
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'WAITING': return 'รอรับบริการ';
      case 'IN_PROGRESS': return 'กำลังเรียกตรวจ';
      case 'COMPLETED': return 'เสร็จสิ้น';
      case 'CANCELLED': return 'ยกเลิก';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WAITING': return 'bg-yellow-500';
      case 'IN_PROGRESS': return 'bg-blue-500';
      case 'COMPLETED': return 'bg-green-500';
      case 'CANCELLED': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const handleCancelQueue = async () => {
    if (!confirm('คุณต้องการยกเลิกคิวนี้ใช่หรือไม่?')) return;
    
    try {
      const res = await fetch(`/api/queues/${myQueue.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          employeeId: searchEmpId || employeeId, 
          idCardLast4: searchIdCard || idCardLast4 
        }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setMyQueue({ ...myQueue, status: 'CANCELLED' });
        if (selectedDate) fetchSlots(selectedDate, station);
        alert('ยกเลิกคิวสำเร็จ');
      } else {
        alert(data.error || 'ไม่สามารถยกเลิกคิวได้');
      }
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  };

  return (
    <main className="bg-slate-50 p-4 md:p-8">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2 flex flex-col items-center">
          <img src="/logo.png" alt="Company Logo" className="h-16 w-auto mb-2" />
          <h1 className="text-2xl font-bold text-slate-900">{systemConfig.PROJECT_NAME}</h1>
          <p className="text-slate-500">สำหรับพนักงานบริษัท</p>
          <p className="text-xs text-slate-400">ใช้สิทธิประกันสังคม 900 บ./ปี</p>
          {systemConfig.CREATOR_NAME && (
            <p className="text-xs text-slate-400 mt-1">{systemConfig.CREATOR_NAME}</p>
          )}
        </div>

        {/* My Queue Display */}
        {myQueue ? (
          <Card className="border-2 border-blue-500 bg-blue-50">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg text-blue-700">สถานะคิวของคุณ</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-3">
              <p className="text-slate-600 font-medium">{formatDate(myQueue.date)}</p>
              <div className="text-3xl font-bold text-slate-800">รอบ {myQueue.timeSlot}</div>
              <Badge className={getStatusColor(myQueue.status) + ' text-base px-4 py-1'}>
                {getStatusText(myQueue.status)}
              </Badge>

              {myQueue.status === 'WAITING' && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm mt-4 text-left space-y-1">
                  <p><strong>ข้อปฏิบัติ (สำคัญ):</strong></p>
                  <ul className="list-disc pl-5">
                    <li>กรุณานำ<strong>บัตรประชาชนตัวจริง</strong>มาด้วย</li>
                    <li>กรุณามา<strong>ก่อนเวลา 15 นาที</strong></li>
                    <li>กรณียกเลิกคิว ให้ยกเลิก<strong>ก่อนกำหนด 3 วัน</strong></li>
                  </ul>
                </div>
              )}
              
              <div className="pt-4 space-y-2">
                {myQueue.status === 'WAITING' && (
                  <Button variant="destructive" onClick={handleCancelQueue} className="w-full">
                    ยกเลิกคิวนี้
                  </Button>
                )}
                <Button variant="outline" onClick={() => setMyQueue(null)} className="w-full">
                  ออก (ปิดคิวส่วนตัว)
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Check Queue */}
            <Card>
              <CardHeader>
                <CardTitle>ตรวจสอบคิวของคุณ</CardTitle>
                <CardDescription>กรอกข้อมูลเพื่อดูสถานะคิวส่วนตัว</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="space-y-2">
                    <Label>รหัสพนักงาน (ตัวเลขเท่านั้น) <span className="text-red-500">*</span></Label>
                    <Input
                      type="text" inputMode="numeric"
                      value={searchEmpId}
                      onChange={e => setSearchEmpId(e.target.value.replace(/\D/g, ''))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>เลขบัตร ปชช. 4 ตัวท้าย <span className="text-red-500">*</span></Label>
                    <Input
                      type="text" inputMode="numeric" maxLength={4}
                      value={searchIdCard}
                      onChange={e => setSearchIdCard(e.target.value.replace(/\D/g, ''))}
                      required
                    />
                  </div>
                  {searchError && <p className="text-red-500 text-sm">{searchError}</p>}
                  <Button type="submit" className="w-full" disabled={isSearching}>
                    {isSearching ? 'กำลังค้นหา...' : 'ตรวจสอบคิว'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Book queue */}
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) { setSelectedDate(''); setSlots([]); setSelectedSlot(''); }
            }}>
              <DialogTrigger className="w-full h-12 text-lg bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors font-medium">
                ลงทะเบียนจองคิวใหม่
              </DialogTrigger>
              <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>ลงทะเบียนจองคิวรับบริการ</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                  {/* Personal Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>รหัสพนักงาน <span className="text-red-500">*</span></Label>
                      <Input
                        type="text" inputMode="numeric"
                        value={employeeId}
                        onChange={e => setEmployeeId(e.target.value.replace(/\D/g, ''))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>บัตร ปชช. 4 ตัวท้าย <span className="text-red-500">*</span></Label>
                      <Input
                        type="text" inputMode="numeric" maxLength={4}
                        value={idCardLast4}
                        onChange={e => setIdCardLast4(e.target.value.replace(/\D/g, ''))}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>ชื่อ <span className="text-red-500">*</span></Label>
                      <Input value={firstName} onChange={e => setFirstName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>นามสกุล <span className="text-red-500">*</span></Label>
                      <Input value={lastName} onChange={e => setLastName(e.target.value)} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>เบอร์โทรศัพท์ (10 หลัก) <span className="text-red-500">*</span></Label>
                    <Input
                      type="tel" inputMode="numeric" maxLength={10}
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                      required pattern="\d{10}"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>สถานี (Station) <span className="text-red-500">*</span></Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={station}
                      onChange={e => {
                        setStation(e.target.value);
                        setSelectedDate('');
                        setSlots([]);
                        setSelectedSlot('');
                      }}
                      required
                    >
                      <option value="HDQ-สำนักงานใหญ่">HDQ-สำนักงานใหญ่</option>
                      <option value="BKK-สุวรรณภูมิ">BKK-สุวรรณภูมิ</option>
                    </select>
                  </div>

                  {/* Date selection */}
                  <div className="space-y-2 pt-2 border-t">
                    <Label>เลือกวันที่เข้ารับบริการ <span className="text-red-500">*</span></Label>
                    {availableDates.filter(d => (d.station || 'HDQ-สำนักงานใหญ่') === station).length === 0 ? (
                      <p className="text-sm text-red-500">ยังไม่มีวันที่เปิดให้บริการสำหรับสถานีนี้</p>
                    ) : (
                      <div className="space-y-2">
                        {availableDates.filter(d => (d.station || 'HDQ-สำนักงานใหญ่') === station).map(d => {
                          const dateObj = new Date(d.date);
                          const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
                          
                          return (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => handleDateSelect(dateStr, station)}
                              className={`w-full p-3 text-left text-sm border rounded-md transition-colors ${
                                selectedDate === dateStr
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white hover:bg-slate-50'
                              }`}
                            >
                              {formatDate(d.date)}
                              <span className={`block text-xs mt-0.5 ${selectedDate === dateStr ? 'text-blue-100' : 'text-slate-400'}`}>
                                {d.startTime} - {d.endTime} | ทุก {d.slotDuration} นาที
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Time slot selection */}
                  {selectedDate && (
                    <div className="space-y-2 pt-2 border-t">
                      <Label className="mt-4 block">เลือกรอบเวลา <span className="text-red-500">*</span></Label>
                      {loadingSlots ? (
                        <p className="text-sm text-slate-500">กำลังโหลดรอบเวลา...</p>
                      ) : slots.length === 0 ? (
                        <p className="text-sm text-red-500">ไม่พบรอบเวลาสำหรับวันนี้</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {slots.map(slot => (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={!slot.available}
                              onClick={() => setSelectedSlot(slot.time)}
                              className={`p-2 text-sm border rounded-md transition-colors ${
                                selectedSlot === slot.time
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : !slot.available
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                                    : 'bg-white hover:bg-slate-50'
                              }`}
                            >
                              {slot.time}
                              <br />
                              <span className="text-xs opacity-80">
                                {slot.available ? `ว่าง ${slot.capacity - slot.booked} ที่` : 'เต็มแล้ว'}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={isSubmitting || !selectedDate || !selectedSlot}>
                    {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันการจองคิว'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </main>
  );
}
