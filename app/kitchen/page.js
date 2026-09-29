'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// กำหนดค่า Supabase Client
// แนะนำให้ใส่ NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_ANON_KEY ในไฟล์ .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function KitchenPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  // 1. ดึงข้อมูลออเดอร์เริ่มต้น (received และ cooking)
  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['received', 'cooking'])
        .order('created_at', { ascending: true }) // เก่าสุดไปใหม่สุด (ซ้ายไปขวา)

      if (error) throw error
      setOrders(data || [])
    } catch (err) {
      console.error('Error fetching orders:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()

    // 2. ตั้งค่า Supabase Realtime Subscribe
    const channel = supabase
      .channel('kitchen-orders-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new
          // เพิ่มออเดอร์ใหม่เข้า state หาก status เป็น received หรือ cooking
          if (['received', 'cooking'].includes(newOrder.status)) {
            setOrders((prev) => {
              // ตรวจสอบว่าไม่มี ID ซ้ำ
              if (prev.some((o) => o.id === newOrder.id)) return prev
              return [...prev, newOrder]
            })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const updatedOrder = payload.new
          setOrders((prev) => {
            // ถ้าออเดอร์ถูกเปลี่ยนเป็น 'served' หรือสถิตินอกเหนือจากที่แสดง ให้เอาออกจากจอ
            if (!['received', 'cooking'].includes(updatedOrder.status)) {
              return prev.filter((o) => o.id !== updatedOrder.id)
            }
            // อัปเดตข้อมูลการ์ดเดิม
            return prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
          })
        }
      )
      .subscribe()

    // คลีนอัป subscription เมื่อ component Unmount
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // 4. ฟังก์ชันเปลี่ยนสถานะออเดอร์
  const updateOrderStatus = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error
    } catch (err) {
      console.error(`Error updating status to ${newStatus}:`, err.message)
      alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ')
    }
  }

  // ฟังก์ชันแปลงเวลาให้อ่านง่าย
  const formatTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white text-3xl font-bold">
        กำลังโหลดข้อมูลห้องครัว...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white font-sans">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 pb-4 border-b border-slate-800">
        <h1 className="text-4xl font-extrabold tracking-wide text-emerald-400">
          จอสั่งการห้องครัว (Kitchen Display)
        </h1>
        <div className="text-2xl font-semibold bg-slate-800 px-6 py-2 rounded-xl">
          ออเดอร์ค้าง: <span className="text-amber-400 font-bold">{orders.length}</span> รายการ
        </div>
      </header>

      {/* Grid Display */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[70vh] text-slate-500">
          <p className="text-4xl font-medium">ไม่มีออเดอร์ค้างในขณะนี้ 🎉</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {orders.map((order) => {
            const isCooking = order.status === 'cooking'

            return (
              <div
                key={order.id}
                className={`flex flex-col justify-between rounded-2xl p-6 shadow-xl border-4 transition-all duration-300 ${
                  isCooking
                    ? 'bg-amber-950/40 border-amber-500 text-amber-50'
                    : 'bg-slate-900 border-slate-700 text-slate-100'
                }`}
              >
                {/* Header การ์ด: เลขโต๊ะ & เวลา */}
                <div>
                  <div className="flex justify-between items-start border-b border-slate-700/60 pb-4 mb-4">
                    <div>
                      <span className="text-sm uppercase tracking-wider text-slate-400 block">
                        โต๊ะ
                      </span>
                      <span className="text-5xl font-black tracking-tight">
                        {order.table_number || order.table_no || '-'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-bold mb-1 ${
                          isCooking
                            ? 'bg-amber-500 text-black'
                            : 'bg-slate-700 text-slate-200'
                        }`}
                      >
                        {isCooking ? 'กำลังทำ' : 'รับแล้ว'}
                      </span>
                      <p className="text-xl font-bold text-slate-300">
                        {formatTime(order.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* รายการอาหาร (จาก jsonb: order.items) */}
                  <div className="space-y-3 mb-6">
                    {Array.isArray(order.items) &&
                      order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center text-2xl font-bold border-b border-slate-800/40 pb-2"
                        >
                          <span className="truncate pr-2">{item.name}</span>
                          <span className="text-3xl font-extrabold text-emerald-400 bg-slate-800/80 px-3 py-1 rounded-lg min-w-[3rem] text-center">
                            x{item.quantity || item.qty || 1}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* ปุ่มควบคุม */}
                <div className="mt-4 pt-4 border-t border-slate-800">
                  {!isCooking ? (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'cooking')}
                      className="w-full py-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black text-2xl rounded-xl shadow-lg transition-transform active:scale-95"
                    >
                      🍳 เริ่มทำ
                    </button>
                  ) : (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'served')}
                      className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-2xl rounded-xl shadow-lg transition-transform active:scale-95"
                    >
                      ✅ จัดเสิร์ฟแล้ว
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
