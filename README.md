# บิงซูภูเขาฟูจิ — ระบบสั่งบิงซู

Next.js (App Router, JavaScript) + Supabase, deploy บน Vercel

## เริ่มใช้งาน

```bash
npm install
cp .env.example .env.local   # แล้วใส่ค่า Supabase จริง
npm run dev
```

เปิด http://localhost:3000

## Deploy บน Vercel

1. push โค้ดขึ้น GitHub แล้ว import โปรเจกต์ใน Vercel
2. ตั้ง Environment Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy

> สำหรับกฎการใช้ `use(params)` กับ Dynamic Route และโครงสร้างตาราง ดูที่ `CLAUDE.md`
