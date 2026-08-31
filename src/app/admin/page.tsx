'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Queue = {
  id: string;
  timeSlot: string;
  status: string;
  date: string;
  patient: {
    firstName: string;
    lastName: string;
    phone: string;
    employeeId: string;
    station: string;
  };
};

export default function AdminDashboard() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const fetchQueues = async (date: string) => {
    try {
      const res = await fetch(`/api/queues?date=${date}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setQueues(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueues(selectedDate);
    const interval = setInterval(() => fetchQueues(selectedDate), 5000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await fetch(`/api/queues/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchQueues(selectedDate);
    } catch (error) {
      console.error(error);
      alert('Failed to update status');
    }
  };

  const hardDeleteQueue = async (id: string) => {
    if (!confirm('คุณต้องการลบข้อมูลการจองนี้ออกจากระบบอย่างถาวรใช่หรือไม่? (ลบเทส)')) return;
    
    // In a real app we'd fetch the password securely or use a token,
    // here we just prompt or use the one stored in sessionStorage (if any), 
    // or we can prompt the admin to enter it.
    const password = prompt('กรุณาป้อนรหัสผ่าน Admin เพื่อยืนยันการลบถาวร:');
    if (!password) return;

    try {
      const res = await fetch(`/api/queues/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword: password, hardDelete: true }),
      });
      
      const data = await res.json();
      if (res.ok) {
        alert('ลบข้อมูลสำเร็จ');
        fetchQueues(selectedDate);
      } else {
        alert(data.error || 'รหัสผ่านไม่ถูกต้อง หรือไม่สามารถลบได้');
      }
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'WAITING': return <Badge className="bg-yellow-500">รอรับบริการ</Badge>;
      case 'IN_PROGRESS': return <Badge className="bg-blue-500">กำลังตรวจ</Badge>;
      case 'COMPLETED': return <Badge className="bg-green-500">เสร็จสิ้น</Badge>;
      case 'CANCELLED': return <Badge className="bg-red-500">ยกเลิก</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const exportToCSV = () => {
    // Add BOM for Thai language support in Excel
    const BOM = '\uFEFF';
    
    // Headers
    const headers = ['รอบเวลา', 'รหัสพนักงาน', 'ชื่อ', 'นามสกุล', 'เบอร์โทร', 'สถานี', 'สถานะ'];
    
    // Rows
    const rows = queues.map(q => [
      q.timeSlot,
      q.patient.employeeId,
      q.patient.firstName,
      q.patient.lastName,
      q.patient.phone,
      q.patient.station,
      q.status === 'WAITING' ? 'รอรับบริการ' : 
      q.status === 'IN_PROGRESS' ? 'กำลังตรวจ' : 
      q.status === 'COMPLETED' ? 'เสร็จสิ้น' : 'ยกเลิก'
    ]);
    
    // Combine to CSV string
    const csvContent = BOM + [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `dental_queues_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">จัดการคิวทันตกรรม</h1>
            <p className="text-slate-500">สำหรับเจ้าหน้าที่</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => window.location.href = '/admin/settings'}>
              ตั้งค่าคลินิก
            </Button>
            <Button variant="outline" onClick={() => window.open('/', '_blank')}>
              ดูหน้าผู้ป่วย
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle>รายการคิว</CardTitle>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="adminDate" className="whitespace-nowrap text-sm">เลือกวันที่:</Label>
                  <Input
                    id="adminDate"
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="w-auto"
                  />
                </div>
                <Button onClick={exportToCSV} variant="default" className="bg-green-600 hover:bg-green-700 text-white" disabled={queues.length === 0}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>กำลังโหลดข้อมูล...</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">รอบเวลา</TableHead>
                      <TableHead>รหัสพนักงาน</TableHead>
                      <TableHead>ชื่อ - นามสกุล</TableHead>
                      <TableHead>เบอร์โทร</TableHead>
                      <TableHead>สถานี</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead className="text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queues.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                          ยังไม่มีคิวในระบบ
                        </TableCell>
                      </TableRow>
                    )}
                    {queues.map((queue) => (
                      <TableRow key={queue.id}>
                        <TableCell className="font-medium text-lg">
                          {queue.timeSlot}
                        </TableCell>
                        <TableCell>{queue.patient.employeeId}</TableCell>
                        <TableCell>
                          {queue.patient.firstName} {queue.patient.lastName}
                        </TableCell>
                        <TableCell>{queue.patient.phone}</TableCell>
                        <TableCell>{queue.patient.station}</TableCell>
                        <TableCell>{getStatusBadge(queue.status)}</TableCell>
                        <TableCell className="text-right space-x-2 whitespace-nowrap">
                          {queue.status === 'WAITING' && (
                            <>
                              <Button size="sm" onClick={() => updateStatus(queue.id, 'IN_PROGRESS')}>
                                เรียกคิว
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => updateStatus(queue.id, 'CANCELLED')}>
                                ยกเลิก
                              </Button>
                            </>
                          )}
                          {queue.status === 'IN_PROGRESS' && (
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateStatus(queue.id, 'COMPLETED')}>
                              ตรวจเสร็จสิ้น
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={() => hardDeleteQueue(queue.id)} title="ลบข้อมูลถาวร (ลบเทส)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
