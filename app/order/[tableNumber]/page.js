'use client';

import { use, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

// ราคาบุฟเฟต์ต่อหัว (บาท)
const PRICE_ADULT = 289;
const PRICE_CHILD = 145;

export default function OrderPage({ params }) {
  // Unwrap params ตามข้อกำหนด Next.js App Router เวอร์ชันล่าสุด
  const resolvedParams = use(params);
  const tableNumber = resolvedParams.tableNumber;

  // Session & UI Loading State
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionClosed, setSessionClosed] = useState(false);

  // Menu State
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Cart & Order State
  const [cart, setCart] = useState({}); // { itemId: { id, name, quantity } }
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Checkout Modal State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [closingSession, setClosingSession] = useState(false);

  // 1. ดึงข้อมูล Session และรายการ เมนู เมื่อโหลดหน้า
  useEffect(() => {
    if (!tableNumber) return;

    async function initData() {
      setCheckingSession(true);
      try {
        // เช็ค session ที่เปิดอยู่
        const { data: sessionData, error: sessionErr } = await supabase
          .from('sessions')
          .select('*')
          .eq('table_number', tableNumber)
          .eq('status', 'open')
          .single();

        if (sessionErr || !sessionData) {
          setSession(null);
          setCheckingSession(false);
          return;
        }

        setSession(sessionData);

        // ดึง หมวดหมู่เมนู
        const { data: catData } = await supabase
          .from('menu_categories')
          .select('*')
          .order('sort_order', { ascending: true });

        // ดึง รายการเมนู
        const { data: itemData } = await supabase.from('menu_items').select('*');

        if (catData && catData.length > 0) {
          setCategories(catData);
          setSelectedCategory(catData[0].id);
        }
        if (itemData) {
          setMenuItems(itemData);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setCheckingSession(false);
      }
    }

    initData();
  }, [tableNumber]);

  // จัดการเพิ่ม/ลด สินค้าในตะกร้า (จำกัดไม่เกิน 5 ชิ้น/เมนู)
  const handleQuantityChange = (item, delta) => {
    setCart((prevCart) => {
      const currentQty = prevCart[item.id]?.quantity || 0;
      const newQty = currentQty + delta;

      if (newQty <= 0) {
        const newCart = { ...prevCart };
        delete newCart[item.id];
        return newCart;
      }

      if (newQty > 5) {
        alert('สั่งรายการนี้ได้สูงสุด 5 จานต่อครั้ง');
        return prevCart;
      }

      return {
        ...prevCart,
        [item.id]: {
          id: item.id,
          name: item.name,
          quantity: newQty,
        },
      };
    });
  };

  // รวมจำนวนชิ้นทั้งหมดในตะกร้า
  const totalCartCount = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);

  // 2. กดส่งออเดอร์
  const handleSubmitOrder = async () => {
    if (totalCartCount === 0) return;

    if (totalCartCount > 10) {
      alert('สั่งอาหารได้สูงสุด 10 รายการต่อการส่ง 1 ครั้ง');
      return;
    }

    setSubmittingOrder(true);
    try {
      const orderItems = Object.values(cart).map((item) => ({
        name: item.name,
        quantity: item.quantity,
      }));

      const { error } = await supabase.from('orders').insert([
        {
          session_id: session.id,
          table_number: tableNumber,
          items: orderItems,
          status: 'received',
        },
      ]);

      if (error) throw error;

      // ส่งสำเร็จ -> เคลียร์ตะกร้าและโชว์แจ้งเตือน
      setCart({});
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert(`เกิดข้อผิดพลาดในการส่งออเดอร์: ${err.message}`);
    } finally {
      setSubmittingOrder(false);
    }
  };

  // 3. กดยืนยันปิดโต๊ะ / เรียกเก็บเงิน
  const handleConfirmCheckout = async () => {
    setClosingSession(true);
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'closed' })
        .eq('id', session.id);

      if (error) throw error;

      setShowCheckoutModal(false);
      setSessionClosed(true);
    } catch (err) {
      console.error(err);
      alert(`เกิดข้อผิดพลาดในการเช็คบิล: ${err.message}`);
    } finally {
      setClosingSession(false);
    }
  };

  // ================= STATE 1: กำลังโหลด =================
  if (checkingSession) {
    return (
      <div style={styles.centerBox}>
        <p style={{ fontSize: '1.2rem', color: '#6b7280' }}>⏳ กำลังโหลดข้อมูลโต๊ะ...</p>
      </div>
    );
  }

  // ================= STATE 2: ปิด Session / เช็คบิลสำเร็จแล้ว =================
  if (sessionClosed) {
    return (
      <div style={styles.centerBox}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h1 style={{ fontSize: '3rem', margin: '0 0 1rem 0' }}>🍨</h1>
          <h2 style={{ fontSize: '1.8rem', color: '#059669', marginBottom: '0.5rem' }}>
            ขอบคุณที่ใช้บริการ
          </h2>
          <p style={{ fontSize: '1.1rem', color: '#4b5563' }}>
            ร้านบิงซูภูเขาฟูจิ ยินดีให้บริการครับ ❤️
          </p>
        </div>
      </div>
    );
  }

  // ================= STATE 3: ไม่เจอ Session เปิดค้างอยู่ =================
  if (!session) {
    return (
      <div style={styles.centerBox}>
        <div style={styles.errorCard}>
          <h1 style={{ fontSize: '2.5rem', margin: '0 0 0.5rem 0' }}>⚠️</h1>
          <h2 style={{ color: '#dc2626', fontSize: '1.4rem', margin: '0 0 0.5rem 0' }}>
            โต๊ะนี้ยังไม่เปิดใช้งาน
          </h2>
          <p style={{ color: '#4b5563', fontSize: '1.1rem', margin: 0 }}>
            กรุณาแจ้งพนักงานเพื่อเปิดโต๊ะก่อนสั่งอาหาร
          </p>
        </div>
      </div>
    );
  }

  // คำนวณยอดเงินรวม
  const adultTotal = (session.adult_count || 0) * PRICE_ADULT;
  const childTotal = (session.child_count || 0) * PRICE_CHILD;
  const grandTotal = adultTotal + childTotal;

  // กรองเมนูตามหมวดหมู่ที่เลือก
  const filteredMenuItems = menuItems.filter((item) => item.category_id === selectedCategory);

  return (
    <div style={styles.container}>
      {/* HEADER BAR */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.headerTitle}>บิงซูภูเขาฟูจิ 🍨</h1>
          <span style={styles.tableBadge}>โต๊ะ {tableNumber}</span>
        </div>
        <button onClick={() => setShowCheckoutModal(true)} style={styles.checkoutBtn}>
          💳 เรียกเก็บเงิน
        </button>
      </header>

      {/* SUCCESS BANNER (ส่งออเดอร์แล้ว) */}
      {orderSuccess && (
        <div style={styles.successBanner}>
          ✓ ส่งออเดอร์เรียบร้อยแล้ว! พนักงานกำลังเตรียมอาหารให้ครับ
        </div>
      )}

      {/* CATEGORY TABS */}
      <nav style={styles.tabsContainer}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            style={{
              ...styles.tabBtn,
              ...(selectedCategory === cat.id ? styles.tabBtnActive : {}),
            }}
          >
            {cat.name}
          </button>
        ))}
      </nav>

      {/* MENU ITEMS LIST */}
      <main style={styles.menuList}>
        {filteredMenuItems.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem 0' }}>
            ไม่มีรายการเมนูในหมวดนี้
          </p>
        ) : (
          filteredMenuItems.map((item) => {
            const qty = cart[item.id]?.quantity || 0;
            return (
              <div key={item.id} style={styles.menuCard}>
                <span style={styles.menuName}>{item.name}</span>
                <div style={styles.qtyControl}>
                  {qty > 0 && (
                    <>
                      <button onClick={() => handleQuantityChange(item, -1)} style={styles.minusBtn}>
                        -
                      </button>
                      <span style={styles.qtyText}>{qty}</span>
                    </>
                  )}
                  <button onClick={() => handleQuantityChange(item, 1)} style={styles.plusBtn}>
                    +
                  </button>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* FLOATING CART BAR (ตะกร้าลอย) */}
      {totalCartCount > 0 && (
        <div style={styles.floatingCart}>
          <div style={styles.cartInfo}>
            <span style={styles.cartBadge}>{totalCartCount}</span>
            <span style={styles.cartLabel}>รายการที่เลือกไว้ (สูงสุด 10)</span>
          </div>
          <button
            onClick={handleSubmitOrder}
            disabled={submittingOrder}
            style={styles.submitOrderBtn}
          >
            {submittingOrder ? 'กำลังส่ง...' : 'ส่งออเดอร์ 🚀'}
          </button>
        </div>
      )}

      {/* CHECKOUT MODAL (หน้าต่างเรียกเก็บเงิน) */}
      {showCheckoutModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>🧾 สรุปรายการเรียกเก็บเงิน</h2>
            <p style={{ textAlign: 'center', color: '#4b5563', margin: '0 0 1rem 0' }}>
              โต๊ะหมายเลข <strong>{tableNumber}</strong>
            </p>

            <div style={styles.receiptBox}>
              <div style={styles.receiptRow}>
                <span>ผู้ใหญ่ ({session.adult_count || 0} คน × ฿{PRICE_ADULT})</span>
                <span>฿{adultTotal}</span>
              </div>
              {session.child_count > 0 && (
                <div style={styles.receiptRow}>
                  <span>เด็ก ({session.child_count} คน × ฿{PRICE_CHILD})</span>
                  <span>฿{childTotal}</span>
                </div>
              )}
              <hr style={{ border: 'none', borderTop: '1px dashed #d1d5db', margin: '0.75rem 0' }} />
              <div style={{ ...styles.receiptRow, fontWeight: '800', fontSize: '1.25rem', color: '#1e3a8a' }}>
                <span>ราคารวมทั้งสิ้น</span>
                <span>฿{grandTotal}</span>
              </div>
            </div>

            <div style={styles.modalActions}>
              <button
                onClick={() => setShowCheckoutModal(false)}
                style={styles.cancelModalBtn}
                disabled={closingSession}
              >
                ย้อนกลับ
              </button>
              <button
                onClick={handleConfirmCheckout}
                style={styles.confirmCheckoutBtn}
                disabled={closingSession}
              >
                {closingSession ? 'กำลังปิดโต๊ะ...' : 'ยืนยันเรียกเก็บเงิน'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline Styles ดีไซน์กระชับ มือถืออ่านง่าย ปุ่มใหญ่กดด้วยนิ้วโป้งสะดวก
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    paddingBottom: '90px', // เว้นที่ให้ตะกร้าลอย
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  centerBox: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '1.5rem',
    backgroundColor: '#f8fafc',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  errorCard: {
    backgroundColor: '#ffffff',
    border: '2px solid #fca5a5',
    borderRadius: '16px',
    padding: '2rem',
    textAlign: 'center',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)',
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    backgroundColor: '#ffffff',
    padding: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  headerTitle: {
    fontSize: '1.2rem',
    fontWeight: '800',
    color: '#1e3a8a',
    margin: 0,
  },
  tableBadge: {
    display: 'inline-block',
    fontSize: '0.85rem',
    fontWeight: '700',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    padding: '0.2rem 0.6rem',
    borderRadius: '9999px',
    marginTop: '0.25rem',
  },
  checkoutBtn: {
    backgroundColor: '#f59e0b',
    color: '#ffffff',
    border: 'none',
    padding: '0.6rem 1rem',
    fontSize: '0.95rem',
    fontWeight: '700',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  successBanner: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
    padding: '0.85rem 1rem',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: '0.95rem',
    borderBottom: '1px solid #bbf7d0',
  },
  tabsContainer: {
    display: 'flex',
    overflowX: 'auto',
    backgroundColor: '#ffffff',
    padding: '0.5rem 0.75rem',
    gap: '0.5rem',
    borderBottom: '1px solid #e2e8f0',
  },
  tabBtn: {
    padding: '0.6rem 1.1rem',
    borderRadius: '9999px',
    border: 'none',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    fontSize: '0.95rem',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
  },
  tabBtnActive: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
  },
  menuList: {
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  menuCard: {
    backgroundColor: '#ffffff',
    padding: '1rem',
    borderRadius: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  menuName: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1e293b',
  },
  qtyControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
  },
  minusBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#334155',
    fontSize: '1.3rem',
    fontWeight: '700',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
  },
  plusBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: '1.3rem',
    fontWeight: '700',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
  },
  qtyText: {
    fontSize: '1.1rem',
    fontWeight: '800',
    color: '#0f172a',
    minWidth: '20px',
    textAlign: 'center',
  },
  // Floating Cart Bar
  floatingCart: {
    position: 'fixed',
    bottom: '1rem',
    left: '1rem',
    right: '1rem',
    backgroundColor: '#0f172a',
    borderRadius: '16px',
    padding: '0.85rem 1.25rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
    zIndex: 20,
  },
  cartInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  cartBadge: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    fontWeight: '800',
    fontSize: '1rem',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartLabel: {
    color: '#f8fafc',
    fontSize: '0.95rem',
    fontWeight: '600',
  },
  submitOrderBtn: {
    backgroundColor: '#059669',
    color: '#ffffff',
    border: 'none',
    padding: '0.7rem 1.2rem',
    borderRadius: '10px',
    fontWeight: '700',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  // Modal Styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '1rem',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '1.5rem',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
  },
  modalTitle: {
    fontSize: '1.4rem',
    fontWeight: '800',
    color: '#1e3a8a',
    textAlign: 'center',
    margin: '0 0 0.5rem 0',
  },
  receiptBox: {
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    padding: '1rem',
    marginBottom: '1.5rem',
  },
  receiptRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '1rem',
    color: '#334155',
    marginBottom: '0.5rem',
  },
  modalActions: {
    display: 'flex',
    gap: '0.75rem',
  },
  cancelModalBtn: {
    flex: 1,
    padding: '0.85rem',
    fontSize: '1rem',
    fontWeight: '700',
    backgroundColor: '#e2e8f0',
    color: '#475569',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  confirmCheckoutBtn: {
    flex: 1,
    padding: '0.85rem',
    fontSize: '1rem',
    fontWeight: '700',
    backgroundColor: '#f59e0b',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};
