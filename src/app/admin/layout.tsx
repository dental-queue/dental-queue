'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if already authenticated via sessionStorage
    const authStatus = sessionStorage.getItem('adminAuth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
    setIsChecking(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      
      if (res.ok) {
        sessionStorage.setItem('adminAuth', 'true');
        setIsAuthenticated(true);
      } else {
        setError('รหัสผ่านไม่ถูกต้อง');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการตรวจสอบ');
    }
  };

  if (isChecking) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">กำลังตรวจสอบสิทธิ...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>เข้าสู่ระบบจัดการคิว</CardTitle>
            <CardDescription>สำหรับเจ้าหน้าที่คลินิกเท่านั้น</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label>รหัสผ่าน</Label>
                <Input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full">เข้าสู่ระบบ</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <img src="/logo.png" alt="Company Logo" className="h-10 w-auto" />
        <h1 className="text-xl font-bold text-slate-900">ระบบจัดการคิว (Admin)</h1>
      </header>
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
