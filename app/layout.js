export const metadata = {
  title: "บิงซูภูเขาฟูจิ",
  description: "ระบบสั่งบิงซูร้านบิงซูภูเขาฟูจิ",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
