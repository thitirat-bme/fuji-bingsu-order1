# บิงซูภูเขาฟูจิ — ระบบสั่งบิงซู

Next.js (App Router, **JavaScript ไม่ใช่ TypeScript**) deploy บน Vercel และใช้ Supabase เป็น backend

## กฎสำคัญของโปรเจกต์นี้

โปรเจกต์นี้ใช้ Next.js เวอร์ชันล่าสุด ซึ่ง `params` ของ Dynamic Route เป็น **Promise**
ต้อง unwrap ด้วย `use()` จาก React เสมอ เช่น

```js
"use client";
import { use } from "react";

export default function OrderPage({ params }) {
  const { table } = use(params); // ห้ามอ่าน params.table ตรงๆ
  // ...
}
```

หมายเหตุ: `use()` ใช้ใน Client Component (`"use client"`) ถ้าเป็น Server Component ให้ทำเป็น `async` แล้ว `await params` แทน

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

ตั้งใน `.env.local` (ห้าม commit) และใน Vercel → Project Settings → Environment Variables
Supabase client อยู่ที่ `lib/supabaseClient.js` (`import { supabase } from "@/lib/supabaseClient"` หรือใช้ relative path)

## โครงสร้างตารางฐานข้อมูล (มีอยู่แล้วใน Supabase — ไม่ต้องสร้างใหม่)

| ตาราง | คอลัมน์ |
|---|---|
| `sessions` | id, table_number, adult_count, child_count, status, created_at |
| `menu_categories` | id, name, sort_order |
| `menu_items` | id, category_id, name |
| `orders` | id, session_id, table_number, items (jsonb), status, created_at |

## หน้าที่วางแผนไว้

- `/` — หน้าแรก (ทดสอบ deploy) มีลิงก์ไป `/generate-qr` และ `/kitchen`
- `/generate-qr` — พนักงานเปิดโต๊ะ / สร้าง QR
- `/kitchen` — หน้าครัวดูออเดอร์
- `/order/[table]` — หน้าลูกค้าสั่งอาหาร (Dynamic Route → ต้องใช้ `use(params)`)
