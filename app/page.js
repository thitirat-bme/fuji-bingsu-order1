import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.5rem",
        padding: "1rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "2.5rem", margin: 0 }}>บิงซูภูเขาฟูจิ</h1>
      <p style={{ margin: 0, color: "#666" }}>Deploy สำเร็จแล้ว ✅</p>

      <nav style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
        <Link href="/generate-qr" style={linkStyle}>
          สร้าง QR โต๊ะ (/generate-qr)
        </Link>
        <Link href="/kitchen" style={linkStyle}>
          หน้าครัว (/kitchen)
        </Link>
      </nav>
    </main>
  );
}

const linkStyle = {
  padding: "0.75rem 1.25rem",
  border: "1px solid #ccc",
  borderRadius: "8px",
  textDecoration: "none",
  color: "inherit",
};
